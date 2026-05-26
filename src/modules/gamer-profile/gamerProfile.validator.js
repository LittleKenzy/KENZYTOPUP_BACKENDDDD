// ============================================
// Gamer Profile Validator — Zod Schemas
// ============================================

const { z } = require('zod');

// Schema untuk POST (tambah profil baru)
const createProfileSchema = z.object({
  gameId: z.string().min(1, 'gameId wajib diisi'),
  gameName: z.string().min(1, 'gameName wajib diisi'),
  gameIcon: z.string().url('gameIcon harus berupa URL valid').optional(),
  inGameUserId: z
    .string()
    .min(1, 'inGameUserId wajib diisi')
    .regex(/^[a-zA-Z0-9.\-_]+$/, 'inGameUserId hanya boleh angka, huruf, titik, strip, dan underscore'),
  serverOrZone: z.string().optional(),
  nickname: z.string().optional(),
});

// Schema untuk PUT (update profil — semua optional kecuali inGameUserId)
const updateProfileSchema = z.object({
  inGameUserId: z
    .string()
    .min(1, 'inGameUserId wajib diisi')
    .regex(/^[a-zA-Z0-9.\-_]+$/, 'inGameUserId hanya boleh angka, huruf, titik, strip, dan underscore'),
  serverOrZone: z.string().optional(),
  nickname: z.string().optional(),
  gameIcon: z.string().url('gameIcon harus berupa URL valid').optional(),
});

module.exports = {
  createProfileSchema,
  updateProfileSchema,
};
