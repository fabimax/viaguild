const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const sharp = require('sharp');
const crypto = require('crypto');

/**
 * Service for handling file uploads to Cloudflare R2 storage.
 * Provides methods for uploading avatars, badges, and other assets with automatic image processing.
 */
class R2Service {
  constructor() {
    // Initialize S3-compatible client for Cloudflare R2
    // Note: EU jurisdiction buckets need .eu in the endpoint
    const endpoint = process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`;
    
    this.client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true, // Important for R2
    });
    this.bucketName = process.env.R2_BUCKET_NAME;
    this.publicUrlBase = process.env.R2_PUBLIC_URL_BASE;
  }

  /**
   * Generate a unique storage key for uploaded files
   * @param {string} prefix - Directory prefix (e.g., 'avatars/userId')
   * @param {string} filename - Original filename to extract extension
   * @returns {string} Unique storage key
   */
  generateKey(prefix, filename) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = filename.split('.').pop();
    return `${prefix}/${timestamp}-${randomString}.${extension}`;
  }

  /**
   * Extract storage key from R2 public URL
   * @param {string} url - Public URL from R2
   * @returns {string|null} Storage key or null if not an R2 URL
   */
  extractKeyFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    // Check if it's our R2 URL
    if (!url.startsWith(this.publicUrlBase)) return null;
    
    // Extract the key part after the base URL
    const key = url.substring(this.publicUrlBase.length + 1); // +1 for the slash
    return key || null;
  }

  /**
   * Delete specific avatar files by their URLs
   * @param {string} largeAvatarUrl - Large avatar URL to delete
   * @param {Object} prisma - Prisma client instance
   * @returns {Promise<boolean>} True if deleted, false if not an R2 URL
   */
  async deleteSpecificAvatar(largeAvatarUrl, prisma) {
    const key = this.extractKeyFromUrl(largeAvatarUrl);
    
    if (!key) {
      console.log('Not an R2 URL, skipping deletion:', largeAvatarUrl);
      return false;
    }

    try {
      // Extract the base filename from the large key
      // E.g., "avatars/userId/large/1234-abcd.webp" or "temp/avatars/userId/large/1234-abcd.webp"
      const keyParts = key.split('/');
      if (keyParts.length < 2) {
        throw new Error('Invalid key structure');
      }
      
      const filename = keyParts[keyParts.length - 1];
      const basePath = keyParts.slice(0, -2).join('/'); // Remove size and filename
      
      // Delete all three sizes with the same filename
      const sizes = ['large', 'medium', 'small'];
      const deletePromises = sizes.map(async (size) => {
        const sizeKey = `${basePath}/${size}/${filename}`;
        try {
          await this.client.send(new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: sizeKey,
          }));
          console.log(`Deleted ${size} avatar:`, sizeKey);
        } catch (err) {
          console.log(`Could not delete ${size} avatar:`, err.message);
        }
      });
      
      await Promise.all(deletePromises);
      
      // Only try to delete from database if it's not a temp file
      if (!key.includes('temp/')) {
        const asset = await prisma.uploadedAsset.findFirst({
          where: { storageIdentifier: key }
        });
        
        if (asset) {
          await prisma.uploadedAsset.delete({
            where: { id: asset.id }
          });
        }
      }
      
      console.log('Successfully deleted specific avatar set');
      return true;
    } catch (error) {
      console.error('Error deleting specific avatar:', error.message);
      return false;
    }
  }

  /**
   * Delete all avatars in a directory (for preview cleanup)
   * @param {string} oldAvatarUrl - Current avatar URL to check and delete
   * @param {Object} prisma - Prisma client instance
   * @returns {Promise<boolean>} True if deleted, false if not an R2 URL
   */
  async deleteOldAvatar(oldAvatarUrl, prisma) {
    const key = this.extractKeyFromUrl(oldAvatarUrl);
    
    if (!key) {
      console.log('Not an R2 URL, skipping deletion:', oldAvatarUrl);
      return false;
    }

    try {
      // Extract the base path from the key
      // E.g., "avatars/userId/large/1234-abcd.webp" -> "avatars/userId"
      const keyParts = key.split('/');
      let basePath;
      
      if (keyParts.length >= 3 && (keyParts[keyParts.length - 2] === 'large' || 
                                   keyParts[keyParts.length - 2] === 'medium' || 
                                   keyParts[keyParts.length - 2] === 'small')) {
        // Remove size and filename to get base path
        basePath = keyParts.slice(0, -2).join('/');
      } else {
        // Fallback: assume the parent directory is the base path
        basePath = keyParts.slice(0, -1).join('/');
      }
      
      // List all objects in the user's avatar directory
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: basePath + '/',
      });
      
      const listResponse = await this.client.send(listCommand);
      
      if (listResponse.Contents && listResponse.Contents.length > 0) {
        // Only delete image files, not directories
        const deletePromises = listResponse.Contents
          .filter(object => {
            // Only delete files that end with image extensions
            const key = object.Key.toLowerCase();
            return key.endsWith('.webp') || key.endsWith('.jpg') || 
                   key.endsWith('.jpeg') || key.endsWith('.png') || 
                   key.endsWith('.gif');
          })
          .map(async (object) => {
            try {
              await this.client.send(new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: object.Key,
              }));
              console.log('Deleted avatar:', object.Key);
            } catch (err) {
              console.error(`Failed to delete ${object.Key}:`, err.message);
            }
          });
        
        await Promise.all(deletePromises);
      }
      
      // Delete from database if it exists
      const asset = await prisma.uploadedAsset.findFirst({
        where: { storageIdentifier: key }
      });
      
      if (asset) {
        await prisma.uploadedAsset.delete({
          where: { id: asset.id }
        });
      }
      
      console.log('Successfully deleted old avatar set');
      return true;
    } catch (error) {
      console.error('Error deleting old avatar:', error.message);
      // Don't throw - just log and continue
      return false;
    }
  }

  /**
   * Upload user avatar with multiple size variants
   * @param {Buffer} buffer - Image buffer
   * @param {string} userId - User ID for organization
   * @param {string} filename - Original filename
   * @param {Object} prisma - Prisma client instance
   * @param {boolean} isPreview - Whether this is a preview upload (goes to temp folder)
   * @returns {Object} Upload result with URLs for all sizes
   */
  async uploadAvatar(buffer, userId, filename, prisma, isPreview = true) {
    // Define size variants for responsive images
    const sizes = {
      large: { width: 256, height: 256, key: null },
      medium: { width: 128, height: 128, key: null },
      small: { width: 48, height: 48, key: null },
    };

    const results = {};
    
    // Use temp folder for previews, permanent folder for saved avatars
    const folderPrefix = isPreview ? `temp/avatars/${userId}` : `avatars/${userId}`;
    
    // Generate a single filename for all sizes to keep them synchronized
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const avatarFilename = `${timestamp}-${randomString}.webp`;

    // Process and upload each size variant
    for (const [size, config] of Object.entries(sizes)) {
      // Resize and convert to WebP for optimal performance
      const processed = await sharp(buffer)
        .resize(config.width, config.height, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer();

      const key = `${folderPrefix}/${size}/${avatarFilename}`;
      config.key = key;

      // Upload to R2
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: processed,
        ContentType: 'image/webp',
      }));

      results[size] = `${this.publicUrlBase}/${key}`;
    }

    // Only store in database if it's not a preview
    let uploadedAsset = null;
    if (!isPreview) {
      uploadedAsset = await prisma.uploadedAsset.create({
        data: {
          uploaderId: userId,
          originalFilename: filename,
          mimeType: 'image/webp',
          sizeBytes: buffer.length,
          hostedUrl: results.large, // Primary URL is the large size
          storageIdentifier: sizes.large.key,
          assetType: 'avatar',
          description: 'User avatar',
        },
      });
    }

    // Clean up old temp files after successful upload
    if (isPreview) {
      // Extract just the filename from the generated key
      const uploadedFilename = sizes.large.key.split('/').pop();
      await this.cleanupOldTempFiles(userId, uploadedFilename);
    }
    
    return {
      id: uploadedAsset?.id || null,
      urls: results,
      uploadedAsset,
      isPreview,
    };
  }

  /**
   * Move avatar from temp to permanent location
   * @param {string} tempUrl - The temporary avatar URL
   * @param {string} userId - User ID
   * @param {Object} prisma - Prisma client instance
   * @returns {Object} New permanent URLs
   */
  async moveAvatarFromTemp(tempUrl, userId, prisma) {
    const tempKey = this.extractKeyFromUrl(tempUrl);
    if (!tempKey || !tempKey.includes('temp/')) {
      throw new Error('Invalid temp URL provided');
    }

    const sizes = ['large', 'medium', 'small'];
    const results = {};
    const movedKeys = {};

    // Extract filename from temp key
    const keyParts = tempKey.split('/');
    const filename = keyParts[keyParts.length - 1];

    try {
      // First, let's verify what files actually exist in temp
      console.log('Checking which temp files exist...');
      for (const size of sizes) {
        const checkKey = `temp/avatars/${userId}/${size}/${filename}`;
        try {
          await this.client.send(new GetObjectCommand({
            Bucket: this.bucketName,
            Key: checkKey,
          }));
          console.log(`✓ Found ${size} at: ${checkKey}`);
        } catch (err) {
          console.log(`✗ Missing ${size} at: ${checkKey}`);
        }
      }
      
      // Copy each size from temp to permanent location
      for (const size of sizes) {
        // Build the correct temp key for each size
        // tempKey might be for any size (large/medium/small), so we need to handle that
        let tempSizeKey;
        if (tempKey.includes('/large/')) {
          tempSizeKey = tempKey.replace('/large/', `/${size}/`);
        } else if (tempKey.includes('/medium/')) {
          tempSizeKey = tempKey.replace('/medium/', `/${size}/`);
        } else if (tempKey.includes('/small/')) {
          tempSizeKey = tempKey.replace('/small/', `/${size}/`);
        } else {
          // Fallback - build from scratch
          const basePath = `temp/avatars/${userId}`;
          tempSizeKey = `${basePath}/${size}/${filename}`;
        }
        
        const permanentKey = `avatars/${userId}/${size}/${filename}`;

        // Copy object
        // CopySource needs to be URL-encoded for S3 compatibility
        const copySource = encodeURIComponent(`${this.bucketName}/${tempSizeKey}`);
        console.log(`Copying from ${tempSizeKey} to ${permanentKey}`);
        console.log(`CopySource: ${copySource}`);
        
        await this.client.send(new CopyObjectCommand({
          Bucket: this.bucketName,
          CopySource: copySource,
          Key: permanentKey,
        }));

        results[size] = `${this.publicUrlBase}/${permanentKey}`;
        movedKeys[size] = permanentKey;
      }

      // Delete temp files after successful copy
      for (const size of sizes) {
        // Use the same logic as above to build the correct temp key
        let tempSizeKey;
        if (tempKey.includes('/large/')) {
          tempSizeKey = tempKey.replace('/large/', `/${size}/`);
        } else if (tempKey.includes('/medium/')) {
          tempSizeKey = tempKey.replace('/medium/', `/${size}/`);
        } else if (tempKey.includes('/small/')) {
          tempSizeKey = tempKey.replace('/small/', `/${size}/`);
        } else {
          // Fallback - build from scratch
          const basePath = `temp/avatars/${userId}`;
          tempSizeKey = `${basePath}/${size}/${filename}`;
        }
        await this.client.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: tempSizeKey,
        }));
      }

      // Create database entry for permanent avatar
      const uploadedAsset = await prisma.uploadedAsset.create({
        data: {
          uploaderId: userId,
          originalFilename: filename,
          mimeType: 'image/webp',
          sizeBytes: 0, // We don't have the original size here
          hostedUrl: results.large,
          storageIdentifier: movedKeys.large,
          assetType: 'avatar',
          description: 'User avatar',
        },
      });

      return {
        urls: results,
        uploadedAsset,
      };
    } catch (error) {
      console.error('Error moving avatar from temp:', error);
      console.error('Full error details:', {
        message: error.message,
        code: error.Code,
        statusCode: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Clean up old temporary files for a user
   * @param {string} userId - User ID
   * @param {string} excludeFilename - Filename to exclude from deletion (current upload)
   */
  async cleanupOldTempFiles(userId, excludeFilename = null) {
    const sizes = ['large', 'medium', 'small'];
    
    for (const size of sizes) {
      const prefix = `temp/avatars/${userId}/${size}/`;
      
      try {
        // List all files in this temp directory
        const listCommand = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
        });
        
        const response = await this.client.send(listCommand);
        
        if (response.Contents && response.Contents.length > 0) {
          for (const object of response.Contents) {
            // Skip if this is the file we just uploaded
            if (excludeFilename && object.Key.endsWith(excludeFilename)) {
              continue;
            }
            
            // Delete old temp file
            try {
              await this.client.send(new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: object.Key,
              }));
              console.log(`Cleaned up old temp file: ${object.Key}`);
            } catch (err) {
              console.error(`Failed to delete old temp file ${object.Key}:`, err.message);
            }
          }
        }
      } catch (error) {
        console.error(`Error listing temp files for ${size}:`, error.message);
      }
    }
  }

  /**
   * Clean up old temporary guild files
   * @param {string} guildId - Guild ID
   * @param {string} excludeFilename - Filename to exclude from deletion (current upload)
   */
  async cleanupOldGuildTempFiles(guildId, excludeFilename = null) {
    const sizes = ['large', 'medium', 'small'];
    
    for (const size of sizes) {
      const prefix = `temp/guilds/${guildId}/${size}/`;
      
      try {
        // List all files in this temp directory
        const listCommand = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
        });
        
        const response = await this.client.send(listCommand);
        
        if (response.Contents && response.Contents.length > 0) {
          for (const object of response.Contents) {
            // Skip if this is the file we just uploaded
            if (excludeFilename && object.Key.endsWith(excludeFilename)) {
              continue;
            }
            
            // Delete old temp file
            try {
              await this.client.send(new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: object.Key,
              }));
              console.log(`Cleaned up old guild temp file: ${object.Key}`);
            } catch (err) {
              console.error(`Failed to delete old guild temp file ${object.Key}:`, err.message);
            }
          }
        }
      } catch (error) {
        console.error(`Error listing guild temp files for ${size}:`, error.message);
      }
    }
  }

  /**
   * Upload badge SVG content
   * @param {string} svgContent - SVG content as string
   * @param {string} ownerId - Owner/creator ID
   * @param {string} filename - Filename for the SVG
   * @param {string} description - Optional description
   * @param {Object} prisma - Prisma client instance
   * @returns {Object} Upload result with URL
   */
  async uploadBadgeSvg(svgContent, ownerId, filename, description, prisma) {
    const buffer = Buffer.from(svgContent);
    const key = this.generateKey(`badges/${ownerId}`, filename);

    // Upload SVG to R2
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'image/svg+xml',
    }));

    const url = `${this.publicUrlBase}/${key}`;

    // Store reference in database
    const uploadedAsset = await prisma.uploadedAsset.create({
      data: {
        uploaderId: ownerId,
        originalFilename: filename,
        mimeType: 'image/svg+xml',
        sizeBytes: buffer.length,
        hostedUrl: url,
        storageIdentifier: key,
        assetType: 'badge',
        description: description || 'Badge SVG',
      },
    });

    return {
      id: uploadedAsset.id,
      url,
      uploadedAsset,
    };
  }

  /**
   * Upload guild avatar with multiple size variants
   * @param {Buffer} buffer - Image buffer
   * @param {string} guildId - Guild ID for organization
   * @param {string} filename - Original filename
   * @param {Object} prisma - Prisma client instance
   * @param {boolean} isPreview - Whether this is a preview upload (goes to temp folder)
   * @returns {Object} Upload result with URLs for all sizes
   */
  async uploadGuildAvatar(buffer, guildId, filename, prisma, isPreview = true) {
    // Define size variants for responsive images
    const sizes = {
      large: { width: 256, height: 256, key: null },
      medium: { width: 128, height: 128, key: null },
      small: { width: 48, height: 48, key: null },
    };

    const results = {};
    
    // Use temp folder for previews, permanent folder for saved avatars
    const folderPrefix = isPreview ? `temp/guilds/${guildId}` : `guilds/${guildId}`;
    
    // Generate a single filename for all sizes to keep them synchronized
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const avatarFilename = `${timestamp}-${randomString}.webp`;

    // Process and upload each size variant
    for (const [size, config] of Object.entries(sizes)) {
      const processed = await sharp(buffer)
        .resize(config.width, config.height, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer();

      const key = `${folderPrefix}/${size}/${avatarFilename}`;
      config.key = key;

      await this.client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: processed,
        ContentType: 'image/webp',
      }));

      results[size] = `${this.publicUrlBase}/${key}`;
    }
    
    // If this is a preview upload, clean up old temp files
    if (isPreview) {
      await this.cleanupOldGuildTempFiles(guildId, avatarFilename);
    }

    // Only store in database if it's not a preview
    let uploadedAsset = null;
    if (!isPreview) {
      uploadedAsset = await prisma.uploadedAsset.create({
        data: {
          originalFilename: filename,
          mimeType: 'image/webp',
          sizeBytes: buffer.length,
          hostedUrl: results.large,
          storageIdentifier: sizes.large.key,
          assetType: 'guild_avatar',
          description: 'Guild avatar',
        },
      });
    }

    return {
      id: uploadedAsset?.id || null,
      urls: results,
      uploadedAsset,
    };
  }

  /**
   * Move guild avatar from temp to permanent location
   * @param {string} tempUrl - The temporary guild avatar URL
   * @param {string} guildId - Guild ID
   * @param {Object} prisma - Prisma client instance
   * @returns {Object} New permanent URLs
   */
  async moveGuildAvatarFromTemp(tempUrl, guildId, prisma) {
    const tempKey = this.extractKeyFromUrl(tempUrl);
    if (!tempKey || !tempKey.includes('temp/')) {
      throw new Error('Invalid temp URL provided');
    }

    const sizes = ['large', 'medium', 'small'];
    const results = {};
    const movedKeys = {};

    // Extract filename from temp key
    const keyParts = tempKey.split('/');
    const filename = keyParts[keyParts.length - 1];

    try {
      // Copy each size from temp to permanent location
      for (const size of sizes) {
        // Build the correct temp key for each size
        let tempSizeKey;
        if (tempKey.includes('/large/')) {
          tempSizeKey = tempKey.replace('/large/', `/${size}/`);
        } else if (tempKey.includes('/medium/')) {
          tempSizeKey = tempKey.replace('/medium/', `/${size}/`);
        } else if (tempKey.includes('/small/')) {
          tempSizeKey = tempKey.replace('/small/', `/${size}/`);
        } else {
          // Fallback - build from scratch
          const basePath = `temp/guilds/${guildId}`;
          tempSizeKey = `${basePath}/${size}/${filename}`;
        }
        
        const permanentKey = `guilds/${guildId}/${size}/${filename}`;

        // Copy object
        const copySource = encodeURIComponent(`${this.bucketName}/${tempSizeKey}`);
        console.log(`Copying guild avatar from ${tempSizeKey} to ${permanentKey}`);
        
        await this.client.send(new CopyObjectCommand({
          Bucket: this.bucketName,
          CopySource: copySource,
          Key: permanentKey,
        }));

        results[size] = `${this.publicUrlBase}/${permanentKey}`;
        movedKeys[size] = permanentKey;
      }

      // Delete temp files after successful copy
      for (const size of sizes) {
        let tempSizeKey;
        if (tempKey.includes('/large/')) {
          tempSizeKey = tempKey.replace('/large/', `/${size}/`);
        } else if (tempKey.includes('/medium/')) {
          tempSizeKey = tempKey.replace('/medium/', `/${size}/`);
        } else if (tempKey.includes('/small/')) {
          tempSizeKey = tempKey.replace('/small/', `/${size}/`);
        } else {
          const basePath = `temp/guilds/${guildId}`;
          tempSizeKey = `${basePath}/${size}/${filename}`;
        }
        await this.client.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: tempSizeKey,
        }));
      }

      // Create database entry for permanent guild avatar
      const uploadedAsset = await prisma.uploadedAsset.create({
        data: {
          originalFilename: filename,
          mimeType: 'image/webp',
          sizeBytes: 0, // We don't have the original size here
          hostedUrl: results.large,
          storageIdentifier: movedKeys.large,
          assetType: 'guild_avatar',
          description: 'Guild avatar',
        },
      });

      return {
        urls: results,
        uploadedAsset,
      };
    } catch (error) {
      console.error('Error moving guild avatar from temp:', error);
      throw error;
    }
  }

  /**
   * Delete an asset from R2 and database
   * @param {string} storageIdentifier - R2 storage key
   * @param {Object} prisma - Prisma client instance
   */
  async deleteAsset(storageIdentifier, prisma) {
    // Delete from R2
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: storageIdentifier,
    }));

    // Delete database reference
    await prisma.uploadedAsset.delete({
      where: { storageIdentifier },
    });
  }

  /**
   * Generate a presigned upload URL for direct client uploads
   * @param {string} key - Storage key
   * @param {string} contentType - MIME type
   * @param {number} expiresIn - URL expiration in seconds
   * @returns {string} Presigned upload URL
   */
  async getSignedUploadUrl(key, contentType, expiresIn = 3600) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Generic method to process and upload images with custom options
   * @param {Buffer} buffer - Image buffer
   * @param {string} type - Asset type (e.g., 'user', 'guild', 'badge')
   * @param {string} id - Related entity ID
   * @param {string} filename - Original filename
   * @param {Object} options - Processing options
   * @param {Object} prisma - Prisma client instance
   * @returns {Object} Upload result
   */
  async processAndUploadImage(buffer, type, id, filename, options = {}, prisma) {
    const { width = 1024, height = 1024, quality = 85, format = 'webp' } = options;

    // Process image with Sharp
    const processed = await sharp(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      [format]({ quality })
      .toBuffer();

    const key = this.generateKey(`${type}/${id}`, `image.${format}`);

    // Upload to R2
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: processed,
      ContentType: `image/${format}`,
    }));

    const url = `${this.publicUrlBase}/${key}`;

    // Store reference in database
    const uploadedAsset = await prisma.uploadedAsset.create({
      data: {
        uploaderId: type === 'user' ? id : null,
        originalFilename: filename,
        mimeType: `image/${format}`,
        sizeBytes: processed.length,
        hostedUrl: url,
        storageIdentifier: key,
        assetType: type,
        description: options.description,
      },
    });

    return {
      id: uploadedAsset.id,
      url,
      uploadedAsset,
    };
  }
}

// Export singleton instance
module.exports = new R2Service();