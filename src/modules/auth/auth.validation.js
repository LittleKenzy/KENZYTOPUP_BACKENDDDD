// ============================================
// Auth Validation — Schema Zod untuk auth input
// ============================================

const { z } = require('zod');

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Nama wajib diisi' })
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter'),
  phone: z
    .string({ required_error: 'Nomor HP wajib diisi' })
    .regex(/^08\d{8,13}$/, 'Format nomor HP tidak valid (contoh: 081234567890)'),
  email: z
    .string({ required_error: 'Email wajib diisi' })
    .email('Format email tidak valid'),
  password: z
    .string({ required_error: 'Password wajib diisi' })
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
    .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
    .regex(/[0-9]/, 'Password harus mengandung angka')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password harus mengandung karakter spesial'),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email wajib diisi' })
    .email('Format email tidak valid'),
  password: z
    .string({ required_error: 'Password wajib diisi' })
    .min(1, 'Password wajib diisi'),
});

const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token wajib diisi' })
    .min(1, 'Refresh token wajib diisi'),
});

// ─── FORGOT PASSWORD ────────────────────────
const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email wajib diisi' })
    .email('Format email tidak valid'),
});

// ─── VERIFY RESET TOKEN ─────────────────────
const verifyResetTokenSchema = z.object({
  token: z
    .string({ required_error: 'Token wajib diisi' })
    .min(1, 'Token wajib diisi'),
});

// ─── RESET PASSWORD ─────────────────────────
const resetPasswordSchema = z.object({
  token: z
    .string({ required_error: 'Token wajib diisi' })
    .min(1, 'Token wajib diisi'),
  newPassword: z
    .string({ required_error: 'Password baru wajib diisi' })
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
    .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
    .regex(/[0-9]/, 'Password harus mengandung angka')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password harus mengandung karakter spesial'),
  confirmPassword: z
    .string({ required_error: 'Konfirmasi password wajib diisi' })
    .min(1, 'Konfirmasi password wajib diisi'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password baru dan konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  verifyResetTokenSchema,
  resetPasswordSchema,
};
