// ============================================
// Card Drop Utility — Kartu Kolektibel
// ============================================
//
// Dipanggil setelah transaksi berhasil dikonfirmasi admin.
// Mengembalikan kartu yang didapat, atau null jika tidak dapat.
//
// Mekanisme:
// 1. Roll 40% chance apakah user dapat kartu
// 2. Roll rarity berdasarkan weight (Common 50%, Rare 30%, Epic 15%, Legendary 5%)
// 3. Pilih kartu random dari pool yang belum dimiliki user
// 4. Jika semua kartu rarity itu sudah dimiliki, return null (duplicate diabaikan)
// ============================================

const CARD_DROP_CHANCE = 0.4; // 40%

const RARITY_WEIGHTS = {
  COMMON: 50,
  RARE: 30,
  EPIC: 15,
  LEGENDARY: 5,
};

/**
 * Roll apakah user dapat kartu setelah top-up berhasil.
 * @param {string} userId - ID user yang mendapat kartu
 * @param {import('@prisma/client').PrismaClient} prisma - Prisma client instance
 * @returns {Promise<object|null>} Kartu yang didapat, atau null
 */
async function rollCardDrop(userId, prisma) {
  // 1. Roll apakah user dapat kartu (40% chance)
  if (Math.random() > CARD_DROP_CHANCE) return null;

  // 2. Tentukan rarity berdasarkan weight
  const rarity = rollRarity();

  // 3. Ambil semua card ID yang sudah dimiliki user
  const ownedCardIds = await prisma.userCard.findMany({
    where: { userId },
    select: { cardId: true },
  });
  const ownedIds = ownedCardIds.map((uc) => uc.cardId);

  // 4. Ambil semua kartu eligible (rarity cocok + belum dimiliki)
  //    Prisma tidak punya ORDER BY RANDOM(), jadi kita ambil semua lalu pilih random di JS
  let eligibleCards = await prisma.card.findMany({
    where: {
      rarity,
      id: { notIn: ownedIds },
    },
  });

  // Fallback: user sudah punya semua kartu rarity ini → return null (duplicate diabaikan)
  if (eligibleCards.length === 0) {
    return null;
  }

  // 5. Pilih kartu random dari pool eligible
  const randomIndex = Math.floor(Math.random() * eligibleCards.length);
  const card = eligibleCards[randomIndex];

  // 6. Simpan ke UserCard (skip jika sudah punya — karena @@unique)
  try {
    await prisma.userCard.create({
      data: { userId, cardId: card.id },
    });
  } catch (e) {
    // Duplicate — user sudah punya kartu ini (race condition), return null
    if (e.code === 'P2002') {
      return null;
    }
    throw e; // Re-throw unexpected errors
  }

  return card;
}

/**
 * Roll rarity berdasarkan weighted probability.
 * @returns {'COMMON'|'RARE'|'EPIC'|'LEGENDARY'}
 */
function rollRarity() {
  const rand = Math.random() * 100;
  if (rand < 5) return 'LEGENDARY';   // 5%
  if (rand < 20) return 'EPIC';       // 15% (5 + 15 = 20)
  if (rand < 50) return 'RARE';       // 30% (20 + 30 = 50)
  return 'COMMON';                     // 50%
}

module.exports = { rollCardDrop };
