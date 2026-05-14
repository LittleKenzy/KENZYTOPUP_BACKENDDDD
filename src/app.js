// ============================================
// Kenzy Store — Main Application Entry Point
// ============================================

const express = require('express');

// ── Fix: Force IPv4 for ALL fetch/HTTP calls (Supabase, etc.) ──
// Node.js 24 uses undici for fetch, which tries IPv6 first.
// On networks where IPv6 DNS is broken, this causes "fetch failed".
// This forces undici to ONLY use IPv4 connections.
const { setGlobalDispatcher, Agent } = require('undici');
setGlobalDispatcher(new Agent({ connect: { family: 4 } }));
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/sanitize');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const { authorize } = require('./middleware/role');

// Import routes
const authRoutes = require('./modules/auth/auth.route');
const productRoutes = require('./modules/products/product.route');
const transactionRoutes = require('./modules/transactions/transaction.route');
const transactionController = require('./modules/transactions/transaction.controller');
const productController = require('./modules/products/product.controller');
const qrisController = require('./modules/qris/qris.controller');
const newsController = require('./modules/news/news.controller');
const { uploadQrisImage, uploadNewsImage } = require('./middleware/upload');
const { ensureBuckets } = require('./config/supabase');

const app = express();

// ─── GLOBAL MIDDLEWARE ───────────────────────

// Security headers (Helmet)
app.use(helmet());

// CORS — whitelist frontend origins
const corsOptions = {
  origin: function (origin, callback) {
    // Izinkan Postman, localhost, atau domain apa pun dari vercel.app
    if (!origin || origin.includes('localhost') || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // penting untuk Vercel Serverless
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Tangkap semua OPTIONS preflight

// Rate limiting global
app.use(generalLimiter);

// Body parser
app.use(express.json({ limit: '10kb' })); // Batasi ukuran body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Input sanitization — strip karakter berbahaya
app.use(sanitizeInput);

// ─── HEALTH CHECK ────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Kenzy Store API is running! 🚀',
    data: {
      name: 'Kenzy Store Backend',
      version: '1.0.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── API ROUTES ──────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);

// Public: ambil gambar QRIS toko (tidak perlu login)
app.get('/api/qris', qrisController.getQris);

// Public: ambil berita/pengumuman toko yang sudah dipublish
app.get('/api/news', newsController.getPublishedNews);

// ═══════════════════════════════════════════════
// ADMIN-ONLY ENDPOINTS
// ═══════════════════════════════════════════════

// --- Admin: Transaction management ---
app.get(
  '/api/admin/transactions/stats',
  authenticate,
  authorize('admin'),
  transactionController.getTransactionStats
);
app.get(
  '/api/admin/transactions',
  authenticate,
  authorize('admin'),
  transactionController.listAllTransactions
);
app.get(
  '/api/admin/transactions/:id',
  authenticate,
  authorize('admin'),
  transactionController.getTransactionAdmin
);
app.patch(
  '/api/admin/transactions/:id/status',
  authenticate,
  authorize('admin'),
  transactionController.updateTransactionStatus
);

// --- Admin: Product management ---
app.get(
  '/api/admin/products/stats',
  authenticate,
  authorize('admin'),
  productController.getProductStats
);
app.get(
  '/api/admin/products/categories',
  authenticate,
  authorize('admin'),
  productController.listCategories
);
app.get(
  '/api/admin/products/operators',
  authenticate,
  authorize('admin'),
  productController.listOperatorCodes
);
app.get(
  '/api/admin/products',
  authenticate,
  authorize('admin'),
  productController.listAllProducts
);
app.post(
  '/api/admin/products',
  authenticate,
  authorize('admin'),
  productController.createProduct
);
app.put(
  '/api/admin/products/:id',
  authenticate,
  authorize('admin'),
  productController.updateProduct
);
app.delete(
  '/api/admin/products/:id',
  authenticate,
  authorize('admin'),
  productController.deleteProduct
);
app.patch(
  '/api/admin/products/:id/reactivate',
  authenticate,
  authorize('admin'),
  productController.reactivateProduct
);

// --- Admin: QRIS management ---
app.post(
  '/api/admin/qris',
  authenticate,
  authorize('admin'),
  uploadQrisImage,
  qrisController.setQris
);
app.patch(
  '/api/admin/qris/toggle',
  authenticate,
  authorize('admin'),
  qrisController.toggleQris
);

// --- Admin: News / Pengumuman management ---
app.get(
  '/api/admin/news',
  authenticate,
  authorize('admin'),
  newsController.getAllNews
);
app.get(
  '/api/admin/news/:id',
  authenticate,
  authorize('admin'),
  newsController.getNewsById
);
app.post(
  '/api/admin/news',
  authenticate,
  authorize('admin'),
  uploadNewsImage,
  newsController.createNews
);
app.put(
  '/api/admin/news/:id',
  authenticate,
  authorize('admin'),
  uploadNewsImage,
  newsController.updateNews
);
app.delete(
  '/api/admin/news/:id',
  authenticate,
  authorize('admin'),
  newsController.deleteNews
);
app.patch(
  '/api/admin/news/:id/publish',
  authenticate,
  authorize('admin'),
  newsController.togglePublish
);
app.patch(
  '/api/admin/news/:id/pin',
  authenticate,
  authorize('admin'),
  newsController.togglePin
);

// ─── 404 HANDLER ─────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan. Cek URL dan metode HTTP Anda.',
  });
});

// ─── GLOBAL ERROR HANDLER (harus terakhir) ───
app.use(errorHandler);

// ─── START SERVER (Lokal saja, untuk Vercel di-export) ───
if (env.NODE_ENV !== 'production') {
  app.listen(env.PORT, async () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║       🛒 KENZY STORE BACKEND API        ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Status  : Running ✅                    ║`);
    console.log(`║  Port    : ${String(env.PORT).padEnd(29)}║`);
    console.log(`║  Env     : ${String(env.NODE_ENV).padEnd(29)}║`);
    console.log(`║  URL     : http://localhost:${String(env.PORT).padEnd(13)}║`);
    console.log('╠══════════════════════════════════════════╣');
    console.log('║  Endpoints:                              ║');
    console.log('║  • /api/health         — Health check    ║');
    console.log('║  • /api/auth/*         — Auth            ║');
    console.log('║  • /api/products/*     — Products        ║');
    console.log('║  • /api/transactions/* — Transactions    ║');
    console.log('║  • /api/admin/*        — Admin panel     ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');

    // Auto-create Supabase storage buckets
    await ensureBuckets();
  });
}

module.exports = app;
