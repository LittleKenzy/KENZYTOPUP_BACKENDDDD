// ============================================
// Push Validation — Zod schema untuk push subscription
// ============================================

const { z } = require('zod');

// Schema untuk subscribe push notification
// Sesuai dengan format PushSubscription dari browser
const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z
      .string()
      .url('Endpoint harus berupa URL yang valid.')
      .min(1, 'Endpoint wajib diisi.'),
    keys: z.object({
      p256dh: z.string().min(1, 'Key p256dh wajib diisi.'),
      auth: z.string().min(1, 'Key auth wajib diisi.'),
    }),
    // expirationTime bisa null atau number
    expirationTime: z.union([z.number(), z.null()]).optional(),
  }),
});

// Schema untuk unsubscribe — cukup kirim endpoint
const unsubscribeSchema = z.object({
  endpoint: z
    .string()
    .url('Endpoint harus berupa URL yang valid.')
    .min(1, 'Endpoint wajib diisi.'),
});

module.exports = {
  subscribeSchema,
  unsubscribeSchema,
};
