// ============================================
// Blast Controller — Admin WA Blast Management
// Admin bisa pilih kirim ke user tertentu atau semua
// ============================================

const blastService = require('../flashsale/blast.service');
const waBlastService = require('./wa-blast.service');

// ─── GET /api/admin/blast/users — Daftar user yang bisa di-blast ─
async function getBlastableUsers(req, res, next) {
  try {
    const { search, waVerified } = req.query;

    const users = await waBlastService.getBlastableUsers({
      search: search || '',
      waVerified: waVerified === 'false' ? false : true,
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar user berhasil diambil.',
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/admin/blast/send — Kirim WA blast ─
// Body (JSON): message, userIds ("all" | JSON array string)
async function sendBlast(req, res, next) {
  try {
    const { message, userIds, flashSaleId } = req.body;

    // Validasi input
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pesan WA wajib diisi.',
      });
    }

    if (!userIds) {
      return res.status(400).json({
        success: false,
        message: 'Target user wajib diisi. Kirim "all" untuk semua user atau array user IDs.',
      });
    }

    // Parse userIds — bisa "all" (string) atau JSON array string dari form-data
    let parsedUserIds = userIds;
    if (typeof userIds === 'string' && userIds !== 'all') {
      try {
        parsedUserIds = JSON.parse(userIds);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Format userIds tidak valid. Kirim "all" atau JSON array.',
        });
      }
    }

    const result = await waBlastService.sendCustomBlast({
      message: message.trim(),
      userIds: parsedUserIds,
      flashSaleId: flashSaleId || null,
      adminId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: `WA blast dikirim ke ${result.queued} user.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/blast/history — History blast (grouped) ─
async function getBlastHistory(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;

    const history = await waBlastService.getBlastHistory({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.status(200).json({
      success: true,
      message: 'History blast berhasil diambil.',
      data: history,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/blast/history/:id — Detail blast tertentu ─
async function getBlastDetail(req, res, next) {
  try {
    const detail = await waBlastService.getBlastDetail(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Detail blast berhasil diambil.',
      data: detail,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBlastableUsers,
  sendBlast,
  getBlastHistory,
  getBlastDetail,
};
