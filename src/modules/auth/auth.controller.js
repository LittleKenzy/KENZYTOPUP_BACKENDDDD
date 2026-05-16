// ============================================
// Auth Controller — Handle HTTP request/response
// ============================================

const authService = require('./auth.service');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  verifyResetTokenSchema,
  resetPasswordSchema,
} = require('./auth.validation');

// ─── POST /api/auth/register ─────────────────
async function register(req, res, next) {
  try {
    // Validasi input dengan Zod
    const validated = registerSchema.parse(req.body);

    const user = await authService.register(validated);

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Silakan login.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/auth/login ────────────────────
async function login(req, res, next) {
  try {
    const validated = loginSchema.parse(req.body);

    const result = await authService.login(validated);

    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/auth/refresh ──────────────────
async function refresh(req, res, next) {
  try {
    const validated = refreshSchema.parse(req.body);

    const result = await authService.refreshAccessToken(validated.refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Access token berhasil diperbarui.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/auth/logout ───────────────────
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token wajib disertakan.',
      });
    }

    await authService.logout(refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Logout berhasil. Refresh token telah dihapus.',
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/auth/me ────────────────────────
async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.userId);

    return res.status(200).json({
      success: true,
      message: 'Data user berhasil diambil.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/auth/forgot-password ──────────
async function forgotPassword(req, res, next) {
  try {
    const validated = forgotPasswordSchema.parse(req.body);

    const result = await authService.requestPasswordReset(validated.email);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/auth/verify-reset-token ───────
async function verifyResetToken(req, res, next) {
  try {
    const validated = verifyResetTokenSchema.parse(req.body);

    const result = await authService.verifyResetToken(validated.token);

    return res.status(200).json({
      success: true,
      message: 'Token reset password valid.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/auth/reset-password ───────────
async function resetPassword(req, res, next) {
  try {
    const validated = resetPasswordSchema.parse(req.body);

    const result = await authService.resetPassword(validated.token, validated.newPassword);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  forgotPassword,
  verifyResetToken,
  resetPassword,
};
