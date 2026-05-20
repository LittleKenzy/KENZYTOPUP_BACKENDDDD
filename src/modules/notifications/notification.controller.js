// ============================================
// Notification Controller — Req/Res logic
// ============================================

const notificationService = require('./notification.service');

async function getMyNotifications(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await notificationService.listNotifications(req.user.userId, { page, limit });

    return res.status(200).json({
      success: true,
      message: 'Notifikasi berhasil diambil.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const unreadCount = await notificationService.countUnread(req.user.userId);
    const recent = await notificationService.getRecentNotifications(req.user.userId);

    return res.status(200).json({
      success: true,
      data: {
        unreadCount,
        recent,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    await notificationService.markAsRead(id, req.user.userId);

    return res.status(200).json({
      success: true,
      message: 'Notifikasi ditandai dibaca.',
    });
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await notificationService.markAllAsRead(req.user.userId);

    return res.status(200).json({
      success: true,
      message: 'Semua notifikasi ditandai dibaca.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
