// ============================================
// Loyalty Controller — Handle HTTP req/res poin
// ============================================

const loyaltyService = require('./loyalty.service');

// ═══════════════════════════════════════════════
// PUBLIC / USER ENDPOINTS
// ═══════════════════════════════════════════════

// ─── GET /api/loyalty/config — Public: ambil pengaturan poin ─
async function getLoyaltyConfig(req, res, next) {
  try {
    const config = await loyaltyService.getLoyaltyConfig();

    return res.status(200).json({
      success: true,
      message: 'Pengaturan loyalty berhasil diambil.',
      data: config,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/loyalty/my-points — User: lihat saldo poin ─
async function getMyPoints(req, res, next) {
  try {
    const points = await loyaltyService.getUserPoints(req.user.userId);

    return res.status(200).json({
      success: true,
      message: 'Saldo poin berhasil diambil.',
      data: points,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/loyalty/redeem — User: tukar poin ─
async function redeemPoints(req, res, next) {
  try {
    const { points } = req.body;

    if (!points || typeof points !== 'number' || points < 1) {
      return res.status(400).json({
        success: false,
        message: 'Jumlah poin harus berupa angka positif.',
      });
    }

    const result = await loyaltyService.redeemPoints(req.user.userId, points);

    return res.status(201).json({
      success: true,
      message: `Berhasil menukar ${points} poin! Kode diskon Anda: ${result.redemption.discountCode}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/loyalty/validate-code — User: validasi kode diskon ─
async function validateDiscountCode(req, res, next) {
  try {
    const { discountCode } = req.body;

    if (!discountCode) {
      return res.status(400).json({
        success: false,
        message: 'Kode diskon wajib diisi.',
      });
    }

    const redemption = await loyaltyService.validateDiscountCode(
      discountCode,
      req.user.userId
    );

    return res.status(200).json({
      success: true,
      message: `Kode diskon valid! Diskon Rp${redemption.discountAmount.toLocaleString()}`,
      data: redemption,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/loyalty/my-redemptions — User: riwayat penukaran ─
async function getMyRedemptions(req, res, next) {
  try {
    const redemptions = await loyaltyService.getUserRedemptions(req.user.userId);

    return res.status(200).json({
      success: true,
      message: 'Riwayat penukaran poin berhasil diambil.',
      data: redemptions,
    });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════

// ─── PUT /api/admin/loyalty/config — Admin: update pengaturan ─
async function updateLoyaltyConfig(req, res, next) {
  try {
    const config = await loyaltyService.updateLoyaltyConfig(req.body);

    return res.status(200).json({
      success: true,
      message: 'Pengaturan loyalty berhasil diperbarui.',
      data: config,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/loyalty/stats — Admin: statistik poin ─
async function getLoyaltyStats(req, res, next) {
  try {
    const stats = await loyaltyService.getLoyaltyStats();

    return res.status(200).json({
      success: true,
      message: 'Statistik loyalty berhasil diambil.',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/loyalty/leaderboard — Admin: top user ─
async function getLoyaltyLeaderboard(req, res, next) {
  try {
    const leaderboard = await loyaltyService.getLoyaltyLeaderboard();

    return res.status(200).json({
      success: true,
      message: 'Leaderboard loyalty berhasil diambil.',
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLoyaltyConfig,
  getMyPoints,
  redeemPoints,
  validateDiscountCode,
  getMyRedemptions,
  updateLoyaltyConfig,
  getLoyaltyStats,
  getLoyaltyLeaderboard,
};
