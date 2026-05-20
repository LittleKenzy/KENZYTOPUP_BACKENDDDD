// ============================================
// Loyalty Service — Sistem poin & redeem diskon
// ============================================

const crypto = require('crypto');
const prisma = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const pushService = require('../push/push.service');
const notificationService = require('../notifications/notification.service');

// ─── GET OR CREATE LOYALTY CONFIG ───────────
// Pastikan selalu ada config (singleton)
async function getOrCreateConfig() {
  let config = await prisma.loyaltyConfig.findUnique({
    where: { id: 'loyalty-config' },
  });

  if (!config) {
    config = await prisma.loyaltyConfig.create({
      data: { id: 'loyalty-config' },
    });
  }

  return config;
}

// ─── GET LOYALTY CONFIG (public/admin) ──────
async function getLoyaltyConfig() {
  return getOrCreateConfig();
}

// ─── UPDATE LOYALTY CONFIG (admin) ──────────
async function updateLoyaltyConfig(data) {
  const config = await getOrCreateConfig();

  const updateData = {};
  if (data.pointsPerThousand !== undefined) {
    updateData.pointsPerThousand = parseInt(data.pointsPerThousand, 10);
    if (updateData.pointsPerThousand < 0) {
      throw new AppError('Poin per Rp1.000 tidak boleh negatif.', 400);
    }
  }
  if (data.pointValue !== undefined) {
    updateData.pointValue = parseInt(data.pointValue, 10);
    if (updateData.pointValue < 1) {
      throw new AppError('Nilai poin minimal Rp1.', 400);
    }
  }
  if (data.minRedeemPoints !== undefined) {
    updateData.minRedeemPoints = parseInt(data.minRedeemPoints, 10);
    if (updateData.minRedeemPoints < 1) {
      throw new AppError('Minimum redeem minimal 1 poin.', 400);
    }
  }
  if (data.redeemExpiryDays !== undefined) {
    updateData.redeemExpiryDays = parseInt(data.redeemExpiryDays, 10);
    if (updateData.redeemExpiryDays < 1) {
      throw new AppError('Masa berlaku kode diskon minimal 1 hari.', 400);
    }
  }
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive === true || data.isActive === 'true';
  }

  const updated = await prisma.loyaltyConfig.update({
    where: { id: 'loyalty-config' },
    data: updateData,
  });

  return updated;
}

// ─── GET USER POINTS ────────────────────────
async function getUserPoints(userId) {
  let loyalty = await prisma.loyaltyPoints.findUnique({
    where: { userId },
  });

  // Auto-create jika belum ada
  if (!loyalty) {
    loyalty = await prisma.loyaltyPoints.create({
      data: { userId },
    });
  }

  return loyalty;
}

// ─── AWARD POINTS ───────────────────────────
// Dipanggil saat transaksi berhasil (status SUCCESS)
async function awardPoints(userId, totalPrice, transactionId) {
  const config = await getOrCreateConfig();

  // Jika sistem poin tidak aktif, skip
  if (!config.isActive) {
    return null;
  }

  // Hitung poin: totalPrice / 1000 * pointsPerThousand
  const pointsEarned = Math.floor((totalPrice / 1000) * config.pointsPerThousand);

  if (pointsEarned <= 0) {
    return null;
  }

  // Update saldo poin user (upsert)
  const loyalty = await prisma.loyaltyPoints.upsert({
    where: { userId },
    update: {
      totalPoints: { increment: pointsEarned },
      currentPoints: { increment: pointsEarned },
    },
    create: {
      userId,
      totalPoints: pointsEarned,
      currentPoints: pointsEarned,
    },
  });

  // Update transaksi dengan poin yang didapat
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { pointsEarned },
  });

  console.log(
    `🎁 Poin diberikan: ${pointsEarned} poin ke user ${userId} (Rp${totalPrice.toLocaleString()})`
  );

  // Kirim push notification ke user (fire-and-forget)
  try {
    await pushService.sendPushToUser(userId, {
      title: '🎁 Poin Masuk!',
      body: `+${pointsEarned} poin dari transaksi! Total poin kamu sekarang ${loyalty.currentPoints} poin.`,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'points_earned',
        source: 'transaction',
        transactionId,
        url: '/loyalty',
      },
    });

    // Simpan notifikasi in-app
    await notificationService.createNotification(userId, {
      type: 'points',
      title: '🎁 Poin Masuk!',
      body: `+${pointsEarned} poin dari transaksi!`,
      data: { transactionId, url: '/loyalty' },
    });
  } catch (pushErr) {
    console.warn(`⚠️ Push notification gagal: ${pushErr.message}`);
  }

  return { pointsEarned, currentPoints: loyalty.currentPoints };
}

// ─── REDEEM POINTS ──────────────────────────
// User menukar poin untuk mendapat kode diskon
async function redeemPoints(userId, pointsToRedeem) {
  const config = await getOrCreateConfig();

  if (!config.isActive) {
    throw new AppError('Sistem poin sedang tidak aktif.', 400);
  }

  // Validasi minimum redeem
  if (pointsToRedeem < config.minRedeemPoints) {
    throw new AppError(
      `Minimum penukaran poin adalah ${config.minRedeemPoints} poin.`,
      400
    );
  }

  // Cek saldo poin user
  const loyalty = await getUserPoints(userId);

  if (loyalty.currentPoints < pointsToRedeem) {
    throw new AppError(
      `Poin tidak cukup. Anda memiliki ${loyalty.currentPoints} poin, butuh ${pointsToRedeem} poin.`,
      400
    );
  }

  // Hitung nilai diskon
  const discountAmount = pointsToRedeem * config.pointValue;

  // Generate kode diskon unik
  const discountCode = `KNZ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // Hitung tanggal kadaluarsa
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.redeemExpiryDays);

  // Transaction: kurangi poin + buat redemption record
  const [updatedLoyalty, redemption] = await prisma.$transaction([
    prisma.loyaltyPoints.update({
      where: { userId },
      data: {
        currentPoints: { decrement: pointsToRedeem },
      },
    }),
    prisma.pointRedemption.create({
      data: {
        userId,
        pointsUsed: pointsToRedeem,
        discountAmount,
        discountCode,
        expiresAt,
      },
    }),
  ]);

  console.log(
    `🎟️ Poin ditukar: ${pointsToRedeem} poin → diskon Rp${discountAmount.toLocaleString()} (${discountCode})`
  );

  return {
    redemption,
    remainingPoints: updatedLoyalty.currentPoints,
  };
}

// ─── VALIDATE DISCOUNT CODE ────────────────
// Validasi kode diskon saat checkout
async function validateDiscountCode(discountCode, userId) {
  const redemption = await prisma.pointRedemption.findUnique({
    where: { discountCode },
  });

  if (!redemption) {
    throw new AppError('Kode diskon tidak ditemukan.', 404);
  }

  if (redemption.userId !== userId) {
    throw new AppError('Kode diskon ini bukan milik Anda.', 403);
  }

  if (redemption.isUsed) {
    throw new AppError('Kode diskon sudah pernah digunakan.', 400);
  }

  if (new Date() > redemption.expiresAt) {
    throw new AppError('Kode diskon sudah kadaluarsa.', 400);
  }

  return redemption;
}

// ─── MARK DISCOUNT CODE AS USED ─────────────
async function useDiscountCode(discountCode) {
  const redemption = await prisma.pointRedemption.update({
    where: { discountCode },
    data: { isUsed: true },
  });

  return redemption;
}

// ─── GET USER REDEMPTION HISTORY ────────────
async function getUserRedemptions(userId) {
  const redemptions = await prisma.pointRedemption.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return redemptions;
}

// ─── ADMIN: GET ALL USERS LOYALTY LEADERBOARD ─
async function getLoyaltyLeaderboard() {
  const leaderboard = await prisma.loyaltyPoints.findMany({
    orderBy: { totalPoints: 'desc' },
    take: 50,
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  return leaderboard;
}

// ─── ADMIN: GET LOYALTY STATS ──────────────
async function getLoyaltyStats() {
  const [totalUsers, totalPointsIssued, totalRedemptions, activeRedemptions] =
    await Promise.all([
      prisma.loyaltyPoints.count(),
      prisma.loyaltyPoints.aggregate({ _sum: { totalPoints: true } }),
      prisma.pointRedemption.count(),
      prisma.pointRedemption.count({ where: { isUsed: false } }),
    ]);

  return {
    totalUsersWithPoints: totalUsers,
    totalPointsIssued: totalPointsIssued._sum.totalPoints || 0,
    totalRedemptions,
    activeRedemptions,
  };
}

module.exports = {
  getLoyaltyConfig,
  updateLoyaltyConfig,
  getUserPoints,
  awardPoints,
  redeemPoints,
  validateDiscountCode,
  useDiscountCode,
  getUserRedemptions,
  getLoyaltyLeaderboard,
  getLoyaltyStats,
};
