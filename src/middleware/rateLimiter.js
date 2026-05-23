// ============================================
// Rate Limiter — Re-export dari security.js
// ============================================
//
// File ini tetap ada untuk backward compatibility.
// Semua limiter sekarang didefinisikan di security.js
// sebagai sumber kebenaran tunggal (single source of truth).
// ============================================

const {
  generalLimiter,
  authLimiter,
  orderLimiter,
  pushSubscribeLimiter,
  missionClaimLimiter,
} = require('./security');

// loginLimiter sekarang sama dengan authLimiter (max 10/15min)
// untuk backward compat dengan auth.route.js yang import loginLimiter
const loginLimiter = authLimiter;

module.exports = {
  generalLimiter,
  authLimiter,
  loginLimiter,
  orderLimiter,
  pushSubscribeLimiter,
  missionClaimLimiter,
};
