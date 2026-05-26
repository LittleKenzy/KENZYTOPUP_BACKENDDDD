// ============================================
// Cards Router — Kartu Kolektibel
// ============================================

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { getCardCatalog, getMyCollection } = require('./cards.controller');

const router = express.Router();

// Semua endpoint kartu memerlukan login
router.use(authenticate);

router.get('/catalog', getCardCatalog);
router.get('/my-collection', getMyCollection);

module.exports = router;
