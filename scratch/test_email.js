// Test script: Kirim email reset password langsung
require('dotenv').config();

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function test() {
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set (' + process.env.SMTP_PASS.length + ' chars)' : '❌ Not set');

  // Step 1: Verify SMTP connection
  console.log('\n🔍 Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection OK!');
  } catch (err) {
    console.error('❌ SMTP connection FAILED:', err.message);
    console.error('Full error:', err);
    return;
  }

  // Step 2: Send test email
  console.log('\n📧 Sending test email...');
  try {
    const info = await transporter.sendMail({
      from: `"Kenzy Store" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Kirim ke diri sendiri
      subject: '🔐 TEST Reset Password — Kenzy Store',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #1a1a2e; color: #eee; border-radius: 10px;">
          <h2 style="color: #a855f7;">✅ Email berhasil terkirim!</h2>
          <p>Ini adalah email test dari fitur reset password Kenzy Store.</p>
          <p>Jika kamu menerima email ini, berarti konfigurasi SMTP sudah benar.</p>
          <p style="color: #888; font-size: 12px;">Dikirim: ${new Date().toLocaleString('id-ID')}</p>
        </div>
      `,
    });
    console.log('✅ Email sent! Message ID:', info.messageId);
    console.log('   Response:', info.response);
  } catch (err) {
    console.error('❌ Send email FAILED:', err.message);
    console.error('Full error:', err);
  }
}

test();
