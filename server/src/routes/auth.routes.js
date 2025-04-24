const express = require('express');
const authController = require('../controllers/auth.controller');
const { validateRegistration, validateLogin } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * Authentication routes for ViaGuild
 */

// Registration and login routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);

// Protected route to get current user info
router.get('/me', authenticate, authController.getMe);

// Social authentication routes 
router.get('/connect/twitter', authenticate, authController.connectTwitter);
router.get('/connect/twitter/callback', authController.twitterCallback);
router.get('/connect/bluesky', authenticate, authController.connectBluesky);
router.get('/connect/bluesky/callback', authController.blueskyCallback);

module.exports = router;