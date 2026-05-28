// ============================================
// Wishlist Router — Kartu yang diinginkan user
// ============================================

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require('./trade.controller');

const router = express.Router();

// Semua endpoint wishlist memerlukan login
router.use(authenticate);

// GET    /api/wishlist           — Ambil wishlist user
router.get('/', getWishlist);

// POST   /api/wishlist/:cardId   — Tambah kartu ke wishlist
router.post('/:cardId', addToWishlist);

// DELETE /api/wishlist/:cardId   — Hapus kartu dari wishlist
router.delete('/:cardId', removeFromWishlist);

module.exports = router;
