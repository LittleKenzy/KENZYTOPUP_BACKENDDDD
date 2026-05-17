// ============================================
// Blast Service — WA Blast logic for Flash Sale
// Handles batch sending and logging
// ============================================

const prisma = require('../../config/db');
const { sendWhatsApp, formatPhoneNumber, isValidPhoneNumber, generateBlastMessage, BLAST_CONFIG } = require('../../config/fonnte');

/**
 * Trigger WA blast ke user tertentu atau semua yang wa_verified = true
 * Dijalankan secara ASYNC (fire & forget) agar tidak blocking response
 *
 * @param {object} flashSale - Data flash sale yang baru dibuat
 * @param {object} product - Data produk terkait (jika ada)
 * @param {string|string[]} [targetUserIds='all'] - "all" untuk semua, "none" untuk skip, atau array user IDs
 * @returns {Promise<{total: number, queued: number}>} Status awal blast
 */
async function triggerBlast(flashSale, product, targetUserIds = 'all') {
  // Skip blast jika admin memilih "none"
  if (targetUserIds === 'none') {
    console.log('⏭️ WA blast dilewati (admin memilih tidak mengirim).');
    return { total: 0, queued: 0 };
  }

  // 1. Ambil target users
  let users;

  if (targetUserIds === 'all') {
    // Kirim ke SEMUA user yang wa_verified dan punya nomor
    users = await prisma.user.findMany({
      where: {
        waVerified: true,
        phone: { not: '' },
      },
      select: { id: true, phone: true, name: true },
    });
  } else if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
    // Kirim ke user tertentu saja
    users = await prisma.user.findMany({
      where: {
        id: { in: targetUserIds },
        phone: { not: '' },
      },
      select: { id: true, phone: true, name: true },
    });
  } else {
    console.log('📭 Target blast tidak valid, skip.');
    return { total: 0, queued: 0 };
  }

  if (users.length === 0) {
    console.log('📭 Tidak ada user yang bisa diblast.');
    return { total: 0, queued: 0 };
  }

  // 2. Filter hanya nomor yang valid
  const validUsers = users.filter(u => isValidPhoneNumber(u.phone));

  console.log(`📤 Memulai WA blast: ${validUsers.length} user (dari ${users.length} total)`);

  // 3. Buat blast log entries (status: pending)
  const blastLogs = await prisma.blastLog.createMany({
    data: validUsers.map(user => ({
      flashSaleId: flashSale.id,
      userId: user.id,
      phone: formatPhoneNumber(user.phone),
      status: 'pending',
    })),
  });

  // 4. Generate pesan blast
  const message = generateBlastMessage({
    productName: product ? `${product.name} — ${product.denomination}` : flashSale.title,
    originalPrice: product ? product.price : 0,
    salePrice: product ? Math.round(product.price * (1 - flashSale.discountPercent / 100)) : 0,
    discount: flashSale.discountPercent,
    validUntil: flashSale.endAt,
  });

  // 5. Kirim dalam batch (ASYNC — fire & forget)
  processBlastBatches(flashSale.id, validUsers, message).catch(err => {
    console.error('❌ Error saat proses blast batch:', err.message);
  });

  return {
    total: validUsers.length,
    queued: blastLogs.count,
  };
}

/**
 * Process blast dalam batch agar tidak kena rate limit Fonnte
 * Kirim BATCH_SIZE pesan, tunggu DELAY_MS, kirim batch berikutnya
 */
async function processBlastBatches(flashSaleId, users, message) {
  const { BATCH_SIZE, DELAY_MS } = BLAST_CONFIG;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    // Kirim semua dalam batch secara parallel
    await Promise.all(
      batch.map(user => sendAndLog(flashSaleId, user, message))
    );

    console.log(`📨 Blast batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)} selesai`);

    // Jeda antar batch (kecuali batch terakhir)
    if (i + BATCH_SIZE < users.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(`✅ WA blast selesai! Total: ${users.length} pesan dikirim.`);
}

/**
 * Kirim WA ke satu user dan update log di database
 */
async function sendAndLog(flashSaleId, user, message) {
  const phone = formatPhoneNumber(user.phone);

  try {
    const result = await sendWhatsApp(phone, message);

    // Update blast log
    await prisma.blastLog.updateMany({
      where: {
        flashSaleId: flashSaleId,
        userId: user.id,
      },
      data: {
        status: result.status ? 'sent' : 'failed',
        sentAt: result.status ? new Date() : null,
        errorMsg: result.status ? null : (result.reason || 'Unknown error'),
      },
    });
  } catch (error) {
    // Update log sebagai failed
    await prisma.blastLog.updateMany({
      where: {
        flashSaleId: flashSaleId,
        userId: user.id,
      },
      data: {
        status: 'failed',
        errorMsg: error.message,
      },
    });
  }
}

/**
 * Get blast log statistics untuk sebuah flash sale
 * @param {string} flashSaleId
 * @returns {Promise<object>} Stats: total, sent, failed, pending
 */
async function getBlastStats(flashSaleId) {
  const [total, sent, failed, pending] = await Promise.all([
    prisma.blastLog.count({ where: { flashSaleId } }),
    prisma.blastLog.count({ where: { flashSaleId, status: 'sent' } }),
    prisma.blastLog.count({ where: { flashSaleId, status: 'failed' } }),
    prisma.blastLog.count({ where: { flashSaleId, status: 'pending' } }),
  ]);

  return { total, sent, failed, pending };
}

/**
 * Get blast logs detail untuk sebuah flash sale (admin)
 * @param {string} flashSaleId
 * @returns {Promise<Array>} Daftar blast logs
 */
async function getBlastLogs(flashSaleId) {
  return prisma.blastLog.findMany({
    where: { flashSaleId },
    include: {
      user: {
        select: { id: true, name: true, phone: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = {
  triggerBlast,
  getBlastStats,
  getBlastLogs,
};
