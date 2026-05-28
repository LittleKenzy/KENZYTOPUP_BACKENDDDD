// ============================================
// Trade Validators — Zod validation schemas
// ============================================

const { z } = require('zod');

// ─── Create Trade Offer Schema ──────────────
const createTradeOfferSchema = z.object({
  offeredCardId: z.string().min(1, 'offeredCardId tidak boleh kosong.'),
  wantedCardId: z.string().min(1, 'wantedCardId tidak boleh kosong.'),
}).refine(
  (data) => data.offeredCardId !== data.wantedCardId,
  {
    message: 'Kartu yang ditawarkan dan yang diminta tidak boleh sama.',
    path: ['wantedCardId'],
  }
);

// ─── Confirm Trade Schema ───────────────────
const confirmTradeSchema = z.object({
  id: z.string().uuid('Trade ID harus berformat UUID yang valid.'),
});

// ─── Cancel Trade Schema ────────────────────
const cancelTradeSchema = z.object({
  id: z.string().uuid('Trade ID harus berformat UUID yang valid.'),
});

// ─── Card ID Param Schema (wishlist) ────────
const cardIdParamSchema = z.object({
  cardId: z.string().min(1, 'Card ID tidak boleh kosong.'),
});

module.exports = {
  createTradeOfferSchema,
  confirmTradeSchema,
  cancelTradeSchema,
  cardIdParamSchema,
};
