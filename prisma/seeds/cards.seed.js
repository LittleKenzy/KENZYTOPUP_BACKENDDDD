// ============================================
// Card Seeder — Data Kartu Kolektibel Awal
// ============================================
//
// Jalankan: node prisma/seeds/cards.seed.js
//
// Distribusi: 10 Common, 5 Rare, 3 Epic, 2 Legendary
// Total: 20 kartu
//
// PENTING: Seeder ini TIDAK menghapus data yang sudah ada.
// Menggunakan upsert berdasarkan nama kartu untuk mencegah duplikat.
// ============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cards = [
  // ── COMMON (10 kartu) ──────────────────────
  {
    name: 'Prajurit Naga',
    rarity: 'COMMON',
    imageUrl: 'https://picsum.photos/seed/card-dragon-warrior/400/560',
    description: 'Prajurit muda yang berlatih di lembah naga. Semangatnya membara!',
  },
  {
    name: 'Pedang Kayu',
    rarity: 'COMMON',
    imageUrl: 'https://picsum.photos/seed/card-wood-sword/400/560',
    description: 'Pedang latihan pemula. Sederhana tapi tajam.',
  },
  {
    name: 'Potion Hijau',
    rarity: 'COMMON',
    imageUrl: 'https://picsum.photos/seed/card-green-potion/400/560',
    description: 'Ramuan penyembuh dasar. Memulihkan sedikit HP.',
  },
  {
    name: 'Perisai Batu',
    rarity: 'COMMON',
    imageUrl: 'https://picsum.photos/seed/card-stone-shield/400/560',
    description: 'Perisai dari batu gunung. Berat tapi kokoh.',
  },
  {
    name: 'Jubah Pengelana',
    rarity: 'COMMON',
    imageUrl: 'https://picsum.photos/seed/card-wanderer-cloak/400/560',
    description: 'Jubah usang milik pengelana. Nyaman untuk perjalanan jauh.',
  },
  {
    name: 'Panah Api',
    rarity: 'COMMON',
    imageUrl: 'https://picsum.photos/seed/card-fire-arrow/400/560',
    description: 'Panah yang ujungnya berselimut api. Cocok untuk berburu.',
  },
  {
    name: 'Helm Besi',
    rarity: 'COMMON',
    imageUrl: 'https://picsum.photos/seed/card-iron-helm/400/560',
    description: 'Helm standar pasukan kerajaan. Melindungi dari serangan ringan.',
  },
  {
    name: 'Kristal Kecil',
    rarity: 'COMMON',
    imageUrl: 'https://picsum.photos/seed/card-small-crystal/400/560',
    description: 'Kristal kecil yang bersinar samar. Sumber mana dasar.',
  },
  {
    name: 'Sepatu Kulit',
    rarity: 'COMMON',
    imageUrl: 'https://picsum.photos/seed/card-leather-boots/400/560',
    description: 'Sepatu kulit ringan. Meningkatkan kelincahan sedikit.',
  },
  {
    name: 'Scroll Dasar',
    rarity: 'COMMON',
    imageUrl: 'https://picsum.photos/seed/card-basic-scroll/400/560',
    description: 'Gulungan mantra dasar. Berisi sihir pembersih.',
  },

  // ── RARE (5 kartu) ─────────────────────────
  {
    name: 'Pedang Langit',
    rarity: 'RARE',
    imageUrl: 'https://picsum.photos/seed/card-sky-blade/400/560',
    description: 'Pedang yang ditempa dari besi langit. Ringan namun mematikan.',
  },
  {
    name: 'Elixir Biru',
    rarity: 'RARE',
    imageUrl: 'https://picsum.photos/seed/card-blue-elixir/400/560',
    description: 'Ramuan langka yang memulihkan mana secara instan.',
  },
  {
    name: 'Armor Ksatria',
    rarity: 'RARE',
    imageUrl: 'https://picsum.photos/seed/card-knight-armor/400/560',
    description: 'Armor berlapis perak milik ksatria terpilih. Sangat tangguh.',
  },
  {
    name: 'Tongkat Sihir',
    rarity: 'RARE',
    imageUrl: 'https://picsum.photos/seed/card-magic-staff/400/560',
    description: 'Tongkat dari pohon Yggdrasil. Mengalirkan mana dengan efisien.',
  },
  {
    name: 'Cincin Pelindung',
    rarity: 'RARE',
    imageUrl: 'https://picsum.photos/seed/card-protector-ring/400/560',
    description: 'Cincin yang memberikan pelindung magis kepada pemakainya.',
  },

  // ── EPIC (3 kartu) ─────────────────────────
  {
    name: 'Mahkota Abadi',
    rarity: 'EPIC',
    imageUrl: 'https://picsum.photos/seed/card-eternal-crown/400/560',
    description: 'Mahkota kuno yang konon tidak bisa dihancurkan. Simbol kekuasaan.',
  },
  {
    name: 'Phoenix Blade',
    rarity: 'EPIC',
    imageUrl: 'https://picsum.photos/seed/card-phoenix-blade/400/560',
    description: 'Pedang yang bangkit dari abu. Apinya tidak pernah padam.',
  },
  {
    name: 'Grimoire Gelap',
    rarity: 'EPIC',
    imageUrl: 'https://picsum.photos/seed/card-dark-grimoire/400/560',
    description: 'Buku mantra terlarang dari dimensi kegelapan. Kekuatan luar biasa.',
  },

  // ── LEGENDARY (2 kartu) ────────────────────
  {
    name: 'Legenda Kenzy',
    rarity: 'LEGENDARY',
    imageUrl: 'https://picsum.photos/seed/card-kenzy-legend/400/560',
    description: 'Kartu legendaris eksklusif Kenzy Store. Hanya yang beruntung yang memilikinya!',
  },
  {
    name: 'Naga Langit Abadi',
    rarity: 'LEGENDARY',
    imageUrl: 'https://picsum.photos/seed/card-eternal-dragon/400/560',
    description: 'Naga purba yang menguasai langit dan lautan. Kekuatan tak tertandingi.',
  },
];

async function seedCards() {
  console.log('🃏 Memulai seeding kartu kolektibel...');
  console.log(`   Total kartu: ${cards.length}`);
  console.log('   ⚠️  Data existing TIDAK akan dihapus (menggunakan upsert)\n');

  let created = 0;
  let skipped = 0;

  for (const card of cards) {
    // Cek apakah kartu dengan nama ini sudah ada
    const existing = await prisma.card.findFirst({
      where: { name: card.name },
    });

    if (existing) {
      console.log(`   ⏭️  Skip: "${card.name}" (sudah ada)`);
      skipped++;
      continue;
    }

    await prisma.card.create({
      data: card,
    });
    console.log(`   ✅ Created: "${card.name}" [${card.rarity}]`);
    created++;
  }

  console.log(`\n🎉 Seeding selesai!`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);

  // Tampilkan distribusi
  const distribution = await prisma.card.groupBy({
    by: ['rarity'],
    _count: true,
  });
  console.log('\n📊 Distribusi kartu di database:');
  distribution.forEach((d) => {
    console.log(`   ${d.rarity}: ${d._count}`);
  });
}

seedCards()
  .catch((e) => {
    console.error('❌ Seeding gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
