// ============================================
// Trade Match Service — Auto-matching logic
// ============================================
//
// Dipanggil setelah trade offer baru dibuat.
// Mencari user yang:
//   1. Punya cardId === wantedCardId di wishlist mereka
//   2. Punya kartu offeredCardId di user_cards mereka
//   3. Bukan si offerer sendiri
//   4. Belum ada trade aktif dengan kartu yang sama
// ============================================

const prisma = require('../../config/db');
const { sendWhatsApp } = require('../../utils/whatsapp');

/**
 * Jalankan auto-match untuk sebuah trade offer.
 * Jika match ditemukan, update status → MATCHED dan kirim WA notif.
 * Jika tidak ada match, biarkan status OPEN (tampil di marketplace).
 *
 * @param {string} tradeOfferId - ID TradeOffer yang baru dibuat
 * @returns {Promise<object>} Hasil matching
 */
async function runAutoMatch(tradeOfferId) {
  // 1. Ambil detail trade offer
  const trade = await prisma.tradeOffer.findUnique({
    where: { id: tradeOfferId },
    include: {
      offeredCard: true,
      wantedCard: true,
      offerer: { select: { id: true, phone: true, name: true } },
    },
  });

  if (!trade || trade.status !== 'OPEN') {
    return { matched: false, reason: 'Trade tidak ditemukan atau bukan OPEN.' };
  }

  // 2. Cari user yang:
  //    - Punya offeredCardId di WISHLIST mereka (mereka menginginkan kartu ini)
  //      WAIT — logika sebenarnya: cari user yang menginginkan trade.offeredCard
  //      DAN punya trade.wantedCard di koleksi mereka
  //
  //    Koreksi: Match = user yang PUNYA wantedCard (yang diminta offerer)
  //    dan MENGINGINKAN offeredCard (yang ditawarkan offerer)
  //
  //    Jadi: cari user yang:
  //      a. offeredCardId ada di wishlist mereka → mereka mau kartu ini
  //      b. Mereka punya wantedCardId di userCards → mereka bisa kasih kartu yang diminta
  //
  // Query: user yang wishlist-nya mengandung offeredCardId
  //         DAN userCards-nya mengandung wantedCardId
  //         DAN bukan offerer
  //         DAN tidak punya trade aktif yang melibatkan kartu yang sama

  const potentialMatches = await prisma.user.findMany({
    where: {
      id: { not: trade.offererId },
      // User ini MENGINGINKAN kartu yang ditawarkan (offeredCard)
      wishlist: {
        some: { cardId: trade.offeredCardId },
      },
      // User ini MEMILIKI kartu yang diminta (wantedCard)
      userCards: {
        some: { cardId: trade.wantedCardId },
      },
    },
    select: {
      id: true,
      phone: true,
      name: true,
    },
  });

  if (potentialMatches.length === 0) {
    return { matched: false, reason: 'Belum ada user yang cocok.' };
  }

  // 3. Filter: pastikan match belum punya trade aktif dengan kartu yang sama
  for (const match of potentialMatches) {
    const existingActiveTrade = await prisma.tradeOffer.findFirst({
      where: {
        OR: [
          // Match sudah menawarkan wantedCard di trade lain yang aktif
          {
            offererId: match.id,
            offeredCardId: trade.wantedCardId,
            status: { in: ['OPEN', 'MATCHED'] },
          },
          // Match sudah jadi matchedUser di trade lain yang melibatkan wantedCard
          {
            matchedUserId: match.id,
            status: { in: ['MATCHED'] },
            wantedCardId: trade.wantedCardId,
          },
        ],
      },
    });

    if (existingActiveTrade) {
      continue; // Skip user yang sudah punya trade aktif
    }

    // 4. Match ditemukan! Update trade offer
    await prisma.tradeOffer.update({
      where: { id: tradeOfferId },
      data: {
        status: 'MATCHED',
        matchedUserId: match.id,
      },
    });

    // 5. Kirim notif WA (fire-and-forget, jangan block)
    const offererMsg = `🔄 *TRADE MATCH!*\n\nAda yang mau trade kartu *${trade.wantedCard.name}* dengan kartu *${trade.offeredCard.name}* kamu!\n\nBuka app Kenzy Store untuk konfirmasi.\n👉 ${process.env.WEBSITE_URL || 'https://kenzytopup-frontenddddd.vercel.app/'}`;

    const matcherMsg = `🔄 *TRADE MATCH!*\n\nAda yang mau trade kartu *${trade.offeredCard.name}* dengan kartu *${trade.wantedCard.name}* kamu!\n\nBuka app Kenzy Store untuk konfirmasi.\n👉 ${process.env.WEBSITE_URL || 'https://kenzytopup-frontenddddd.vercel.app/'}`;

    // Fire-and-forget — don't await, don't block
    sendWhatsApp(trade.offerer.phone, offererMsg).catch((err) => {
      console.error('❌ Gagal kirim WA notif trade ke offerer:', err.message);
    });

    sendWhatsApp(match.phone, matcherMsg).catch((err) => {
      console.error('❌ Gagal kirim WA notif trade ke matcher:', err.message);
    });

    return {
      matched: true,
      matchedUserId: match.id,
      matchedUserName: match.name,
    };
  }

  // Semua potentialMatches sudah punya trade aktif
  return { matched: false, reason: 'Semua kandidat sudah punya trade aktif dengan kartu yang sama.' };
}

module.exports = { runAutoMatch };
