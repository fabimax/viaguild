const badgeService = require('../services/badge.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  },

  /**
   * POST /api/badge-templates
   * Create a new badge template
   */
  async createBadgeTemplate(req, res) {
    try {
      const templateData = req.body;
      const creatorId = req.user.id;

      // Validate required fields
      if (!templateData.templateSlug || !templateData.defaultBadgeName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: templateSlug and defaultBadgeName are required'
        });
      }

      const template = await badgeService.createBadgeTemplate({
        ...templateData,
        authoredByUserId: creatorId
      });

      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error creating badge template:', error);
      const statusCode = 
        error.message.includes('already exists') ? 409 :
        error.message.includes('Invalid') ? 400 :
        500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /api/users/:username/badge-templates
   * Get all badge templates owned by a user
   */
  async getUserBadgeTemplates(req, res) {
    try {
      const { username } = req.params;
      const templates = await badgeService.getUserBadgeTemplates(username);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error fetching user badge templates:', error);
      res.status(error.message === 'User not found' ? 404 : 500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /api/badge-templates/:templateId
   * Get a specific badge template
   */
  async getBadgeTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const template = await badgeService.getBadgeTemplate(templateId);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Badge template not found'
        });
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error fetching badge template:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * PATCH /api/badge-templates/:templateId
   * Update a badge template
   */
  async updateBadgeTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const updateData = req.body;
      const requestingUserId = req.user.id;

      const template = await badgeService.updateBadgeTemplate(
        templateId,
        updateData,
        requestingUserId
      );

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error updating badge template:', error);
      const statusCode = 
        error.message === 'Badge template not found' ? 404 :
        error.message.includes('Cannot modify') ? 403 :
        error.message.includes('already exists') ? 409 :
        500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/badge-templates/:templateId
   * Delete a badge template
   */
  async deleteBadgeTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const requestingUserId = req.user.id;

      await badgeService.deleteBadgeTemplate(templateId, requestingUserId);

      res.json({
        success: true,
        message: 'Badge template deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting badge template:', error);
      const statusCode = 
        error.message === 'Badge template not found' ? 404 :
        error.message.includes('Cannot delete') ? 403 :
        error.message.includes('has existing badges') ? 409 :
        500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/badges/give
   * Give a badge to a user
   */
  async giveBadge(req, res) {
    try {
      const giverId = req.user.id;
      const { templateId, recipientUsername, customizations } = req.body;

      // Validate required fields
      if (!templateId || !recipientUsername) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: templateId and recipientUsername are required'
        });
      }

      const badge = await badgeService.giveBadge(
        giverId,
        templateId,
        recipientUsername,
        customizations || {}
      );

      res.status(201).json({
        success: true,
        data: badge
      });
    } catch (error) {
      console.error('Error giving badge:', error);
      const statusCode = 
        error.message === 'Badge template not found' ? 404 :
        error.message === 'Recipient user not found' ? 404 :
        error.message.includes('You can only give badges') ? 403 :
        error.message.includes('Insufficient') ? 403 :
        500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/badges/give/bulk
   * Give badges to multiple users
   */
  async giveBadgesBulk(req, res) {
    try {
      const giverId = req.user.id;
      const { templateId, recipients } = req.body;

      // Validate required fields
      if (!templateId || !recipients || !Array.isArray(recipients)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: templateId and recipients array are required'
        });
      }

      const results = await badgeService.giveBadgesBulk(
        giverId,
        templateId,
        recipients
      );

      res.status(207).json({ // 207 Multi-Status for partial success
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error giving badges in bulk:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /api/users/:username/allocations
   * Get user's badge allocations
   */
  async getUserAllocations(req, res) {
    try {
      const { username } = req.params;
      
      // Verify the user is fetching their own allocations or is an admin
      const user = await prisma.user.findUnique({
        where: { username_ci: username.toLowerCase() },
        select: { id: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Only allow users to see their own allocations for now
      if (user.id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Cannot view other users\' allocations'
        });
      }

      const allocations = await badgeService.getUserAllocations(user.id);

      res.json({
        success: true,
        data: allocations
      });
    } catch (error) {
      console.error('Error fetching user allocations:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /api/users/:username/badges/given
   * Get badges given by a user
   */
  async getUserGivenBadges(req, res) {
    try {
      const { username } = req.params;
      const filters = req.query; // status, templateId, receiverUsername
      
      // Verify the user exists
      const user = await prisma.user.findUnique({
        where: { username_ci: username.toLowerCase() },
        select: { id: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Only allow users to see their own given badges for now
      if (user.id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Cannot view other users\' given badges'
        });
      }

      const badges = await badgeService.getUserGivenBadges(user.id, filters);

      res.json({
        success: true,
        data: badges
      });
    } catch (error) {
      console.error('Error fetching given badges:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Secure proxy for fetching SVG content from R2
   * Only allows fetching from our R2 bucket to prevent SSRF attacks
   */
  async fetchSvgContent(req, res) {
    try {
      const { url } = req.query;
      
      if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      // Validate URL
      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      // Whitelist only our R2 bucket
      const allowedHosts = [
        'pub-2a8c2830ac2d42478acd81b42a86bd95.r2.dev'
      ];

      if (!allowedHosts.includes(parsedUrl.hostname)) {
        return res.status(403).json({ error: 'URL not allowed' });
      }

      // Only allow HTTPS
      if (parsedUrl.protocol !== 'https:') {
        return res.status(403).json({ error: 'Only HTTPS URLs are allowed' });
      }

      // Fetch with timeout and size limit
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'ViaGuild-Badge-Service/1.0'
          }
        });

        clearTimeout(timeout);

        if (!response.ok) {
          return res.status(response.status).json({ error: 'Failed to fetch SVG' });
        }

        // Check content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('svg')) {
          return res.status(400).json({ error: 'Content is not SVG' });
        }

        // Read response with size limit (1MB)
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 1024 * 1024) {
          return res.status(413).json({ error: 'SVG file too large' });
        }

        const svgContent = await response.text();
        
        // Basic SVG validation
        if (!svgContent.trim().startsWith('<svg') && !svgContent.trim().startsWith('<?xml')) {
          return res.status(400).json({ error: 'Invalid SVG content' });
        }

        // Return SVG content with appropriate headers
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.send(svgContent);

      } catch (fetchError) {
        clearTimeout(timeout);
        if (fetchError.name === 'AbortError') {
          return res.status(504).json({ error: 'Request timeout' });
        }
        throw fetchError;
      }

    } catch (error) {
      console.error('Error in fetchSvgContent:', error);
      res.status(500).json({ error: 'Failed to fetch SVG content' });
    }
  }
};

module.exports = badgeController;