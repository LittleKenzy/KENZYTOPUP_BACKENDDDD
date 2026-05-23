// ============================================
// Admin Auth Validation — Zod schemas untuk 2FA OTP
// ============================================

const { z } = require('zod');

// ─── ADMIN LOGIN (Step 1) ───────────────────
// Sama seperti login biasa: email + password
const adminLoginSchema = z.object({
  email: z
    .string({ required_error: 'Email wajib diisi' })
    .email('Format email tidak valid'),
  password: z
    .string({ required_error: 'Password wajib diisi' })
    .min(1, 'Password wajib diisi'),
});

// ─── VERIFY OTP (Step 2) ────────────────────
// sessionToken (UUID) + otp (6 digit string)
const verifyOtpSchema = z.object({
  sessionToken: z
    .string({ required_error: 'Session token wajib diisi' })
    .uuid('Format session token tidak valid'),
  otp: z
    .string({ required_error: 'Kode OTP wajib diisi' })
    .length(6, 'Kode OTP harus 6 digit')
    .regex(/^\d{6}$/, 'Kode OTP harus berupa 6 digit angka'),
});

// ─── RESEND OTP (Step 3) ────────────────────
// Hanya butuh sessionToken untuk identifikasi sesi
const resendOtpSchema = z.object({
  sessionToken: z
    .string({ required_error: 'Session token wajib diisi' })
    .uuid('Format session token tidak valid'),
});

module.exports = {
  adminLoginSchema,
  verifyOtpSchema,
  resendOtpSchema,
};
