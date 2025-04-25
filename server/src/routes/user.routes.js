const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * User routes for ViaGuild
 * Handles user search and profile viewing
 */

// Search for users 
// No authentication required for basic search
router.get('/search', userController.searchUsers);

// Update current user's profile (requires authentication)
router.put('/profile', authenticate, userController.updateProfile);

// Get public profile for a specific user
// No authentication required for viewing public profiles
router.get('/:username', userController.getUserProfile);

// Get a user's public social accounts
router.get('/:username/social-accounts', userController.getUserSocialAccounts);

module.exports = router;