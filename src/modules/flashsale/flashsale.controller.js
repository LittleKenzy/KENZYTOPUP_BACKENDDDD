// ============================================
// Flash Sale Controller — Handle HTTP req/res
// ============================================

const flashSaleService = require('./flashsale.service');

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

// ─── POST /api/admin/flash-sales — Admin: buat flash sale ─
async function createFlashSale(req, res, next) {
  try {
    const { title, description, discountPercent, productId, category, startAt, endAt } = req.body;

    const flashSale = await flashSaleService.createFlashSale({
      title,
      description,
      discountPercent: parseInt(discountPercent, 10),
      productId,
      category,
      startAt,
      endAt,
    });

    return res.status(201).json({
      success: true,
      message: 'Flash sale berhasil dibuat.',
      data: flashSale,
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

module.exports = {
  getActiveFlashSales,
  getAllFlashSales,
  getFlashSaleById,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
  toggleFlashSale,
};
