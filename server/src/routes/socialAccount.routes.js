const express = require('express');
const socialAccountController = require('../controllers/socialAccount.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * Social account routes for ViaGuild
 * All routes require authentication
 */

// Get all social accounts for the current user
router.get('/', authenticate, socialAccountController.getSocialAccounts);

// Delete a social account
router.delete('/:id', authenticate, socialAccountController.removeSocialAccount);

// Mock routes for development (these would be replaced with real OAuth in production)
router.post('/mock/twitter', authenticate, socialAccountController.mockTwitterConnect);
router.post('/mock/bluesky', authenticate, socialAccountController.mockBlueskyConnect);

module.exports = router;