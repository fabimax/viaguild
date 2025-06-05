const badgeService = require('../services/badge.service');

const badgeController = {
  /**
   * GET /api/users/:username/badges/received
   * Get all badges received by a user
   */
  async getUserReceivedBadges(req, res) {
    try {
      const { username } = req.params;
      const badges = await badgeService.getUserReceivedBadges(username);
      
      // Transform badges to include resolved display properties
      const transformedBadges = badges.map(badge => ({
        id: badge.id,
        templateId: badge.templateId,
        templateSlug: badge.template.templateSlug,
        giverType: badge.giverType,
        giverId: badge.giverId,
        assignedAt: badge.assignedAt,
        message: badge.message,
        awardStatus: badge.awardStatus,
        apiVisible: badge.apiVisible,
        isInCase: !!badge.userBadgeItem,
        displayProps: badgeService.getBadgeDisplayProps(badge)
      }));

      res.json({
        success: true,
        data: transformedBadges
      });
    } catch (error) {
      console.error('Error fetching user badges:', error);
      res.status(error.message === 'User not found' ? 404 : 500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /api/users/:username/badgecase
   * Get user's public badge case
   */
  async getUserBadgeCase(req, res) {
    try {
      const { username } = req.params;
      const badgeCase = await badgeService.getUserBadgeCase(username);
      
      // Transform badge case data
      const transformedCase = {
        id: badgeCase.id,
        title: badgeCase.title,
        isPublic: badgeCase.isPublic,
        badges: badgeCase.badges.map(item => ({
          id: item.badge.id,
          templateId: item.badge.templateId,
          templateSlug: item.badge.template.templateSlug,
          displayOrder: item.displayOrder,
          addedAt: item.addedAt,
          assignedAt: item.badge.assignedAt,
          message: item.badge.message,
          displayProps: badgeService.getBadgeDisplayProps(item.badge)
        }))
      };

      res.json({
        success: true,
        data: transformedCase
      });
    } catch (error) {
      console.error('Error fetching badge case:', error);
      res.status(error.message === 'User not found' ? 404 : 500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/users/:username/badgecase/badges/:badgeInstanceId
   * Add a badge to user's badge case
   */
  async addBadgeToCase(req, res) {
    try {
      const { username, badgeInstanceId } = req.params;
      const requestingUserId = req.user.id; // From auth middleware

      const badgeItem = await badgeService.addBadgeToCase(
        username, 
        badgeInstanceId, 
        requestingUserId
      );

      res.status(201).json({
        success: true,
        data: badgeItem
      });
    } catch (error) {
      console.error('Error adding badge to case:', error);
      const statusCode = 
        error.message === 'User not found' ? 404 :
        error.message.includes('Cannot modify') ? 403 :
        error.message === 'Badge not found or not owned by user' ? 404 :
        error.message === 'Badge is already in the case' ? 409 :
        500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/users/:username/badgecase/badges/:badgeInstanceId
   * Remove a badge from user's badge case
   */
  async removeBadgeFromCase(req, res) {
    try {
      const { username, badgeInstanceId } = req.params;
      const requestingUserId = req.user.id;

      await badgeService.removeBadgeFromCase(
        username, 
        badgeInstanceId, 
        requestingUserId
      );

      res.json({
        success: true,
        message: 'Badge removed from case'
      });
    } catch (error) {
      console.error('Error removing badge from case:', error);
      const statusCode = 
        error.message === 'User not found' ? 404 :
        error.message.includes('Cannot modify') ? 403 :
        error.message === 'Badge not found in case' ? 404 :
        500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * PATCH /api/users/:username/badgecase/order
   * Reorder badges in user's badge case
   */
  async reorderBadgeCase(req, res) {
    try {
      const { username } = req.params;
      const { badges } = req.body; // Array of { badgeInstanceId, displayOrder }
      const requestingUserId = req.user.id;

      if (!Array.isArray(badges)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body. Expected an array of badges.'
        });
      }

      await badgeService.reorderBadgeCase(username, badges, requestingUserId);

      res.json({
        success: true,
        message: 'Badge order updated'
      });
    } catch (error) {
      console.error('Error reordering badges:', error);
      const statusCode = 
        error.message === 'User not found' ? 404 :
        error.message.includes('Cannot modify') ? 403 :
        500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * PATCH /api/users/:username/badgecase/visibility
   * Toggle badge case visibility
   */
  async toggleBadgeCaseVisibility(req, res) {
    try {
      const { username } = req.params;
      const { isPublic } = req.body;
      const requestingUserId = req.user.id;

      if (typeof isPublic !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body. isPublic must be a boolean.'
        });
      }

      const badgeCase = await badgeService.toggleBadgeCaseVisibility(
        username, 
        isPublic, 
        requestingUserId
      );

      res.json({
        success: true,
        data: {
          id: badgeCase.id,
          isPublic: badgeCase.isPublic
        }
      });
    } catch (error) {
      console.error('Error toggling badge case visibility:', error);
      const statusCode = 
        error.message === 'User not found' ? 404 :
        error.message.includes('Cannot modify') ? 403 :
        500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/users/:username/badges/:badgeInstanceId
   * Delete a badge permanently (soft delete)
   */
  async deleteBadgePermanently(req, res) {
    try {
      const { username, badgeInstanceId } = req.params;
      const requestingUserId = req.user.id;

      await badgeService.deleteBadgePermanently(
        username, 
        badgeInstanceId, 
        requestingUserId
      );

      res.json({
        success: true,
        message: 'Badge deleted permanently'
      });
    } catch (error) {
      console.error('Error deleting badge:', error);
      const statusCode = 
        error.message === 'User not found' ? 404 :
        error.message.includes('Cannot delete') ? 403 :
        error.message === 'Badge not found or not owned by user' ? 404 :
        500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /api/users/:username/badgecase/public
   * Get user's public badge case (no authentication required)
   */
  async getPublicBadgeCase(req, res) {
    try {
      const { username } = req.params;
      const badgeCase = await badgeService.getUserBadgeCase(username);
      
      // Only return if badge case is public
      if (!badgeCase.isPublic) {
        return res.status(403).json({
          success: false,
          error: 'Badge case is private'
        });
      }
      
      // Transform badge case data (same as authenticated endpoint)
      const transformedCase = {
        id: badgeCase.id,
        title: badgeCase.title,
        isPublic: badgeCase.isPublic,
        badges: badgeCase.badges.map(item => ({
          id: item.badge.id,
          templateId: item.badge.templateId,
          templateSlug: item.badge.template.templateSlug,
          displayOrder: item.displayOrder,
          addedAt: item.addedAt,
          assignedAt: item.badge.assignedAt,
          message: item.badge.message,
          displayProps: badgeService.getBadgeDisplayProps(item.badge)
        }))
      };

      res.json({
        success: true,
        data: transformedCase
      });
    } catch (error) {
      console.error('Error fetching public badge case:', error);
      res.status(error.message === 'User not found' ? 404 : 500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = badgeController;