const guildService = require('../services/guild.service');

/**
 * Guild Controller - handles HTTP requests for guild operations
 */
class GuildController {
  /**
   * Create a new guild
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createGuild(req, res) {
    try {
      const userId = req.user.id;
      const guild = await guildService.createGuild(req.body, userId);
      res.status(201).json(guild);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Get guild by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGuildById(req, res) {
    try {
      const { id } = req.params;
      const guild = await guildService.getGuildById(id);
      res.json(guild);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  /**
   * Update guild
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateGuild(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const guild = await guildService.updateGuild(id, req.body, userId);
      res.json(guild);
    } catch (error) {
      if (error.message === 'Guild not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('permission')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  /**
   * Delete guild
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteGuild(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      await guildService.deleteGuild(id, userId);
      res.status(204).end();
    } catch (error) {
      if (error.message === 'Guild not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('owner')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  /**
   * Get guilds by user ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGuildsByUserId(req, res) {
    try {
      const userId = req.user.id;
      const guilds = await guildService.getGuildsByUserId(userId);
      res.json(guilds);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Search guilds
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchGuilds(req, res) {
    try {
      const { query, isOpen } = req.query;
      const filters = {};
      
      if (isOpen !== undefined) {
        filters.isOpen = isOpen === 'true';
      }
      
      const guilds = await guildService.searchGuilds(query || '', filters);
      res.json(guilds);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Join guild
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async joinGuild(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const membership = await guildService.joinGuild(id, userId);
      res.status(201).json(membership);
    } catch (error) {
      if (error.message === 'Guild not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('invitation')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  /**
   * Leave guild
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async leaveGuild(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      await guildService.leaveGuild(id, userId);
      res.status(204).end();
    } catch (error) {
      if (error.message === 'Guild not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('owner')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  /**
   * Update member role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateMemberRole(req, res) {
    try {
      const { guildId, userId } = req.params;
      const { role } = req.body;
      const actorUserId = req.user.id;
      
      const membership = await guildService.updateMemberRole(
        guildId,
        userId,
        role,
        actorUserId
      );
      
      res.json(membership);
    } catch (error) {
      if (error.message === 'Guild not found' || error.message === 'User is not a member of this guild') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('permission') || error.message.includes('owner')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  /**
   * Set primary guild
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async setPrimaryGuild(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const membership = await guildService.setPrimaryGuild(id, userId);
      res.json(membership);
    } catch (error) {
      if (error.message === 'Guild not found' || error.message === 'You are not a member of this guild') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  /**
   * Get paginated list of guild members
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGuildMembers(req, res) {
    try {
      const { guildId } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      const result = await guildService.getGuildMembers(guildId, { page, limit });
      res.json(result);
    } catch (error) {
      if (error.message === 'Guild not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  /**
   * Get current user's permissions for a specific guild
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMyGuildPermissions(req, res) {
    try {
      const { guildId } = req.params;
      const userId = req.user.id; // Assuming authenticate middleware sets req.user

      const permissionsData = await guildService.getMyGuildPermissions(guildId, userId);
      res.json(permissionsData);
    } catch (error) {
      if (error.message === 'Guild not found' || error.message === 'User not a member of this guild') {
        res.status(404).json({ error: error.message }); // Or 403 if preferred for non-members
      } else {
        res.status(500).json({ error: 'Failed to retrieve guild permissions' });
      }
    }
  }
}

module.exports = new GuildController(); 