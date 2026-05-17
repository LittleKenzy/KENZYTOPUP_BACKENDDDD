// ============================================
// Flash Sale Service — Business logic flash sale
// ============================================

const prisma = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const blastService = require('./blast.service');

// ─── GET ACTIVE FLASH SALES (public) ────────
// Ambil semua flash sale yang sedang aktif & dalam rentang waktu
async function getActiveFlashSales() {
  const now = new Date();

  const flashSales = await prisma.flashSale.findMany({
    where: {
      isActive: true,
      startAt: { lte: now },
      endAt: { gt: now },
    },
    orderBy: { endAt: 'asc' }, // Yang akan berakhir paling cepat di atas
    include: {
      product: {
        select: {
          id: true,
          name: true,
          category: true,
          denomination: true,
          price: true,
          operatorCode: true,
        },
      },
    },
  });

  // Tambahkan info sisa waktu untuk setiap flash sale
  return flashSales.map((sale) => ({
    ...sale,
    remainingMs: sale.endAt.getTime() - now.getTime(),
    discountedPrice: sale.product
      ? Math.round(sale.product.price * (1 - sale.discountPercent / 100))
      : null,
  }));
}

// ─── GET ALL FLASH SALES (admin) ────────────
async function getAllFlashSales() {
  const now = new Date();

  const flashSales = await prisma.flashSale.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          category: true,
          denomination: true,
          price: true,
        },
      },
    },
  });

  // Tambahkan status real-time
  return flashSales.map((sale) => {
    let status = 'INACTIVE';
    if (sale.isActive) {
      if (now < sale.startAt) status = 'SCHEDULED';
      else if (now >= sale.startAt && now < sale.endAt) status = 'LIVE';
      else status = 'EXPIRED';
    }
    return { ...sale, status };
  });
}

// ─── GET FLASH SALE BY ID (admin) ───────────
async function getFlashSaleById(id) {
  const flashSale = await prisma.flashSale.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          category: true,
          denomination: true,
          price: true,
          operatorCode: true,
        },
      },
    },
  });

  if (!flashSale) {
    throw new AppError('Flash sale tidak ditemukan.', 404);
  }

  return flashSale;
}

// ─── CREATE FLASH SALE + TRIGGER WA BLAST (admin) ──────────
async function createFlashSale({
  title,
  description,
  discountPercent,
  productId,
  category,
  startAt,
  endAt,
  blastUserIds = 'all', // "all" | "none" | [...userIds]
}) {
  // Validasi diskon
  if (discountPercent < 1 || discountPercent > 100) {
    throw new AppError('Diskon harus antara 1% - 100%.', 400);
  }

  // Validasi waktu
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (end <= start) {
    throw new AppError('Waktu berakhir harus setelah waktu mulai.', 400);
  }

  // Validasi produk jika diberikan
  let product = null;
  if (productId) {
    product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new AppError('Produk tidak ditemukan.', 404);
    }
  }

  const flashSale = await prisma.flashSale.create({
    data: {
      title,
      description,
      discountPercent,
      productId: productId || null,
      category: category || null,
      startAt: start,
      endAt: end,
      isActive: true,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          category: true,
          denomination: true,
          price: true,
        },
      },
    },
  });

  console.log(`🏷️ Flash Sale dibuat: "${title}" — Diskon ${discountPercent}%`);

  // ── TRIGGER WA BLAST (async, fire & forget) ──
  // Kirim pesan ke user sesuai pilihan admin
  let blastStatus = { total: 0, queued: 0 };
  try {
    blastStatus = await blastService.triggerBlast(flashSale, flashSale.product, blastUserIds);
    console.log(`📤 WA Blast diqueue: ${blastStatus.queued}/${blastStatus.total} user`);
  } catch (err) {
    console.error('⚠️ Gagal trigger WA blast:', err.message);
    // Blast gagal tidak boleh menggagalkan pembuatan flash sale
  }

  return { flashSale, blastStatus };
}

// ─── UPDATE FLASH SALE (admin) ──────────────
async function updateFlashSale(id, data) {
  const existing = await prisma.flashSale.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Flash sale tidak ditemukan.', 404);
  }

  const updateData = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;

  if (data.discountPercent !== undefined) {
    if (data.discountPercent < 1 || data.discountPercent > 100) {
      throw new AppError('Diskon harus antara 1% - 100%.', 400);
    }
    updateData.discountPercent = data.discountPercent;
  }

  if (data.productId !== undefined) {
    if (data.productId) {
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
      });
      if (!product) {
        throw new AppError('Produk tidak ditemukan.', 404);
      }
    }
    updateData.productId = data.productId || null;
  }

  if (data.category !== undefined) updateData.category = data.category || null;

  if (data.startAt !== undefined) updateData.startAt = new Date(data.startAt);
  if (data.endAt !== undefined) updateData.endAt = new Date(data.endAt);

  // Validasi waktu jika keduanya diupdate
  const finalStart = updateData.startAt || existing.startAt;
  const finalEnd = updateData.endAt || existing.endAt;
  if (finalEnd <= finalStart) {
    throw new AppError('Waktu berakhir harus setelah waktu mulai.', 400);
  }

  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const flashSale = await prisma.flashSale.update({
    where: { id },
    data: updateData,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          category: true,
          denomination: true,
          price: true,
        },
      },
    },
  });

  return flashSale;
}

// ─── DELETE FLASH SALE (admin) ──────────────
async function deleteFlashSale(id) {
  const existing = await prisma.flashSale.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Flash sale tidak ditemukan.', 404);
  }

  await prisma.flashSale.delete({ where: { id } });

  return { message: 'Flash sale berhasil dihapus.' };
}

// ─── TOGGLE ACTIVE (admin) ─────────────────
async function toggleFlashSale(id, isActive) {
  const existing = await prisma.flashSale.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Flash sale tidak ditemukan.', 404);
  }

  const flashSale = await prisma.flashSale.update({
    where: { id },
    data: { isActive },
  });

  return flashSale;
}

// ─── CHECK FLASH SALE FOR PRODUCT ───────────
// Cek apakah ada flash sale aktif untuk produk tertentu
// Digunakan saat membuat transaksi untuk menghitung harga diskon
async function getActiveDiscountForProduct(productId, productCategory) {
  const now = new Date();

  // Cari flash sale yang cocok (produk spesifik atau kategori)
  const flashSale = await prisma.flashSale.findFirst({
    where: {
      isActive: true,
      startAt: { lte: now },
      endAt: { gt: now },
      OR: [
        { productId: productId },
        { category: productCategory, productId: null },
        { productId: null, category: null }, // Flash sale global
      ],
    },
    orderBy: { discountPercent: 'desc' }, // Ambil diskon terbesar
  });

  return flashSale;
}

module.exports = {
  getActiveFlashSales,
  getAllFlashSales,
  getFlashSaleById,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
  toggleFlashSale,
  getActiveDiscountForProduct,
};
