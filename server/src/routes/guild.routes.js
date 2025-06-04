const express = require('express');
const router = express.Router();
const guildController = require('../controllers/guild.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Public routes (no authentication required) - specific routes first
router.get('/search', guildController.searchGuilds); // Public guild search

// All routes below require authentication EXCEPT the public guild profile
// Auth-required routes - specific routes first
router.get('/user/me', authenticate, guildController.getGuildsByUserId);
router.get('/:guildId/members', authenticate, guildController.getGuildMembers);
router.get('/:guildId/my-permissions', authenticate, guildController.getMyGuildPermissions);

// Guild CRUD operations
router.post('/', authenticate, guildController.createGuild);
router.put('/:identifier', authenticate, guildController.updateGuild);
router.delete('/:identifier', authenticate, guildController.deleteGuild);

// Guild membership operations
router.post('/:identifier/join', authenticate, guildController.joinGuild);
router.delete('/:identifier/leave', authenticate, guildController.leaveGuild);
router.put('/:identifier/primary', authenticate, guildController.setPrimaryGuild);
router.put('/:guildId/members/:userId/role', authenticate, guildController.updateMemberRole);

// Public guild profile - MUST BE LAST due to catch-all nature of :identifier
router.get('/:identifier', guildController.getGuildById); // Public guild profile

module.exports = router; 