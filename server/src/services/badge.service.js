const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    return {
      name: badgeInstance.overrideBadgeName || template.defaultBadgeName,
      subtitle: badgeInstance.overrideSubtitle || template.defaultSubtitleText,
      shape: badgeInstance.overrideOuterShape || template.defaultOuterShape,
      borderColor: badgeInstance.overrideBorderColor || template.defaultBorderColor,
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
}

module.exports = new BadgeService();