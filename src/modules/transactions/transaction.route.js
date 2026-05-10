// ============================================
// Transaction Routes — Endpoint transaksi
// ============================================

const { Router } = require('express');
const transactionController = require('./transaction.controller');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

const router = Router();

// Semua route transaksi memerlukan autentikasi
router.use(authenticate);

// User routes
router.post('/', transactionController.createTransaction);
router.get('/', transactionController.listTransactions);
router.get('/:id', transactionController.getTransaction);

module.exports = router;
