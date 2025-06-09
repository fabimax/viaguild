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
   * Single global preview per user - deletes any existing temp upload first
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
      const isSvg = file.mimetype === 'image/svg+xml';
      
      // Check file size limit (2MB for badge icons)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.buffer.length > maxSize) {
        return res.status(400).json({ error: 'File too large. Maximum size is 2MB for badge icons.' });
      }
      
      // SINGLE PREVIEW SYSTEM: Delete any existing temp badge icon for this user
      console.log('Checking for existing temp badge icon for user:', req.user.id);
      const existingTempAsset = await req.prisma.uploadedAsset.findFirst({
        where: {
          uploaderId: req.user.id,
          assetType: 'badge-icon',
          status: 'TEMP'
        }
      });
      
      if (existingTempAsset) {
        console.log('Deleting existing temp badge icon:', existingTempAsset.id);
        try {
          // Delete from R2
          await r2Service.client.send(new (require('@aws-sdk/client-s3').DeleteObjectCommand)({
            Bucket: r2Service.bucketName,
            Key: existingTempAsset.storageIdentifier,
          }));
          
          // Delete from database
          await req.prisma.uploadedAsset.delete({
            where: { id: existingTempAsset.id }
          });
          
          console.log('Successfully deleted existing temp badge icon');
        } catch (deleteError) {
          console.error('Error deleting existing temp asset:', deleteError);
          // Continue with upload even if deletion fails
        }
      }
      
      // Create generic temp filename (no template relationship implied)
      const timestamp = Date.now();
      const randomString = require('crypto').randomBytes(4).toString('hex');
      const fileExtension = file.originalname.split('.').pop();
      const filename = `temp-icon-${timestamp}-${randomString}.${fileExtension}`;
      
      // Generate storage key for temp upload
      const tempPath = r2Service.getEntityAssetPath('users', req.user.id, 'badge-icons', true);
      const storageKey = `${tempPath}/${filename}`;
      
      let metadata = null;
      let processedBuffer = file.buffer;
      
      if (isSvg) {
        // Extract SVG metadata (colors, dimensions, etc.)
        const svgContent = file.buffer.toString('utf8');
        // TODO: Add actual SVG metadata extraction here
        metadata = {
          type: 'svg',
          extractedColors: [], // Will be populated by frontend
          hasCurrentColor: svgContent.includes('currentColor'),
          dimensions: { width: 100, height: 100 }, // Parse from SVG
          fileSize: file.buffer.length
        };
      } else {
        // Process regular image
        const sharp = require('sharp');
        const imageMetadata = await sharp(file.buffer).metadata();
        metadata = {
          type: 'image',
          dimensions: { width: imageMetadata.width, height: imageMetadata.height },
          format: imageMetadata.format,
          fileSize: file.buffer.length,
          hasTransparency: imageMetadata.channels === 4
        };
      }
      
      // Upload to R2 temp folder
      await r2Service.client.send(new (require('@aws-sdk/client-s3').PutObjectCommand)({
        Bucket: r2Service.bucketName,
        Key: storageKey,
        Body: processedBuffer,
        ContentType: file.mimetype,
      }));
      
      const hostedUrl = `${r2Service.publicUrlBase}/${storageKey}`;
      
      // Create temporary asset record with expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration
      
      const uploadedAsset = await req.prisma.uploadedAsset.create({
        data: {
          uploaderId: req.user.id,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.buffer.length,
          hostedUrl,
          storageIdentifier: storageKey,
          assetType: 'badge-icon',
          description: 'Temporary badge icon upload',
          status: 'TEMP',
          expiresAt,
          metadata
        },
      });

      res.json({
        success: true,
        message: 'Badge icon uploaded successfully',
        data: {
          iconUrl: hostedUrl,
          assetId: uploadedAsset.id,
          uploadId: uploadedAsset.id, // For upload:// references
          expires: expiresAt.toISOString(),
          metadata,
          replaced: !!existingTempAsset, // Let frontend know if we replaced an existing preview
          // Data for localStorage sync across tabs
          syncData: {
            iconUrl: hostedUrl,
            assetId: uploadedAsset.id,
            timestamp: Date.now(),
            metadata
          }
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
   * Delete a temporary badge icon upload
   * DELETE /api/upload/badge-icon/:assetId
   * Requires authentication and ownership
   */
  async deleteTempBadgeIcon(req, res) {
    try {
      const { assetId } = req.params;

      // Find the asset
      const asset = await req.prisma.uploadedAsset.findUnique({
        where: { id: assetId },
      });

      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      // Check if user owns the asset
      if (asset.uploaderId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized to delete this asset' });
      }

      // Only allow deletion of TEMP assets
      if (asset.status !== 'TEMP') {
        return res.status(400).json({ error: 'Can only delete temporary assets' });
      }

      // Delete from R2
      try {
        await r2Service.client.send(new (require('@aws-sdk/client-s3').DeleteObjectCommand)({
          Bucket: r2Service.bucketName,
          Key: asset.storageIdentifier,
        }));
      } catch (err) {
        console.error('Error deleting from R2:', err);
      }

      // Delete from database
      await req.prisma.uploadedAsset.delete({
        where: { id: assetId },
      });

      res.json({
        success: true,
        message: 'Temporary badge icon deleted successfully',
      });
    } catch (error) {
      console.error('Badge icon deletion error:', error);
      res.status(500).json({ error: 'Failed to delete badge icon' });
    }
  },

  /**
   * Delete a temporary badge icon (beacon endpoint)
   * Special endpoint for sendBeacon that accepts auth token in body
   */
  async deleteBadgeIconBeacon(req, res) {
    try {
      const { assetId, authToken } = req.body;

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

      if (!assetId) {
        return res.status(400).json({ error: 'No asset ID provided' });
      }

      // Find the asset
      const asset = await req.prisma.uploadedAsset.findUnique({
        where: { id: assetId },
      });

      if (!asset) {
        return res.json({ success: true, message: 'Asset not found' });
      }

      // Check if user owns the asset
      if (asset.uploaderId !== decoded.userId) {
        return res.json({ success: true, message: 'Not authorized' });
      }

      // Only delete if it's still a TEMP asset
      if (asset.status === 'TEMP') {
        try {
          await r2Service.client.send(new (require('@aws-sdk/client-s3').DeleteObjectCommand)({
            Bucket: r2Service.bucketName,
            Key: asset.storageIdentifier,
          }));
        } catch (err) {
          console.error('Error deleting from R2:', err);
        }

        await req.prisma.uploadedAsset.delete({
          where: { id: assetId },
        });

        console.log('Deleted badge icon via beacon:', assetId);
      }

      res.json({
        success: true,
        message: 'Badge icon cleanup completed',
      });
    } catch (error) {
      console.error('Badge icon beacon deletion error:', error);
      // Don't fail the frontend if cleanup fails
      res.json({
        success: true,
        message: 'Badge icon cleanup attempted',
      });
    }
  },

  /**
   * Get current temporary badge icon for user
   * GET /api/upload/badge-icon/current
   * Used for tab synchronization and discovery
   */
  async getCurrentBadgeIcon(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tempAsset = await req.prisma.uploadedAsset.findFirst({
        where: {
          uploaderId: req.user.id,
          assetType: 'badge-icon',
          status: 'TEMP'
        },
        select: {
          id: true,
          hostedUrl: true,
          metadata: true,
          expiresAt: true,
          originalFilename: true,
          sizeBytes: true
        }
      });

      res.json({
        success: true,
        data: {
          tempAsset: tempAsset || null
        }
      });
    } catch (error) {
      console.error('Get current badge icon error:', error);
      res.status(500).json({ error: 'Failed to get current badge icon' });
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

  /**
   * Upload badge background image
   * Similar to badge icon but for background images
   * Follows single global preview pattern
   */
  async uploadBadgeBackground(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      
      if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed for backgrounds.' });
      }

      // SINGLE GLOBAL PREVIEW SYSTEM: Delete any existing temp background upload for this user
      const existingTempAsset = await req.prisma.uploadedAsset.findFirst({
        where: {
          uploaderId: req.user.id,
          assetType: 'badge-background',
          status: 'TEMP'
        }
      });

      let replacedExisting = false;
      if (existingTempAsset) {
        try {
          // Delete from R2
          await r2Service.deleteAsset(existingTempAsset.storageIdentifier, req.prisma);
          
          // Delete from database
          await req.prisma.uploadedAsset.delete({
            where: { id: existingTempAsset.id }
          });
          
          replacedExisting = true;
          console.log('Deleted existing temp background upload:', existingTempAsset.id);
        } catch (deleteError) {
          console.error('Error deleting existing temp background:', deleteError);
          // Continue with new upload even if deletion fails
        }
      }

      // Generate unique filename with generic naming (no template association yet)
      const timestamp = Date.now();
      const randomString = require('crypto').randomBytes(4).toString('hex');
      const filename = `temp-bg-${timestamp}-${randomString}.${fileExtension}`;

      // Generate storage key for temp upload (following badge icon pattern)
      const tempPath = r2Service.getEntityAssetPath('users', req.user.id, 'badge-backgrounds', true);
      const storageKey = `${tempPath}/${filename}`;

      // Upload to R2 directly
      await r2Service.client.send(new (require('@aws-sdk/client-s3').PutObjectCommand)({
        Bucket: r2Service.bucketName,
        Key: storageKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }));
      
      const hostedUrl = `${r2Service.publicUrlBase}/${storageKey}`;

      // Extract metadata
      const metadata = {
        type: 'image',
        mimeType: req.file.mimetype,
        dimensions: { width: null, height: null }, // Could extract with sharp if needed
        fileSize: req.file.size
      };

      // Create database record with TEMP status and expiration
      const uploadedAsset = await req.prisma.uploadedAsset.create({
        data: {
          hostedUrl,
          storageIdentifier: storageKey,
          originalFilename: req.file.originalname,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          assetType: 'badge-background',
          uploaderId: req.user.id,
          status: 'TEMP',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          metadata,
          description: 'Temporary badge background upload'
        }
      });

      console.log('Badge background uploaded:', uploadedAsset.id);

      res.json({
        success: true,
        message: 'Badge background uploaded successfully',
        data: {
          backgroundUrl: hostedUrl,
          assetId: uploadedAsset.id,
          expiresAt: uploadedAsset.expiresAt,
          syncData: {
            assetId: uploadedAsset.id,
            backgroundUrl: hostedUrl,
            timestamp: Date.now(),
            metadata
          },
          replacedExisting
        }
      });
    } catch (error) {
      console.error('Badge background upload error:', error);
      res.status(500).json({ error: 'Failed to upload badge background' });
    }
  },

  /**
   * Get current temporary badge background for the user
   * Used for tab discovery and synchronization
   */
  async getCurrentBadgeBackground(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tempAsset = await req.prisma.uploadedAsset.findFirst({
        where: {
          uploaderId: req.user.id,
          assetType: 'badge-background',
          status: 'TEMP'
        },
        select: {
          id: true,
          hostedUrl: true,
          metadata: true,
          expiresAt: true,
          originalFilename: true,
          sizeBytes: true
        }
      });

      res.json({
        success: true,
        data: {
          tempAsset: tempAsset || null
        }
      });
    } catch (error) {
      console.error('Get current badge background error:', error);
      res.status(500).json({ error: 'Failed to get current badge background' });
    }
  },

  /**
   * Delete temporary badge background
   * Similar to badge icon deletion
   */
  async deleteTempBadgeBackground(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { assetId } = req.params;

      // Find the asset
      const asset = await req.prisma.uploadedAsset.findUnique({
        where: { id: assetId }
      });

      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      // Check ownership
      if (asset.uploaderId !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this asset' });
      }

      // Only allow deletion of TEMP badge backgrounds
      if (asset.status !== 'TEMP' || asset.assetType !== 'badge-background') {
        return res.status(400).json({ error: 'Can only delete temporary badge backgrounds' });
      }

      // Delete from R2
      try {
        await r2Service.client.send(new (require('@aws-sdk/client-s3').DeleteObjectCommand)({
          Bucket: r2Service.bucketName,
          Key: asset.storageIdentifier,
        }));
      } catch (deleteError) {
        console.error('R2 deletion error for badge background:', deleteError);
        // Continue with database deletion even if R2 fails
      }

      // Delete from database
      await req.prisma.uploadedAsset.delete({
        where: { id: assetId }
      });

      res.json({
        success: true,
        message: 'Badge background deleted successfully'
      });
    } catch (error) {
      console.error('Delete badge background error:', error);
      res.status(500).json({ error: 'Failed to delete badge background' });
    }
  },

  /**
   * Delete badge background (beacon endpoint)
   * For cleanup on component unmount
   */
  async deleteBadgeBackgroundBeacon(req, res) {
    try {
      // Parse the raw body as JSON
      let body;
      if (req.body && typeof req.body === 'string') {
        try {
          body = JSON.parse(req.body);
        } catch (e) {
          body = req.body;
        }
      } else {
        body = req.body || {};
      }

      const { assetId, authToken } = body;

      if (!assetId || !authToken) {
        return res.json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Manually verify the auth token
      const jwt = require('jsonwebtoken');
      let userId;
      try {
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'your-secret-key');
        userId = decoded.userId;
      } catch (err) {
        return res.json({
          success: false,
          message: 'Invalid auth token'
        });
      }

      // Find the asset
      const asset = await req.prisma.uploadedAsset.findUnique({
        where: { id: assetId }
      });

      if (!asset || asset.uploaderId !== userId || asset.status !== 'TEMP' || asset.assetType !== 'badge-background') {
        return res.json({
          success: false,
          message: 'Asset not found or not eligible for deletion'
        });
      }

      // Delete from R2
      try {
        await r2Service.client.send(new (require('@aws-sdk/client-s3').DeleteObjectCommand)({
          Bucket: r2Service.bucketName,
          Key: asset.storageIdentifier,
        }));
      } catch (deleteError) {
        console.error('R2 deletion error for badge background (beacon):', deleteError);
      }

      // Delete from database
      await req.prisma.uploadedAsset.delete({
        where: { id: assetId }
      });

      res.json({
        success: true,
        message: 'Badge background deleted via beacon'
      });
    } catch (error) {
      console.error('Badge background deletion error (beacon):', error);
      res.json({
        success: true,
        message: 'Badge background deletion attempted'
      });
    }
  },
};

module.exports = { uploadController };