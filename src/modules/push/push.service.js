// ============================================
// Push Service — Web Push Notification (VAPID)
// Terpusat: semua push notification lewat service ini
// ============================================

const webpush = require('web-push');
const prisma = require('../../config/db');

// ─── SETUP VAPID ────────────────────────────
// VAPID keys harus di-generate sekali lalu disimpan di .env
// Generate: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:admin@kenzystore.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('🔔 Web Push VAPID configured successfully');
} else {
  console.warn('⚠️ VAPID keys not configured — push notifications disabled');
}

// ─── HELPER: Check if VAPID is ready ────────
function isVapidReady() {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

// ─── GET VAPID PUBLIC KEY ───────────────────
// Frontend butuh public key untuk subscribe
function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY || null;
}

// ─── SUBSCRIBE ──────────────────────────────
// Simpan subscription browser ke database
async function subscribe(userId, subscriptionData) {
  const subscriptionStr = JSON.stringify(subscriptionData);
  const endpoint = subscriptionData.endpoint;

  // Upsert: jika endpoint sudah ada, update. Jika belum, buat baru.
  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      userId,
      subscription: subscriptionStr,
    },
    create: {
      userId,
      endpoint,
      subscription: subscriptionStr,
    },
  });

  console.log(`🔔 Push subscription saved for user ${userId}`);
  return subscription;
}

// ─── UNSUBSCRIBE ────────────────────────────
// Hapus subscription berdasarkan endpoint
async function unsubscribe(userId, endpoint) {
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint },
  });

  if (!existing) {
    return { deleted: false, message: 'Subscription tidak ditemukan.' };
  }

  // Pastikan subscription milik user ini
  if (existing.userId !== userId) {
    return { deleted: false, message: 'Subscription bukan milik Anda.' };
  }

  await prisma.pushSubscription.delete({
    where: { endpoint },
  });

  console.log(`🔕 Push subscription removed for user ${userId}`);
  return { deleted: true, message: 'Berhasil unsubscribe dari push notification.' };
}

// ─── SEND PUSH TO SINGLE USER ───────────────
// Kirim push notification ke semua device user tertentu
async function sendPushToUser(userId, payload) {
  if (!isVapidReady()) {
    console.warn('⚠️ VAPID not configured, skipping push to user', userId);
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payloadStr = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const expiredEndpoints = [];

  for (const sub of subscriptions) {
    try {
      const parsedSub = JSON.parse(sub.subscription);
      await webpush.sendNotification(parsedSub, payloadStr);
      sent++;
    } catch (err) {
      failed++;
      // 410 Gone = subscription expired, hapus dari database
      if (err.statusCode === 410 || err.statusCode === 404) {
        expiredEndpoints.push(sub.endpoint);
      } else {
        console.error(`❌ Push failed for endpoint ${sub.endpoint}:`, err.message);
      }
    }
  }

  // Cleanup expired subscriptions
  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    });
    console.log(`🧹 Cleaned up ${expiredEndpoints.length} expired push subscriptions`);
  }

  console.log(`🔔 Push to user ${userId}: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

// ─── SEND PUSH TO ALL SUBSCRIBERS ───────────
// Broadcast push notification ke semua user yang punya subscription
async function sendPushToAll(payload) {
  if (!isVapidReady()) {
    console.warn('⚠️ VAPID not configured, skipping broadcast push');
    return { sent: 0, failed: 0, total: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany();

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, total: 0 };
  }

  const payloadStr = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const expiredEndpoints = [];

  // Send in parallel with concurrency limit (avoid overwhelming)
  const BATCH_SIZE = 50;
  for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
    const batch = subscriptions.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (sub) => {
        const parsedSub = JSON.parse(sub.subscription);
        return webpush.sendNotification(parsedSub, payloadStr);
      })
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        const err = results[j].reason;
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.push(batch[j].endpoint);
        }
      }
    }
  }

  // Cleanup expired subscriptions
  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    });
    console.log(`🧹 Cleaned up ${expiredEndpoints.length} expired push subscriptions`);
  }

  console.log(`🔔 Broadcast push: ${sent} sent, ${failed} failed, ${subscriptions.length} total`);
  return { sent, failed, total: subscriptions.length };
}

module.exports = {
  isVapidReady,
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  sendPushToUser,
  sendPushToAll,
};
