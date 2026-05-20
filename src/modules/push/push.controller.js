// ============================================
// Push Controller — Handle HTTP req/res push notification
// ============================================

const pushService = require('./push.service');
const { subscribeSchema, unsubscribeSchema } = require('./push.validation');

// ─── GET /api/push/vapid-key — Public: ambil VAPID public key ─
// Frontend butuh key ini untuk PushManager.subscribe()
async function getVapidKey(req, res, next) {
  try {
    const publicKey = pushService.getVapidPublicKey();

    if (!publicKey) {
      return res.status(503).json({
        success: false,
        message: 'Push notification belum dikonfigurasi di server.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'VAPID public key berhasil diambil.',
      data: { publicKey },
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/push/subscribe — User: simpan subscription ─
async function subscribe(req, res, next) {
  try {
    const validated = subscribeSchema.parse(req.body);

    const result = await pushService.subscribe(
      req.user.userId,
      validated.subscription
    );

    return res.status(201).json({
      success: true,
      message: 'Berhasil subscribe push notification.',
      data: {
        id: result.id,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── DELETE /api/push/unsubscribe — User: hapus subscription ─
async function unsubscribe(req, res, next) {
  try {
    const validated = unsubscribeSchema.parse(req.body);

    const result = await pushService.unsubscribe(
      req.user.userId,
      validated.endpoint
    );

    if (!result.deleted) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getVapidKey,
  subscribe,
  unsubscribe,
};
