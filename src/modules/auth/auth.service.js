// ============================================
// Auth Service — Business logic untuk autentikasi
// ============================================

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../../config/db');
const { signAccessToken, signRefreshToken, verifyRefreshToken, parseDurationToMs } = require('../../config/jwt');
const env = require('../../config/env');
const { AppError } = require('../../middleware/errorHandler');

const SALT_ROUNDS = 12;

// ─── REGISTER ────────────────────────────────
async function register({ name, phone, email, password }) {
  // Cek apakah email sudah terdaftar
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new AppError('Email sudah terdaftar.', 409);
    }
    throw new AppError('Nomor HP sudah terdaftar.', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Buat user baru
  const user = await prisma.user.create({
    data: {
      name,
      phone,
      email,
      password: hashedPassword,
      role: 'user', // Default role: user biasa
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

// ─── LOGIN ───────────────────────────────────
async function login({ email, password }) {
  // Cari user berdasarkan email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError('Email atau password salah.', 401);
  }

  // Verifikasi password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Email atau password salah.', 401);
  }

  // Buat access token & refresh token
  const accessToken = signAccessToken({ userId: user.id, role: user.role });

  // Buat refresh token unik dan simpan di database
  const refreshTokenValue = signRefreshToken({ userId: user.id, tokenId: crypto.randomUUID() });
  const refreshExpiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN));

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    accessToken,
    refreshToken: refreshTokenValue,
  };
}

// ─── REFRESH TOKEN ───────────────────────────
async function refreshAccessToken(refreshToken) {
  // Verifikasi JWT refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Refresh token tidak valid atau sudah kadaluarsa.', 401);
  }

  // Cek apakah token masih ada di database (belum di-revoke/logout)
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!storedToken) {
    throw new AppError('Refresh token sudah tidak berlaku. Silakan login ulang.', 401);
  }

  // Cek apakah token sudah expired di database
  if (new Date() > storedToken.expiresAt) {
    // Hapus token expired
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    throw new AppError('Refresh token sudah kadaluarsa. Silakan login ulang.', 401);
  }

  // Buat access token baru
  const newAccessToken = signAccessToken({
    userId: storedToken.user.id,
    role: storedToken.user.role,
  });

  return { accessToken: newAccessToken };
}

// ─── LOGOUT ──────────────────────────────────
async function logout(refreshToken) {
  // Hapus refresh token dari database (revoke)
  const deleted = await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });

  if (deleted.count === 0) {
    throw new AppError('Refresh token tidak ditemukan.', 404);
  }

  return true;
}

// ─── GET CURRENT USER ────────────────────────
async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('User tidak ditemukan.', 404);
  }

  return user;
}

// ─── REQUEST PASSWORD RESET ──────────────────
// Buat token reset password dan simpan di database
// Token berlaku 15 menit
async function requestPasswordReset(email) {
  // Cari user berdasarkan email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Selalu response sukses (hindari email enumeration attack)
  if (!user) {
    return { message: 'Jika email terdaftar, link reset password akan dikirimkan.' };
  }

  // Invalidasi semua token reset lama milik user ini
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, isUsed: false },
    data: { isUsed: true },
  });

  // Generate token acak (64 karakter hex)
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Token berlaku 15 menit
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Simpan token ke database
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt,
    },
  });

  // Kirim email reset password ke user
  const { sendPasswordResetEmail } = require('../../config/email');

  try {
    await sendPasswordResetEmail(user.email, user.name, resetToken);
  } catch (emailError) {
    console.error('❌ Gagal kirim email reset password:', emailError.message);
    // Jangan throw error ke user — tetap kasih response sukses
    // Token sudah tersimpan, bisa dipakai jika email retry berhasil
  }

  return {
    message: 'Jika email terdaftar, link reset password akan dikirimkan.',
  };
}

// ─── VERIFY RESET TOKEN ─────────────────────
// Validasi apakah token reset masih berlaku
async function verifyResetToken(token) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!resetToken) {
    throw new AppError('Token reset password tidak valid.', 400);
  }

  if (resetToken.isUsed) {
    throw new AppError('Token reset password sudah digunakan.', 400);
  }

  if (new Date() > resetToken.expiresAt) {
    throw new AppError('Token reset password sudah kadaluarsa. Silakan request ulang.', 400);
  }

  return {
    valid: true,
    email: resetToken.user.email,
    name: resetToken.user.name,
  };
}

// ─── RESET PASSWORD ─────────────────────────
// Ganti password user berdasarkan token reset yang valid
async function resetPassword(token, newPassword) {
  // Cari token di database
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken) {
    throw new AppError('Token reset password tidak valid.', 400);
  }

  if (resetToken.isUsed) {
    throw new AppError('Token reset password sudah digunakan.', 400);
  }

  if (new Date() > resetToken.expiresAt) {
    throw new AppError('Token reset password sudah kadaluarsa. Silakan request ulang.', 400);
  }

  // Hash password baru
  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password user + tandai token sebagai sudah dipakai
  await prisma.$transaction([
    // Update password
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    // Tandai token sebagai sudah dipakai
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { isUsed: true },
    }),
    // Hapus semua refresh token user (paksa logout dari semua sesi)
    prisma.refreshToken.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  return {
    message: 'Password berhasil diubah. Silakan login dengan password baru.',
  };
}

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
};
