const express = require('express');
const socialAccountController = require('../controllers/socialAccount.controller');
const blueskyController = require('../controllers/bluesky.controller');
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

// Connect Bluesky account with app password
router.post('/bluesky', authenticate, blueskyController.connectBlueskyAccount);

// Mock routes for development (these would be replaced with real OAuth in production)
router.post('/mock/twitter', authenticate, socialAccountController.mockTwitterConnect);
// Keep the mock route for Bluesky for backwards compatibility during development
router.post('/mock/bluesky', authenticate, socialAccountController.mockBlueskyConnect);

module.exports = router;