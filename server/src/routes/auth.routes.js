const express = require('express');
const authController = require('../controllers/auth.controller');
const { validateRegistration, validateLogin } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const twitchController = require('../controllers/twitch.controller');
const twitterController = require('../controllers/twitter.controller');
const discordController = require('../controllers/discord.controller');

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
router.get('/connect/twitter', authenticate, twitterController.initiateTwitterAuth);
router.get('/connect/twitter/callback', twitterController.twitterCallback);
router.get('/connect/twitch', authenticate, twitchController.initiateTwitchAuth);
router.get('/connect/twitch/callback', twitchController.twitchCallback);

// Discord OAuth routes
router.get('/connect/discord', authenticate, discordController.initiateDiscordAuth);
router.get('/connect/discord/callback', discordController.discordCallback);

module.exports = router;