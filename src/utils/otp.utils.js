// ============================================
// OTP Utilities — Generate & hash OTP codes
// Digunakan untuk 2FA admin login via WhatsApp
// ============================================

const crypto = require('crypto');
const bcrypt = require('bcrypt');

const OTP_LENGTH = 6;
const SALT_ROUNDS = 10;

/**
 * Generate kode OTP 6 digit angka acak
 * Menggunakan crypto.randomInt untuk keamanan kriptografis
 * @returns {string} OTP 6 digit, e.g. "482917"
 */
function generateOtp() {
  // crypto.randomInt menghasilkan angka acak yang aman secara kriptografis
  // Range: 100000 - 999999 (6 digit)
  const min = Math.pow(10, OTP_LENGTH - 1);  // 100000
  const max = Math.pow(10, OTP_LENGTH);       // 1000000
  const otp = crypto.randomInt(min, max);
  return otp.toString();
}

/**
 * Hash OTP menggunakan bcrypt sebelum disimpan ke database
 * Plain OTP TIDAK PERNAH disimpan — hanya hash-nya
 * @param {string} otp - Plain OTP 6 digit
 * @returns {Promise<string>} Hashed OTP
 */
async function hashOtp(otp) {
  return bcrypt.hash(otp, SALT_ROUNDS);
}

/**
 * Verifikasi plain OTP terhadap hashed OTP dari database
 * @param {string} plainOtp - Plain OTP yang diinput user
 * @param {string} hashedOtp - Hashed OTP dari database
 * @returns {Promise<boolean>} true jika cocok
 */
async function verifyOtp(plainOtp, hashedOtp) {
  return bcrypt.compare(plainOtp, hashedOtp);
}

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
};
