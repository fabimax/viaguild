const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badge.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Public routes (no authentication required)
router.get('/users/:username/badgecase/public', badgeController.getPublicBadgeCase);

// Authenticated routes
router.get('/users/:username/badges/received', authenticate, badgeController.getUserReceivedBadges);
router.get('/users/:username/badgecase', authenticate, badgeController.getUserBadgeCase);
router.post('/users/:username/badgecase/badges/:badgeInstanceId', authenticate, badgeController.addBadgeToCase);
router.delete('/users/:username/badgecase/badges/:badgeInstanceId', authenticate, badgeController.removeBadgeFromCase);
router.patch('/users/:username/badgecase/order', authenticate, badgeController.reorderBadgeCase);
router.patch('/users/:username/badgecase/visibility', authenticate, badgeController.toggleBadgeCaseVisibility);
router.delete('/users/:username/badges/:badgeInstanceId', authenticate, badgeController.deleteBadgePermanently);

// Badge template routes
router.post('/badge-templates', authenticate, badgeController.createBadgeTemplate);
router.get('/users/:username/badge-templates', authenticate, badgeController.getUserBadgeTemplates);
router.get('/badge-templates/:templateId', authenticate, badgeController.getBadgeTemplate);
router.patch('/badge-templates/:templateId', authenticate, badgeController.updateBadgeTemplate);
router.delete('/badge-templates/:templateId', authenticate, badgeController.deleteBadgeTemplate);

module.exports = router;