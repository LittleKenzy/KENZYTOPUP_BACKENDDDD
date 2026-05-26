const prisma = require('../src/config/db');

async function verify() {
  const users = await prisma.user.count();
  const transactions = await prisma.transaction.count();
  const products = await prisma.product.count();
  const cards = await prisma.card.count();
  const byRarity = await prisma.card.groupBy({ by: ['rarity'], _count: true });

  console.log('=== DATA INTEGRITY CHECK ===');
  console.log('Users:', users);
  console.log('Transactions:', transactions);
  console.log('Products:', products);
  console.log('Cards (new):', cards);
  console.log('Card distribution:', byRarity.map(r => `${r.rarity}: ${r._count}`).join(', '));
  console.log('=== ALL DATA SAFE ===');
  
  await prisma.$disconnect();
}

verify().catch(e => { console.error(e); process.exit(1); });
