// ============================================
// Supabase Client — Untuk upload file ke Storage
// ============================================

const { createClient } = require('@supabase/supabase-js');
const { AppError } = require('../middleware/errorHandler');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'your-supabase-service-role-key-here') {
  console.warn('⚠️  SUPABASE_URL atau SUPABASE_SERVICE_KEY belum dikonfigurasi. Upload file tidak akan berfungsi.');
} else {
  console.log(`🔌 Supabase Client initialized for: ${supabaseUrl}`);
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: { persistSession: false },
});

// Bucket names
const BUCKETS = {
  PAYMENT_PROOF: 'payment-proofs',   // Bukti transfer QRIS dari user
  QRIS_IMAGE: 'qris-images',         // Gambar QRIS toko (admin upload)
};

/**
 * Auto-create storage buckets jika belum ada
 * Dipanggil saat server startup
 */
async function ensureBuckets() {
  if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'your-supabase-service-role-key-here') {
    console.warn('⚠️  Supabase belum dikonfigurasi, skip pembuatan bucket.');
    return;
  }

  for (const bucketName of Object.values(BUCKETS)) {
    try {
      const { data, error } = await supabase.storage.getBucket(bucketName);
      
      if (error && error.message.includes('not found')) {
        // Bucket belum ada, buat baru (public)
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024, // 5MB
        });

        if (createError) {
          console.warn(`⚠️  Gagal membuat bucket "${bucketName}": ${createError.message}`);
        } else {
          console.log(`✅ Bucket "${bucketName}" berhasil dibuat (public).`);
        }
      } else if (data) {
        console.log(`✅ Bucket "${bucketName}" sudah ada.`);
      }
    } catch (err) {
      console.error(`❌ Error saat cek/buat bucket "${bucketName}":`, err.message);
    }
  }
}

/**
 * Upload file ke Supabase Storage
 * @param {string} bucket - Nama bucket
 * @param {string} filePath - Path file di bucket (e.g. "proofs/abc123.jpg")
 * @param {Buffer} fileBuffer - Buffer file
 * @param {string} contentType - MIME type (e.g. "image/jpeg")
 * @returns {Promise<{url: string}>} Public URL file
 */
async function uploadFile(bucket, filePath, fileBuffer, contentType) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: true, // overwrite jika sudah ada
    });

  if (error) {
    console.error(`❌ Supabase Upload Error [${bucket}]:`, error);
    throw new AppError(`Gagal upload ke storage: ${error.message}`, 500);
  }

  // Ambil public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return { url: urlData.publicUrl };
}

/**
 * Hapus file dari Supabase Storage
 */
async function deleteFile(bucket, filePath) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.warn(`⚠️  Gagal hapus file ${filePath}: ${error.message}`);
  }
}

module.exports = { supabase, BUCKETS, uploadFile, deleteFile, ensureBuckets };

