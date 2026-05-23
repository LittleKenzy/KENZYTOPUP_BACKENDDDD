// ============================================
// Admin Auth Routes — 2FA OTP Login via WhatsApp
// ============================================
//
// Rate limiting ketat:
//   /admin/login      → max 5x per 15 menit per IP
//   /admin/verify-otp → max 10x per 15 menit per IP
//   /admin/resend-otp → max 3x per 15 menit per IP
// ============================================

const { Router } = require('express');
const adminAuthController = require('./adminAuth.controller');
const {
  adminLoginLimiter,
  adminVerifyOtpLimiter,
  adminResendOtpLimiter,
} = require('../../middleware/security');

const router = Router();

// Step 1: Admin login → validasi email+password → kirim OTP ke WA
router.post('/login', adminLoginLimiter, adminAuthController.adminLogin);

// Step 2: Verifikasi OTP → beri JWT jika benar
router.post('/verify-otp', adminVerifyOtpLimiter, adminAuthController.verifyOtp);

// Step 3: Kirim ulang OTP (cooldown 60 detik)
router.post('/resend-otp', adminResendOtpLimiter, adminAuthController.resendOtp);

module.exports = router;
