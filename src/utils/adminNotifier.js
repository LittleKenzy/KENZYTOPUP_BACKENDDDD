// ============================================
// Admin Notifier — Kirim WA ke admin saat ada order baru
// Fire-and-forget: jangan await di response user!
// ============================================

const { sendWhatsApp } = require('./whatsapp');

/**
 * Kirim notifikasi WA ke admin saat ada order masuk.
 * Panggil secara fire-and-forget (jangan await di response user).
 *
 * @param {object} order - Data order yang sudah di-normalize
 * @param {string} order.id - Order/Transaction ID
 * @param {string} order.productName - Nama produk
 * @param {string} order.userName - Nama user pembeli
 * @param {string} order.userPhone - Nomor WA user
 * @param {number} order.totalPrice - Total harga
 * @param {string} [order.targetId] - ID tujuan top-up (nomor HP/game ID)
 * @param {string} [order.paymentMethod] - Metode pembayaran
 */
async function notifyAdminNewOrder(order) {
  const adminNumber = process.env.ADMIN_WA_NUMBER;

  if (!adminNumber) {
    console.error('❌ ADMIN_WA_NUMBER belum diset di environment variables!');
    return;
  }

  const message = buildOrderMessage(order);
  const result = await sendWhatsApp(adminNumber, message);

  if (result && result.status) {
    console.log(`✅ Notifikasi order #${order.id} terkirim ke admin WA`);
  } else {
    console.error(`❌ Gagal kirim notifikasi order #${order.id}:`, result?.reason || 'Unknown error');
  }

  return result;
}

/**
 * Build pesan WA notifikasi order masuk.
 * Template ini TIDAK boleh diubah tanpa konfirmasi pemilik!
 */
function buildOrderMessage(order) {
  const time = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const formatRp = (num) => {
    if (typeof num !== 'number') return '0';
    return num.toLocaleString('id-ID');
  };

  return `🛒 *ORDER MASUK - KENZY STORE*

📦 Produk   : ${order.productName || '-'}
👤 User     : ${order.userName || '-'}
📱 WA User  : ${order.userPhone || '-'}
🎯 Target   : ${order.targetId || '-'}
💳 Bayar    : ${order.paymentMethod || '-'}
💰 Total    : Rp ${formatRp(order.totalPrice)}
🕐 Waktu    : ${time}
🔖 Order ID : #${order.id}

Segera proses pesanan ini!
👉 ${process.env.WEBSITE_URL || 'https://kenzytopup-frontenddddd.vercel.app'}/admin/orders/${order.id}`;
}

module.exports = { notifyAdminNewOrder, buildOrderMessage };
