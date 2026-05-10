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

module.exports = { register, login, refreshAccessToken, logout, getMe };
