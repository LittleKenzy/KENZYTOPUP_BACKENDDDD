// ============================================
// Transaction Validation — Schema Zod
// ============================================

const { z } = require('zod');

const PAYMENT_METHODS = ['CASH', 'QRIS', 'DANA', 'SHOPEEPAY'];
const TRANSACTION_STATUSES = ['PENDING', 'SUCCESS', 'FAILED'];

const createTransactionSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID wajib diisi' })
    .uuid('Product ID tidak valid'),
  targetId: z
    .string({ required_error: 'Target ID wajib diisi (ID game / no HP / no meter)' })
    .min(1, 'Target ID wajib diisi')
    .max(50, 'Target ID maksimal 50 karakter'),
  quantity: z
    .coerce.number({ required_error: 'Jumlah wajib diisi' })
    .int('Jumlah harus bilangan bulat')
    .positive('Jumlah harus lebih dari 0')
    .max(100, 'Maksimal 100 per transaksi'),
  paymentMethod: z.enum(PAYMENT_METHODS, {
    errorMap: () => ({ message: `Metode pembayaran harus salah satu dari: ${PAYMENT_METHODS.join(', ')}` }),
  }),
});

const queryTransactionSchema = z.object({
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
});

// Admin: Update status transaksi
const updateStatusSchema = z.object({
  status: z.enum(TRANSACTION_STATUSES, {
    errorMap: () => ({ message: `Status harus salah satu dari: ${TRANSACTION_STATUSES.join(', ')}` }),
  }),
  note: z
    .string()
    .max(500, 'Catatan maksimal 500 karakter')
    .optional(),
});

module.exports = {
  createTransactionSchema,
  queryTransactionSchema,
  updateStatusSchema,
  PAYMENT_METHODS,
  TRANSACTION_STATUSES,
};
