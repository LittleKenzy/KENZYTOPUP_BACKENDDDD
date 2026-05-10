// ============================================
// Global Error Handler — Tangkap semua error
// ============================================

const { ZodError } = require('zod');

/**
 * Global error handler middleware
 * Harus dipasang TERAKHIR setelah semua routes
 *
 * Format response konsisten:
 * { success: false, message: string, errors?: any }
 */
function errorHandler(err, req, res, _next) {
  // Log error di server (hanya di development)
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  // ─── Zod Validation Error ────────────────
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validasi input gagal.',
      errors: formattedErrors,
    });
  }

  // ─── Custom AppError (thrown dari service) ─
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }

  // ─── Prisma Known Error ──────────────────
  if (err.code === 'P2002') {
    // Unique constraint violation
    const field = err.meta?.target?.join(', ') || 'field';
    return res.status(409).json({
      success: false,
      message: `Data dengan ${field} tersebut sudah ada.`,
    });
  }

  if (err.code === 'P2025') {
    // Record not found
    return res.status(404).json({
      success: false,
      message: 'Data tidak ditemukan.',
    });
  }

  // ─── Default: Internal Server Error ──────
  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
  });
}

/**
 * Custom error class untuk operational errors
 * Digunakan di service layer untuk melempar error dengan status code tertentu
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, AppError };
