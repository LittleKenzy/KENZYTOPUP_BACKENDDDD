// ============================================
// Trade Confirm Service — Proses konfirmasi trade
// ============================================
//
// Alur:
//   1. Offerer atau matchedUser konfirmasi
//   2. Jika KEDUA pihak sudah konfirmasi:
//      - Tukar kartu secara atomic (Prisma $transaction)
//      - Update status → COMPLETED
//      - Kirim WA notif ke kedua pihak
//   3. Jika baru satu pihak: update field saja
//
// PENTING: Menggunakan prisma.$transaction() agar atomic.
//          Kalau transaksi gagal, tidak ada kartu yang hilang.
// ============================================

const prisma = require('../../config/db');
const { sendWhatsApp } = require('../../utils/whatsapp');

/**
 * Proses konfirmasi trade dari salah satu pihak.
 *
 * @param {string} tradeId - ID TradeOffer
 * @param {string} userId - ID user yang mengkonfirmasi
 * @returns {Promise<object>} Hasil konfirmasi
 */
async function processTradeConfirmation(tradeId, userId) {
  // 1. Ambil trade dan cek status
  const trade = await prisma.tradeOffer.findUnique({
    where: { id: tradeId },
    include: {
      offerer: { select: { id: true, phone: true, name: true } },
      matchedUser: { select: { id: true, phone: true, name: true } },
      offeredCard: { select: { id: true, name: true } },
      wantedCard: { select: { id: true, name: true } },
    },
  });

  if (!trade) {
    return { success: false, status: 404, message: 'Trade tidak ditemukan.' };
  }

  if (trade.status !== 'MATCHED' && trade.status !== 'OPEN') {
    return {
      success: false,
      status: 400,
      message: `Trade tidak bisa dikonfirmasi. Status saat ini: ${trade.status}.`,
    };
  }

  // 2. Tentukan siapa yang konfirmasi
  let isOfferer = userId === trade.offererId;
  let isMatcher = userId === trade.matchedUserId;

  // Jika trade OPEN dan yang klik bukan offerer, jadikan dia matcher
  if (trade.status === 'OPEN' && !isOfferer) {
    // Pastikan user ini punya kartu yang diminta offerer!
    const ownsWantedCard = await prisma.userCard.findUnique({
      where: {
        userId_cardId: { userId, cardId: trade.wantedCardId }
      }
    });

    if (!ownsWantedCard) {
      return {
        success: false,
        status: 400,
        message: 'Kamu tidak bisa mengkonfirmasi trade ini karena kamu tidak memiliki kartu yang diminta.'
      };
    }

    // Jadikan dia matcher
    trade.matchedUserId = userId;
    isMatcher = true;
    trade.matchedUser = await prisma.user.findUnique({ select: { id: true, phone: true, name: true }, where: { id: userId } });
    
    // Update status ke MATCHED di memori, akan tersimpan di DB nanti
    trade.status = 'MATCHED';
  }

  if (!isOfferer && !isMatcher) {
    return {
      success: false,
      status: 403,
      message: 'Anda bukan bagian dari trade ini.',
    };
  }

  // Cek apakah sudah pernah konfirmasi
  if (isOfferer && trade.confirmedByOfferer) {
    return {
      success: false,
      status: 400,
      message: 'Anda sudah mengkonfirmasi trade ini. Menunggu pihak lain.',
    };
  }
  if (isMatcher && trade.confirmedByMatcher) {
    return {
      success: false,
      status: 400,
      message: 'Anda sudah mengkonfirmasi trade ini. Menunggu pihak lain.',
    };
  }

  // 3. Update konfirmasi
  const updateData = {};
  if (isOfferer) updateData.confirmedByOfferer = true;
  if (isMatcher) updateData.confirmedByMatcher = true;
  if (trade.status === 'MATCHED') updateData.status = 'MATCHED';
  if (trade.matchedUserId) updateData.matchedUserId = trade.matchedUserId;

  // Cek apakah setelah update ini, kedua pihak sudah konfirmasi
  const willOffererConfirm = isOfferer ? true : trade.confirmedByOfferer;
  const willMatcherConfirm = isMatcher ? true : trade.confirmedByMatcher;
  const bothConfirmed = willOffererConfirm && willMatcherConfirm;

  if (!bothConfirmed) {
    // Baru satu pihak, update field saja
    await prisma.tradeOffer.update({
      where: { id: tradeId },
      data: updateData,
    });

    return {
      success: true,
      completed: false,
      message: 'Konfirmasi berhasil. Menunggu konfirmasi dari pihak lain.',
    };
  }

  // 4. KEDUA pihak sudah konfirmasi → Tukar kartu secara atomic
  try {
    await prisma.$transaction(async (tx) => {
      // a. Hapus offeredCard dari offerer
      await tx.userCard.delete({
        where: {
          userId_cardId: {
            userId: trade.offererId,
            cardId: trade.offeredCard.id,
          },
        },
      });

      // b. Tambah offeredCard ke matchedUser
      await tx.userCard.create({
        data: {
          userId: trade.matchedUserId,
          cardId: trade.offeredCard.id,
        },
      });

      // c. Hapus wantedCard dari matchedUser
      await tx.userCard.delete({
        where: {
          userId_cardId: {
            userId: trade.matchedUserId,
            cardId: trade.wantedCard.id,
          },
        },
      });

      // d. Tambah wantedCard ke offerer
      await tx.userCard.create({
        data: {
          userId: trade.offererId,
          cardId: trade.wantedCard.id,
        },
      });

      // e. Update trade status → COMPLETED
      await tx.tradeOffer.update({
        where: { id: tradeId },
        data: {
          ...updateData,
          status: 'COMPLETED',
        },
      });
    });
  } catch (error) {
    console.error('❌ Trade transaction gagal:', error.message);

    // Jika error karena kartu sudah tidak ada (P2025 = record not found)
    if (error.code === 'P2025') {
      return {
        success: false,
        status: 400,
        message: 'Trade gagal: salah satu kartu sudah tidak dimiliki. Trade dibatalkan.',
      };
    }

    return {
      success: false,
      status: 500,
      message: 'Trade gagal karena kesalahan sistem. Tidak ada kartu yang hilang.',
    };
  }

  // 5. Kirim WA notif ke kedua pihak (fire-and-forget)
  const successMsg = (userName, gotCard, gaveCard) =>
    `✅ *TRADE BERHASIL!*\n\nHai ${userName}!\nKartu *${gotCard}* sudah masuk ke koleksi kamu.\nKartu *${gaveCard}* sudah dikirim ke partner trade.\n\nCek koleksi kamu di Kenzy Store!\n👉 ${process.env.WEBSITE_URL || 'https://kenzytopup-frontenddddd.vercel.app/'}`;

  sendWhatsApp(
    trade.offerer.phone,
    successMsg(trade.offerer.name, trade.wantedCard.name, trade.offeredCard.name)
  ).catch((err) => {
    console.error('❌ Gagal kirim WA trade success ke offerer:', err.message);
  });

  sendWhatsApp(
    trade.matchedUser.phone,
    successMsg(trade.matchedUser.name, trade.offeredCard.name, trade.wantedCard.name)
  ).catch((err) => {
    console.error('❌ Gagal kirim WA trade success ke matcher:', err.message);
  });

  return {
    success: true,
    completed: true,
    message: 'Trade berhasil! Kartu sudah ditukar.',
  };
}

module.exports = { processTradeConfirmation };
