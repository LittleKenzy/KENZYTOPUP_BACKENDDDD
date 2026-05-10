// ============================================
// Product Validation — Schema Zod untuk produk
// ============================================

const { z } = require('zod');

// Kategori default — digunakan sebagai referensi, bukan pembatas
const DEFAULT_CATEGORIES = ['GAME', 'EWALLET', 'PLN', 'PULSA', 'PAKET_DATA'];

const createProductSchema = z.object({
  category: z
    .string({ required_error: 'Category wajib diisi' })
    .min(1, 'Category wajib diisi')
    .max(50, 'Category maksimal 50 karakter')
    .transform(val => val.toUpperCase()),
  name: z
    .string({ required_error: 'Nama produk wajib diisi' })
    .min(3, 'Nama produk minimal 3 karakter')
    .max(200, 'Nama produk maksimal 200 karakter'),
  description: z.string().max(500).optional(),
  denomination: z
    .string({ required_error: 'Denomination wajib diisi' })
    .min(1, 'Denomination wajib diisi'),
  price: z
    .number({ required_error: 'Harga wajib diisi' })
    .int('Harga harus bilangan bulat')
    .positive('Harga harus lebih dari 0'),
  operatorCode: z
    .string({ required_error: 'Kode operator wajib diisi' })
    .min(1, 'Kode operator wajib diisi')
    .max(50),
  isActive: z.boolean().optional().default(true),
});

const updateProductSchema = createProductSchema.partial();

const queryProductSchema = z.object({
  category: z.string().optional(),
  operatorCode: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

module.exports = { createProductSchema, updateProductSchema, queryProductSchema, DEFAULT_CATEGORIES };
