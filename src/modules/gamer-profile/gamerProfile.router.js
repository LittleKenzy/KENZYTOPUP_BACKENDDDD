// ============================================
// Gamer Profile Router — Profil Akun Game User
// ============================================

const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../../middleware/auth');
const {
  getAllProfiles,
  getProfileByGame,
  addProfile,
  updateProfile,
  deleteProfile,
} = require('./gamerProfile.controller');

const router = express.Router();

// Rate limiter khusus POST/PUT profil gamer: max 10 per menit per IP
const profileLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak request, coba lagi nanti',
  },
});

// Semua endpoint perlu login
router.use(authenticate);

router.get('/', getAllProfiles);
router.get('/:gameId', getProfileByGame);
router.post('/', profileLimiter, addProfile);
router.put('/:gameId', profileLimiter, updateProfile);
router.delete('/:gameId', deleteProfile);

module.exports = router;
