// ============================================
// Upload Middleware — Multer config untuk file upload
// ============================================

const multer = require('multer');
const { AppError } = require('./errorHandler');

// Simpan di memory (buffer) karena akan langsung upload ke Supabase Storage
const storage = multer.memoryStorage();

// Filter: hanya terima gambar
const imageFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('File harus berupa gambar (JPEG, PNG, atau WebP).', 400), false);
  }
};

// Upload untuk bukti QRIS (max 5MB)
const uploadPaymentProof = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('paymentProof'); // field name: "paymentProof"

// Upload untuk gambar QRIS toko oleh admin (max 5MB)
const uploadQrisImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('qrisImage'); // field name: "qrisImage"

// Wrapper agar multer error masuk ke error handler Express
function handleMulterUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('Ukuran file maksimal 5MB.', 400));
        }
        return next(new AppError(`Upload error: ${err.message}`, 400));
      }
      if (err) {
        return next(err);
      }
      next();
    });
  };
}

module.exports = {
  uploadPaymentProof: handleMulterUpload(uploadPaymentProof),
  uploadQrisImage: handleMulterUpload(uploadQrisImage),
};
