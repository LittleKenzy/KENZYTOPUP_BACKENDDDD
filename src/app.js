// ============================================
// Kenzy Store — Main Application Entry Point
// ============================================

const express = require('express');
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

const app = express();

// ─── GLOBAL MIDDLEWARE ───────────────────────

// Security headers (Helmet)
app.use(helmet());

// CORS — whitelist frontend origins
const corsOptions = {
  origin: env.CORS_ORIGINS,
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
  app.listen(env.PORT, () => {
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
  });
}

module.exports = app;
