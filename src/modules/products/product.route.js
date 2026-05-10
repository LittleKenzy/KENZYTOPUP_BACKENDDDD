// ============================================
// Product Routes — Endpoint produk
// ============================================

const { Router } = require('express');
const productController = require('./product.controller');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

const router = Router();

// Public routes — semua user bisa melihat produk
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);

// Admin-only routes — CRUD produk
router.post('/', authenticate, authorize('admin'), productController.createProduct);
router.put('/:id', authenticate, authorize('admin'), productController.updateProduct);
router.delete('/:id', authenticate, authorize('admin'), productController.deleteProduct);

module.exports = router;
