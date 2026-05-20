// ============================================
// Shared WhatsApp Sender — Re-export dari config/fonnte.js
// Dipakai oleh semua fitur yang butuh kirim WA
// (admin notifier, blast, dll)
// ============================================

const { sendWhatsApp, formatPhoneNumber, isValidPhoneNumber } = require('../config/fonnte');

module.exports = { sendWhatsApp, formatPhoneNumber, isValidPhoneNumber };
