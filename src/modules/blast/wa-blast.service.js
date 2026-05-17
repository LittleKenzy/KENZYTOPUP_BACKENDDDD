// ============================================
// WA Blast Service — Custom Admin Blast Logic
// Admin bisa kirim WA ke user pilihan atau semua
// ============================================

const prisma = require('../../config/db');
const { sendWhatsApp, formatPhoneNumber, isValidPhoneNumber, BLAST_CONFIG } = require('../../config/fonnte');
const { AppError } = require('../../middleware/errorHandler');

// ─── GET BLASTABLE USERS ────────────────────
// Ambil daftar user yang bisa di-blast (untuk ditampilkan di admin)
async function getBlastableUsers({ search = '', waVerified = true }) {
  const where = {};

  // Filter wa_verified
  if (waVerified !== undefined) {
    where.waVerified = waVerified;
  }

  // Filter phone tidak kosong
  where.phone = { not: '' };

  // Search by name, phone, atau email
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      waVerified: true,
      role: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });

  return users;
}

// ─── SEND CUSTOM BLAST ──────────────────────
// Admin kirim WA custom ke user pilihan atau semua
async function sendCustomBlast({ message, userIds, flashSaleId = null, adminId }) {
  // 1. Ambil target users
  let targetUsers;

  if (userIds === 'all') {
    // Kirim ke SEMUA user yang wa_verified dan punya nomor
    targetUsers = await prisma.user.findMany({
      where: {
        waVerified: true,
        phone: { not: '' },
      },
      select: { id: true, phone: true, name: true },
    });
  } else if (Array.isArray(userIds) && userIds.length > 0) {
    // Kirim ke user tertentu saja
    targetUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        phone: { not: '' },
      },
      select: { id: true, phone: true, name: true },
    });
  } else {
    throw new AppError('Target user tidak valid. Kirim "all" atau array user IDs.', 400);
  }

  if (targetUsers.length === 0) {
    throw new AppError('Tidak ada user yang bisa dikirimi pesan.', 400);
  }

  // Filter hanya nomor valid
  const validUsers = targetUsers.filter(u => isValidPhoneNumber(u.phone));

  if (validUsers.length === 0) {
    throw new AppError('Tidak ada user dengan nomor WA yang valid.', 400);
  }

  // 2. Buat WaBlast campaign record
  const waBlast = await prisma.waBlast.create({
    data: {
      message,
      targetType: userIds === 'all' ? 'all' : 'selected',
      totalSent: validUsers.length,
      adminId,
    },
  });

  // 3. Buat blast log entries (status: pending)
  await prisma.blastLog.createMany({
    data: validUsers.map(user => ({
      waBlastId: waBlast.id,
      flashSaleId: flashSaleId || null,
      userId: user.id,
      phone: formatPhoneNumber(user.phone),
      status: 'pending',
    })),
  });

  console.log(`📤 Custom WA blast: ${validUsers.length} user (campaign: ${waBlast.id})`);

  // 4. Proses blast secara ASYNC (fire & forget)
  processCustomBlast(waBlast.id, validUsers, message).catch(err => {
    console.error('❌ Error saat proses custom blast:', err.message);
  });

  return {
    blastId: waBlast.id,
    total: validUsers.length,
    queued: validUsers.length,
    targetType: userIds === 'all' ? 'all' : 'selected',
  };
}

// ─── PROCESS BLAST BATCHES ──────────────────
async function processCustomBlast(waBlastId, users, message) {
  const { BATCH_SIZE, DELAY_MS } = BLAST_CONFIG;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(user => sendAndLogCustom(waBlastId, user, message))
    );

    console.log(`📨 Custom blast batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)} selesai`);

    if (i + BATCH_SIZE < users.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  // Update totalSent di WaBlast record
  const sentCount = await prisma.blastLog.count({
    where: { waBlastId, status: 'sent' },
  });

  await prisma.waBlast.update({
    where: { id: waBlastId },
    data: { totalSent: sentCount },
  });

  console.log(`✅ Custom WA blast selesai! Sent: ${sentCount}/${users.length}`);
}

// ─── SEND & LOG PER USER ────────────────────
async function sendAndLogCustom(waBlastId, user, message) {
  const phone = formatPhoneNumber(user.phone);

  try {
    const result = await sendWhatsApp(phone, message);

    await prisma.blastLog.updateMany({
      where: { waBlastId, userId: user.id },
      data: {
        status: result.status ? 'sent' : 'failed',
        sentAt: result.status ? new Date() : null,
        errorMsg: result.status ? null : (result.reason || 'Unknown error'),
      },
    });
  } catch (error) {
    await prisma.blastLog.updateMany({
      where: { waBlastId, userId: user.id },
      data: {
        status: 'failed',
        errorMsg: error.message,
      },
    });
  }
}

// ─── GET BLAST HISTORY ──────────────────────
async function getBlastHistory({ page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;

  const [blasts, total] = await Promise.all([
    prisma.waBlast.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { id: true, name: true },
        },
        _count: {
          select: { blastLogs: true },
        },
      },
    }),
    prisma.waBlast.count(),
  ]);

  // Tambahkan stats per blast
  const blastsWithStats = await Promise.all(
    blasts.map(async (blast) => {
      const [sent, failed, pending] = await Promise.all([
        prisma.blastLog.count({ where: { waBlastId: blast.id, status: 'sent' } }),
        prisma.blastLog.count({ where: { waBlastId: blast.id, status: 'failed' } }),
        prisma.blastLog.count({ where: { waBlastId: blast.id, status: 'pending' } }),
      ]);

      return {
        ...blast,
        stats: { total: blast._count.blastLogs, sent, failed, pending },
      };
    })
  );

  return {
    blasts: blastsWithStats,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── GET BLAST DETAIL ───────────────────────
async function getBlastDetail(blastId) {
  const blast = await prisma.waBlast.findUnique({
    where: { id: blastId },
    include: {
      admin: {
        select: { id: true, name: true },
      },
      blastLogs: {
        include: {
          user: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!blast) {
    throw new AppError('Blast campaign tidak ditemukan.', 404);
  }

  // Hitung stats
  const stats = {
    total: blast.blastLogs.length,
    sent: blast.blastLogs.filter(l => l.status === 'sent').length,
    failed: blast.blastLogs.filter(l => l.status === 'failed').length,
    pending: blast.blastLogs.filter(l => l.status === 'pending').length,
  };

  return { ...blast, stats };
}

module.exports = {
  getBlastableUsers,
  sendCustomBlast,
  getBlastHistory,
  getBlastDetail,
};
