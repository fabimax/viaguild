const express = require('express');
const router = express.Router();
const guildController = require('../controllers/guild.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All guild routes require authentication
router.use(authenticate);

// Guild CRUD operations
router.post('/', guildController.createGuild);
router.get('/:id', guildController.getGuildById);
router.put('/:id', guildController.updateGuild);
router.delete('/:id', guildController.deleteGuild);

// Guild Member Listing
router.get('/:guildId/members', guildController.getGuildMembers);

// Guild Permissions for current user
router.get('/:guildId/my-permissions', guildController.getMyGuildPermissions);

// User's guilds
router.get('/user/me', guildController.getGuildsByUserId);

// Guild search
router.get('/search', guildController.searchGuilds);

// Guild membership operations
router.post('/:id/join', guildController.joinGuild);
router.delete('/:id/leave', guildController.leaveGuild);
router.put('/:id/primary', guildController.setPrimaryGuild);
router.put('/:guildId/members/:userId/role', guildController.updateMemberRole);

module.exports = router; 