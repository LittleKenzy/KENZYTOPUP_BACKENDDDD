// ============================================
// Email Service — Kirim email via SMTP (Gmail)
// ============================================

const nodemailer = require('nodemailer');
const dns = require('dns');
const env = require('./env');

// Force IPv4 DNS lookup (sama seperti undici fix di app.js)
const dnsLookupIPv4 = (hostname, options, callback) => {
  return dns.lookup(hostname, { ...options, family: 4 }, callback);
};

// Buat transporter (koneksi SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS, // App Password, BUKAN password Gmail biasa
  },
  // Force IPv4 untuk jaringan yang IPv6 DNS nya bermasalah
  dnsLookup: dnsLookupIPv4,
});

/**
 * Kirim email reset password ke user
 * @param {string} toEmail - Alamat email tujuan
 * @param {string} userName - Nama user
 * @param {string} resetToken - Token reset password
 */
async function sendPasswordResetEmail(toEmail, userName, resetToken) {
  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"Kenzy Store" <${env.SMTP_USER}>`,
    to: toEmail,
    subject: '🔐 Reset Password — Kenzy Store',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f1923; border-radius: 12px; overflow: hidden; border: 1px solid #1e2d3d;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6c5ce7 0%, #a855f7 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">🛒 Kenzy Store</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Reset Password</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px;">
          <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
            Halo <strong>${userName}</strong>,
          </p>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            Kami menerima permintaan untuk mereset password akun Kenzy Store Anda. 
            Klik tombol di bawah ini untuk membuat password baru:
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #6c5ce7 0%, #a855f7 100%); 
                      color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; 
                      font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
              Reset Password Saya
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 16px;">
            Atau copy-paste link berikut ke browser Anda:
          </p>
          <div style="background: #1a2332; border: 1px solid #2d3748; border-radius: 8px; padding: 12px; margin: 0 0 24px; word-break: break-all;">
            <a href="${resetLink}" style="color: #a78bfa; font-size: 13px; text-decoration: none;">${resetLink}</a>
          </div>

          <!-- Warning -->
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 16px; margin: 0 0 24px;">
            <p style="color: #f59e0b; font-size: 13px; margin: 0; line-height: 1.5;">
              ⚠️ <strong>Link ini berlaku selama 15 menit.</strong><br/>
              Jika Anda tidak merasa meminta reset password, abaikan email ini. 
              Password Anda tidak akan berubah.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #0a1017; padding: 20px 24px; text-align: center; border-top: 1px solid #1e2d3d;">
          <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5;">
            Email ini dikirim otomatis oleh Kenzy Store.<br/>
            Jangan balas email ini.
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Verifikasi koneksi SMTP saat startup
 */
async function verifyEmailConnection() {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.log('⚠️  SMTP belum dikonfigurasi. Fitur email reset password nonaktif.');
    return false;
  }

  try {
    await transporter.verify();
    console.log('✅ SMTP email connection verified!');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    return false;
  }
}

module.exports = { sendPasswordResetEmail, verifyEmailConnection };
