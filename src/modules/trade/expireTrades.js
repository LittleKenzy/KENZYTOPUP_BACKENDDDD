// ============================================
// Expire Trades Job — Cron job untuk expired trades
// ============================================
//
// Jalan setiap jam (dipanggil dari app.js atau scheduler).
// Cari semua TradeOffer OPEN/MATCHED yang sudah lewat expiresAt.
// Update status → EXPIRED. JANGAN hapus record.
// ============================================

const prisma = require('../../config/db');

/**
 * Expire semua trade offer yang sudah melewati waktu kadaluarsa.
 * Hanya update status, tidak menghapus record.
 *
 * @returns {Promise<object>} Hasil proses expire
 */
async function expireOldTrades() {
  const now = new Date();

  try {
    const result = await prisma.tradeOffer.updateMany({
      where: {
        status: { in: ['OPEN', 'MATCHED'] },
        expiresAt: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count > 0) {
      console.log(`⏰ Expired ${result.count} trade offer(s) at ${now.toISOString()}`);
    }

    return { expired: result.count };
  } catch (error) {
    console.error('❌ Error expiring trades:', error.message);
    return { expired: 0, error: error.message };
  }
}

module.exports = { expireOldTrades };
