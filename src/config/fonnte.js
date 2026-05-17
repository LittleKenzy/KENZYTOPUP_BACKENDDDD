// ============================================
// Fonnte Config — WhatsApp Gateway Integration
// Docs: https://fonnte.com/docs
// ============================================

// Force IPv4 untuk fetch ke Fonnte API
// Node.js 24 pakai undici yang coba IPv6 dulu — di beberapa jaringan IPv6 broken
const { fetch: undiciFetch, Agent } = require('undici');
const ipv4Agent = new Agent({ connect: { family: 4 } });

const FONNTE_API_URL = 'https://api.fonnte.com/send';

/**
 * Kirim pesan WhatsApp via Fonnte API (teks saja)
 * @param {string} phone - Nomor tujuan format 6281234567890
 * @param {string} message - Isi pesan WA
 * @returns {Promise<object>} Response dari Fonnte API
 */
async function sendWhatsApp(phone, message) {
  const token = process.env.FONNTE_TOKEN;

  if (!token) {
    console.error('❌ FONNTE_TOKEN belum diset di environment variables!');
    return { status: false, reason: 'FONNTE_TOKEN not configured' };
  }

  try {
    const response = await undiciFetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phone,
        message: message,
        countryCode: '62',
      }),
      dispatcher: ipv4Agent,
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`❌ Gagal kirim WA ke ${phone}:`, error.message);
    return { status: false, reason: error.message };
  }
}

/**
 * Format nomor telepon ke format internasional Indonesia (62xxx)
 * Input: 081234567890 → Output: 6281234567890
 * Input: 6281234567890 → Output: 6281234567890 (tetap)
 * @param {string} phone - Nomor telepon
 * @returns {string} Nomor format 62xxx
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';

  // Hapus semua karakter non-digit
  let cleaned = phone.replace(/\D/g, '');

  // Jika diawali 0, ganti ke 62
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }

  // Jika belum diawali 62, tambahkan
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }

  return cleaned;
}

/**
 * Validasi nomor telepon Indonesia
 * @param {string} phone - Nomor format 62xxx
 * @returns {boolean}
 */
function isValidPhoneNumber(phone) {
  const cleaned = formatPhoneNumber(phone);
  // 62 + 10-13 digit = total 12-15 karakter
  return /^62\d{9,13}$/.test(cleaned);
}

// ─── KONSTANTA BLAST ────────────────────────
const BLAST_CONFIG = {
  BATCH_SIZE: 10,       // Kirim 10 pesan per batch
  DELAY_MS: 1000,       // Jeda 1 detik antar batch (hindari rate limit)
  OWNER_PHONE: '082395928309',
  OWNER_WA: '6282395928309',
  WEBSITE_URL: 'https://kenzytopup-frontenddddd.vercel.app/',
  STORE_NAME: 'Kenzy Store',
};

/**
 * Generate pesan WA blast untuk flash sale
 * Template pesan TIDAK boleh diubah tanpa konfirmasi pemilik!
 */
function generateBlastMessage({ productName, originalPrice, salePrice, discount, validUntil }) {
  // Format harga ke Rupiah
  const formatRp = (num) => new Intl.NumberFormat('id-ID').format(num);

  // Format tanggal ke format Indonesia
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    });
  };

  return `🔥 *FLASH SALE KENZY STORE* 🔥

Halo! Ada promo spesial nih buat kamu!

🎮 *${productName}*
💰 Harga normal: Rp ${formatRp(originalPrice)}
🏷️ Harga flash sale: *Rp ${formatRp(salePrice)}*
🔖 Diskon: *${discount}%*

⏰ Berlaku sampai: ${formatDate(validUntil)}

Buruan order sebelum kehabisan!
👉 ${BLAST_CONFIG.WEBSITE_URL}
📱 Order/info: ${BLAST_CONFIG.OWNER_PHONE}

_Kenzy Store - Top Up Murah & Terpercaya_`;
}

module.exports = {
  FONNTE_API_URL,
  BLAST_CONFIG,
  sendWhatsApp,
  formatPhoneNumber,
  isValidPhoneNumber,
  generateBlastMessage,
};
