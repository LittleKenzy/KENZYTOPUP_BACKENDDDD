// ============================================
// Transaction Service — Business logic transaksi
// ============================================

const crypto = require('crypto');
const prisma = require('../../config/db');
const { uploadFile, BUCKETS } = require('../../config/supabase');
const { AppError } = require('../../middleware/errorHandler');
const loyaltyService = require('../loyalty/loyalty.service');
const flashSaleService = require('../flashsale/flashsale.service');
const pushService = require('../push/push.service');
const notificationService = require('../notifications/notification.service');
const { rollCardDrop } = require('../../utils/cardDrop');

// ─── CREATE TRANSACTION ─────────────────────
async function createTransaction(userId, { productId, targetId, quantity, paymentMethod, discountCode }, paymentProofFile) {
  // 1. Validasi produk aktif
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new AppError('Produk tidak ditemukan.', 404);
  }

  if (!product.isActive) {
    throw new AppError('Produk ini sedang tidak tersedia.', 400);
  }

  // 2. Jika metode QRIS, bukti transfer WAJIB diupload
  let paymentProofUrl = null;
  if (paymentMethod === 'QRIS') {
    if (!paymentProofFile) {
      throw new AppError('Bukti transfer QRIS wajib diupload.', 400);
    }

    // Upload bukti ke Supabase Storage
    const ext = paymentProofFile.originalname.split('.').pop();
    const fileName = `proof-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = `proofs/${userId}/${fileName}`;

    const { url } = await uploadFile(BUCKETS.PAYMENT_PROOF, filePath, paymentProofFile.buffer, paymentProofFile.mimetype);
    paymentProofUrl = url;
  }

  // 3. Cek flash sale aktif untuk produk ini
  let finalPrice = product.price;
  let appliedFlashSale = null;

  try {
    const flashSale = await flashSaleService.getActiveDiscountForProduct(
      product.id,
      product.category
    );
    if (flashSale) {
      finalPrice = Math.round(product.price * (1 - flashSale.discountPercent / 100));
      appliedFlashSale = {
        id: flashSale.id,
        title: flashSale.title,
        discountPercent: flashSale.discountPercent,
        originalPrice: product.price,
        discountedPrice: finalPrice,
      };
    }
  } catch (err) {
    // Flash sale check gagal, gunakan harga normal
    console.warn('⚠️ Flash sale check failed:', err.message);
  }

  // 4. Hitung total harga dasar
  let totalPrice = finalPrice * quantity;

  // 5. Validasi & terapkan kode diskon loyalty jika ada
  let appliedDiscountCode = null;
  let discountAmount = 0;
  if (discountCode) {
    try {
      const redemption = await loyaltyService.validateDiscountCode(discountCode, userId);
      discountAmount = redemption.discountAmount;
      
      // Validasi minimal belanja (misal: 2.5x dari nilai diskon, 10k -> 25k)
      const minPurchase = discountAmount * 2.5;
      if (totalPrice < minPurchase) {
        throw new AppError(`Total belanja belum memenuhi syarat. Minimal belanja untuk voucher ini adalah Rp${minPurchase.toLocaleString('id-ID')}`, 400);
      }

      appliedDiscountCode = discountCode;
      
      // Potong harga, tapi tidak boleh minus
      totalPrice = Math.max(0, totalPrice - discountAmount);
      
      // Tandai kode diskon sudah dipakai
      await loyaltyService.useDiscountCode(discountCode);
    } catch (err) {
      throw new AppError(`Gagal menggunakan kode diskon: ${err.message}`, 400);
    }
  }

  // 6. Generate referensi eksternal (mock payment gateway)
  const externalRef = `KNZ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  // 7. Buat note termasuk info flash sale & loyalty jika ada
  let noteText = `Menunggu konfirmasi admin — ${product.name} x${quantity} untuk ${targetId} via ${paymentMethod}`;
  
  const additionalNotes = [];
  if (appliedFlashSale) {
    additionalNotes.push(`🏷️ ${appliedFlashSale.title}: diskon ${appliedFlashSale.discountPercent}%`);
  }
  if (appliedDiscountCode) {
    additionalNotes.push(`🎁 Tukar Poin: potongan Rp${discountAmount.toLocaleString()}`);
  }
  
  if (additionalNotes.length > 0) {
    noteText += ` (${additionalNotes.join(', ')})`;
  }

  // 8. Buat transaksi dengan status PENDING
  //    Status akan diubah secara manual oleh Admin
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      productId,
      targetId,
      amount: quantity,
      totalPrice,
      paymentMethod,
      paymentProof: paymentProofUrl,
      status: 'PENDING',
      externalRef,
      note: noteText,
    },
    include: {
      product: {
        select: { name: true, category: true, denomination: true, operatorCode: true },
      },
    },
  });

  // Tambahkan info flash sale ke response
  return {
    ...transaction,
    appliedFlashSale,
  };
}

// ─── LIST USER TRANSACTIONS ─────────────────
async function listUserTransactions(userId, { status, page = 1, limit = 10 }) {
  const where = { userId };

  if (status) {
    where.status = status;
  }

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { name: true, category: true, denomination: true, operatorCode: true },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── GET TRANSACTION BY ID (user hanya bisa lihat miliknya) ─
async function getTransactionById(transactionId, userId) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      product: {
        select: { name: true, category: true, denomination: true, operatorCode: true, price: true },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!transaction) {
    throw new AppError('Transaksi tidak ditemukan.', 404);
  }

  // Cek kepemilikan: user biasa hanya bisa lihat transaksi sendiri
  if (transaction.userId !== userId) {
    throw new AppError('Anda tidak memiliki akses ke transaksi ini.', 403);
  }

  return transaction;
}

// ─── LIST ALL TRANSACTIONS (admin) ──────────
async function listAllTransactions({ status, page = 1, limit = 10, search }) {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { id: { contains: search } },
      { targetId: { contains: search } },
      { externalRef: { contains: search } },
      { user: { name: { contains: search } } },
      { user: { email: { contains: search } } },
      { user: { phone: { contains: search } } },
    ];
  }

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { name: true, category: true, denomination: true },
        },
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── GET TRANSACTION DETAIL (admin — bisa lihat semua) ─
async function getTransactionByIdAdmin(transactionId) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      product: {
        select: { name: true, category: true, denomination: true, operatorCode: true, price: true },
      },
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  if (!transaction) {
    throw new AppError('Transaksi tidak ditemukan.', 404);
  }

  return transaction;
}

// ─── UPDATE TRANSACTION STATUS (admin) ──────
async function updateTransactionStatus(transactionId, { status, note }) {
  // 1. Pastikan transaksi ada
  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existing) {
    throw new AppError('Transaksi tidak ditemukan.', 404);
  }

  // 2. Bangun note otomatis jika tidak disediakan
  const statusNote = note || getDefaultNote(status);

  // 3. Update status
  const transaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status,
      note: statusNote,
    },
    include: {
      product: {
        select: { name: true, category: true, denomination: true, operatorCode: true, price: true },
      },
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  console.log(
    `📦 Transaction ${transactionId}: Status diubah ke ${status} oleh Admin`
  );

  // 4. Jika status berubah ke SUCCESS, berikan poin loyalty + push notification
  let pointsResult = null;
  let droppedCard = null;
  
  if (status === 'SUCCESS' && existing.status !== 'SUCCESS') {
    // Jalankan post-process dalam block try-catch terpisah agar tidak menyebabkan error 500 jika salah satu gagal
    try {
      // 4. Berikan poin loyalty
      try {
        pointsResult = await loyaltyService.awardPoints(
          existing.userId,
          existing.totalPrice,
          transactionId
        );
      } catch (err) {
        console.warn(`⚠️ Gagal memberikan poin loyalty untuk transaksi ${transactionId}:`, err.message);
      }

      // 5. Roll kartu kolektibel (40% chance)
      try {
        droppedCard = await rollCardDrop(existing.userId, prisma);
        if (droppedCard) {
          console.log(`🃏 User ${existing.userId} mendapat kartu: ${droppedCard.name} [${droppedCard.rarity}]`);
        }
      } catch (cardErr) {
        console.warn(`⚠️ Card drop gagal untuk transaksi ${transactionId}:`, cardErr.message);
      }

      // 6. Kirim push notification & in-app notification (fire-and-forget style)
      try {
        const productName = transaction.product?.name || 'Produk';
        const pointsEarned = pointsResult ? pointsResult.pointsEarned : 0;
        const pointsText = pointsEarned > 0
          ? ` Kamu dapat +${pointsEarned} poin.`
          : '';
        const cardText = droppedCard
          ? ` 🃏 Kamu dapat kartu "${droppedCard.name}" [${droppedCard.rarity}]!`
          : '';

        // Push ke browser (PWA)
        await pushService.sendPushToUser(existing.userId, {
          title: '✅ Order Berhasil!',
          body: `${productName} sudah diproses.${pointsText}${cardText}`,
          icon: '/icons/icon-192x192.png',
          data: {
            type: 'order_confirmed',
            transactionId,
            url: '/orders',
            droppedCard: droppedCard || null,
          },
        }).catch(e => console.warn('⚠️ Gagal kirim push:', e.message));

        // Simpan notifikasi in-app
        await notificationService.createNotification(existing.userId, {
          type: 'order_status',
          title: '✅ Order Berhasil!',
          body: `${productName} untuk ${existing.targetId} sudah diproses.${pointsText}${cardText}`,
          data: { transactionId, url: '/riwayat', droppedCard: droppedCard || null },
        }).catch(e => console.warn('⚠️ Gagal create notification in-app:', e.message));
        
      } catch (notifErr) {
        console.warn(`⚠️ Notifikasi gagal untuk transaksi ${transactionId}:`, notifErr.message);
      }
    } catch (criticalErr) {
      console.error(`❌ Critical error in post-success processing #${transactionId}:`, criticalErr.message);
    }
  }

  return {
    ...transaction,
    pointsResult,
    card: droppedCard || null,
  };
}

function getDefaultNote(status) {
  switch (status) {
    case 'SUCCESS':
      return 'Top-up berhasil diproses oleh admin.';
    case 'FAILED':
      return 'Transaksi ditolak oleh admin.';
    case 'PENDING':
      return 'Status dikembalikan ke pending oleh admin.';
    default:
      return '';
  }
}

// ─── GET TRANSACTION STATS (admin dashboard) ─
async function getTransactionStats() {
  const [total, pending, success, failed] = await Promise.all([
    prisma.transaction.count(),
    prisma.transaction.count({ where: { status: 'PENDING' } }),
    prisma.transaction.count({ where: { status: 'SUCCESS' } }),
    prisma.transaction.count({ where: { status: 'FAILED' } }),
  ]);

  return { total, pending, success, failed };
}

// ─── GET NEW ORDERS SINCE TIMESTAMP (admin polling) ─
async function getNewOrders(since) {
  const where = {};

  if (since) {
    const sinceDate = new Date(since);
    if (!isNaN(sinceDate.getTime())) {
      where.createdAt = { gt: sinceDate };
    }
  }

  const orders = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50, // Batasi max 50 order per polling
    include: {
      product: {
        select: { name: true, category: true, denomination: true },
      },
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  return {
    orders,
    count: orders.length,
  };
}

module.exports = {
  createTransaction,
  listUserTransactions,
  getTransactionById,
  listAllTransactions,
  getTransactionByIdAdmin,
  updateTransactionStatus,
  getTransactionStats,
  getNewOrders,
};
