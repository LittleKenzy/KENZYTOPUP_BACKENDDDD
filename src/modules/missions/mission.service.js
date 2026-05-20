// ============================================
// Mission Service — Logika bisnis misi harian
// ============================================

const prisma = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const {
  MISSION_POINTS,
  TIMEZONE_OFFSET,
  VALID_CHANNELS,
} = require('../../config/missionConfig');
const pushService = require('../push/push.service');
const notificationService = require('../notifications/notification.service');

/**
 * Hitung tanggal hari ini berdasarkan WIB (UTC+7)
 * Return format: "YYYY-MM-DD"
 */
function getTodayWIB() {
  const now = new Date();
  // Tambah offset WIB ke UTC
  const wibTime = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
  return wibTime.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

/**
 * Hitung waktu reset berikutnya (00:00 WIB besok) dalam ISO string
 */
function getNextResetISO() {
  const today = getTodayWIB();
  // Besok 00:00 WIB = besok 00:00 UTC+7 = hari ini 17:00 UTC + 1 hari
  const [year, month, day] = today.split('-').map(Number);
  const tomorrowWIB = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
  // Kurangi offset WIB untuk mendapat UTC
  tomorrowWIB.setHours(tomorrowWIB.getHours() - TIMEZONE_OFFSET);
  return tomorrowWIB.toISOString();
}

// ─── GET DAILY STATUS ───────────────────────
// Cek apakah user sudah menyelesaikan misi hari ini
async function getDailyStatus(userId) {
  const todayWIB = getTodayWIB();

  // Cek apakah ada log misi hari ini
  const todayLog = await prisma.missionLog.findUnique({
    where: {
      userId_missionDate: {
        userId,
        missionDate: todayWIB,
      },
    },
  });

  // Ambil total poin user dari tabel LoyaltyPoints
  let loyalty = await prisma.loyaltyPoints.findUnique({
    where: { userId },
  });

  // Auto-create jika belum ada
  if (!loyalty) {
    loyalty = await prisma.loyaltyPoints.create({
      data: { userId },
    });
  }

  return {
    completed: !!todayLog,
    pointsEarned: todayLog ? todayLog.points : 0,
    resetAt: getNextResetISO(),
    totalPoints: loyalty.currentPoints,
  };
}

// ─── CLAIM DAILY MISSION ────────────────────
// Klaim poin setelah user konfirmasi share
async function claimDailyMission(userId, channel) {
  // 1. Validasi channel
  if (!VALID_CHANNELS.includes(channel)) {
    throw new AppError(
      `Channel tidak valid. Pilih salah satu: ${VALID_CHANNELS.join(', ')}`,
      400
    );
  }

  const todayWIB = getTodayWIB();

  // 2. Cek apakah misi hari ini sudah diklaim
  const existingLog = await prisma.missionLog.findUnique({
    where: {
      userId_missionDate: {
        userId,
        missionDate: todayWIB,
      },
    },
  });

  if (existingLog) {
    throw new AppError('Misi sudah diselesaikan hari ini.', 400);
  }

  // 3. Atomic transaction: insert mission log + tambah poin
  const [missionLog, updatedLoyalty] = await prisma.$transaction([
    // Insert log misi
    prisma.missionLog.create({
      data: {
        userId,
        missionDate: todayWIB,
        channel,
        points: MISSION_POINTS,
      },
    }),
    // Upsert poin ke LoyaltyPoints (increment)
    prisma.loyaltyPoints.upsert({
      where: { userId },
      update: {
        totalPoints: { increment: MISSION_POINTS },
        currentPoints: { increment: MISSION_POINTS },
      },
      create: {
        userId,
        totalPoints: MISSION_POINTS,
        currentPoints: MISSION_POINTS,
      },
    }),
  ]);

  console.log(
    `🎯 Misi harian selesai: user ${userId} klaim ${MISSION_POINTS} poin via ${channel}`
  );

  // Kirim push notification ke user (fire-and-forget)
  try {
    await pushService.sendPushToUser(userId, {
      title: '🎁 Poin Masuk!',
      body: `+${MISSION_POINTS} poin dari misi harian! Total poin kamu sekarang ${updatedLoyalty.currentPoints} poin.`,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'points_earned',
        source: 'daily_mission',
        url: '/missions',
      },
    });

    // Simpan notifikasi in-app
    await notificationService.createNotification(userId, {
      type: 'points',
      title: '🎁 Poin Masuk!',
      body: `+${MISSION_POINTS} poin dari misi harian!`,
      data: { url: '/missions' },
    });
  } catch (pushErr) {
    console.warn(`⚠️ Push notification gagal: ${pushErr.message}`);
  }

  return {
    success: true,
    points: missionLog.points,
    message: 'Poin berhasil ditambahkan!',
    currentPoints: updatedLoyalty.currentPoints,
  };
}

// ─── ADMIN: GET TODAY'S MISSION LOGS ──────────
async function getTodayLogs() {
  const todayWIB = getTodayWIB();
  const logs = await prisma.missionLog.findMany({
    where: { missionDate: todayWIB },
    include: {
      user: {
        select: { id: true, name: true, phone: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  return logs;
}

// ─── ADMIN: RESET TODAY'S MISSIONS ────────────
async function resetTodayMissions() {
  const todayWIB = getTodayWIB();
  const result = await prisma.missionLog.deleteMany({
    where: { missionDate: todayWIB }
  });
  
  return { deletedCount: result.count };
}

module.exports = {
  getDailyStatus,
  claimDailyMission,
  getTodayWIB,
  getNextResetISO,
  getTodayLogs,
  resetTodayMissions,
};
