const prisma = require('../src/config/db');

async function check() {
  // 1. Cek user yang bisa di-blast
  const users = await prisma.user.findMany({
    where: { waVerified: true, phone: { not: '' } },
    select: { id: true, name: true, phone: true, waVerified: true }
  });
  console.log('=== Users dengan WA verified ===');
  console.log('Total:', users.length);
  users.forEach(u => console.log('  -', u.name, '|', u.phone, '| waVerified:', u.waVerified));

  // 2. Cek blast logs
  const logs = await prisma.blastLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { flashSale: { select: { title: true } } }
  });
  console.log('\n=== Blast Logs (terbaru) ===');
  console.log('Total logs:', logs.length);
  logs.forEach(l => console.log('  -', l.phone, '| status:', l.status, '| error:', l.errorMsg, '| flash sale:', l.flashSale?.title));

  // 3. Cek flash sales
  const flashSales = await prisma.flashSale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, title: true, createdAt: true, discountPercent: true }
  });
  console.log('\n=== Flash Sales (terbaru) ===');
  flashSales.forEach(f => console.log('  -', f.title, '| diskon:', f.discountPercent + '%', '| dibuat:', f.createdAt));

  // 4. Cek FONNTE_TOKEN
  console.log('\n=== Config ===');
  console.log('FONNTE_TOKEN set:', !!process.env.FONNTE_TOKEN);

  await prisma.$disconnect();
}

check().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
