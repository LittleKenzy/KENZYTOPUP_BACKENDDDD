// ============================================
// Transaction Service — Business logic transaksi
// ============================================

const crypto = require('crypto');
const prisma = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

// ─── CREATE TRANSACTION ─────────────────────
async function createTransaction(userId, { productId, targetId, quantity, paymentMethod }) {
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

  // 2. Hitung total harga
  const totalPrice = product.price * quantity;

  // 3. Generate referensi eksternal (mock payment gateway)
  const externalRef = `KNZ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  // 4. Buat transaksi dengan status PENDING
  //    Status akan diubah secara manual oleh Admin
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      productId,
      targetId,
      amount: quantity,
      totalPrice,
      paymentMethod,
      status: 'PENDING',
      externalRef,
      note: `Menunggu konfirmasi admin — ${product.name} x${quantity} untuk ${targetId} via ${paymentMethod}`,
    },
    include: {
      product: {
        select: { name: true, category: true, denomination: true, operatorCode: true },
      },
    },
  });

  return transaction;
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

  return transaction;
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

module.exports = {
  createTransaction,
  listUserTransactions,
  getTransactionById,
  listAllTransactions,
  getTransactionByIdAdmin,
  updateTransactionStatus,
  getTransactionStats,
};
