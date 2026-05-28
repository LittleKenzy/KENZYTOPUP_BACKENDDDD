// ============================================
// Trade Router — Penawaran tukar kartu
// ============================================

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const {
  tradeCreateLimiter,
  tradeConfirmLimiter,
} = require('../../middleware/security');
const {
  listOpenTrades,
  getMyTrades,
  getMatchingTrades,
  createTradeOffer,
  confirmTrade,
  cancelTrade,
} = require('./trade.controller');

const router = express.Router();

// Semua endpoint trade memerlukan login
router.use(authenticate);

// GET  /api/trade          — List semua trade offer OPEN (marketplace)
router.get('/', listOpenTrades);

// GET  /api/trade/mine     — Trade offer milik user yang login
router.get('/mine', getMyTrades);

// GET  /api/trade/matches  — Trade yang cocok dengan wishlist user
router.get('/matches', getMatchingTrades);

// POST /api/trade          — Buat trade offer baru
// Rate limit: max 10 per jam per user
router.post('/', tradeCreateLimiter, createTradeOffer);

// POST /api/trade/:id/confirm — Konfirmasi trade
// Rate limit: max 20 per jam per user
router.post('/:id/confirm', tradeConfirmLimiter, confirmTrade);

// POST /api/trade/:id/cancel  — Batalkan trade offer milik sendiri
router.post('/:id/cancel', cancelTrade);

module.exports = router;
