// ============================================
// Seed Data — Kenzy Store
// Mengisi database dengan data awal untuk demo
// ============================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database Kenzy Store...\n');

  // ─── 1. BUAT AKUN ADMIN & USER ──────────────
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const userPassword = await bcrypt.hash('User123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'bilal.alaudin.addaba2@gmail.com' },
    update: {},
    create: {
      name: 'Admin Kenzy',
      phone: '082395928309',
      email: 'bilal.alaudin.addaba2@gmail.com',
      password: adminPassword,
      role: 'admin',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@kenzystore.com' },
    update: {},
    create: {
      name: 'Budi Santoso',
      phone: '081300000001',
      email: 'user@kenzystore.com',
      password: userPassword,
      role: 'user',
    },
  });

  console.log('✅ Users created:', admin.email, '&', user.email);

  // ─── 2. BUAT PRODUK SAMPLE ────────────────────
  const products = [
    // === GAME — Mobile Legends ===
    { category: 'GAME', name: 'Mobile Legends 86 Diamonds', description: 'Top-up 86 Diamonds MLBB', denomination: '86 Diamonds', price: 19000, operatorCode: 'MLBB' },
    { category: 'GAME', name: 'Mobile Legends 172 Diamonds', description: 'Top-up 172 Diamonds MLBB', denomination: '172 Diamonds', price: 37000, operatorCode: 'MLBB' },
    { category: 'GAME', name: 'Mobile Legends 344 Diamonds', description: 'Top-up 344 Diamonds MLBB', denomination: '344 Diamonds', price: 72000, operatorCode: 'MLBB' },
    // === GAME — Free Fire ===
    { category: 'GAME', name: 'Free Fire 100 Diamonds', description: 'Top-up 100 Diamonds FF', denomination: '100 Diamonds', price: 15000, operatorCode: 'FF' },
    { category: 'GAME', name: 'Free Fire 310 Diamonds', description: 'Top-up 310 Diamonds FF', denomination: '310 Diamonds', price: 46000, operatorCode: 'FF' },
    // === GAME — PUBG Mobile ===
    { category: 'GAME', name: 'PUBG Mobile 60 UC', description: 'Top-up 60 UC PUBG Mobile', denomination: '60 UC', price: 16000, operatorCode: 'PUBG' },
    { category: 'GAME', name: 'PUBG Mobile 325 UC', description: 'Top-up 325 UC PUBG Mobile', denomination: '325 UC', price: 79000, operatorCode: 'PUBG' },

    // === E-WALLET ===
    { category: 'EWALLET', name: 'GoPay Rp 50.000', description: 'Saldo GoPay Rp 50.000', denomination: 'Rp 50.000', price: 51000, operatorCode: 'GOPAY' },
    { category: 'EWALLET', name: 'OVO Rp 100.000', description: 'Saldo OVO Rp 100.000', denomination: 'Rp 100.000', price: 101500, operatorCode: 'OVO' },
    { category: 'EWALLET', name: 'DANA Rp 50.000', description: 'Saldo DANA Rp 50.000', denomination: 'Rp 50.000', price: 51000, operatorCode: 'DANA' },

    // === TOKEN PLN ===
    { category: 'PLN', name: 'Token PLN Rp 20.000', description: 'Token Listrik Rp 20.000', denomination: 'Rp 20.000', price: 21500, operatorCode: 'PLN' },
    { category: 'PLN', name: 'Token PLN Rp 50.000', description: 'Token Listrik Rp 50.000', denomination: 'Rp 50.000', price: 51500, operatorCode: 'PLN' },
    { category: 'PLN', name: 'Token PLN Rp 100.000', description: 'Token Listrik Rp 100.000', denomination: 'Rp 100.000', price: 101500, operatorCode: 'PLN' },
    { category: 'PLN', name: 'Token PLN Rp 500.000', description: 'Token Listrik Rp 500.000', denomination: 'Rp 500.000', price: 501500, operatorCode: 'PLN' },
    { category: 'PLN', name: 'Token PLN Rp 1.000.000', description: 'Token Listrik Rp 1.000.000', denomination: 'Rp 1.000.000', price: 1001500, operatorCode: 'PLN' },

    // === PULSA ===
    { category: 'PULSA', name: 'Pulsa Telkomsel Rp 5.000', description: 'Pulsa Telkomsel Rp 5.000', denomination: 'Rp 5.000', price: 6500, operatorCode: 'TELKOMSEL' },
    { category: 'PULSA', name: 'Pulsa Telkomsel Rp 25.000', description: 'Pulsa Telkomsel Rp 25.000', denomination: 'Rp 25.000', price: 26000, operatorCode: 'TELKOMSEL' },
    { category: 'PULSA', name: 'Pulsa XL Rp 50.000', description: 'Pulsa XL Rp 50.000', denomination: 'Rp 50.000', price: 50500, operatorCode: 'XL' },
    { category: 'PULSA', name: 'Pulsa Indosat Rp 100.000', description: 'Pulsa Indosat Rp 100.000', denomination: 'Rp 100.000', price: 100500, operatorCode: 'INDOSAT' },

    // === PAKET DATA ===
    { category: 'PAKET_DATA', name: 'Telkomsel 1GB 30 Hari', description: 'Paket Data Telkomsel 1GB masa aktif 30 hari', denomination: '1 GB / 30 Hari', price: 15000, operatorCode: 'TELKOMSEL' },
    { category: 'PAKET_DATA', name: 'Telkomsel 5GB 30 Hari', description: 'Paket Data Telkomsel 5GB masa aktif 30 hari', denomination: '5 GB / 30 Hari', price: 45000, operatorCode: 'TELKOMSEL' },
    { category: 'PAKET_DATA', name: 'Telkomsel 15GB 30 Hari', description: 'Paket Data Telkomsel 15GB masa aktif 30 hari', denomination: '15 GB / 30 Hari', price: 85000, operatorCode: 'TELKOMSEL' },
    { category: 'PAKET_DATA', name: 'Telkomsel 30GB 30 Hari', description: 'Paket Data Telkomsel 30GB masa aktif 30 hari', denomination: '30 GB / 30 Hari', price: 135000, operatorCode: 'TELKOMSEL' },
    { category: 'PAKET_DATA', name: 'Tri 3GB 30 Hari', description: 'Paket Data Tri 3GB masa aktif 30 hari', denomination: '3 GB / 30 Hari', price: 25000, operatorCode: 'TRI' },
    { category: 'PAKET_DATA', name: 'Tri 10GB 30 Hari', description: 'Paket Data Tri 10GB masa aktif 30 hari', denomination: '10 GB / 30 Hari', price: 55000, operatorCode: 'TRI' },
  ];

  // Hapus data lama (urutan penting karena FK constraint)
  await prisma.transaction.deleteMany();
  await prisma.product.deleteMany();
  const createdProducts = await prisma.product.createMany({ data: products });
  console.log(`✅ ${createdProducts.count} products created`);

  // Ambil semua produk untuk referensi transaksi
  const allProducts = await prisma.product.findMany();

  // ─── 3. BUAT TRANSAKSI SAMPLE ─────────────────
  const sampleTransactions = [
    {
      userId: user.id,
      productId: allProducts[0].id, // MLBB 86 Diamonds
      targetId: '123456789',
      amount: 1,
      totalPrice: allProducts[0].price,
      paymentMethod: 'QRIS',
      status: 'SUCCESS',
      externalRef: 'KNZ-TXN-001',
      note: 'Top-up MLBB berhasil via QRIS',
    },
    {
      userId: user.id,
      productId: allProducts[7].id, // GoPay 50rb
      targetId: '081234567890',
      amount: 1,
      totalPrice: allProducts[7].price,
      paymentMethod: 'DANA',
      status: 'SUCCESS',
      externalRef: 'KNZ-TXN-002',
      note: 'Saldo GoPay berhasil ditambahkan via DANA',
    },
    {
      userId: user.id,
      productId: allProducts[10].id, // Token PLN 20rb
      targetId: '14012345678',
      amount: 2,
      totalPrice: allProducts[10].price * 2,
      paymentMethod: 'SHOPEEPAY',
      status: 'PENDING',
      externalRef: 'KNZ-TXN-003',
      note: 'Menunggu proses via ShopeePay',
    },
    {
      userId: user.id,
      productId: allProducts[3].id, // FF 100 Diamonds
      targetId: '987654321',
      amount: 1,
      totalPrice: allProducts[3].price,
      paymentMethod: 'CASH',
      status: 'FAILED',
      externalRef: 'KNZ-TXN-004',
      note: 'Gagal: ID game tidak valid',
    },
    {
      userId: admin.id,
      productId: allProducts[15].id, // Pulsa Telkomsel 5rb
      targetId: '081299887766',
      amount: 3,
      totalPrice: allProducts[15].price * 3,
      paymentMethod: 'QRIS',
      status: 'SUCCESS',
      externalRef: 'KNZ-TXN-005',
      note: 'Pulsa Telkomsel berhasil dikirim via QRIS',
    },
  ];

  await prisma.transaction.deleteMany();
  for (const txn of sampleTransactions) {
    await prisma.transaction.create({ data: txn });
  }
  console.log(`✅ ${sampleTransactions.length} transactions created`);

  console.log('\n🎉 Seeding selesai! Kenzy Store siap digunakan.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
