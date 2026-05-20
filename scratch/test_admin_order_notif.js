/**
 * Test Script: Fitur 3 — Verifikasi endpoint & module loading
 * Tanpa perlu login — cek bahwa semua module ter-load dan route terdaftar
 */

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('🧪 Test Fitur 3: Verifikasi Backend\n');

  // ── Test 1: Health check — server start tanpa error ──
  console.log('── Test 1: Server Start (semua module ter-load) ──');
  try {
    const health = await fetch(`${BASE_URL}/api/health`);
    const healthData = await health.json();
    console.log(`   ✅ Server running: ${healthData.data.name}`);
    console.log(`   ✅ Semua module ter-import tanpa error`);
    console.log(`   (utils/whatsapp.js, utils/adminNotifier.js, dll)\n`);
  } catch (err) {
    console.error('   ❌ Server tidak bisa dihubungi:', err.message);
    return;
  }

  // ── Test 2: Route /api/admin/orders/new terdaftar (expect 401, bukan 404) ──
  console.log('── Test 2: Route terdaftar — GET /api/admin/orders/new ──');
  try {
    const res = await fetch(`${BASE_URL}/api/admin/orders/new`);
    const data = await res.json();
    
    if (res.status === 401) {
      console.log(`   ✅ Status: 401 — Route terdaftar, butuh auth`);
      console.log(`   ✅ Message: "${data.message}"`);
    } else if (res.status === 404) {
      console.log(`   ❌ Status: 404 — Route TIDAK terdaftar!`);
    } else {
      console.log(`   ⚠️ Status: ${res.status} — Unexpected`);
    }
    console.log('');
  } catch (err) {
    console.error('   ❌ Error:', err.message, '\n');
  }

  // ── Test 3: Route /api/admin/orders/new?since= terdaftar ──
  console.log('── Test 3: Route dengan query param — GET /api/admin/orders/new?since= ──');
  try {
    const since = new Date(Date.now() - 3600000).toISOString();
    const res = await fetch(`${BASE_URL}/api/admin/orders/new?since=${since}`);
    
    if (res.status === 401) {
      console.log(`   ✅ Status: 401 — Route + query param works`);
    } else if (res.status === 404) {
      console.log(`   ❌ Status: 404 — Route tidak terdaftar!`);
    } else {
      console.log(`   ⚠️ Status: ${res.status}`);
    }
    console.log('');
  } catch (err) {
    console.error('   ❌ Error:', err.message, '\n');
  }

  // ── Test 4: Verifikasi adminNotifier module bisa di-require ──
  console.log('── Test 4: Module adminNotifier loadable ──');
  try {
    const { notifyAdminNewOrder, buildOrderMessage } = require('../src/utils/adminNotifier');
    
    // Test buildOrderMessage
    const testMsg = buildOrderMessage({
      id: 'TEST-001',
      productName: 'Mobile Legends 100 Diamond',
      userName: 'Test User',
      userPhone: '6281234567890',
      totalPrice: 25000,
      targetId: '123456789',
      paymentMethod: 'QRIS',
    });
    
    console.log('   ✅ Module loaded successfully');
    console.log('   ✅ buildOrderMessage() works');
    console.log('   📄 Contoh pesan:\n');
    console.log(testMsg);
    console.log('');
  } catch (err) {
    console.error('   ❌ Module error:', err.message, '\n');
  }

  console.log('🏁 Semua test selesai!');
}

main().catch(console.error);
