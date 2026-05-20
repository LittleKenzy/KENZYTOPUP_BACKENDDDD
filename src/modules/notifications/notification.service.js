// ============================================
// Notification Service — Log in-app notifications
// ============================================

const prisma = require('../../config/db');

/**
 * Buat notifikasi baru untuk user
 */
async function createNotification(userId, { type, title, body, data }) {
  return await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: data ? JSON.stringify(data) : null,
    },
  });
}

/**
 * Broadcast notifikasi ke semua user (untuk Flash Sale)
 */
async function broadcastNotification({ type, title, body, data }) {
  // Ambil semua user IDs
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  if (users.length === 0) return { count: 0 };

  const dataStr = data ? JSON.stringify(data) : null;

  const notifications = users.map((user) => ({
    userId: user.id,
    type,
    title,
    body,
    data: dataStr,
  }));

  // Batch insert
  const result = await prisma.notification.createMany({
    data: notifications,
  });

  return result;
}

/**
 * Ambil list notifikasi user (paginated)
 */
async function listNotifications(userId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({
      where: { userId },
    }),
  ]);

  return {
    items: items.map(item => ({
      ...item,
      data: item.data ? JSON.parse(item.data) : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Hitung notifikasi belum dibaca
 */
async function countUnread(userId) {
  return await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

/**
 * Ambil 5 notifikasi unread terbaru untuk dropdown bell
 */
async function getRecentNotifications(userId) {
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return items.map(item => ({
    ...item,
    data: item.data ? JSON.parse(item.data) : null,
  }));
}

/**
 * Tandai satu notifikasi sudah dibaca
 */
async function markAsRead(notificationId, userId) {
  return await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      isRead: true,
    },
  });
}

/**
 * Tandai SEMUA notifikasi user sudah dibaca
 */
async function markAllAsRead(userId) {
  return await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}

module.exports = {
  createNotification,
  broadcastNotification,
  listNotifications,
  countUnread,
  getRecentNotifications,
  markAsRead,
  markAllAsRead,
};
