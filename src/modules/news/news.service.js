// ============================================
// News Service — Kelola berita / pengumuman toko
// ============================================

const prisma = require('../../config/db');
const { uploadFile, deleteFile, BUCKETS } = require('../../config/supabase');
const { AppError } = require('../../middleware/errorHandler');
const crypto = require('crypto');

// ─── GET PUBLISHED NEWS (public) ────────────
async function getPublishedNews() {
  const news = await prisma.news.findMany({
    where: { isPublished: true },
    orderBy: [
      { isPinned: 'desc' },   // Pinned dulu di atas
      { createdAt: 'desc' },  // Lalu terbaru
    ],
  });

  return news;
}

// ─── GET ALL NEWS (admin) ───────────────────
async function getAllNews() {
  const news = await prisma.news.findMany({
    orderBy: [
      { isPinned: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return news;
}

// ─── GET NEWS BY ID (admin) ─────────────────
async function getNewsById(id) {
  const news = await prisma.news.findUnique({
    where: { id },
  });

  if (!news) {
    throw new AppError('Berita tidak ditemukan.', 404);
  }

  return news;
}

// ─── CREATE NEWS (admin) ────────────────────
async function createNews({ title, content, isPinned, isPublished }, file) {
  if (!title || !content) {
    throw new AppError('Judul dan konten berita wajib diisi.', 400);
  }

  let imageUrl = null;

  // Upload gambar banner jika ada
  if (file) {
    const ext = file.originalname.split('.').pop();
    const fileName = `news-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = `banners/${fileName}`;

    console.log(`📤 Uploading news image to bucket: ${BUCKETS.NEWS_IMAGE}, path: ${filePath}`);
    const { url } = await uploadFile(BUCKETS.NEWS_IMAGE, filePath, file.buffer, file.mimetype);
    console.log(`✅ Upload success! URL: ${url}`);

    imageUrl = url;
  }

  const news = await prisma.news.create({
    data: {
      title,
      content,
      imageUrl,
      isPinned: isPinned === true || isPinned === 'true',
      isPublished: isPublished === true || isPublished === 'true',
    },
  });

  return news;
}

// ─── UPDATE NEWS (admin) ────────────────────
async function updateNews(id, { title, content, isPinned, isPublished }, file) {
  // Pastikan berita ada
  const existing = await prisma.news.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Berita tidak ditemukan.', 404);
  }

  const updateData = {};

  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (isPinned !== undefined) updateData.isPinned = isPinned === true || isPinned === 'true';
  if (isPublished !== undefined) updateData.isPublished = isPublished === true || isPublished === 'true';

  // Upload gambar baru jika ada
  if (file) {
    const ext = file.originalname.split('.').pop();
    const fileName = `news-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = `banners/${fileName}`;

    console.log(`📤 Uploading news image to bucket: ${BUCKETS.NEWS_IMAGE}, path: ${filePath}`);
    const { url } = await uploadFile(BUCKETS.NEWS_IMAGE, filePath, file.buffer, file.mimetype);
    console.log(`✅ Upload success! URL: ${url}`);

    // Hapus gambar lama jika ada
    if (existing.imageUrl) {
      try {
        const oldPath = extractFilePathFromUrl(existing.imageUrl);
        if (oldPath) {
          await deleteFile(BUCKETS.NEWS_IMAGE, oldPath);
          console.log(`🗑️ Old image deleted: ${oldPath}`);
        }
      } catch (err) {
        console.warn(`⚠️ Gagal hapus gambar lama: ${err.message}`);
      }
    }

    updateData.imageUrl = url;
  }

  const news = await prisma.news.update({
    where: { id },
    data: updateData,
  });

  return news;
}

// ─── DELETE NEWS (admin) ────────────────────
async function deleteNews(id) {
  const existing = await prisma.news.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Berita tidak ditemukan.', 404);
  }

  // Hapus gambar dari storage jika ada
  if (existing.imageUrl) {
    try {
      const filePath = extractFilePathFromUrl(existing.imageUrl);
      if (filePath) {
        await deleteFile(BUCKETS.NEWS_IMAGE, filePath);
        console.log(`🗑️ Image deleted: ${filePath}`);
      }
    } catch (err) {
      console.warn(`⚠️ Gagal hapus gambar: ${err.message}`);
    }
  }

  await prisma.news.delete({ where: { id } });

  return { message: 'Berita berhasil dihapus.' };
}

// ─── TOGGLE PUBLISH (admin) ─────────────────
async function togglePublish(id, isPublished) {
  const existing = await prisma.news.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Berita tidak ditemukan.', 404);
  }

  const news = await prisma.news.update({
    where: { id },
    data: { isPublished },
  });

  return news;
}

// ─── TOGGLE PIN (admin) ─────────────────────
async function togglePin(id, isPinned) {
  const existing = await prisma.news.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Berita tidak ditemukan.', 404);
  }

  const news = await prisma.news.update({
    where: { id },
    data: { isPinned },
  });

  return news;
}

// ─── HELPER: extract path dari Supabase URL ─
function extractFilePathFromUrl(url) {
  // URL format: https://xxx.supabase.co/storage/v1/object/public/news-images/banners/filename.jpg
  try {
    const parts = url.split('/news-images/');
    return parts.length > 1 ? parts[1] : null;
  } catch {
    return null;
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
