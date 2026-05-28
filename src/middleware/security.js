// ============================================
// Security Middleware — Centralized security layer
// ============================================
//
// File ini mengekspor semua middleware keamanan:
//   1. Helmet         → Security headers (XSS, clickjacking, sniffing)
//   2. CORS           → Whitelist origin ketat
//   3. Mongo Sanitize → Cegah NoSQL/operator injection (defense in depth)
//   4. Rate Limiters  → Cegah brute force & spam request
//   5. Body Parsers   → Batasi ukuran request body
//
// Urutan pemasangan di app.js:
//   helmet → cors → bodyParser → sanitize → rateLimiter → routes
// ============================================

const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

// ─── 1. HELMET — Security Headers ────────────────────────────
// Mengaktifkan semua default security headers:
//   - X-Content-Type-Options: nosniff
//   - X-Frame-Options: SAMEORIGIN (cegah clickjacking)
//   - X-XSS-Protection
//   - Strict-Transport-Security (HSTS)
//   - dll.
//
// Content-Security-Policy diatur agar tidak memblokir Vite/React frontend.
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  // Cross-Origin headers agar API bisa dipanggil dari frontend
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
});

// ─── 2. CORS — Whitelist Origin Ketat ─────────────────────────
// Hanya izinkan origin yang terdaftar di ALLOWED_ORIGINS.
// Baca dari env variable, jangan hardcode URL di kode.
const buildCorsOptions = () => {
  // Ambil whitelist dari env, fallback ke localhost dev
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:5173'];

  return {
    origin: function (origin, callback) {
      // Izinkan request tanpa origin (Postman, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Untuk httpOnly cookie JWT nanti
    optionsSuccessStatus: 200, // Penting untuk Vercel Serverless
  };
};

const corsMiddleware = () => {
  const options = buildCorsOptions();
  return cors(options);
};

// Preflight handler untuk semua routes
const corsPreflight = () => {
  const options = buildCorsOptions();
  return cors(options);
};

// ─── 3. MONGO SANITIZE — Defense in Depth ─────────────────────
// Mencegah injeksi operator MongoDB ($gt, $ne, dll) di query string.
// Meskipun pakai Prisma (bukan Mongo), ini sebagai defense in depth
// untuk mencegah payload berbahaya masuk ke logika bisnis.
const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️  Sanitized ${key} in request from ${req.ip}`);
    }
  },
});

// ─── 4. RATE LIMITERS — Cegah Brute Force & Spam ──────────────

// Pesan standar ketika kena rate limit
const rateLimitMessage = {
  success: false,
  message: 'Terlalu banyak permintaan, coba lagi nanti.',
};

// Global limiter: max 500 request per 15 menit per IP (dilonggarkan)
// Berlaku untuk semua endpoint sebagai safety net
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

// Auth limiter: longgarkan untuk development / mencegah masalah proxy
// Untuk route login & register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 50, // Naikkan dari 10 menjadi 50 agar tidak mudah terblokir saat testing
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

// Order limiter: max 20 request per 15 menit per IP
// Untuk POST /api/orders dan POST /api/transactions — cegah spam order
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

// Push subscribe limiter: max 5 request per 15 menit per IP
// Untuk POST /api/push/subscribe — cegah spam subscription
const pushSubscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

// Mission claim limiter: max 10 request per menit per IP
// Untuk POST /api/missions/daily/claim — cegah spam klaim
const missionClaimLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan klaim misi. Coba lagi dalam 1 menit.',
  },
});

// ─── ADMIN 2FA AUTH LIMITERS ────────────────────────────────────
// Rate limiter ketat khusus untuk route 2FA admin login

// Admin login limiter: max 5x per 15 menit per IP
// Cegah brute force password admin
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login admin. Coba lagi dalam 15 menit.',
  },
});

// Admin verify OTP limiter: max 10x per 15 menit per IP
// Cegah brute force OTP (OTP 6 digit = 1 juta kemungkinan)
const adminVerifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan verifikasi OTP. Coba lagi dalam 15 menit.',
  },
});

// Admin resend OTP limiter: max 3x per 15 menit per IP
// Cegah spam kirim OTP ke WA owner
const adminResendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan kirim ulang OTP. Coba lagi dalam 15 menit.',
  },
});

// ─── TRADE RATE LIMITERS ────────────────────────────────────────
// Rate limiter khusus untuk trade endpoint

// Create trade limiter: max 10 per jam per user
// Keyed by userId (dari JWT) bukan IP, agar rate limit per user
const tradeCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: {
    success: false,
    message: 'Terlalu banyak pembuatan trade. Maksimal 10 per jam. Coba lagi nanti.',
  },
});

// Confirm trade limiter: max 20 per jam per user
const tradeConfirmLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: {
    success: false,
    message: 'Terlalu banyak konfirmasi trade. Maksimal 20 per jam. Coba lagi nanti.',
  },
});

module.exports = {
  // Helmet
  helmetMiddleware,

  // CORS
  corsMiddleware,
  corsPreflight,

  // Sanitize
  mongoSanitizeMiddleware,

  // Rate limiters
  generalLimiter,
  authLimiter,
  orderLimiter,
  pushSubscribeLimiter,
  missionClaimLimiter,

  // Admin 2FA rate limiters
  adminLoginLimiter,
  adminVerifyOtpLimiter,
  adminResendOtpLimiter,

  // Trade rate limiters
  tradeCreateLimiter,
  tradeConfirmLimiter,
};
