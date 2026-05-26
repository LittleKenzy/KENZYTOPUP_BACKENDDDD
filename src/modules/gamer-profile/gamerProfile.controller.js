// ============================================
// Gamer Profile Controller — CRUD Profil Game
// ============================================

const prisma = require('../../config/db');
const {
  createProfileSchema,
  updateProfileSchema,
} = require('./gamerProfile.validator');

// ─── GET /api/gamer-profile ─────────────────
// Semua profil game milik user yang login
async function getAllProfiles(req, res, next) {
  try {
    const userId = req.user.userId;

    const profiles = await prisma.gamerProfile.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      profiles,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/gamer-profile/:gameId ─────────
// Profil satu game spesifik (untuk auto-fill saat buka halaman order)
async function getProfileByGame(req, res, next) {
  try {
    const userId = req.user.userId;
    const { gameId } = req.params;

    const profile = await prisma.gamerProfile.findUnique({
      where: {
        userId_gameId: { userId, gameId },
      },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil tidak ditemukan',
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/gamer-profile ────────────────
// Tambah profil game baru
async function addProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const validated = createProfileSchema.parse(req.body);

    // Cek apakah sudah ada profil untuk gameId ini
    const existing = await prisma.gamerProfile.findUnique({
      where: {
        userId_gameId: { userId, gameId: validated.gameId },
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Akun game ini sudah tersimpan. Gunakan PUT untuk update.',
      });
    }

    const profile = await prisma.gamerProfile.create({
      data: {
        userId,
        ...validated,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Profil berhasil disimpan',
      profile,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PUT /api/gamer-profile/:gameId ─────────
// Update profil game yang sudah ada
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const { gameId } = req.params;
    const validated = updateProfileSchema.parse(req.body);

    // Cek profil milik user ini
    const existing = await prisma.gamerProfile.findUnique({
      where: {
        userId_gameId: { userId, gameId },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Profil tidak ditemukan',
      });
    }

    const profile = await prisma.gamerProfile.update({
      where: {
        userId_gameId: { userId, gameId },
      },
      data: validated,
    });

    return res.status(200).json({
      success: true,
      message: 'Profil berhasil diupdate',
      profile,
    });
  } catch (error) {
    next(error);
  }
}

// ─── DELETE /api/gamer-profile/:gameId ──────
// Hapus profil game
async function deleteProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const { gameId } = req.params;

    // Cek profil milik user ini
    const existing = await prisma.gamerProfile.findUnique({
      where: {
        userId_gameId: { userId, gameId },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Profil tidak ditemukan',
      });
    }

    await prisma.gamerProfile.delete({
      where: {
        userId_gameId: { userId, gameId },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Profil berhasil dihapus',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllProfiles,
  getProfileByGame,
  addProfile,
  updateProfile,
  deleteProfile,
};
