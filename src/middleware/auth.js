// ============================================
// Auth Middleware — Verifikasi JWT Access Token
// ============================================

const { verifyAccessToken } = require('../config/jwt');

/**
 * Middleware: Proteksi route dengan JWT
 * Mengambil token dari header Authorization: Bearer <token>
 * Menyimpan decoded user info di req.user
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token tidak ditemukan.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Simpan data user ke request object
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token sudah kadaluarsa. Silakan refresh atau login ulang.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token tidak valid.',
    });
  }
}

module.exports = { authenticate };
