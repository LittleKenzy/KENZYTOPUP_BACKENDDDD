// ============================================
// Product Service — Business logic produk
// ============================================

const prisma = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

// ─── LIST PRODUCTS (with filter & pagination) ─
async function listProducts({ category, operatorCode, search, page = 1, limit = 20 }) {
  const where = { isActive: true };

  // Filter berdasarkan category
  if (category) {
    where.category = category;
  }

  // Filter berdasarkan operator
  if (operatorCode) {
    where.operatorCode = operatorCode;
  }

  // Search berdasarkan nama produk
  if (search) {
    where.name = { contains: search };
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── GET PRODUCT BY ID ──────────────────────
async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new AppError('Produk tidak ditemukan.', 404);
  }

  return product;
}

// ─── CREATE PRODUCT (admin) ─────────────────
async function createProduct(data) {
  const product = await prisma.product.create({
    data,
  });

  return product;
}

// ─── UPDATE PRODUCT (admin) ─────────────────
async function updateProduct(id, data) {
  // Cek apakah produk ada
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Produk tidak ditemukan.', 404);
  }

  const product = await prisma.product.update({
    where: { id },
    data,
  });

  return product;
}

// ─── DELETE PRODUCT (admin) ─────────────────
async function deleteProduct(id) {
  // Cek apakah produk ada
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Produk tidak ditemukan.', 404);
  }

  // Soft delete: set isActive = false (produk tetap ada untuk referensi transaksi)
  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  return true;
}

// ─── LIST ALL PRODUCTS — admin (termasuk non-aktif) ─
async function listAllProducts({ category, operatorCode, search, page = 1, limit = 20 }) {
  const where = {};

  if (category) {
    where.category = category;
  }

  if (operatorCode) {
    where.operatorCode = operatorCode;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { operatorCode: { contains: search } },
      { denomination: { contains: search } },
    ];
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── LIST CATEGORIES (distinct dari database) ─
async function listCategories() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  return products.map(p => p.category);
}

// ─── LIST OPERATOR CODES (distinct per category) ─
async function listOperatorCodes(category) {
  const where = { isActive: true };
  if (category) {
    where.category = category;
  }

  const products = await prisma.product.findMany({
    where,
    select: { operatorCode: true },
    distinct: ['operatorCode'],
    orderBy: { operatorCode: 'asc' },
  });

  return products.map(p => p.operatorCode);
}

// ─── PRODUCT STATS (admin dashboard) ─
async function getProductStats() {
  const [total, active, inactive] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: false } }),
  ]);

  const categories = await listCategories();

  return { total, active, inactive, totalCategories: categories.length, categories };
}

// ─── REACTIVATE PRODUCT (admin) ─────────────
async function reactivateProduct(id) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Produk tidak ditemukan.', 404);
  }

  const product = await prisma.product.update({
    where: { id },
    data: { isActive: true },
  });

  return product;
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listAllProducts,
  listCategories,
  listOperatorCodes,
  getProductStats,
  reactivateProduct,
};
