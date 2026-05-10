// ============================================
// Product Controller — Handle HTTP request/response
// ============================================

const productService = require('./product.service');
const { createProductSchema, updateProductSchema, queryProductSchema } = require('./product.validation');

// ─── GET /api/products ───────────────────────
async function listProducts(req, res, next) {
  try {
    const query = queryProductSchema.parse(req.query);
    const result = await productService.listProducts(query);

    return res.status(200).json({
      success: true,
      message: 'Daftar produk berhasil diambil.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/products/:id ───────────────────
async function getProduct(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Detail produk berhasil diambil.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/products (admin) ──────────────
async function createProduct(req, res, next) {
  try {
    const validated = createProductSchema.parse(req.body);
    const product = await productService.createProduct(validated);

    return res.status(201).json({
      success: true,
      message: 'Produk berhasil ditambahkan.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PUT /api/products/:id (admin) ───────────
async function updateProduct(req, res, next) {
  try {
    const validated = updateProductSchema.parse(req.body);
    const product = await productService.updateProduct(req.params.id, validated);

    return res.status(200).json({
      success: true,
      message: 'Produk berhasil diperbarui.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

// ─── DELETE /api/products/:id (admin) ────────
async function deleteProduct(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Produk berhasil dihapus (dinonaktifkan).',
    });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════
// ADMIN PRODUCT CONTROLLERS
// ═══════════════════════════════════════════════

// ─── GET /api/admin/products (termasuk non-aktif) ─
async function listAllProducts(req, res, next) {
  try {
    const query = queryProductSchema.parse(req.query);
    const result = await productService.listAllProducts(query);

    return res.status(200).json({
      success: true,
      message: 'Semua produk berhasil diambil (termasuk non-aktif).',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/products/stats ──────────
async function getProductStats(req, res, next) {
  try {
    const stats = await productService.getProductStats();

    return res.status(200).json({
      success: true,
      message: 'Statistik produk berhasil diambil.',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/products/categories ─────
async function listCategories(req, res, next) {
  try {
    const categories = await productService.listCategories();

    return res.status(200).json({
      success: true,
      message: 'Daftar kategori berhasil diambil.',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/admin/products/operators ──────
async function listOperatorCodes(req, res, next) {
  try {
    const operators = await productService.listOperatorCodes(req.query.category);

    return res.status(200).json({
      success: true,
      message: 'Daftar operator berhasil diambil.',
      data: operators,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/admin/products/:id/reactivate ─
async function reactivateProduct(req, res, next) {
  try {
    const product = await productService.reactivateProduct(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Produk berhasil diaktifkan kembali.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listAllProducts,
  getProductStats,
  listCategories,
  listOperatorCodes,
  reactivateProduct,
};
