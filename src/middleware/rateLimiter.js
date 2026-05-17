// ============================================
// Rate Limiter — Proteksi dari abuse/brute force
// ============================================

const rateLimit = require('express-rate-limit');

/**
 * General limiter: 1000 request per 15 menit per IP
 * Untuk semua API endpoint
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak request. Coba lagi dalam 15 menit.',
  },
});

/**
 * Auth limiter: 100 request per menit per IP
 * Untuk endpoint auth umum (logout, refresh, GET /me)
 */
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak request autentikasi. Coba lagi dalam 1 menit.',
  },
});

/**
 * Login/Register limiter: 30 request per menit per IP
 * HANYA untuk POST /login dan POST /register
 */
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.',
  },
});

/**
 * Mission claim limiter: 10 request per menit per IP
 * Untuk endpoint POST /api/missions/daily/claim — cegah spam klaim
 */
const missionClaimLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan klaim misi. Coba lagi dalam 1 menit.',
  },
});

module.exports = { generalLimiter, authLimiter, loginLimiter, missionClaimLimiter };

