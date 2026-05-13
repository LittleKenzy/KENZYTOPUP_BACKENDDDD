// ============================================
// QRIS Service — Kelola gambar QRIS toko
// ============================================

const prisma = require('../../config/db');
const { uploadFile, deleteFile, BUCKETS } = require('../../config/supabase');
const { AppError } = require('../../middleware/errorHandler');
const crypto = require('crypto');
const sharp = require('sharp');

const QRIS_ID = 'qris-main'; // Singleton ID

// ─── GET QRIS (public) ──────────────────────
async function getQrisSettings() {
  const qris = await prisma.qrisSettings.findUnique({
    where: { id: QRIS_ID },
  });

  // Return null jika belum dikonfigurasi — frontend akan handle
  return qris || null;
}

// ─── UPDATE / SET QRIS IMAGE (admin) ────────
async function setQrisImage(file, label) {
  if (!file) {
    throw new AppError('File gambar QRIS wajib diupload.', 400);
  }

  // Validate image dimensions (minimum 300x300)
  const metadata = await sharp(file.buffer).metadata();
  if (metadata.width < 300 || metadata.height < 300) {
    throw new AppError('Ukuran gambar QRIS terlalu kecil. Minimum 300x300 piksel.', 400);
  }

  // Generate unique filename
  const ext = file.originalname.split('.').pop();
  const fileName = `qris-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const filePath = `store/${fileName}`;

  // Upload ke Supabase Storage
  console.log(`📤 Uploading QRIS image to bucket: ${BUCKETS.QRIS_IMAGE}, path: ${filePath}`);
  const { url } = await uploadFile(BUCKETS.QRIS_IMAGE, filePath, file.buffer, file.mimetype);
  console.log(`✅ Upload success! URL: ${url}`);

  // Upsert ke database (create atau update)
  const qris = await prisma.qrisSettings.upsert({
    where: { id: QRIS_ID },
    update: {
      imageUrl: url,
      label: label || 'QRIS Kenzy Store',
      isActive: true,
    },
    create: {
      id: QRIS_ID,
      imageUrl: url,
      label: label || 'QRIS Kenzy Store',
      isActive: true,
    },
  });

  console.log('✅ QRIS settings updated in database.');
  return qris;
}

// ─── TOGGLE QRIS ACTIVE (admin) ─────────────
async function toggleQris(isActive) {
  const qris = await prisma.qrisSettings.update({
    where: { id: QRIS_ID },
    data: { isActive },
  });

  return qris;
}

module.exports = { getQrisSettings, setQrisImage, toggleQris };
