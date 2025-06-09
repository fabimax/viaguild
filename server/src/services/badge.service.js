const { PrismaClient } = require('@prisma/client');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const prisma = new PrismaClient();
const r2Service = require('./r2.service');

class BadgeService {
  /**
   * Get all badges received by a user
   * @param {string} username - The username to fetch badges for
   * @returns {Promise<Array>} Array of badge instances with template data
   */
  async getUserReceivedBadges(username) {
    const user = await prisma.user.findUnique({
      where: { username_ci: username.toLowerCase() },
      select: { id: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get all badges where user is receiver
    const badges = await prisma.badgeInstance.findMany({
      where: {
        receiverType: 'USER',
        receiverId: user.id,
        awardStatus: 'ACCEPTED',
        revokedAt: null
      },
      include: {
        template: {
          include: {
            metadataFieldDefinitions: {
              orderBy: { displayOrder: 'asc' }
            }
          }
        },
        metadataValues: true,
        userBadgeItem: true // To check if in case
      },
      orderBy: { assignedAt: 'desc' }
    });
    
    return badges;
  }

  /**
   * Get user's public badge case
   * @param {string} username - The username to fetch badge case for
   * @returns {Promise<Object>} Badge case with items
   */
  async getUserBadgeCase(username) {
    const user = await prisma.user.findUnique({
      where: { username_ci: username.toLowerCase() },
      select: { id: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    const badgeCase = await prisma.userBadgeCase.findUnique({
      where: { userId: user.id },
      include: {
        badges: {
          include: {
            badge: {
              select: {
                id: true,
                templateId: true,
                assignedAt: true,
                message: true,
                giverType: true,
                giverId: true,
                awardStatus: true,
                apiVisible: true,
                overrideBadgeName: true,
                overrideSubtitle: true,
                overrideOuterShape: true,
                overrideBorderColor: true,
                overrideBackgroundType: true,
                overrideBackgroundValue: true,
                overrideForegroundType: true,
                overrideForegroundValue: true,
                overrideForegroundColor: true,
                overrideTextFont: true,
                overrideTextSize: true,
                overrideDisplayDescription: true,
                measureValue: true,
                overrideMeasureBest: true,
                overrideMeasureWorst: true,
                overrideMeasureIsNormalizable: true,
                overrideMeasureBestLabel: true,
                overrideMeasureWorstLabel: true,
                template: {
                  include: {
                    metadataFieldDefinitions: {
                      orderBy: { displayOrder: 'asc' }
                    }
                  }
                },
                metadataValues: true
              }
            }
          },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    // Create default badge case if it doesn't exist
    if (!badgeCase) {
      return await prisma.userBadgeCase.create({
        data: {
          userId: user.id,
          title: `${username}'s Badge Case`,
          isPublic: true
        },
        include: {
          badges: true
        }
      });
    }

    return badgeCase;
  }

  /**
   * Add a badge to user's badge case
   * @param {string} username - The username
   * @param {string} badgeInstanceId - The badge instance ID to add
   * @param {string} requestingUserId - The ID of the user making the request
   * @returns {Promise<Object>} The created badge item
   */
  async addBadgeToCase(username, badgeInstanceId, requestingUserId) {
    const user = await prisma.user.findUnique({
      where: { username_ci: username.toLowerCase() },
      select: { id: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check permission
    if (user.id !== requestingUserId) {
      throw new Error('Cannot modify another user\'s badge case');
    }

    // Verify the badge belongs to the user and is accepted
    const badge = await prisma.badgeInstance.findFirst({
      where: {
        id: badgeInstanceId,
        receiverType: 'USER',
        receiverId: user.id,
        awardStatus: 'ACCEPTED',
        revokedAt: null
      }
    });

    if (!badge) {
      throw new Error('Badge not found or not owned by user');
    }

    // Get or create badge case
    let badgeCase = await prisma.userBadgeCase.findUnique({
      where: { userId: user.id }
    });

    if (!badgeCase) {
      badgeCase = await prisma.userBadgeCase.create({
        data: {
          userId: user.id,
          title: `${username}'s Badge Case`,
          isPublic: true
        }
      });
    }

    // Check if badge is already in case
    const existingItem = await prisma.userBadgeItem.findUnique({
      where: {
        badgeCaseId_badgeInstanceId: {
          badgeCaseId: badgeCase.id,
          badgeInstanceId: badgeInstanceId
        }
      }
    });

    if (existingItem) {
      throw new Error('Badge is already in the case');
    }

    // Get current max display order
    const maxOrder = await prisma.userBadgeItem.aggregate({
      where: { badgeCaseId: badgeCase.id },
      _max: { displayOrder: true }
    });

    // Add badge to case
    return await prisma.userBadgeItem.create({
      data: {
        badgeCaseId: badgeCase.id,
        badgeInstanceId: badgeInstanceId,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1
      },
      include: {
        badge: {
          include: {
            template: true
          }
        }
      }
    });
  }

  /**
   * Remove a badge from user's badge case
   * @param {string} username - The username
   * @param {string} badgeInstanceId - The badge instance ID to remove
   * @param {string} requestingUserId - The ID of the user making the request
   * @returns {Promise<void>}
   */
  async removeBadgeFromCase(username, badgeInstanceId, requestingUserId) {
    const user = await prisma.user.findUnique({
      where: { username_ci: username.toLowerCase() },
      select: { id: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check permission
    if (user.id !== requestingUserId) {
      throw new Error('Cannot modify another user\'s badge case');
    }

    const badgeCase = await prisma.userBadgeCase.findUnique({
      where: { userId: user.id }
    });

    if (!badgeCase) {
      throw new Error('Badge case not found');
    }

    const deletedItem = await prisma.userBadgeItem.deleteMany({
      where: {
        badgeCaseId: badgeCase.id,
        badgeInstanceId: badgeInstanceId
      }
    });

    if (deletedItem.count === 0) {
      throw new Error('Badge not found in case');
    }
  }

  /**
   * Reorder badges in user's badge case
   * @param {string} username - The username
   * @param {Array<{badgeInstanceId: string, displayOrder: number}>} orderData - New order data
   * @param {string} requestingUserId - The ID of the user making the request
   * @returns {Promise<void>}
   */
  async reorderBadgeCase(username, orderData, requestingUserId) {
    const user = await prisma.user.findUnique({
      where: { username_ci: username.toLowerCase() },
      select: { id: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check permission
    if (user.id !== requestingUserId) {
      throw new Error('Cannot modify another user\'s badge case');
    }

    const badgeCase = await prisma.userBadgeCase.findUnique({
      where: { userId: user.id }
    });

    if (!badgeCase) {
      throw new Error('Badge case not found');
    }

    // Update each badge's display order in a transaction
    await prisma.$transaction(
      orderData.map(item => 
        prisma.userBadgeItem.update({
          where: {
            badgeCaseId_badgeInstanceId: {
              badgeCaseId: badgeCase.id,
              badgeInstanceId: item.badgeInstanceId
            }
          },
          data: {
            displayOrder: item.displayOrder
          }
        })
      )
    );
  }

  /**
   * Toggle badge case visibility
   * @param {string} username - The username
   * @param {boolean} isPublic - New visibility state
   * @param {string} requestingUserId - The ID of the user making the request
   * @returns {Promise<Object>} Updated badge case
   */
  async toggleBadgeCaseVisibility(username, isPublic, requestingUserId) {
    const user = await prisma.user.findUnique({
      where: { username_ci: username.toLowerCase() },
      select: { id: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check permission
    if (user.id !== requestingUserId) {
      throw new Error('Cannot modify another user\'s badge case');
    }

    let badgeCase = await prisma.userBadgeCase.findUnique({
      where: { userId: user.id }
    });

    if (!badgeCase) {
      badgeCase = await prisma.userBadgeCase.create({
        data: {
          userId: user.id,
          title: `${username}'s Badge Case`,
          isPublic: isPublic
        }
      });
    } else {
      badgeCase = await prisma.userBadgeCase.update({
        where: { id: badgeCase.id },
        data: { isPublic: isPublic }
      });
    }

    return badgeCase;
  }

  /**
   * Delete a badge permanently
   * @param {string} username - The username
   * @param {string} badgeInstanceId - The badge instance ID to delete
   * @param {string} requestingUserId - The ID of the user making the request
   * @returns {Promise<void>}
   */
  async deleteBadgePermanently(username, badgeInstanceId, requestingUserId) {
    const user = await prisma.user.findUnique({
      where: { username_ci: username.toLowerCase() },
      select: { id: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check permission
    if (user.id !== requestingUserId) {
      throw new Error('Cannot delete another user\'s badge');
    }

    // Verify the badge belongs to the user
    const badge = await prisma.badgeInstance.findFirst({
      where: {
        id: badgeInstanceId,
        receiverType: 'USER',
        receiverId: user.id
      }
    });

    if (!badge) {
      throw new Error('Badge not found or not owned by user');
    }

    // Soft delete by setting revokedAt
    await prisma.badgeInstance.update({
      where: { id: badgeInstanceId },
      data: { revokedAt: new Date() }
    });
  }

  /**
   * Get badge display properties with template fallbacks
   * @param {Object} badgeInstance - Badge instance with template
   * @returns {Object} Resolved display properties
   */
  getBadgeDisplayProps(badgeInstance) {
    const template = badgeInstance.template;
    
    // Define tier-enforced border colors
    const tierBorderColors = {
      'GOLD': '#FFD700',
      'SILVER': '#C0C0C0',
      'BRONZE': '#CD7F32'
    };
    
    // For tiered badges, enforce tier colors (ignore overrides)
    // For non-tiered badges, allow custom colors
    const borderColor = template.inherentTier && tierBorderColors[template.inherentTier] 
      ? tierBorderColors[template.inherentTier]
      : (badgeInstance.overrideBorderColor || template.defaultBorderColor);
    
    return {
      name: badgeInstance.overrideBadgeName || template.defaultBadgeName,
      subtitle: badgeInstance.overrideSubtitle || template.defaultSubtitleText,
      shape: badgeInstance.overrideOuterShape || template.defaultOuterShape,
      borderColor: borderColor,
      backgroundType: badgeInstance.overrideBackgroundType || template.defaultBackgroundType,
      backgroundValue: badgeInstance.overrideBackgroundValue || template.defaultBackgroundValue,
      foregroundType: badgeInstance.overrideForegroundType || template.defaultForegroundType,
      foregroundValue: badgeInstance.overrideForegroundValue || template.defaultForegroundValue,
      foregroundColor: badgeInstance.overrideForegroundColor || template.defaultForegroundColor,
      textFont: badgeInstance.overrideTextFont || template.defaultTextFont,
      textSize: badgeInstance.overrideTextSize || template.defaultTextSize,
      description: badgeInstance.overrideDisplayDescription || template.defaultDisplayDescription,
      tier: template.inherentTier,
      measureValue: badgeInstance.measureValue,
      measureLabel: template.measureLabel,
      measureBest: badgeInstance.overrideMeasureBest ?? template.measureBest,
      measureWorst: badgeInstance.overrideMeasureWorst ?? template.measureWorst,
      higherIsBetter: template.higherIsBetter,
      metadata: this.formatMetadata(badgeInstance, template)
    };
  }

  /**
   * Format metadata values based on field definitions
   * @private
   */
  formatMetadata(badgeInstance, template) {
    if (!template.metadataFieldDefinitions || !badgeInstance.metadataValues) {
      return [];
    }

    return template.metadataFieldDefinitions.map(fieldDef => {
      const value = badgeInstance.metadataValues.find(v => v.dataKey === fieldDef.fieldKeyForInstanceData);
      return {
        key: fieldDef.fieldKeyForInstanceData,
        label: fieldDef.label,
        value: value ? value.dataValue : null,
        prefix: fieldDef.prefix,
        suffix: fieldDef.suffix,
        style: fieldDef.style,
        displayOrder: fieldDef.displayOrder
      };
    }).filter(item => item.value !== null);
  }

  /**
   * Create a new badge template
   * @param {Object} templateData - Template data including owner information
   * @returns {Promise<Object>} Created badge template
   */
  async createBadgeTemplate(templateData) {
    const {
      templateSlug,
      ownerType,
      ownerId,
      authoredByUserId,
      defaultBadgeName,
      defaultSubtitleText,
      defaultDisplayDescription,
      defaultOuterShape,
      defaultBorderColor,
      defaultBackgroundType,
      defaultBackgroundValue,
      defaultForegroundType,
      defaultForegroundValue,
      defaultForegroundColor,
      defaultForegroundColorConfig,
      transformedForegroundSvgContent,
      defaultTextFont,
      defaultTextSize,
      inherentTier,
      definesMeasure,
      measureLabel,
      measureBest,
      measureWorst,
      measureNotes,
      measureIsNormalizable,
      higherIsBetter,
      measureBestLabel,
      measureWorstLabel,
      isModifiableByIssuer,
      allowsPushedInstanceUpdates,
      internalNotes
    } = templateData;

    // Check if template slug already exists for this owner
    const existingTemplate = await prisma.badgeTemplate.findFirst({
      where: {
        templateSlug: templateSlug,
        ownerType: ownerType,
        ownerId: ownerId
      }
    });

    if (existingTemplate) {
      throw new Error(`Template with slug '${templateSlug}' already exists for this owner`);
    }

    // Process upload references - convert temp uploads to permanent storage
    let processedForegroundValue = defaultForegroundValue;
    let processedBackgroundValue = defaultBackgroundValue;

    // Handle foreground upload
    if (defaultForegroundType === 'UPLOADED_ICON' && defaultForegroundValue?.startsWith('upload://')) {
      const assetId = defaultForegroundValue.replace('upload://', '');
      const asset = await prisma.uploadedAsset.findUnique({
        where: { id: assetId }
      });
      
      if (asset && asset.status === 'TEMP') {
        // Check if we have transformed SVG content from client-side
        if (transformedForegroundSvgContent && transformedForegroundSvgContent.trim().startsWith('<svg')) {
          // Store the transformed SVG content directly
          const transformedKey = `users/${ownerId}/badge-templates/${templateSlug}-icon-${asset.id}`;
          const permanentUrl = await r2Service.uploadContent(
            transformedKey,
            transformedForegroundSvgContent,
            'image/svg+xml'
          );
          processedForegroundValue = permanentUrl;
          
          // Delete the temp file
          await r2Service.client.send(new DeleteObjectCommand({
            Bucket: r2Service.bucketName,
            Key: asset.storageIdentifier,
          }));
          
          // Update asset to permanent status with transformed content info
          await prisma.uploadedAsset.update({
            where: { id: assetId },
            data: {
              status: 'PERMANENT',
              expiresAt: null,
              hostedUrl: permanentUrl,
              storageIdentifier: transformedKey,
              description: `Badge template icon for ${templateSlug} (color-transformed)`
            }
          });
        } else {
          // Regular image or SVG without transformations - move to proper template location
          // First fetch the original content
          const response = await fetch(asset.hostedUrl);
          const originalContent = await response.buffer();
          
          // Store in proper template location
          const permanentKey = `users/${ownerId}/badge-templates/${templateSlug}-icon-${asset.id}`;
          const permanentUrl = await r2Service.uploadContent(
            permanentKey,
            originalContent,
            asset.mimeType
          );
          processedForegroundValue = permanentUrl;
          
          // Delete the temp file
          await r2Service.client.send(new DeleteObjectCommand({
            Bucket: r2Service.bucketName,
            Key: asset.storageIdentifier,
          }));
          
          await prisma.uploadedAsset.update({
            where: { id: assetId },
            data: {
              status: 'PERMANENT',
              expiresAt: null,
              hostedUrl: permanentUrl,
              storageIdentifier: permanentKey,
              description: `Badge template icon for ${templateSlug}`
            }
          });
        }
      } else if (asset) {
        // Already permanent, use the hosted URL
        processedForegroundValue = asset.hostedUrl;
      }
    }

    // Handle background upload  
    if (defaultBackgroundType === 'HOSTED_IMAGE' && defaultBackgroundValue?.startsWith('upload://')) {
      const assetId = defaultBackgroundValue.replace('upload://', '');
      const asset = await prisma.uploadedAsset.findUnique({
        where: { id: assetId }
      });
      
      if (asset && asset.status === 'TEMP') {
        // Move background to proper template location
        // First fetch the original content
        const response = await fetch(asset.hostedUrl);
        const originalContent = await response.buffer();
        
        // Store in proper template location
        const permanentKey = `users/${ownerId}/badge-templates/${templateSlug}-bg-${asset.id}`;
        const permanentUrl = await r2Service.uploadContent(
          permanentKey,
          originalContent,
          asset.mimeType
        );
        processedBackgroundValue = permanentUrl;
        
        // Delete the temp file
        await r2Service.client.send(new DeleteObjectCommand({
          Bucket: r2Service.bucketName,
          Key: asset.storageIdentifier,
        }));
        
        // Update asset to permanent status
        await prisma.uploadedAsset.update({
          where: { id: assetId },
          data: {
            status: 'PERMANENT',
            expiresAt: null,
            hostedUrl: permanentUrl,
            storageIdentifier: permanentKey,
            description: `Badge template background for ${templateSlug}`
          }
        });
      } else if (asset) {
        // Already permanent, use the hosted URL
        processedBackgroundValue = asset.hostedUrl;
      }
    }

    // Create the template with processed URLs
    const template = await prisma.badgeTemplate.create({
      data: {
        templateSlug,
        templateSlug_ci: templateSlug.toLowerCase(),
        ownerType,
        ownerId,
        authoredByUserId,
        defaultBadgeName,
        defaultSubtitleText: defaultSubtitleText || '',
        defaultDisplayDescription: defaultDisplayDescription || '',
        defaultOuterShape,
        defaultBorderColor,
        defaultBackgroundType,
        defaultBackgroundValue: processedBackgroundValue,
        defaultForegroundType,
        defaultForegroundValue: processedForegroundValue,
        defaultForegroundColor,
        defaultForegroundColorConfig: defaultForegroundColorConfig || {},
        defaultTextFont: defaultTextFont || 'Arial',
        defaultTextSize: defaultTextSize || 24,
        inherentTier,
        definesMeasure: definesMeasure || false,
        measureLabel: measureLabel || null,
        measureBest: measureBest || null,
        measureWorst: measureWorst || null,
        measureNotes: measureNotes || '',
        measureIsNormalizable: measureIsNormalizable || false,
        higherIsBetter: higherIsBetter || null,
        measureBestLabel: measureBestLabel || '',
        measureWorstLabel: measureWorstLabel || '',
        isModifiableByIssuer: isModifiableByIssuer || false,
        allowsPushedInstanceUpdates: allowsPushedInstanceUpdates || false,
        internalNotes: internalNotes || ''
      }
    });

    return template;
  }

  /**
   * Get all badge templates owned by a user
   * @param {string} username - Username to fetch templates for
   * @returns {Promise<Array>} Array of badge templates
   */
  async getUserBadgeTemplates(username) {
    const user = await prisma.user.findUnique({
      where: { username_ci: username.toLowerCase() },
      select: { id: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    const templates = await prisma.badgeTemplate.findMany({
      where: {
        ownerType: 'USER',
        ownerId: user.id
      },
      orderBy: { createdAt: 'desc' }
    });

    return templates;
  }

  /**
   * Get a specific badge template
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Badge template
   */
  async getBadgeTemplate(templateId) {
    const template = await prisma.badgeTemplate.findUnique({
      where: { id: templateId },
      include: {
        metadataFieldDefinitions: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    return template;
  }

  /**
   * Update a badge template
   * @param {string} templateId - Template ID
   * @param {Object} updateData - Data to update
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<Object>} Updated badge template
   */
  async updateBadgeTemplate(templateId, updateData, requestingUserId) {
    // Get the template to check permissions
    const template = await prisma.badgeTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new Error('Badge template not found');
    }

    // Check if user has permission to update
    if (template.ownerType === 'USER' && template.ownerId !== requestingUserId) {
      throw new Error('Cannot modify another user\'s badge template');
    }

    // If templateSlug is being updated, check for conflicts
    if (updateData.templateSlug && updateData.templateSlug !== template.templateSlug) {
      const existingTemplate = await prisma.badgeTemplate.findFirst({
        where: {
          templateSlug: updateData.templateSlug,
          ownerType: template.ownerType,
          ownerId: template.ownerId,
          id: { not: templateId }
        }
      });

      if (existingTemplate) {
        throw new Error(`Template with slug '${updateData.templateSlug}' already exists for this owner`);
      }
    }

    // Update the template
    const updatedTemplate = await prisma.badgeTemplate.update({
      where: { id: templateId },
      data: updateData
    });

    return updatedTemplate;
  }

  /**
   * Delete a badge template
   * @param {string} templateId - Template ID
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<void>}
   */
  async deleteBadgeTemplate(templateId, requestingUserId) {
    // Get the template to check permissions
    const template = await prisma.badgeTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new Error('Badge template not found');
    }

    // Check if user has permission to delete
    if (template.ownerType === 'USER' && template.ownerId !== requestingUserId) {
      throw new Error('Cannot delete another user\'s badge template');
    }

    // Check if template has any instances
    const instanceCount = await prisma.badgeInstance.count({
      where: { templateId: templateId }
    });

    if (instanceCount > 0) {
      throw new Error('Cannot delete template that has existing badges');
    }

    // Delete the template
    await prisma.badgeTemplate.delete({
      where: { id: templateId }
    });
  }

}

module.exports = new BadgeService();