const r2Service = require('../services/r2.service.js');

/**
 * Controller for handling file uploads to R2 storage
 */
const uploadController = {
  /**
   * Upload user avatar
   * Replaces the old Base64 avatar system
   */
  async uploadUserAvatar(req, res) {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Get previous preview URL from header
      const previousPreviewUrl = req.headers['x-previous-preview-url'];

      // Get current saved avatar from database
      const currentUser = await req.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { avatar: true }
      });
      
      console.log('Current saved avatar:', currentUser.avatar);
      console.log('Previous preview URL:', previousPreviewUrl);
      
      // If there's a previous preview URL, check if it should be deleted
      if (previousPreviewUrl) {
        // Only delete if it's different from the saved avatar (i.e., it's a preview)
        if (previousPreviewUrl !== currentUser.avatar) {
          console.log('Deleting previous preview:', previousPreviewUrl);
          try {
            // Use deleteSpecificAvatar to only delete those specific files
            await r2Service.deleteSpecificAvatar(previousPreviewUrl, req.prisma);
          } catch (deleteError) {
            console.error('Error deleting previous preview:', deleteError);
            // Continue with upload even if deletion fails
          }
        } else {
          console.log('Previous URL is the saved avatar, not deleting');
        }
      }
      
      // Upload to R2 with multiple sizes
      const result = await r2Service.uploadAvatar(
        req.file.buffer,
        req.user.id,
        req.file.originalname,
        req.prisma
      );

      // Don't update the database here - let the user save their profile
      // This is just a preview upload

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatarUrl: result.urls.large,
          urls: result.urls,
          assetId: result.id,
        },
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ 
        error: 'Failed to upload avatar',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Upload guild avatar
   */
  async uploadGuildAvatar(req, res) {
    try {
      const { guildId } = req.params;

      // Check if user has permission to update guild
      const membership = await req.prisma.guildMembership.findFirst({
        where: {
          guildId,
          userId: req.user.id,
        },
        include: {
          assignedRoles: {
            include: {
              guildRole: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Check for GUILD_EDIT_DETAILS permission (which should allow avatar changes)
      const hasPermission = membership?.assignedRoles.some(ar =>
        ar.guildRole.permissions.some(rp =>
          rp.permission.key === 'GUILD_EDIT_DETAILS'
        )
      );

      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Get previous preview URL from header
      const previousPreviewUrl = req.headers['x-previous-preview-url'];

      // Get current saved guild avatar from database
      const currentGuild = await req.prisma.guild.findUnique({
        where: { id: guildId },
        select: { avatar: true }
      });
      
      console.log('Current saved guild avatar:', currentGuild.avatar);
      console.log('Previous guild preview URL:', previousPreviewUrl);
      
      // If there's a previous preview URL, check if it should be deleted
      if (previousPreviewUrl) {
        // Only delete if it's different from the saved avatar (i.e., it's a preview)
        if (previousPreviewUrl !== currentGuild.avatar) {
          console.log('Deleting previous guild preview:', previousPreviewUrl);
          try {
            // Use deleteSpecificAvatar to only delete those specific files
            await r2Service.deleteSpecificAvatar(previousPreviewUrl, req.prisma);
          } catch (deleteError) {
            console.error('Error deleting previous guild preview:', deleteError);
            // Continue with upload even if deletion fails
          }
        } else {
          console.log('Previous URL is the saved guild avatar, not deleting');
        }
      }

      // Upload to R2
      const result = await r2Service.uploadGuildAvatar(
        req.file.buffer,
        guildId,
        req.file.originalname,
        req.prisma
      );

      // Don't update the database here - let the guild admin save changes
      // This is just a preview upload

      res.json({
        success: true,
        message: 'Guild avatar uploaded successfully',
        data: {
          avatarUrl: result.urls.large,
          urls: result.urls,
          assetId: result.id,
        },
      });
    } catch (error) {
      console.error('Guild avatar upload error:', error);
      res.status(500).json({ error: 'Failed to upload guild avatar' });
    }
  },

  /**
   * Upload cluster avatar
   */
  async uploadClusterAvatar(req, res) {
    try {
      const { clusterId } = req.params;

      // Check if user has permission to update cluster
      // For now, let's assume only cluster admins can update
      // You'll need to implement proper permission checks based on your cluster roles
      const clusterRole = await req.prisma.clusterRoleSetting.findFirst({
        where: {
          clusterId,
          userId: req.user.id,
        },
        include: {
          clusterRole: {
            include: {
              clusterRolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      // Check for CLUSTER_EDIT_DETAILS permission or similar
      const hasPermission = clusterRole?.clusterRole.clusterRolePermissions.some(crp =>
        crp.permission.key === 'CLUSTER_EDIT_DETAILS'
      );

      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Upload to R2 - reuse guild avatar method as they're similar
      // Note: Old avatar cleanup should happen when the cluster profile is saved
      const result = await r2Service.uploadGuildAvatar(
        req.file.buffer,
        clusterId,
        req.file.originalname,
        req.prisma
      );

      // Don't update the database here - let the cluster admin save changes
      // This is just a preview upload

      res.json({
        success: true,
        message: 'Cluster avatar uploaded successfully',
        data: {
          avatarUrl: result.urls.large,
          urls: result.urls,
          assetId: result.id,
        },
      });
    } catch (error) {
      console.error('Cluster avatar upload error:', error);
      res.status(500).json({ error: 'Failed to upload cluster avatar' });
    }
  },

  /**
   * Upload badge SVG
   */
  async uploadBadgeSvg(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { svgContent, filename, description } = req.body;

      if (!svgContent) {
        return res.status(400).json({ error: 'No SVG content provided' });
      }

      // Upload to R2
      const result = await r2Service.uploadBadgeSvg(
        svgContent,
        req.user.id,
        filename || 'badge.svg',
        description,
        req.prisma
      );

      res.json({
        success: true,
        message: 'Badge SVG uploaded successfully',
        data: {
          url: result.url,
          assetId: result.id,
        },
      });
    } catch (error) {
      console.error('Badge SVG upload error:', error);
      res.status(500).json({ error: 'Failed to upload badge SVG' });
    }
  },

  /**
   * Upload badge icon (SVG or image)
   */
  async uploadBadgeIcon(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { templateSlug } = req.body;
      const file = req.file;
      
      // Create filename with template slug
      const timestamp = Date.now();
      const fileExtension = file.originalname.split('.').pop();
      const filename = `${templateSlug || 'badge-icon'}-${timestamp}.${fileExtension}`;
      
      let result;
      
      if (file.mimetype === 'image/svg+xml') {
        // Handle SVG upload using existing method
        const svgContent = file.buffer.toString('utf8');
        result = await r2Service.uploadBadgeSvg(
          svgContent,
          req.user.id,
          filename,
          `Badge icon for ${templateSlug}`,
          req.prisma
        );
      } else {
        // Handle regular image upload
        result = await r2Service.processAndUploadImage(
          file.buffer,
          'users',
          req.user.id,
          filename,
          {
            width: 512,
            height: 512,
            quality: 90,
            format: 'webp',
            description: `Badge icon for ${templateSlug}`
          },
          req.prisma
        );
      }

      res.json({
        success: true,
        message: 'Badge icon uploaded successfully',
        data: {
          iconUrl: result.url,
          assetId: result.id,
        },
      });
    } catch (error) {
      console.error('Badge icon upload error:', error);
      res.status(500).json({ 
        error: 'Failed to upload badge icon',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Generate presigned upload URL for direct client uploads
   * Useful for large files or when you want to upload directly from browser
   */
  async getPresignedUploadUrl(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { assetType, contentType } = req.body;

      // Validate asset type
      const allowedTypes = ['avatar', 'guild_avatar', 'badge'];
      if (!allowedTypes.includes(assetType)) {
        return res.status(400).json({ error: 'Invalid asset type' });
      }

      // Generate unique key
      const prefix = `temp/${req.user.id}/${assetType}`;
      const key = r2Service.generateKey(prefix, 'file');

      // Get presigned URL
      const uploadUrl = await r2Service.getSignedUploadUrl(
        key,
        contentType,
        3600 // 1 hour expiration
      );

      res.json({
        success: true,
        data: {
          uploadUrl,
          key,
          expiresIn: 3600,
        },
      });
    } catch (error) {
      console.error('Presigned URL generation error:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },

  /**
   * Delete an uploaded asset
   */
  async deleteAsset(req, res) {
    try {
      const { assetId } = req.params;

      // Find the asset
      const asset = await req.prisma.uploadedAsset.findUnique({
        where: { id: assetId },
      });

      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      // Check if user owns the asset or has permission
      if (asset.uploaderId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized to delete this asset' });
      }

      // Delete from R2 and database
      await r2Service.deleteAsset(asset.storageIdentifier, req.prisma);

      res.json({
        success: true,
        message: 'Asset deleted successfully',
      });
    } catch (error) {
      console.error('Asset deletion error:', error);
      res.status(500).json({ error: 'Failed to delete asset' });
    }
  },

  /**
   * Delete a preview avatar
   * Called when component unmounts to clean up unsaved previews
   */
  async deletePreview(req, res) {
    try {
      const { previewUrl } = req.body;

      if (!previewUrl) {
        return res.status(400).json({ error: 'No preview URL provided' });
      }

      // Get current user's saved avatar
      const currentUser = await req.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { avatar: true }
      });

      // Only delete if it's not the saved avatar
      if (previewUrl !== currentUser.avatar) {
        console.log('Deleting preview on unmount:', previewUrl);
        try {
          await r2Service.deleteSpecificAvatar(previewUrl, req.prisma);
          res.json({
            success: true,
            message: 'Preview deleted successfully',
          });
        } catch (deleteError) {
          console.error('Error deleting preview:', deleteError);
          // Still return success to avoid blocking the frontend
          res.json({
            success: true,
            message: 'Preview deletion attempted',
          });
        }
      } else {
        res.json({
          success: true,
          message: 'Preview is the saved avatar, not deleted',
        });
      }
    } catch (error) {
      console.error('Preview deletion error:', error);
      // Don't fail the frontend if cleanup fails
      res.json({
        success: true,
        message: 'Preview deletion attempted',
      });
    }
  },

  /**
   * Delete a preview avatar (beacon endpoint)
   * Special endpoint for sendBeacon that accepts auth token in body
   */
  async deletePreviewBeacon(req, res) {
    try {
      const { previewUrl, authToken } = req.body;

      if (!authToken) {
        return res.status(401).json({ error: 'No auth token provided' });
      }

      // Verify the auth token manually since this endpoint bypasses normal auth middleware
      const jwt = require('jsonwebtoken');
      let decoded;
      try {
        decoded = jwt.verify(authToken, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'Invalid auth token' });
      }

      if (!previewUrl) {
        return res.status(400).json({ error: 'No preview URL provided' });
      }

      // Get current user's saved avatar
      const currentUser = await req.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { avatar: true }
      });

      // Only delete if it's not the saved avatar
      if (previewUrl !== currentUser.avatar) {
        console.log('Deleting preview via beacon:', previewUrl);
        try {
          await r2Service.deleteSpecificAvatar(previewUrl, req.prisma);
          res.json({
            success: true,
            message: 'Preview deleted successfully',
          });
        } catch (deleteError) {
          console.error('Error deleting preview:', deleteError);
          // Still return success to avoid blocking the frontend
          res.json({
            success: true,
            message: 'Preview deletion attempted',
          });
        }
      } else {
        res.json({
          success: true,
          message: 'Preview is the saved avatar, not deleted',
        });
      }
    } catch (error) {
      console.error('Preview deletion error (beacon):', error);
      // Don't fail the frontend if cleanup fails
      res.json({
        success: true,
        message: 'Preview deletion attempted',
      });
    }
  },
};

module.exports = { uploadController };