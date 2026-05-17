// Test kirim WA gambar via Fonnte API
require('dotenv').config();
const { sendWhatsApp, formatPhoneNumber } = require('../src/config/fonnte');

async function testImageBlast() {
  const phone = formatPhoneNumber('082395928309'); // nomor pemilik
  const message = '🔥 TEST Gambar dari Kenzy Store 🔥\n\nIni adalah tes kirim gambar via Fonnte API.';
  
  // URL gambar publik (contoh gambar test)
  const imageUrl = 'https://qqtyqxgatwsrsgioavmm.supabase.co/storage/v1/object/public/blast-images/blasts/test.jpg';
  
  // Cek apakah ada gambar di bucket, kalau tidak pakai gambar publik
  const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png';
  
  console.log('📤 Kirim teks saja...');
  const textResult = await sendWhatsApp(phone, 'Test teks biasa dari script');
  console.log('Text result:', JSON.stringify(textResult, null, 2));
  
  console.log('\n📸 Kirim gambar + caption...');
  const imageResult = await sendWhatsApp(phone, message, testImageUrl);
  console.log('Image result:', JSON.stringify(imageResult, null, 2));
}

testImageBlast().catch(console.error);
