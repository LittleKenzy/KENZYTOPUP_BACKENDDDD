// ============================================
// Transaction Routes — Endpoint transaksi
// ============================================

const { Router } = require('express');
const transactionController = require('./transaction.controller');
const { authenticate } = require('../../middleware/auth');
const { uploadPaymentProof } = require('../../middleware/upload');

const router = Router();

// Semua route transaksi memerlukan autentikasi
router.use(authenticate);

// User routes
// POST /api/transactions — Buat transaksi (dengan optional upload bukti QRIS)
router.post('/', uploadPaymentProof, transactionController.createTransaction);
router.get('/', transactionController.listTransactions);
router.get('/:id', transactionController.getTransaction);

module.exports = router;
