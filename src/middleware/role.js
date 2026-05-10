// ============================================
// Role Middleware — Cek role user (admin, user)
// ============================================

/**
 * Factory function: Membuat middleware yang membatasi akses berdasarkan role
 * Harus dipasang SETELAH authenticate middleware
 *
 * Contoh penggunaan: authorize('admin')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak memiliki izin untuk aksi ini.',
      });
    }

    next();
  };
}

module.exports = { authorize };
