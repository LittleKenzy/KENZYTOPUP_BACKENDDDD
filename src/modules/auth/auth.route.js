// ============================================
// Auth Routes — Endpoint autentikasi
// ============================================

const { Router } = require('express');
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const { authLimiter, loginLimiter } = require('../../middleware/rateLimiter');

const router = Router();

// POST /register & POST /login: ketat (5/menit) — cegah brute-force
router.post('/register', loginLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);

// POST /refresh & /logout: sedikit lebih longgar (20/menit)
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authLimiter, authController.logout);

// GET /me: TIDAK kena authLimiter ketat — dipanggil tiap kali halaman load
// hanya dibatasi oleh generalLimiter di app.js (100/15menit)
router.get('/me', authenticate, authController.getMe);

module.exports = router;
