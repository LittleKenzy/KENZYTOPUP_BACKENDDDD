// ============================================
// QRIS Controller — Handle HTTP req/res
// ============================================

const qrisService = require('./qris.service');

// ─── GET /api/qris — Public: ambil gambar QRIS toko ─
async function getQris(req, res, next) {
  try {
    const qris = await qrisService.getQrisSettings();

    return res.status(200).json({
      success: true,
      message: 'QRIS berhasil diambil.',
      data: qris,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/admin/qris — Admin: upload gambar QRIS ─
async function setQris(req, res, next) {
  try {
    const label = req.body.label;
    const qris = await qrisService.setQrisImage(req.file, label);

    return res.status(200).json({
      success: true,
      message: 'Gambar QRIS berhasil diupload/diperbarui.',
      data: qris,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/admin/qris/toggle — Admin: aktifkan/nonaktifkan QRIS ─
async function toggleQris(req, res, next) {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Field "isActive" wajib diisi (true/false).',
      });
    }

    const qris = await qrisService.toggleQris(isActive);

    return res.status(200).json({
      success: true,
      message: `QRIS ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
      data: qris,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getQris, setQris, toggleQris };
