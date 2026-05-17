// ============================================
// Mission Routes — Endpoint misi harian
// ============================================

const { Router } = require('express');
const missionController = require('./mission.controller');
const { authenticate } = require('../../middleware/auth');
const { missionClaimLimiter } = require('../../middleware/rateLimiter');

const router = Router();

// GET /api/missions/daily/status — Cek status misi hari ini
router.get('/daily/status', authenticate, missionController.getDailyStatus);

// POST /api/missions/daily/claim — Klaim poin misi (rate-limited: 10 req/menit)
router.post('/daily/claim', authenticate, missionClaimLimiter, missionController.claimDailyMission);

module.exports = router;
