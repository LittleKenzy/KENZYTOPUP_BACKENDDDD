// ============================================
// Test: Kirim OTP ke WA Admin via Fonnte (IPv4 forced)
// ============================================

require('dotenv').config();

// Force IPv4 sama seperti di backend
const { fetch: undiciFetch, Agent } = require('undici');
const ipv4Agent = new Agent({ connect: { family: 4 } });

const FONNTE_API_URL = 'https://api.fonnte.com/send';

async function testOtpToAdmin() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  🔍 DIAGNOSA OTP WA ADMIN               ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  const token = process.env.FONNTE_TOKEN;
  const adminNumber = process.env.ADMIN_WA_NUMBER;

  console.log('📋 Cek Environment Variables:');
  console.log(`   FONNTE_TOKEN    : ${token ? '✅ SET (' + token.substring(0, 6) + '...)' : '❌ TIDAK ADA!'}`);
  console.log(`   ADMIN_WA_NUMBER : ${adminNumber ? '✅ ' + adminNumber : '❌ TIDAK ADA!'}`);
  console.log('');

  if (!token || !adminNumber) {
    console.error('❌ Environment variables belum lengkap!');
    return;
  }

  const testOtp = '123456';
  const message = `🔐 [TEST] Kode OTP Admin Kenzy Store: ${testOtp}\nBerlaku 5 menit. Jangan berikan ke siapapun.\n\n(Ini pesan test diagnosa — abaikan OTP ini)`;

  console.log(`📤 Mengirim test OTP ke ${adminNumber}...`);
  console.log('');

  try {
    const response = await undiciFetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: adminNumber,
        message: message,
        countryCode: '62',
      }),
      dispatcher: ipv4Agent,
    });

    const result = await response.json();
    
    console.log('📬 Response dari Fonnte:');
    console.log('   HTTP Status:', response.status);
    console.log('   Body:', JSON.stringify(result, null, 2));
    console.log('');

    if (result.status === true || result.status === 'true') {
      console.log('✅ BERHASIL! Pesan OTP terkirim ke WA admin.');
      console.log('   → Cek WA di nomor', adminNumber);
      console.log('');
      console.log('   Jika lokal berhasil tapi Vercel gagal, pastikan:');
      console.log('   1. FONNTE_TOKEN sudah diset di Vercel Environment Variables');
      console.log('   2. ADMIN_WA_NUMBER sudah diset di Vercel Environment Variables');
    } else {
      console.log('❌ GAGAL kirim WA!');
      console.log('   Kemungkinan penyebab:');
      if (result.reason) console.log('   Reason:', result.reason);
      if (result.detail) console.log('   Detail:', JSON.stringify(result.detail));
    }
  } catch (error) {
    console.error('❌ Error saat request ke Fonnte:', error.message);
  }
}

testOtpToAdmin();
