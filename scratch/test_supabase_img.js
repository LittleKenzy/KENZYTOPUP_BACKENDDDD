// Test kirim gambar dari Supabase URL via Fonnte
require('dotenv').config();
const { sendWhatsApp, formatPhoneNumber } = require('../src/config/fonnte');

async function test() {
  const phone = formatPhoneNumber('082395928309');
  
  // URL gambar dari Supabase yang baru diupload
  const supabaseUrl = 'https://qqtyqxgatwsrsgioavmm.supabase.co/storage/v1/object/public/blast-images/blasts/fs_1778994816467_xreo5x.jpg';
  
  console.log('📸 Test 1: Kirim gambar Supabase URL...');
  const r1 = await sendWhatsApp(phone, 'Test gambar dari Supabase', supabaseUrl);
  console.log('Result:', JSON.stringify(r1, null, 2));
  
  // Tunggu 3 detik
  await new Promise(r => setTimeout(r, 3000));
  
  // Test dengan URL gambar yang pasti bisa (direct link)
  console.log('\n📸 Test 2: Kirim gambar direct PNG URL...');
  const directUrl = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';
  const r2 = await sendWhatsApp(phone, 'Test gambar Google logo', directUrl);
  console.log('Result:', JSON.stringify(r2, null, 2));
}

test().catch(console.error);
