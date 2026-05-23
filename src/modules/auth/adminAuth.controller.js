// ============================================
// Admin Auth Controller — 2FA OTP Login via WhatsApp
// ============================================
//
// Flow:
// 1. POST /admin/login     → validasi email+password → kirim OTP ke WA owner
// 2. POST /admin/verify-otp → validasi OTP → beri JWT
// 3. POST /admin/resend-otp → kirim ulang OTP (cooldown 60 detik)
// ============================================

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../../config/db');
const { signAccessToken, signRefreshToken, parseDurationToMs } = require('../../config/jwt');
const env = require('../../config/env');
const { AppError } = require('../../middleware/errorHandler');
const { generateOtp, hashOtp, verifyOtp } = require('../../utils/otp.utils');
const { sendWhatsApp } = require('../../utils/whatsapp');
const {
  adminLoginSchema,
  verifyOtpSchema,
  resendOtpSchema,
} = require('./adminAuth.validator');

// ─── Config ─────────────────────────────────
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;
const RESEND_COOLDOWN_SECONDS = 60;

// ─── Helper: Cleanup expired OTP sessions ───
// Dipanggil setiap kali ada login request untuk membersihkan sesi lama
async function cleanupExpiredOtpSessions() {
  try {
    await prisma.otpSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  } catch (error) {
    // Non-critical: log saja, jangan block request
    console.error('⚠️  Gagal cleanup OTP sessions:', error.message);
  }
}

// ─── Helper: Build OTP WA message ───────────
function buildOtpMessage(otp) {
  return `🔐 Kode OTP Admin Kenzy Store: ${otp}\nBerlaku ${OTP_EXPIRY_MINUTES} menit. Jangan berikan ke siapapun.`;
}

// ════════════════════════════════════════════
// Step 1: ADMIN LOGIN
// POST /api/auth/admin/login
// ════════════════════════════════════════════
async function adminLogin(req, res, next) {
  try {
    // Validasi input
    const { email, password } = adminLoginSchema.parse(req.body);

    // Cleanup expired OTP sessions (fire-and-forget)
    cleanupExpiredOtpSessions();

    // Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
      },
    });

    if (!user) {
      throw new AppError('Email atau password salah.', 401);
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Email atau password salah.', 401);
    }

    // Pastikan user adalah admin
    if (user.role !== 'admin') {
      throw new AppError('Akses ditolak. Hanya admin yang bisa login di sini.', 403);
    }

    // Hapus OTP sessions lama milik admin ini (cegah sesi ganda)
    await prisma.otpSession.deleteMany({
      where: { adminId: user.id },
    });

    // Generate OTP 6 digit
    const plainOtp = generateOtp();

    // Hash OTP sebelum disimpan ke database
    const hashedOtp = await hashOtp(plainOtp);

    // Generate session token (random UUID)
    const sessionToken = crypto.randomUUID();

    // Hitung expiry time
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Simpan OTP session ke database
    await prisma.otpSession.create({
      data: {
        sessionToken,
        hashedOtp,
        adminId: user.id,
        attempts: 0,
        expiresAt,
      },
    });

    // Kirim OTP ke WA owner (fire-and-forget)
    const ownerPhone = process.env.ADMIN_WA_NUMBER;
    if (ownerPhone) {
      const message = buildOtpMessage(plainOtp);
      console.log(`📤 Mengirim OTP ke WA admin: ${ownerPhone}`);
      sendWhatsApp(ownerPhone, message)
        .then((result) => {
          if (result && result.status) {
            console.log('✅ OTP berhasil dikirim ke WA admin');
          } else {
            console.error('❌ Fonnte response error:', JSON.stringify(result));
          }
        })
        .catch((err) => {
          console.error('❌ Gagal kirim OTP ke WA:', err.message);
        });
    } else {
      console.error('❌ ADMIN_WA_NUMBER belum diset di environment variables!');
    }

    // Response: TIDAK expose adminId atau info user
    return res.status(200).json({
      success: true,
      message: 'Kode OTP telah dikirim ke WhatsApp owner.',
      data: {
        sessionToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ════════════════════════════════════════════
// Step 2: VERIFY OTP
// POST /api/auth/admin/verify-otp
// ════════════════════════════════════════════
async function verifyOtpHandler(req, res, next) {
  try {
    // Validasi input
    const { sessionToken, otp } = verifyOtpSchema.parse(req.body);

    // Cari OTP session berdasarkan sessionToken
    const otpSession = await prisma.otpSession.findUnique({
      where: { sessionToken },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    // Session tidak ditemukan
    if (!otpSession) {
      throw new AppError('Sesi tidak valid.', 400);
    }

    // Session sudah expired
    if (new Date() > otpSession.expiresAt) {
      // Hapus session expired
      await prisma.otpSession.delete({
        where: { id: otpSession.id },
      });
      throw new AppError('Kode OTP sudah kadaluarsa, silakan login ulang.', 400);
    }

    // Cek apakah sudah melebihi max attempts
    if (otpSession.attempts >= MAX_OTP_ATTEMPTS) {
      // Hapus session
      await prisma.otpSession.delete({
        where: { id: otpSession.id },
      });
      throw new AppError('Terlalu banyak percobaan, silakan login ulang.', 400);
    }

    // Verifikasi OTP
    const isOtpValid = await verifyOtp(otp, otpSession.hashedOtp);

    if (!isOtpValid) {
      // Increment attempt counter
      const updatedSession = await prisma.otpSession.update({
        where: { id: otpSession.id },
        data: { attempts: { increment: 1 } },
      });

      // Cek apakah setelah increment sudah mencapai max
      if (updatedSession.attempts >= MAX_OTP_ATTEMPTS) {
        await prisma.otpSession.delete({
          where: { id: otpSession.id },
        });
        throw new AppError('Terlalu banyak percobaan, silakan login ulang.', 400);
      }

      const remaining = MAX_OTP_ATTEMPTS - updatedSession.attempts;
      throw new AppError(
        `Kode OTP salah. Sisa percobaan: ${remaining}x.`,
        400
      );
    }

    // ── OTP BENAR — Beri JWT ──────────────────
    const admin = otpSession.admin;

    // Hapus OTP session dari database (sudah terpakai)
    await prisma.otpSession.delete({
      where: { id: otpSession.id },
    });

    // Buat access token (1 jam)
    const accessToken = signAccessToken({
      userId: admin.id,
      role: admin.role,
    });

    // Buat refresh token (7 hari) dan simpan di database
    const refreshTokenValue = signRefreshToken({
      userId: admin.id,
      tokenId: crypto.randomUUID(),
    });
    const refreshExpiresAt = new Date(
      Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN)
    );

    await prisma.refreshToken.create({
      data: {
        userId: admin.id,
        token: refreshTokenValue,
        expiresAt: refreshExpiresAt,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Verifikasi OTP berhasil. Login sukses.',
      data: {
        accessToken,
        refreshToken: refreshTokenValue,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ════════════════════════════════════════════
// Step 3: RESEND OTP
// POST /api/auth/admin/resend-otp
// ════════════════════════════════════════════
async function resendOtp(req, res, next) {
  try {
    // Validasi input
    const { sessionToken } = resendOtpSchema.parse(req.body);

    // Cari OTP session
    const otpSession = await prisma.otpSession.findUnique({
      where: { sessionToken },
    });

    if (!otpSession) {
      throw new AppError('Sesi tidak valid.', 400);
    }

    // Cek apakah session sudah expired
    if (new Date() > otpSession.expiresAt) {
      await prisma.otpSession.delete({
        where: { id: otpSession.id },
      });
      throw new AppError('Sesi sudah kadaluarsa, silakan login ulang.', 400);
    }

    // Cooldown check: hanya boleh resend setelah 60 detik dari OTP terakhir
    const timeSinceCreated = Date.now() - new Date(otpSession.createdAt).getTime();
    const cooldownMs = RESEND_COOLDOWN_SECONDS * 1000;

    if (timeSinceCreated < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - timeSinceCreated) / 1000);
      throw new AppError(
        `Tunggu ${remainingSeconds} detik sebelum mengirim ulang OTP.`,
        429
      );
    }

    // Generate OTP baru
    const plainOtp = generateOtp();
    const hashedOtp = await hashOtp(plainOtp);

    // Update session: OTP baru, reset attempts, perpanjang expiry, update createdAt
    const newExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otpSession.update({
      where: { id: otpSession.id },
      data: {
        hashedOtp,
        attempts: 0,
        expiresAt: newExpiresAt,
        createdAt: new Date(), // Reset createdAt untuk cooldown tracking
      },
    });

    // Kirim OTP baru ke WA owner (fire-and-forget)
    const ownerPhone = process.env.ADMIN_WA_NUMBER;
    if (ownerPhone) {
      const message = buildOtpMessage(plainOtp);
      sendWhatsApp(ownerPhone, message).catch((err) => {
        console.error('❌ Gagal kirim OTP resend ke WA:', err.message);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP baru telah dikirim.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  adminLogin,
  verifyOtp: verifyOtpHandler,
  resendOtp,
};
