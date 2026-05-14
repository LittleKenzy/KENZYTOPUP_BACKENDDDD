// ============================================
// News Controller — Handle HTTP req/res berita
// ============================================

const newsService = require('./news.service');

// ─── GET /api/news — Public: ambil berita yang sudah dipublish ─
async function getPublishedNews(req, res, next) {
  try {
    const news = await newsService.getPublishedNews();

    return res.status(200).json({
      success: true,
      message: 'Daftar berita berhasil diambil.',
      data: news,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/news — Admin: ambil semua berita ─
async function getAllNews(req, res, next) {
  try {
    const news = await newsService.getAllNews();

    return res.status(200).json({
      success: true,
      message: 'Daftar semua berita berhasil diambil.',
      data: news,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/news/:id — Admin: detail berita ─
async function getNewsById(req, res, next) {
  try {
    const news = await newsService.getNewsById(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Detail berita berhasil diambil.',
      data: news,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/admin/news — Admin: buat berita baru ─
async function createNews(req, res, next) {
  try {
    const { title, content, isPinned, isPublished } = req.body;
    const news = await newsService.createNews(
      { title, content, isPinned, isPublished },
      req.file // opsional — dari multer
    );

    return res.status(201).json({
      success: true,
      message: 'Berita berhasil dibuat.',
      data: news,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PUT /api/admin/news/:id — Admin: edit berita ─
async function updateNews(req, res, next) {
  try {
    const { title, content, isPinned, isPublished } = req.body;
    const news = await newsService.updateNews(
      req.params.id,
      { title, content, isPinned, isPublished },
      req.file // opsional
    );

    return res.status(200).json({
      success: true,
      message: 'Berita berhasil diperbarui.',
      data: news,
    });
  } catch (error) {
    next(error);
  }
}

// ─── DELETE /api/admin/news/:id — Admin: hapus berita ─
async function deleteNews(req, res, next) {
  try {
    const result = await newsService.deleteNews(req.params.id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/admin/news/:id/publish — Admin: toggle publish ─
async function togglePublish(req, res, next) {
  try {
    const { isPublished } = req.body;

    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Field "isPublished" wajib diisi (true/false).',
      });
    }

    const news = await newsService.togglePublish(req.params.id, isPublished);

    return res.status(200).json({
      success: true,
      message: `Berita ${isPublished ? 'dipublish' : 'di-draft-kan'}.`,
      data: news,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/admin/news/:id/pin — Admin: toggle pin ─
async function togglePin(req, res, next) {
  try {
    const { isPinned } = req.body;

    if (typeof isPinned !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Field "isPinned" wajib diisi (true/false).',
      });
    }

    const news = await newsService.togglePin(req.params.id, isPinned);

    return res.status(200).json({
      success: true,
      message: `Berita ${isPinned ? 'di-pin' : 'di-unpin'}.`,
      data: news,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPublishedNews,
  getAllNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  togglePublish,
  togglePin,
};
