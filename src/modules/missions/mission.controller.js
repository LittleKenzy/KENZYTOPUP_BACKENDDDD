// ============================================
// Mission Controller — Handle HTTP req/res misi harian
// ============================================

const missionService = require('./mission.service');

// ─── GET /api/missions/daily/status ─────────
// Cek apakah user sudah menyelesaikan misi hari ini
async function getDailyStatus(req, res, next) {
  try {
    const status = await missionService.getDailyStatus(req.user.userId);

    return res.status(200).json({
      success: true,
      message: 'Status misi harian berhasil diambil.',
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/missions/daily/claim ─────────
// Klaim poin setelah user konfirmasi share
async function claimDailyMission(req, res, next) {
  try {
    const { channel } = req.body;

    if (!channel) {
      return res.status(400).json({
        success: false,
        message: 'Channel wajib diisi (whatsapp, instagram, tiktok, atau copy).',
      });
    }

    const result = await missionService.claimDailyMission(
      req.user.userId,
      channel
    );

    return res.status(201).json({
      success: result.success,
      message: result.message,
      data: {
        points: result.points,
        currentPoints: result.currentPoints,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── ADMIN: GET /api/admin/missions/logs ────
async function getTodayLogs(req, res, next) {
  try {
    const logs = await missionService.getTodayLogs();

    return res.status(200).json({
      success: true,
      message: 'Log misi hari ini berhasil diambil.',
      data: logs,
    });
  } catch (error) {
    next(error);
  }
}

// ─── ADMIN: DELETE /api/admin/missions/reset ─
async function resetTodayMissions(req, res, next) {
  try {
    const result = await missionService.resetTodayMissions();

    return res.status(200).json({
      success: true,
      message: `Berhasil mereset ${result.deletedCount} misi hari ini.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDailyStatus,
  claimDailyMission,
  getTodayLogs,
  resetTodayMissions,
};
