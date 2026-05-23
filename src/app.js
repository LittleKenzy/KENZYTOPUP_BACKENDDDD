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

const env = require('./config/env');

// ─── Security middleware (centralized) ───────
const {
  helmetMiddleware,
  corsMiddleware,
  corsPreflight,
  mongoSanitizeMiddleware,
  generalLimiter,
  authLimiter,
  orderLimiter,
  pushSubscribeLimiter,
} = require('./middleware/security');

// ─── Existing middleware ─────────────────────
const { sanitizeInput } = require('./middleware/sanitize');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const { authorize } = require('./middleware/role');

// Import routes
const authRoutes = require('./modules/auth/auth.route');
const adminAuthRoutes = require('./modules/auth/adminAuth.route');
const productRoutes = require('./modules/products/product.route');
const transactionRoutes = require('./modules/transactions/transaction.route');
const transactionController = require('./modules/transactions/transaction.controller');
const productController = require('./modules/products/product.controller');
const qrisController = require('./modules/qris/qris.controller');
const newsController = require('./modules/news/news.controller');
const flashSaleController = require('./modules/flashsale/flashsale.controller');
const blastController = require('./modules/blast/blast.controller');
const loyaltyController = require('./modules/loyalty/loyalty.controller');
const missionRoutes = require('./modules/missions/mission.route');
const missionController = require('./modules/missions/mission.controller');
const pushController = require('./modules/push/push.controller');
const notificationController = require('./modules/notifications/notification.controller');
const { uploadQrisImage, uploadNewsImage } = require('./middleware/upload');
const { ensureBuckets } = require('./config/supabase');

const app = express();

// ─── TRUST PROXY ─────────────────────────────
// Vercel menggunakan reverse proxy, set trust proxy agar rate limiter
// membaca IP asli dari header X-Forwarded-For, bukan IP proxy.
app.set('trust proxy', 1);

// ═══════════════════════════════════════════════
// GLOBAL MIDDLEWARE (urutan penting!)
// Urutan: helmet → cors → bodyParser → sanitize → rateLimiter → routes
// ═══════════════════════════════════════════════

// 1. Security headers (Helmet) — XSS, clickjacking, sniffing protection
app.use(helmetMiddleware);

// 2. CORS — Whitelist origin ketat, baca dari env ALLOWED_ORIGINS
app.use(corsMiddleware());
app.options('*', corsPreflight()); // Handle semua OPTIONS preflight

// 3. Body parser — Batasi ukuran JSON/form ke 10kb
//    (route upload gambar pakai Multer sendiri dengan limit 5MB)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4a. Input sanitization — Strip MongoDB operator injection (defense in depth)
app.use(mongoSanitizeMiddleware);

// 4b. Input sanitization — Strip karakter HTML/control berbahaya
app.use(sanitizeInput);

// 5. Rate limiting global — max 100 request per 15 menit per IP
app.use(generalLimiter);

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
app.use('/api/auth/admin', adminAuthRoutes); // 2FA OTP admin login
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/missions', missionRoutes);

// Public: ambil gambar QRIS toko (tidak perlu login)
app.get('/api/qris', qrisController.getQris);

// Public: ambil berita/pengumuman toko yang sudah dipublish
app.get('/api/news', newsController.getPublishedNews);

// Public: ambil flash sale yang sedang aktif (dengan countdown)
app.get('/api/flash-sales', flashSaleController.getActiveFlashSales);

// Public: ambil pengaturan loyalty (info poin per belanja)
app.get('/api/loyalty/config', loyaltyController.getLoyaltyConfig);

// Public: ambil VAPID public key untuk push notification
app.get('/api/push/vapid-key', pushController.getVapidKey);

// ═══════════════════════════════════════════════
// USER-ONLY ENDPOINTS (perlu login)
// ═══════════════════════════════════════════════

// --- User: Loyalty / Poin ---
app.get('/api/loyalty/my-points', authenticate, loyaltyController.getMyPoints);
app.post('/api/loyalty/redeem', authenticate, loyaltyController.redeemPoints);
app.post('/api/loyalty/validate-code', authenticate, loyaltyController.validateDiscountCode);
app.get('/api/loyalty/my-redemptions', authenticate, loyaltyController.getMyRedemptions);

// --- User: Push Notification ---
// Push subscribe dibatasi max 5 request per 15 menit per IP
app.post('/api/push/subscribe', pushSubscribeLimiter, authenticate, pushController.subscribe);
app.delete('/api/push/unsubscribe', authenticate, pushController.unsubscribe);

// --- User: Notifications (In-app) ---
app.get('/api/notifications', authenticate, notificationController.getMyNotifications);
app.get('/api/notifications/unread', authenticate, notificationController.getUnreadCount);
app.patch('/api/notifications/read-all', authenticate, notificationController.markAllAsRead);
app.patch('/api/notifications/:id/read', authenticate, notificationController.markAsRead);

// ═══════════════════════════════════════════════
// ADMIN-ONLY ENDPOINTS
// ═══════════════════════════════════════════════

// --- Admin: Transaction management ---
// Polling order baru (untuk notifikasi admin dashboard)
app.get(
  '/api/admin/orders/new',
  authenticate,
  authorize('admin'),
  transactionController.getNewOrders
);
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

// --- Admin: Flash Sale management ---
app.get(
  '/api/admin/flash-sales',
  authenticate,
  authorize('admin'),
  flashSaleController.getAllFlashSales
);
app.get(
  '/api/admin/flash-sales/:id',
  authenticate,
  authorize('admin'),
  flashSaleController.getFlashSaleById
);
app.post(
  '/api/admin/flash-sales',
  authenticate,
  authorize('admin'),
  flashSaleController.createFlashSale
);
app.put(
  '/api/admin/flash-sales/:id',
  authenticate,
  authorize('admin'),
  flashSaleController.updateFlashSale
);
app.delete(
  '/api/admin/flash-sales/:id',
  authenticate,
  authorize('admin'),
  flashSaleController.deleteFlashSale
);
app.patch(
  '/api/admin/flash-sales/:id/toggle',
  authenticate,
  authorize('admin'),
  flashSaleController.toggleFlashSale
);
app.get(
  '/api/admin/flash-sales/:id/blast-stats',
  authenticate,
  authorize('admin'),
  flashSaleController.getBlastStats
);
app.get(
  '/api/admin/flash-sales/:id/blast-logs',
  authenticate,
  authorize('admin'),
  flashSaleController.getBlastLogs
);

// --- Admin: Loyalty / Poin management ---
app.get(
  '/api/admin/loyalty/config',
  authenticate,
  authorize('admin'),
  loyaltyController.getLoyaltyConfig
);
app.put(
  '/api/admin/loyalty/config',
  authenticate,
  authorize('admin'),
  loyaltyController.updateLoyaltyConfig
);
app.get(
  '/api/admin/loyalty/stats',
  authenticate,
  authorize('admin'),
  loyaltyController.getLoyaltyStats
);
app.get(
  '/api/admin/loyalty/leaderboard',
  authenticate,
  authorize('admin'),
  loyaltyController.getLoyaltyLeaderboard
);

// --- Admin: Mission / Misi Harian management ---
app.get(
  '/api/admin/missions/logs',
  authenticate,
  authorize('admin'),
  missionController.getTodayLogs
);
app.delete(
  '/api/admin/missions/reset',
  authenticate,
  authorize('admin'),
  missionController.resetTodayMissions
);

// --- Admin: WA Blast management ---
app.get(
  '/api/admin/blast/users',
  authenticate,
  authorize('admin'),
  blastController.getBlastableUsers
);
app.post(
  '/api/admin/blast/send',
  authenticate,
  authorize('admin'),
  blastController.sendBlast
);
app.get(
  '/api/admin/blast/history',
  authenticate,
  authorize('admin'),
  blastController.getBlastHistory
);
app.get(
  '/api/admin/blast/history/:id',
  authenticate,
  authorize('admin'),
  blastController.getBlastDetail
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
    console.log('║  Security: Helmet ✅ CORS ✅ RateLimit ✅ ║');
    console.log('║  Endpoints:                              ║');
    console.log('║  • /api/health         — Health check    ║');
    console.log('║  • /api/auth/*         — Auth            ║');
    console.log('║  • /api/products/*     — Products        ║');
    console.log('║  • /api/transactions/* — Transactions    ║');
    console.log('║  • /api/missions/*     — Daily Mission   ║');
    console.log('║  • /api/push/*         — Push Notif      ║');
    console.log('║  • /api/admin/*        — Admin panel     ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');

    // Auto-create Supabase storage buckets
    await ensureBuckets();
  });
}

module.exports = app;
