// ============================================
// Flash Sale Controller — Handle HTTP req/res
// ============================================

const flashSaleService = require('./flashsale.service');
const blastService = require('./blast.service');

// ─── GET /api/flash-sales — Public: ambil flash sale aktif ─
async function getActiveFlashSales(req, res, next) {
  try {
    const flashSales = await flashSaleService.getActiveFlashSales();

    return res.status(200).json({
      success: true,
      message: 'Daftar flash sale aktif berhasil diambil.',
      data: flashSales,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/flash-sales — Admin: ambil semua ─
async function getAllFlashSales(req, res, next) {
  try {
    const flashSales = await flashSaleService.getAllFlashSales();

    return res.status(200).json({
      success: true,
      message: 'Daftar semua flash sale berhasil diambil.',
      data: flashSales,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/flash-sales/:id — Admin: detail ─
async function getFlashSaleById(req, res, next) {
  try {
    const flashSale = await flashSaleService.getFlashSaleById(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Detail flash sale berhasil diambil.',
      data: flashSale,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/admin/flash-sales — Admin: buat flash sale + trigger WA blast ─
async function createFlashSale(req, res, next) {
  try {
    const { title, description, discountPercent, productId, category, startAt, endAt, blastUserIds } = req.body;

    let parsedBlastUserIds = blastUserIds;
    // Parse blastUserIds if it's a JSON array string from form-data
    if (typeof blastUserIds === 'string' && blastUserIds !== 'all' && blastUserIds !== 'none') {
      try {
        parsedBlastUserIds = JSON.parse(blastUserIds);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Format blastUserIds tidak valid. Kirim "all", "none", atau JSON array.',
        });
      }
    }

    const { flashSale, blastStatus } = await flashSaleService.createFlashSale({
      title,
      description,
      discountPercent: parseInt(discountPercent, 10),
      productId: productId || null,
      category: category || null,
      startAt,
      endAt,
      blastUserIds: parsedBlastUserIds || 'all',
    });

    const blastMsg = blastStatus.total > 0
      ? ` WA blast dikirim ke ${blastStatus.total} user.`
      : blastUserIds === 'none'
        ? ' WA blast dilewati.'
        : '';

    return res.status(201).json({
      success: true,
      message: `Flash sale berhasil dibuat.${blastMsg}`,
      data: flashSale,
      blastStatus,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PUT /api/admin/flash-sales/:id — Admin: edit flash sale ─
async function updateFlashSale(req, res, next) {
  try {
    const { title, description, discountPercent, productId, category, startAt, endAt, isActive } =
      req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (discountPercent !== undefined) updateData.discountPercent = parseInt(discountPercent, 10);
    if (productId !== undefined) updateData.productId = productId;
    if (category !== undefined) updateData.category = category;
    if (startAt !== undefined) updateData.startAt = startAt;
    if (endAt !== undefined) updateData.endAt = endAt;
    if (isActive !== undefined) updateData.isActive = isActive === true || isActive === 'true';

    const flashSale = await flashSaleService.updateFlashSale(req.params.id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Flash sale berhasil diperbarui.',
      data: flashSale,
    });
  } catch (error) {
    next(error);
  }
}

// ─── DELETE /api/admin/flash-sales/:id — Admin: hapus ─
async function deleteFlashSale(req, res, next) {
  try {
    const result = await flashSaleService.deleteFlashSale(req.params.id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/admin/flash-sales/:id/toggle — Admin: toggle aktif ─
async function toggleFlashSale(req, res, next) {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Field "isActive" wajib diisi (true/false).',
      });
    }

    const flashSale = await flashSaleService.toggleFlashSale(req.params.id, isActive);

    return res.status(200).json({
      success: true,
      message: `Flash sale ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
      data: flashSale,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/flash-sales/:id/blast-stats — Admin: statistik blast ─
async function getBlastStats(req, res, next) {
  try {
    const stats = await blastService.getBlastStats(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Statistik blast berhasil diambil.',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/flash-sales/:id/blast-logs — Admin: detail blast logs ─
async function getBlastLogs(req, res, next) {
  try {
    const logs = await blastService.getBlastLogs(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Blast logs berhasil diambil.',
      data: logs,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getActiveFlashSales,
  getAllFlashSales,
  getFlashSaleById,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
  toggleFlashSale,
  getBlastStats,
  getBlastLogs,
};
