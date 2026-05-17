/**
 * Retry blast - hapus log gagal lalu kirim ulang
 */
const prisma = require('../src/config/db');
const blastService = require('../src/modules/flashsale/blast.service');

async function retryBlast() {
  const flashSale = await prisma.flashSale.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { product: true }
  });

  if (!flashSale) {
    console.log('❌ Tidak ada flash sale.');
    return;
  }

  console.log('📢 Flash Sale:', flashSale.title);

  // Hapus blast logs yang gagal
  const deleted = await prisma.blastLog.deleteMany({
    where: { flashSaleId: flashSale.id }
  });
  console.log(`🗑️ Hapus ${deleted.count} blast log lama`);

  // Retry blast
  console.log('🚀 Retry blast...');
  const result = await blastService.triggerBlast(flashSale, flashSale.product);
  console.log('📤 Blast diqueue:', result);

  // Tunggu async blast selesai
  console.log('⏳ Menunggu blast selesai...');
  await new Promise(r => setTimeout(r, 20000));

  // Cek hasil
  const stats = await blastService.getBlastStats(flashSale.id);
  console.log('📊 Final stats:', stats);

  // Lihat detail yang gagal
  const failed = await prisma.blastLog.findMany({
    where: { flashSaleId: flashSale.id, status: 'failed' },
    select: { phone: true, errorMsg: true }
  });
  if (failed.length > 0) {
    console.log('\n❌ Yang gagal:');
    failed.forEach(f => console.log('  -', f.phone, '|', f.errorMsg));
  }

  await prisma.$disconnect();
}

retryBlast().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
