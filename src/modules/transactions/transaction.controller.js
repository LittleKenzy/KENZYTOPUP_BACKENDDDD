// ============================================
// Transaction Controller — Handle HTTP req/res
// ============================================

const transactionService = require('./transaction.service');
const {
  createTransactionSchema,
  queryTransactionSchema,
  updateStatusSchema,
} = require('./transaction.validation');
const { notifyAdminNewOrder } = require('../../utils/adminNotifier');
const prisma = require('../../config/db');

// ─── POST /api/transactions ──────────────────
async function createTransaction(req, res, next) {
  try {
    const validated = createTransactionSchema.parse(req.body);

    const transaction = await transactionService.createTransaction(
      req.user.userId,
      validated,
      req.file // Bukti QRIS (multer file object, bisa undefined jika bukan QRIS)
    );

    // ── Fire-and-forget: Kirim notifikasi WA ke admin ──
    // Jangan await — agar response ke user tidak terhambat
    (async () => {
      try {
        // Query user info (JWT hanya simpan userId & role)
        const user = await prisma.user.findUnique({
          where: { id: req.user.userId },
          select: { name: true, phone: true },
        });

        notifyAdminNewOrder({
          id: transaction.id,
          productName: transaction.product?.name || '-',
          userName: user?.name || '-',
          userPhone: user?.phone || '-',
          totalPrice: transaction.totalPrice,
          targetId: validated.targetId,
          paymentMethod: validated.paymentMethod,
        }).catch(err => console.error('❌ Gagal kirim notif WA admin:', err));
      } catch (err) {
        console.error('❌ Gagal query user untuk notif admin:', err);
      }
    })();

    return res.status(201).json({
      success: true,
      message: 'Transaksi berhasil dibuat. Status: PENDING — menunggu konfirmasi admin.',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/transactions ───────────────────
async function listTransactions(req, res, next) {
  try {
    const query = queryTransactionSchema.parse(req.query);

    const result = await transactionService.listUserTransactions(
      req.user.userId,
      query
    );

    return res.status(200).json({
      success: true,
      message: 'Riwayat transaksi berhasil diambil.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/transactions/:id ───────────────
async function getTransaction(req, res, next) {
  try {
    const transaction = await transactionService.getTransactionById(
      req.params.id,
      req.user.userId
    );

    return res.status(200).json({
      success: true,
      message: 'Detail transaksi berhasil diambil.',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════
// ADMIN CONTROLLERS
// ═══════════════════════════════════════════════

// ─── GET /api/admin/transactions ─────────────
async function listAllTransactions(req, res, next) {
  try {
    const query = queryTransactionSchema.parse(req.query);
    const result = await transactionService.listAllTransactions(query);

    return res.status(200).json({
      success: true,
      message: 'Semua transaksi berhasil diambil.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/transactions/:id ─────────
async function getTransactionAdmin(req, res, next) {
  try {
    const transaction = await transactionService.getTransactionByIdAdmin(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: 'Detail transaksi berhasil diambil.',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/admin/transactions/:id/status ─
async function updateTransactionStatus(req, res, next) {
  try {
    const validated = updateStatusSchema.parse(req.body);

    const transaction = await transactionService.updateTransactionStatus(
      req.params.id,
      validated
    );

    return res.status(200).json({
      success: true,
      message: `Status transaksi berhasil diubah ke ${validated.status}.`,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/transactions/stats ───────
async function getTransactionStats(req, res, next) {
  try {
    const stats = await transactionService.getTransactionStats();

    return res.status(200).json({
      success: true,
      message: 'Statistik transaksi berhasil diambil.',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/orders/new?since= ────────
// Endpoint polling untuk admin dashboard — cek order baru setiap 15 detik
async function getNewOrders(req, res, next) {
  try {
    const { since } = req.query;

    const result = await transactionService.getNewOrders(since);

    return res.status(200).json({
      success: true,
      message: `${result.count} order baru ditemukan.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTransaction,
  listTransactions,
  getTransaction,
  listAllTransactions,
  getTransactionAdmin,
  updateTransactionStatus,
  getTransactionStats,
  getNewOrders,
};
