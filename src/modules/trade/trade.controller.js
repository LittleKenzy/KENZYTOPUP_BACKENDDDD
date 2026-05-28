// ============================================
// Trade Controller — Wishlist & Trade Endpoints
// ============================================

const prisma = require('../../config/db');
const { createTradeOfferSchema, cardIdParamSchema } = require('./tradeValidator');
const { runAutoMatch } = require('./tradeMatchService');
const { processTradeConfirmation } = require('./tradeConfirmService');

// ═══════════════════════════════════════════════
// WISHLIST ENDPOINTS
// ═══════════════════════════════════════════════

// ─── GET /api/wishlist — Ambil wishlist user ──
async function getWishlist(req, res, next) {
  try {
    const userId = req.user.userId;

    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            rarity: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: wishlist.map((w) => ({
        id: w.id,
        cardId: w.cardId,
        card: w.card,
        createdAt: w.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/wishlist/:cardId — Tambah ke wishlist ──
async function addToWishlist(req, res, next) {
  try {
    const userId = req.user.userId;
    const { cardId } = cardIdParamSchema.parse(req.params);

    // Cek apakah kartu ada
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Kartu tidak ditemukan.',
      });
    }

    // Cek apakah user sudah punya kartu ini (kalau sudah punya, tidak perlu wishlist)
    const owned = await prisma.userCard.findUnique({
      where: { userId_cardId: { userId, cardId } },
    });
    if (owned) {
      return res.status(400).json({
        success: false,
        message: 'Kamu sudah memiliki kartu ini. Tidak perlu ditambahkan ke wishlist.',
      });
    }

    // Tambah ke wishlist (unique constraint handle duplikat)
    const wishlistItem = await prisma.wishlist.create({
      data: { userId, cardId },
      include: { card: true },
    });

    return res.status(201).json({
      success: true,
      message: 'Kartu berhasil ditambahkan ke wishlist.',
      data: {
        id: wishlistItem.id,
        cardId: wishlistItem.cardId,
        card: wishlistItem.card,
      },
    });
  } catch (error) {
    // Handle unique constraint violation (sudah ada di wishlist)
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Kartu sudah ada di wishlist kamu.',
      });
    }
    next(error);
  }
}

// ─── DELETE /api/wishlist/:cardId — Hapus dari wishlist ──
async function removeFromWishlist(req, res, next) {
  try {
    const userId = req.user.userId;
    const { cardId } = cardIdParamSchema.parse(req.params);

    const deleted = await prisma.wishlist.deleteMany({
      where: { userId, cardId },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kartu tidak ditemukan di wishlist kamu.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Kartu berhasil dihapus dari wishlist.',
    });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════
// TRADE ENDPOINTS
// ═══════════════════════════════════════════════

// ─── GET /api/trade — List semua trade offer OPEN (marketplace) ──
async function listOpenTrades(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const [trades, total] = await Promise.all([
      prisma.tradeOffer.findMany({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          offerer: { select: { id: true, name: true } },
          offeredCard: {
            select: { id: true, name: true, imageUrl: true, rarity: true },
          },
          wantedCard: {
            select: { id: true, name: true, imageUrl: true, rarity: true },
          },
        },
      }),
      prisma.tradeOffer.count({ where: { status: 'OPEN' } }),
    ]);

    return res.status(200).json({
      success: true,
      data: trades.map((t) => ({
        id: t.id,
        status: t.status,
        offerer: t.offerer,
        offeredCard: t.offeredCard,
        wantedCard: t.wantedCard,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/trade/mine — Trade offer milik user ──
async function getMyTrades(req, res, next) {
  try {
    const userId = req.user.userId;

    const trades = await prisma.tradeOffer.findMany({
      where: {
        OR: [
          { offererId: userId },
          { matchedUserId: userId },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        offerer: { select: { id: true, name: true } },
        matchedUser: { select: { id: true, name: true } },
        offeredCard: {
          select: { id: true, name: true, imageUrl: true, rarity: true },
        },
        wantedCard: {
          select: { id: true, name: true, imageUrl: true, rarity: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: trades.map((t) => ({
        id: t.id,
        status: t.status,
        offerer: t.offerer,
        matchedUser: t.matchedUser,
        offeredCard: t.offeredCard,
        wantedCard: t.wantedCard,
        confirmedByOfferer: t.confirmedByOfferer,
        confirmedByMatcher: t.confirmedByMatcher,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/trade/matches — Trade yang cocok dengan wishlist user ──
async function getMatchingTrades(req, res, next) {
  try {
    const userId = req.user.userId;

    // Ambil wishlist user
    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      select: { cardId: true },
    });

    const wishlistCardIds = wishlist.map((w) => w.cardId);

    // Ambil kartu yang dimiliki user
    const ownedCards = await prisma.userCard.findMany({
      where: { userId },
      select: { cardId: true },
    });
    const ownedCardIds = ownedCards.map((uc) => uc.cardId);

    // Cari trade yang:
    // - Status OPEN
    // - wantedCard ada di koleksi user (user punya kartu yang diminta, sehingga bisa konfirmasi)
    // - Bukan trade milik user sendiri
    const matchingTrades = await prisma.tradeOffer.findMany({
      where: {
        status: 'OPEN',
        offererId: { not: userId },
        wantedCardId: { in: ownedCardIds },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        offerer: { select: { id: true, name: true } },
        offeredCard: {
          select: { id: true, name: true, imageUrl: true, rarity: true },
        },
        wantedCard: {
          select: { id: true, name: true, imageUrl: true, rarity: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: matchingTrades.map((t) => ({
        id: t.id,
        status: t.status,
        offerer: t.offerer,
        offeredCard: t.offeredCard,
        wantedCard: t.wantedCard,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/trade — Buat trade offer baru ──
async function createTradeOffer(req, res, next) {
  try {
    const userId = req.user.userId;

    // Validasi input
    const { offeredCardId, wantedCardId } = createTradeOfferSchema.parse(req.body);

    // Cek: user harus memiliki offeredCard
    const ownedCard = await prisma.userCard.findUnique({
      where: { userId_cardId: { userId, cardId: offeredCardId } },
    });
    if (!ownedCard) {
      return res.status(400).json({
        success: false,
        message: 'Kamu tidak memiliki kartu yang ditawarkan.',
      });
    }

    // Cek: wantedCard harus ada di database
    const wantedCard = await prisma.card.findUnique({
      where: { id: wantedCardId },
    });
    if (!wantedCard) {
      return res.status(404).json({
        success: false,
        message: 'Kartu yang diminta tidak ditemukan.',
      });
    }

    // Cek: user belum punya trade OPEN/MATCHED dengan kartu yang sama
    const existingTrade = await prisma.tradeOffer.findFirst({
      where: {
        offererId: userId,
        offeredCardId,
        status: { in: ['OPEN', 'MATCHED'] },
      },
    });
    if (existingTrade) {
      return res.status(400).json({
        success: false,
        message: 'Kamu sudah punya trade aktif dengan kartu ini.',
      });
    }

    // Cek: batas maksimal 3 trade aktif per user
    const activeTradeCount = await prisma.tradeOffer.count({
      where: {
        offererId: userId,
        status: { in: ['OPEN', 'MATCHED'] },
      },
    });
    if (activeTradeCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Kamu sudah mencapai batas maksimal 3 trade aktif. Batalkan salah satu atau tunggu sampai selesai.',
      });
    }

    // Buat trade offer (expiresAt = createdAt + 7 hari)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const trade = await prisma.tradeOffer.create({
      data: {
        offererId: userId,
        offeredCardId,
        wantedCardId,
        expiresAt,
      },
      include: {
        offeredCard: { select: { id: true, name: true, imageUrl: true, rarity: true } },
        wantedCard: { select: { id: true, name: true, imageUrl: true, rarity: true } },
      },
    });

    // Jalankan auto-match (fire-and-forget)
    const matchResult = runAutoMatch(trade.id).catch((err) => {
      console.error('❌ Auto-match error:', err.message);
      return { matched: false, reason: 'Auto-match error' };
    });

    // Tunggu match result untuk response
    const match = await matchResult;

    return res.status(201).json({
      success: true,
      message: match.matched
        ? 'Trade offer berhasil dibuat dan match ditemukan! Silakan konfirmasi.'
        : 'Trade offer berhasil dibuat. Menunggu match dari user lain.',
      data: {
        id: trade.id,
        offeredCard: trade.offeredCard,
        wantedCard: trade.wantedCard,
        status: match.matched ? 'MATCHED' : 'OPEN',
        expiresAt: trade.expiresAt,
        matched: match.matched,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/trade/:id/confirm — Konfirmasi trade ──
async function confirmTrade(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Trade ID tidak valid.',
      });
    }

    const result = await processTradeConfirmation(id, userId);

    return res.status(result.status || 200).json({
      success: result.success,
      message: result.message,
      completed: result.completed || false,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/trade/:id/cancel — Batalkan trade offer ──
async function cancelTrade(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Trade ID tidak valid.',
      });
    }

    const trade = await prisma.tradeOffer.findUnique({
      where: { id },
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade tidak ditemukan.',
      });
    }

    // Hanya offerer yang bisa cancel
    if (trade.offererId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Hanya pembuat trade yang bisa membatalkan.',
      });
    }

    // Hanya bisa cancel kalau status OPEN atau MATCHED
    if (!['OPEN', 'MATCHED'].includes(trade.status)) {
      return res.status(400).json({
        success: false,
        message: `Trade tidak bisa dibatalkan. Status saat ini: ${trade.status}.`,
      });
    }

    await prisma.tradeOffer.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return res.status(200).json({
      success: true,
      message: 'Trade berhasil dibatalkan.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  // Wishlist
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  // Trade
  listOpenTrades,
  getMyTrades,
  getMatchingTrades,
  createTradeOffer,
  confirmTrade,
  cancelTrade,
};
