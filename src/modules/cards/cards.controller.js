// ============================================
// Cards Controller — Kartu Kolektibel
// ============================================

const prisma = require('../../config/db');

// ─── GET /api/cards/catalog ─────────────────
// Semua kartu di sistem + status owned/unowned bagi user yang login
async function getCardCatalog(req, res, next) {
  try {
    const userId = req.user.userId;

    // Ambil semua kartu
    const allCards = await prisma.card.findMany({
      orderBy: [
        { rarity: 'asc' },
        { name: 'asc' },
      ],
    });

    // Ambil kartu yang sudah dimiliki user
    const ownedCards = await prisma.userCard.findMany({
      where: { userId },
      select: { cardId: true, obtainedAt: true },
    });

    const ownedMap = new Map();
    ownedCards.forEach((uc) => ownedMap.set(uc.cardId, uc.obtainedAt));

    // Map kartu dengan status owned
    const cards = allCards.map((card) => ({
      id: card.id,
      name: card.name,
      description: card.description,
      imageUrl: card.imageUrl,
      rarity: card.rarity,
      owned: ownedMap.has(card.id),
      obtainedAt: ownedMap.get(card.id) || null,
    }));

    return res.status(200).json({
      success: true,
      cards,
      stats: {
        total: allCards.length,
        owned: ownedCards.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/cards/my-collection ───────────
// Hanya kartu yang sudah dimiliki user, diurutkan terbaru
async function getMyCollection(req, res, next) {
  try {
    const userId = req.user.userId;

    const userCards = await prisma.userCard.findMany({
      where: { userId },
      orderBy: { obtainedAt: 'desc' },
      include: {
        card: true,
      },
    });

    const cards = userCards.map((uc) => ({
      id: uc.card.id,
      name: uc.card.name,
      description: uc.card.description,
      imageUrl: uc.card.imageUrl,
      rarity: uc.card.rarity,
      obtainedAt: uc.obtainedAt,
    }));

    return res.status(200).json({
      success: true,
      cards,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCardCatalog,
  getMyCollection,
};
