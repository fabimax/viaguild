const { PrismaClient } = require('@prisma/client');
const r2Service = require('./r2.service');
const prisma = new PrismaClient();

/**
 * Guild Service - handles all guild-related business logic
 */
class GuildService {
  /**
   * Create a new guild
   * @param {Object} guildData - Guild data
   * @param {string} userId - ID of the user creating the guild
   * @returns {Promise<Object>} Created guild
   */
  async createGuild(guildData, userId) {
    try {
      if (!guildData.name || !guildData.description) {
        throw new Error('Guild name and description are required');
      }

      const guildName = guildData.name; // Original casing
      // The name_ci field will be populated by the database trigger

      const guild = await prisma.guild.create({
        data: {
          name: guildName,
          displayName: guildData.displayName || guildName,
          description: guildData.description,
          avatar: guildData.avatar,
          isOpen: guildData.isOpen || false,
          allowJoinRequests: guildData.allowJoinRequests !== undefined ? guildData.allowJoinRequests : true,
          creator: { connect: { id: userId } },
          updatedBy: { connect: { id: userId } },
          // name_ci is handled by DB trigger
        },
      });

      const founderSystemRole = await prisma.role.findFirst({ // MODIFIED: AppRole -> Role
        where: {
          name_ci: 'founder', // MODIFIED: Use name_ci and lowercase 'founder'
          isSystemRole: true,
          guildId: null,
        },
        select: { id: true },
      });

      if (!founderSystemRole) {
        console.error('CRITICAL: System FOUNDER role not found. Cannot assign initial ownership.');
        throw new Error('System FOUNDER role not found.');
      }

      // Create membership for creator
      const membership = await prisma.guildMembership.create({
        data: {
          userId,
          guildId: guild.id,
          // roleId is removed from GuildMembership, roles are now managed by UserGuildRole
          isPrimary: await this.shouldBeSetAsPrimary(userId),
          primarySetAt: await this.shouldBeSetAsPrimary(userId) ? new Date() : null,
          // rank can be set to a default or a specific founder rank if desired, e.g., rank: GuildMemberRank.S 
        },
      });

      // Assign FOUNDER role via UserGuildRole
      await prisma.userGuildRole.create({
        data: {
          guildMembershipId: membership.id,
          roleId: founderSystemRole.id,
        },
      });

      return guild;
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('name_ci')) { // MODIFIED: check name_ci
        throw new Error('A guild with this name already exists');
      }
      console.error('Error in createGuild:', error); // It's good to log the actual error on the server
      throw error; // Re-throw the original error or a new one
    }
  }

  /**
   * Get guild by ID
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>} Guild
   */
  async getGuildById(guildId) {
    const guildData = await prisma.guild.findUnique({
      where: { id: guildId },
      select: {
        displayName: true,
        description: true,
        avatar: true,
        id: true,
        name: true,
        name_ci: true,
        isOpen: true,
        allowJoinRequests: true,
        createdAt: true,
        updatedAt: true,
        creator: { select: { id: true, username: true } },
        updatedBy: { select: { id: true, username: true } },
        _count: { select: { memberships: true } },
        roleSettings: {
          select: {
            guildRoleId: true,
            hierarchyOrder: true,
            overrideRoleName: true,
            overrideDisplayColor: true,
          }
        },
        memberships: {
          orderBy: { joinedAt: 'asc' },
          select: {
            joinedAt: true,
            rank: true,
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
            assignedRoles: {
              select: {
                guildRole: {
                  select: {
                    id: true,
                    name: true,
                    displayColor: true,
                  }
                }
              }
            }
          }
        },
        badgeCase: {
          select: {
            id: true,
            title: true,
            isPublic: true,
            badges: {
              orderBy: { displayOrder: 'asc' },
              select: {
                displayOrder: true,
                addedAt: true,
                badge: {
                  select: {
                    id: true,
                    message: true,
                    overrideBadgeName: true,
                    overrideSubtitle: true,
                    overrideOuterShape: true,
                    overrideBorderConfig: true,
                    overrideBackgroundConfig: true,
                    overrideForegroundConfig: true,
                    overrideDisplayDescription: true,
                    template: {
                      select: {
                        id: true,
                        templateSlug: true,
                        defaultBadgeName: true,
                        defaultSubtitleText: true,
                        defaultOuterShape: true,
                        defaultBorderConfig: true,
                        defaultBackgroundConfig: true,
                        defaultForegroundConfig: true,
                        defaultDisplayDescription: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!guildData) {
      throw new Error('Guild not found');
    }

    // Process members to find their highest role
    const roleSettingsMap = new Map(guildData.roleSettings.map(rs => [rs.guildRoleId, rs]));
    const processedMembers = guildData.memberships.map(membership => {
      let highestRole = null;
      let minHierarchyOrder = Infinity;

      membership.assignedRoles.forEach(assignedRoleEntry => {
        const role = assignedRoleEntry.guildRole;
        const setting = roleSettingsMap.get(role.id);
        
        if (setting && setting.hierarchyOrder !== null && setting.hierarchyOrder < minHierarchyOrder) {
          minHierarchyOrder = setting.hierarchyOrder;
          highestRole = {
            id: role.id,
            name: setting.overrideRoleName || role.name,
            color: setting.overrideDisplayColor || role.displayColor,
            hierarchyOrder: setting.hierarchyOrder
          };
        } else if (!setting && highestRole === null) { 
          // Fallback for roles not in GuildRoleSetting (e.g. system 'Member' if not explicitly ordered)
          // Or if multiple roles lack settings, pick the first one encountered.
          // This part can be refined based on how un-ordered roles should be treated.
          // For now, if no ordered role is found, and this is the first role encountered, consider it.
          // A more robust fallback might assign a default very high hierarchy order to un-set roles.
           if (highestRole === null) { // Only assign if no explicitly ordered role has been found yet
             highestRole = {
               id: role.id,
               name: role.name,
               color: role.displayColor,
               hierarchyOrder: Infinity // Indicates it's effectively at the bottom or undefined
             };
           }
        }
      });
      
      // If no roles were found or none had hierarchy, ensure highestRole is at least {name: 'Member'} or similar default
      if (!highestRole && membership.assignedRoles.length > 0) {
           // If roles exist but none had settings or were chosen, pick first as a basic fallback
           const firstRole = membership.assignedRoles[0].guildRole;
            highestRole = { id: firstRole.id, name: firstRole.name, color: firstRole.displayColor, hierarchyOrder: Infinity };
      } else if (!highestRole) {
          highestRole = { name: 'Member', color: '#888888', hierarchyOrder: Infinity }; // Default if no roles at all
      }

      return {
        user: membership.user,
        joinedAt: membership.joinedAt,
        rank: membership.rank,
        highestRole: highestRole
      };
    });

    // Process BadgeCase data
    let processedBadgeCase = null;
    if (guildData.badgeCase && guildData.badgeCase.badges) {
      const badgeProcessingPromises = guildData.badgeCase.badges.map(async (guildBadgeItem) => {
        const instance = guildBadgeItem.badge;
        const template = instance.template;
        // Get unified config objects (config-only approach)
        const borderConfig = instance.overrideBorderConfig || template.defaultBorderConfig;
        const backgroundConfig = instance.overrideBackgroundConfig || template.defaultBackgroundConfig;
        const foregroundConfig = instance.overrideForegroundConfig || template.defaultForegroundConfig;
        
        // Extract colors from configs
        const { extractColor } = require('../utils/colorConfig');
        let borderColor = extractColor(borderConfig, '#000000');
        
        // For tiered badges, enforce tier colors (ignore config overrides)
        const tierBorderColors = {
          'GOLD': '#FFD700',
          'SILVER': '#C0C0C0',
          'BRONZE': '#CD7F32'
        };
        if (template.inherentTier && tierBorderColors[template.inherentTier]) {
          borderColor = tierBorderColors[template.inherentTier];
        }
        
        // Derive foreground type and value from config for backward compatibility
        let foregroundType = 'TEXT';
        let foregroundValue = '';
        if (foregroundConfig) {
          switch (foregroundConfig.type) {
            case 'simple-color':
              foregroundType = 'TEXT';
              foregroundValue = template.defaultBadgeName || '';
              break;
            case 'static-image-asset':
              foregroundType = 'UPLOADED_ICON';
              foregroundValue = foregroundConfig.url || '';
              break;
            case 'system-icon':
              foregroundType = 'SYSTEM_ICON';
              foregroundValue = foregroundConfig.iconName || 'Shield';
              break;
          }
        }
        
        // Load system icon SVG if needed
        if (foregroundType === 'SYSTEM_ICON' && foregroundValue) {
          const systemIcon = await prisma.systemIcon.findUnique({
            where: { name: foregroundValue }, 
            select: { svgContent: true }
          });
          if (systemIcon && systemIcon.svgContent) {
            foregroundValue = systemIcon.svgContent;
          } else {
            foregroundValue = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>';
          }
        }

        return {
          instanceId: instance.id,
          displayOrder: guildBadgeItem.displayOrder,
          addedAt: guildBadgeItem.addedAt,
          message: instance.message,
          name: instance.overrideBadgeName || template.defaultBadgeName,
          subtitle: instance.overrideSubtitle || template.defaultSubtitleText,
          shape: instance.overrideOuterShape || template.defaultOuterShape,
          
          // Config objects (primary)
          borderConfig: borderConfig,
          backgroundConfig: backgroundConfig,
          foregroundConfig: foregroundConfig,
          
          // Derived display values
          borderColor: borderColor,
          foregroundColor: extractColor(foregroundConfig, '#FFFFFF'),
          
          // Legacy fields for compatibility
          foregroundType: foregroundType,
          foregroundValue: foregroundValue,
          
          description: instance.overrideDisplayDescription || template.defaultDisplayDescription,
          tier: template.inherentTier,
          templateSlug: template.templateSlug
        };
      });
      processedBadgeCase = {
        ...guildData.badgeCase,
        badges: await Promise.all(badgeProcessingPromises)
      };
    }

    return {
      id: guildData.id,
      name: guildData.name,
      displayName: guildData.displayName,
      description: guildData.description,
      avatar: guildData.avatar,
      isOpen: guildData.isOpen,
      allowJoinRequests: guildData.allowJoinRequests,
      createdAt: guildData.createdAt,
      updatedAt: guildData.updatedAt,
      creator: guildData.creator,
      updatedBy: guildData.updatedBy,
      memberCount: guildData._count.memberships,
      name_ci: guildData.name_ci,
      members: processedMembers,
      badgeCase: processedBadgeCase
    };
  }

  /**
   * Get guild by ID or name_ci
   * @param {string} identifier - Guild ID or name_ci
   * @returns {Promise<Object>} Guild with selected fields
   */
  async getGuildByIdentifier(identifier) {
    if (!identifier) {
      throw new Error('Guild identifier is required');
    }

    const isLikelyUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);

    const selectFields = {
      displayName: true,
      description: true,
      avatar: true,
      id: true,
      name: true,
      name_ci: true,
      isOpen: true,
      allowJoinRequests: true,
      createdAt: true,
      updatedAt: true,
      creator: { select: { id: true, username: true } },
      updatedBy: { select: { id: true, username: true } },
      _count: { select: { memberships: true } },
      roleSettings: {
        select: {
          guildRoleId: true,
          hierarchyOrder: true,
          overrideRoleName: true,
          overrideDisplayColor: true,
        }
      },
      memberships: {
        orderBy: { joinedAt: 'asc' },
        select: {
          joinedAt: true,
          rank: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
          assignedRoles: {
            select: {
              guildRole: {
                select: {
                  id: true,
                  name: true,
                  displayColor: true,
                }
              }
            }
          }
        }
      },
      badgeCase: {
        select: {
          id: true,
          title: true,
          isPublic: true,
          badges: {
            orderBy: { displayOrder: 'asc' },
            select: {
              displayOrder: true,
              addedAt: true,
              badge: {
                select: {
                  id: true,
                  message: true,
                  overrideBadgeName: true,
                  overrideSubtitle: true,
                  overrideOuterShape: true,
                  overrideBorderConfig: true,
                  overrideBackgroundConfig: true,
                  overrideForegroundConfig: true,
                  overrideDisplayDescription: true,
                  template: {
                    select: {
                      id: true,
                      templateSlug: true,
                      defaultBadgeName: true,
                      defaultSubtitleText: true,
                      defaultOuterShape: true,
                      defaultBorderConfig: true,
                      defaultBackgroundConfig: true,
                      defaultForegroundConfig: true,
                      defaultDisplayDescription: true,
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    let guildData = null;
    if (isLikelyUuid) {
      guildData = await prisma.guild.findUnique({
        where: { id: identifier },
        select: selectFields
      });
    }

    if (!guildData) {
      guildData = await prisma.guild.findUnique({
        where: { name_ci: identifier.toLowerCase() },
        select: selectFields
      });
    }

    if (!guildData) {
      throw new Error('Guild not found');
    }
    
    const roleSettingsMap = new Map(guildData.roleSettings.map(rs => [rs.guildRoleId, rs]));
    const processedMembers = guildData.memberships.map(membership => {
      let highestRole = null;
      let minHierarchyOrder = Infinity;

      membership.assignedRoles.forEach(assignedRoleEntry => {
        const role = assignedRoleEntry.guildRole;
        const setting = roleSettingsMap.get(role.id);

        if (setting && setting.hierarchyOrder !== null && setting.hierarchyOrder < minHierarchyOrder) {
          minHierarchyOrder = setting.hierarchyOrder;
          highestRole = {
            id: role.id,
            name: setting.overrideRoleName || role.name,
            color: setting.overrideDisplayColor || role.displayColor,
            hierarchyOrder: setting.hierarchyOrder
          };
        } else if (!setting && highestRole === null) {
           if (highestRole === null) {
             highestRole = {
               id: role.id,
               name: role.name,
               color: role.displayColor,
               hierarchyOrder: Infinity 
             };
           }
        }
      });
      
      if (!highestRole && membership.assignedRoles.length > 0) {
           const firstRole = membership.assignedRoles[0].guildRole;
            highestRole = { id: firstRole.id, name: firstRole.name, color: firstRole.displayColor, hierarchyOrder: Infinity };
      } else if (!highestRole) {
          highestRole = { name: 'Member', color: '#888888', hierarchyOrder: Infinity };
      }

      return {
        user: membership.user,
        joinedAt: membership.joinedAt,
        rank: membership.rank,
        highestRole: highestRole
      };
    });

    // Process BadgeCase data
    let processedBadgeCase = null;
    if (guildData.badgeCase && guildData.badgeCase.badges) {
      const badgeProcessingPromises = guildData.badgeCase.badges.map(async (guildBadgeItem) => {
        const instance = guildBadgeItem.badge;
        const template = instance.template;
        // Import badge service for display props processing
        const badgeService = require('./badge.service');
        
        // Create a minimal badge instance object for display props processing
        const badgeInstance = {
          ...instance,
          template: template
        };
        
        // Use the badge service's display props method to get consistent formatting
        const displayProps = badgeService.getBadgeDisplayProps(badgeInstance);
        
        return {
          instanceId: instance.id,
          displayOrder: guildBadgeItem.displayOrder,
          addedAt: guildBadgeItem.addedAt,
          message: instance.message,
          ...displayProps,
          templateSlug: template.templateSlug
        };
      });
      processedBadgeCase = {
        ...guildData.badgeCase,
        badges: await Promise.all(badgeProcessingPromises)
      };
    }

    return {
      id: guildData.id,
      name: guildData.name,
      displayName: guildData.displayName,
      description: guildData.description,
      avatar: guildData.avatar,
      isOpen: guildData.isOpen,
      allowJoinRequests: guildData.allowJoinRequests,
      createdAt: guildData.createdAt,
      updatedAt: guildData.updatedAt,
      creator: guildData.creator,
      updatedBy: guildData.updatedBy,
      memberCount: guildData._count.memberships,
      name_ci: guildData.name_ci,
      members: processedMembers,
      badgeCase: processedBadgeCase
    };
  }

  /**
   * Update guild
   * @param {string} guildId - Guild ID
   * @param {Object} guildData - New guild data
   * @param {string} actorUserId - ID of the user performing the update
   * @returns {Promise<Object>} Updated guild
   */
  async updateGuild(guildId, guildData, actorUserId) {
    // Check if guild exists first
    const existingGuild = await prisma.guild.findUnique({ 
      where: { id: guildId },
      select: { id: true, avatar: true } // Get current avatar for cleanup
    });
    if (!existingGuild) {
      throw new Error('Guild not found');
    }

    // Permission Check: Fetch actor's roles and permissions for this guild
    const actorMembership = await prisma.guildMembership.findUnique({
      where: { 
        uniqueUserGuildMembership: { userId: actorUserId, guildId: guildId }
      },
      include: {
        assignedRoles: {
          include: {
            guildRole: {
              include: {
                permissions: {
                  include: {
                    permission: { select: { key: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!actorMembership) {
      throw new Error('Actor is not a member of this guild.');
    }

    const actorPermissions = actorMembership.assignedRoles.flatMap(
      ar => ar.guildRole.permissions.map(p => p.permission.key)
    );

    // Define the required permission for updating guild details
    const REQUIRED_PERMISSION = 'GUILD_EDIT_DETAILS'; 
    if (!actorPermissions.includes(REQUIRED_PERMISSION)) {
      throw new Error('You do not have permission to update this guild');
    }

    // Handle avatar updates
    if (guildData.avatar) {
      try {
        // Avatar should be a URL from R2
        if (typeof guildData.avatar !== 'string' || !guildData.avatar.startsWith('http')) {
          throw new Error('Invalid avatar URL. Please upload an avatar through the upload endpoint.');
        }
        
        // Validate it's from our R2 bucket
        const publicUrlBase = process.env.R2_PUBLIC_URL_BASE;
        if (publicUrlBase && !guildData.avatar.startsWith(publicUrlBase)) {
          throw new Error('Avatar URL must be from our asset storage.');
        }
        
        // Check if this is a temp URL that needs to be moved to permanent storage
        if (guildData.avatar.includes('/temp/')) {
          console.log('Moving guild avatar from temp to permanent storage:', guildData.avatar);
          try {
            const moveResult = await r2Service.moveGuildAvatarFromTemp(guildData.avatar, guildId, prisma);
            // Update the avatar URL to the new permanent URL
            guildData.avatar = moveResult.urls.large;
            console.log('Guild avatar moved to permanent storage:', guildData.avatar);
          } catch (moveError) {
            console.error('Failed to move guild avatar from temp:', moveError);
            throw new Error('Failed to save guild avatar. Please try uploading again.');
          }
        }
      } catch (error) {
        console.error('Error validating guild avatar:', error);
        throw new Error(error.message || 'Invalid avatar format.');
      }
    }

    // Construct updateData carefully to only include provided fields
    const updateData = {};
    if (guildData.name !== undefined) updateData.name = guildData.name; // name_ci will be updated by trigger
    if (guildData.displayName !== undefined) updateData.displayName = guildData.displayName;
    if (guildData.description !== undefined) updateData.description = guildData.description;
    if (guildData.avatar !== undefined) updateData.avatar = guildData.avatar;
    if (guildData.isOpen !== undefined) updateData.isOpen = guildData.isOpen;
    if (guildData.allowJoinRequests !== undefined) updateData.allowJoinRequests = guildData.allowJoinRequests;
    
    // Always update the updatedBy field
    updateData.updatedBy = { connect: { id: actorUserId } };

    if (Object.keys(updateData).length <= 1 && !updateData.updatedBy) { // only updatedBy is not enough if nothing else changed
        // Or if only updatedBy, but no other actual data changes, Prisma might optimize and not run an update.
        // However, if an update call is made with just updatedBy, it should still update the timestamp.
        // If no actual guild data fields are being changed, we might return the existing guild or throw an error.
        // For now, let's assume if the call is made, an update is intended at least for `updatedAt` and `updatedBy`.
        if (Object.keys(updateData).length === 1 && updateData.updatedBy) {
             // This means only updatedBy was set, which is always true. If no other fields are in guildData, throw error.
             if (Object.keys(guildData).length === 0) {
                 throw new Error("No update data provided.");
             }
        }
    }

    try {
      // First update the guild
      await prisma.guild.update({
        where: { id: guildId },
        data: updateData,
      });
      
      // If avatar was updated and old avatar was from R2, delete it
      if (guildData.avatar && existingGuild.avatar && existingGuild.avatar !== updateData.avatar && !existingGuild.avatar.includes('/temp/')) {
        try {
          // Use deleteSpecificAvatar to only delete the old saved avatar files
          await r2Service.deleteSpecificAvatar(existingGuild.avatar, prisma);
        } catch (error) {
          console.error('Failed to delete old guild avatar:', error);
          // Don't fail the request if cleanup fails
        }
      }
      
      // Then return the full guild data like getGuildByIdentifier does
      return await this.getGuildByIdentifier(guildId);
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('name_ci')) {
        throw new Error('A guild with this name already exists');
      }
      console.error('Error in updateGuild:', error);
      throw error;
    }
  }

  /**
   * Delete guild
   * @param {string} guildId - Guild ID
   * @param {string} actorUserId - ID of the user deleting the guild
   * @returns {Promise<Object>} Deleted guild
   */
  async deleteGuild(guildId, actorUserId) {
    // Check if guild exists first
    const existingGuild = await prisma.guild.findUnique({ 
      where: { id: guildId },
      select: { id: true, createdById: true } // Also get createdById for sole founder check potentially
    });
    if (!existingGuild) {
      throw new Error('Guild not found');
    }

    // Permission Check: Fetch actor's roles and permissions for this guild
    const actorMembership = await prisma.guildMembership.findUnique({
      where: { 
        uniqueUserGuildMembership: { userId: actorUserId, guildId: guildId }
      },
      include: {
        assignedRoles: {
          include: {
            guildRole: {
              include: {
                permissions: {
                  include: {
                    permission: { select: { key: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!actorMembership) {
      // This case implies the user might not even be a member, or a deeper issue.
      throw new Error('You do not have a valid membership in this guild to perform this action.');
    }

    const actorPermissions = actorMembership.assignedRoles.flatMap(
      ar => ar.guildRole.permissions.map(p => p.permission.key)
    );

    const REQUIRED_PERMISSION = 'GUILD_DISBAND'; 
    if (!actorPermissions.includes(REQUIRED_PERMISSION)) {
      throw new Error('You do not have permission to delete this guild');
    }

    // Optional: Add a check if the user is the creator (original founder)
    // and if there are other founders or if ownership transfer is required.
    // This example assumes the GUILD_DISBAND permission is sufficient.
    // For instance, if only the original creator can disband:
    // if (existingGuild.createdById !== actorUserId) {
    //   throw new Error('Only the original guild creator can delete this guild.');
    // }

    // Delete guild - Prisma will handle cascading deletes based on schema relations
    // (e.g., memberships, roles, contacts linked to this guild with onDelete: Cascade)
    return prisma.guild.delete({
      where: { id: guildId }
    });
  }

  /**
   * Get guilds by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of guilds
   */
  async getGuildsByUserId(userId) {
    const memberships = await prisma.guildMembership.findMany({
      where: { userId },
      include: {
        guild: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                // avatar: true // User avatar if needed
              }
            },
            updatedBy: { // Good to include who last updated the guild
              select: {
                id: true,
                username: true,
              }
            },
            _count: {
              select: { memberships: true }
            }
          }
        },
        assignedRoles: { // MODIFIED: Fetch assigned roles
          include: {
        role: {
              select: { 
                id: true, 
                name: true, 
                displayColor: true, // Include color for UI
                apiVisible: true // Include visibility flag
              }
            }
          }
        }
      }
    });

    return memberships.map(membership => ({
      // Spread guild details first, then add membership-specific info
      id: membership.guild.id,
      name: membership.guild.name,
      displayName: membership.guild.displayName,
      description: membership.guild.description,
      avatar: membership.guild.avatar,
      isOpen: membership.guild.isOpen,
      allowJoinRequests: membership.guild.allowJoinRequests,
      creator: membership.guild.creator,
      updatedBy: membership.guild.updatedBy,
      createdAt: membership.guild.createdAt,
      updatedAt: membership.guild.updatedAt,
      memberCount: membership.guild._count.memberships,
      // Membership specific details for this user in this guild:
      userGuildMembershipId: membership.id, // The ID of the GuildMembership record itself
      roles: membership.assignedRoles.map(ar => ({
        id: ar.guildRole.id,
        name: ar.guildRole.name,
        displayColor: ar.guildRole.displayColor,
        apiVisible: ar.guildRole.apiVisible
      })), 
      isPrimary: membership.isPrimary,
      rank: membership.rank, // Include member's rank in this guild
      joinedAt: membership.joinedAt // Include when the user joined this guild
    }));
  }

  /**
   * Search guilds
   * @param {string} query - Search query
   * @param {Object} filters - Filters
   * @returns {Promise<Array>} List of guilds
   */
  async searchGuilds(query, filters = {}) {
    const { isOpen } = filters;
    const lowercasedQuery = query ? query.toLowerCase() : "";
    
    const whereConditions = [];
    if (query) {
        whereConditions.push(
            { name_ci: { contains: lowercasedQuery } }, // Search against the lowercase name_ci field
            { description: { contains: query, mode: 'insensitive' } } // Keep description search as is (can be case-insensitive)
        );
    }

    const whereClause = {};
    if (whereConditions.length > 0) {
        whereClause.OR = whereConditions;
    }

    if (typeof isOpen === 'boolean') {
      whereClause.isOpen = isOpen;
    }

    return prisma.guild.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            // avatar: true // User avatar if needed
          }
        },
        updatedBy: { // Include who last updated, consistent with getGuildById
          select: {
                id: true,
                username: true,
          }
        },
        _count: { // Correct way to get counts
          select: { memberships: true }
        }
      },
      take: 20 // Keep pagination limit
    });
  }

  /**
   * Join guild
   * @param {string} guildId - Guild ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Guild membership
   */
  async joinGuild(guildId, userId) {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { id: true, name: true, isOpen: true, allowJoinRequests: true } // Select necessary fields
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    const existingMembership = await prisma.guildMembership.findUnique({
      where: {
        uniqueUserGuildMembership: { userId, guildId } // MODIFIED: Use named unique constraint
      }
    });

    if (existingMembership) {
      throw new Error('You are already a member of this guild');
    }

    if (guild.isOpen) {
      // Guild is open, create membership and assign default role(s)
      const memberSystemRole = await prisma.role.findFirst({ // MODIFIED: AppRole -> Role
      where: {
          name_ci: 'member', // MODIFIED: use name_ci and lowercase
        isSystemRole: true,
          guildId: null,
      },
      select: { id: true },
    });

      if (!memberSystemRole) {
        console.error('CRITICAL: System MEMBER role not found. Cannot assign default member role.');
        throw new Error('System MEMBER role not found.');
      }
      
      const shouldBePrimary = await this.shouldBeSetAsPrimary(userId);
      const newMembership = await prisma.guildMembership.create({
      data: {
        userId,
        guildId,
          isPrimary: shouldBePrimary,
          primarySetAt: shouldBePrimary ? new Date() : null,
          // rank: default rank, e.g. GuildMemberRank.E - handled by schema default
        }
      });

      await prisma.userGuildRole.create({
        data: {
          guildMembershipId: newMembership.id,
          roleId: memberSystemRole.id,
        }
      });
      // TODO: Add logic to assign guild-specific default roles if any are defined

      return { ...newMembership, guildName: guild.name, status: 'JOINED' }; // Return membership and status

    } else if (guild.allowJoinRequests) {
      // Guild is not open, but allows join requests
      // Check if a join request already exists
      const existingRequest = await prisma.guildJoinRequest.findUnique({
        where: { guildId_userId: { guildId, userId } }
      });
      if (existingRequest && existingRequest.status === 'PENDING') {
        throw new Error('You already have a pending join request for this guild.');
      } else if (existingRequest && existingRequest.status === 'REJECTED') {
        throw new Error('Your previous join request was rejected. Please contact an admin.');
      }

      await prisma.guildJoinRequest.create({
        data: {
          guildId,
          userId,
          // message can be added from controller if provided
        }
      });
      return { message: 'Your request to join has been submitted.', status: 'REQUESTED' };

    } else {
      // Guild is private and does not allow join requests
      throw new Error('This guild is private and requires an invitation to join.');
    }
  }

  /**
   * Leave guild
   * @param {string} guildId - Guild ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deleted membership
   */
  async leaveGuild(guildId, userId) {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { id: true, name: true } // Select necessary fields
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    const membership = await prisma.guildMembership.findUnique({
      where: {
        uniqueUserGuildMembership: { userId, guildId } // MODIFIED: Use named unique constraint
      },
      include: {
        assignedRoles: { // MODIFIED: Include assignedRoles to check for FOUNDER
          include: {
            role: { select: { id: true, name_ci: true } } // name_ci for 'founder' check
          }
        }
      },
    });

    if (!membership) {
      throw new Error('You are not a member of this guild');
    }

    const isFounder = membership.assignedRoles.some(ar => ar.guildRole.name_ci === 'founder');

    if (isFounder) {
      // Check if they are the sole founder
      const founderSystemRole = await prisma.role.findFirst({
        where: { name_ci: 'founder', isSystemRole: true, guildId: null },
        select: { id: true }
      });

      if (founderSystemRole) { // Should always exist if seeds are correct
        const otherFoundersCount = await prisma.guildMembership.count({
      where: {
            guildId: guildId,
            NOT: { userId: userId }, // Exclude the current user
            assignedRoles: {
              some: { roleId: founderSystemRole.id }
        }
      }
    });

        if (otherFoundersCount === 0) {
          throw new Error('As the sole founder, you cannot leave the guild. Please transfer ownership or delete the guild.');
        }
      } else {
        // This is a critical setup error if the FOUNDER role doesn't exist
        console.error('CRITICAL: System FOUNDER role not found during leaveGuild check.');
        throw new Error('Cannot process leave request due to system role configuration error.');
      }
    }

    // Delete membership - Prisma will cascade delete UserGuildRole entries if schema is set up correctly
    await prisma.guildMembership.delete({
      where: {
        id: membership.id // MODIFIED: Delete by membership's own unique ID for safety
      }
    });
    // Return a confirmation or the deleted membership id, or nothing (204 No Content from controller)
    return { message: `Successfully left guild: ${guild.name}` };
  }

  /**
   * Update member role
   * @param {string} guildId - Guild ID
   * @param {string} targetUserId - ID of the user to update
   * @param {string} newRoleId - ID of the AppRole to assign
   * @param {string} actorUserId - ID of the user performing the update
   * @returns {Promise<Object>} Updated membership
   */
  async updateMemberRole(guildId, targetUserId, newRoleId, actorUserId) {
    // THIS METHOD IS DEPRECATED due to schema changes to UserGuildRole for multiple roles.
    // It should be replaced by assignRoleToMember and removeRoleFromMember.
    // Keeping it here temporarily to avoid breaking controller, but it will throw an error.
    throw new Error("updateMemberRole is deprecated. Use assignRoleToMember or removeRoleFromMember.");
  }

  /**
   * Assign a role to a guild member.
   * @param {string} guildId - Guild ID
   * @param {string} targetUserId - ID of the user to assign the role to
   * @param {string} roleToAssignId - ID of the Role to assign
   * @param {string} actorUserId - ID of the user performing the assignment
   * @returns {Promise<Object>} The new UserGuildRole record
   */
  async assignRoleToMember(guildId, targetUserId, roleToAssignId, actorUserId) {
    // 1. Permission Check for actorUserId
    const actorMembershipPerms = await prisma.guildMembership.findUnique({
      where: { uniqueUserGuildMembership: { userId: actorUserId, guildId: guildId } },
      include: {
        assignedRoles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: { select: { key: true } } } }
              }
            }
          }
        }
      }
    });
    if (!actorMembershipPerms) throw new Error('Actor not a member or guild not found.');
    const actorPermissions = actorMembershipPerms.assignedRoles.flatMap(ar => ar.guildRole.permissions.map(p => p.permission.key));
    if (!actorPermissions.includes('GUILD_ROLE_ASSIGN')) {
      throw new Error('Actor does not have permission to assign roles in this guild.');
    }

    // 2. Validate target user is a member
    const targetMembership = await prisma.guildMembership.findUnique({
      where: { uniqueUserGuildMembership: { userId: targetUserId, guildId: guildId } },
      select: { id: true } // Need the membership ID
    });
    if (!targetMembership) {
      throw new Error('Target user is not a member of this guild.');
    }

    // 3. Validate the role to be assigned
    const roleToAssign = await prisma.role.findUnique({
      where: { id: roleToAssignId },
      select: { id: true, name: true, guildId: true, isSystemRole: true }
    });
    if (!roleToAssign) {
      throw new Error('Role to assign not found.');
    }
    // Check if the role is either a system role (guildId is null) or a custom role for THIS guild
    if (roleToAssign.guildId !== null && roleToAssign.guildId !== guildId) {
      throw new Error('Cannot assign a custom role from another guild.');
    }

    // 4. Check if user already has this role
    const existingUserGuildRole = await prisma.userGuildRole.findUnique({
      where: {
        guildMembershipId_roleId: {
          guildMembershipId: targetMembership.id,
          roleId: roleToAssign.id
        }
      }
    });
    if (existingUserGuildRole) {
      throw new Error(`User already has the role: ${roleToAssign.name}`);
    }
    
    // Special handling if assigning FOUNDER role (simplified: assumes only one founder typically)
    // More robust logic would involve checking if others are founder and demoting them, or ensuring only one person gets it if that's the rule.
    // For now, this simplified version allows assigning founder. A dedicated "transfer ownership" function is better.
    if (roleToAssign.name.toUpperCase() === 'FOUNDER' && roleToAssign.isSystemRole) {
        // Consider implications: should this automatically demote other founders?
        // This simplified version does not handle demotion of other founders.
        console.warn(`Assigning FOUNDER role to user ${targetUserId} in guild ${guildId}. Ensure ownership transfer rules are handled if necessary.`);
    }

    // 5. Create UserGuildRole
    const newUserGuildRole = await prisma.userGuildRole.create({
      data: {
        guildMembershipId: targetMembership.id,
        roleId: roleToAssign.id,
        // assignedByUserId: actorUserId, // If you add this field to UserGuildRole schema for audit
      },
      include: { // Include details for the response
        role: { select: { name: true } },
        guildMembership: { select: { userId: true, guildId: true } }
      }
    });

    return newUserGuildRole;
  }

  /**
   * Remove a role from a guild member.
   * @param {string} guildId - Guild ID
   * @param {string} targetUserId - ID of the user to remove the role from
   * @param {string} roleToRevokeId - ID of the Role to revoke
   * @param {string} actorUserId - ID of the user performing the revocation
   * @returns {Promise<Object>} Confirmation message or deleted record
   */
  async removeRoleFromMember(guildId, targetUserId, roleToRevokeId, actorUserId) {
    // 1. Permission Check for actorUserId (similar to assignRoleToMember - can use GUILD_ROLE_ASSIGN or a specific GUILD_ROLE_REVOKE)
    const actorMembershipPerms = await prisma.guildMembership.findUnique({
      where: { uniqueUserGuildMembership: { userId: actorUserId, guildId: guildId } },
      include: {
        assignedRoles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: { select: { key: true } } } }
              }
            }
          }
        }
      }
    });
    if (!actorMembershipPerms) throw new Error('Actor not a member or guild not found.');
    const actorPermissions = actorMembershipPerms.assignedRoles.flatMap(ar => ar.role.permissions.map(p => p.permission.key));
    // Assuming GUILD_ROLE_ASSIGN also covers removal for simplicity, or use a new perm like GUILD_ROLE_REVOKE
    if (!actorPermissions.includes('GUILD_ROLE_ASSIGN')) { 
      throw new Error('Actor does not have permission to manage roles in this guild.');
    }

    // 2. Validate target user is a member
    const targetMembership = await prisma.guildMembership.findUnique({
      where: { uniqueUserGuildMembership: { userId: targetUserId, guildId: guildId } },
      select: { 
        id: true, 
        assignedRoles: { 
          where: {roleId: roleToRevokeId }, 
          select: { 
            role: { // Corrected this inner select
              select: { 
                name: true, // Was 'select Name: true'
                isSystemRole: true 
              } 
            } 
          } 
        } 
      } 
    });
    if (!targetMembership) {
      throw new Error('Target user is not a member of this guild.');
    }

    // Validate the newRoleId exists as an AppRole (either system or custom for this guild)
    const newAppRole = await prisma.appRole.findFirst({
        where: { 
            id: newRoleId,
            OR: [
                { guildId: null, isSystemRole: true }, // System role
                { guildId: guildId } // Custom role for this guild
            ]
        }
    });
    if (!newAppRole) {
        throw new Error('Invalid role ID or role not applicable to this guild.');
    }
    
    const systemOwnerRole = await prisma.appRole.findFirst({ where: {name: 'OWNER', isSystemRole: true, guildId: null}, select: {id: true}});
    const systemAdminRole = await prisma.appRole.findFirst({ where: {name: 'ADMIN', isSystemRole: true, guildId: null}, select: {id: true}});

    if (!systemOwnerRole || !systemAdminRole) {
        throw new Error('Core system roles (OWNER/ADMIN) not found.');
    }

    // If changing target's role to OWNER and they are not already the owner
    if (newAppRole.id === systemOwnerRole.id && targetMembership.roleId !== systemOwnerRole.id) {
      // Find the current guild owner(s) other than the target user
      const currentOtherOwners = await prisma.guildMembership.findMany({
        where: {
          guildId,
          roleId: systemOwnerRole.id,
          NOT: { userId: targetUserId } 
        },
      });

      // Demote current other owner(s) to ADMIN
      for (const owner of currentOtherOwners) {
        await prisma.guildMembership.update({
          where: { id: owner.id }, // Assuming GuildMembership has its own unique id
          data: { roleId: systemAdminRole.id },
        });
      }
    }
    
    // Prevent owner from changing their own role if they are the sole owner and not assigning to OWNER (which is a no-op covered above or a transfer to another OWNER)
    if (actorMembership.userId === targetUserId && 
        actorMembership.roleId === systemOwnerRole.id && 
        newRoleId !== systemOwnerRole.id) {
        const otherOwnersCount = await prisma.guildMembership.count({
            where: {
                guildId,
                roleId: systemOwnerRole.id,
                NOT: { userId: actorMembership.userId }
        }
      });
        if (otherOwnersCount === 0) {
            throw new Error('Cannot change your own role as the sole owner. Transfer ownership or delete the guild.');
        }
    }

    // Update target user's membership
    return prisma.guildMembership.update({
      where: {
        id: targetMembership.id // Use the membership ID for update (ensure GuildMembership has an id field)
      },
      data: {
        roleId: newRoleId,
      },
      include: { // Return the updated membership with role name
          role: {select: {name: true}}
      }
    });
  }

  /**
   * Set primary guild
   * @param {string} guildId - Guild ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated membership
   */
  async setPrimaryGuild(guildId, userId) {
    // Check if guild exists
    const guild = await prisma.guild.findUnique({
      where: { id: guildId }
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check if user is a member
    const membership = await prisma.guildMembership.findUnique({
      where: {
        userId_guildId: {
          userId,
          guildId
        }
      }
    });

    if (!membership) {
      throw new Error('You are not a member of this guild');
    }

    // Check if user has changed primary guild recently (within 4 weeks)
    const lastPrimaryChange = await prisma.guildMembership.findFirst({
      where: {
        userId,
        isPrimary: true,
        primarySetAt: {
          not: null
        }
      },
      orderBy: {
        primarySetAt: 'desc'
      }
    });

    if (lastPrimaryChange?.primarySetAt) {
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28); // 4 weeks = 28 days

      if (lastPrimaryChange.primarySetAt > fourWeeksAgo) {
        const daysLeft = Math.ceil((lastPrimaryChange.primarySetAt - fourWeeksAgo) / (1000 * 60 * 60 * 24));
        throw new Error(`You can only change your primary guild once every 4 weeks. Please try again in ${daysLeft} days.`);
      }
    }

    // Reset all user's primary guilds
    await prisma.guildMembership.updateMany({
      where: {
        userId,
        isPrimary: true
      },
      data: {
        isPrimary: false,
        primarySetAt: null
      }
    });

    // Set this guild as primary
    return prisma.guildMembership.update({
      where: {
        userId_guildId: {
          userId,
          guildId
        }
      },
      data: {
        isPrimary: true,
        primarySetAt: new Date()
      }
    });
  }

  /**
   * Check if a guild should be set as primary (when no other primary exists)
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether this guild should be primary
   */
  async shouldBeSetAsPrimary(userId) {
    const primaryCount = await prisma.guildMembership.count({
      where: {
        userId,
        isPrimary: true
      }
    });
    
    return primaryCount === 0;
  }

  /**
   * Get paginated list of guild members
   * @param {string} guildId - Guild ID
   * @param {Object} paginationOptions - Options for pagination
   * @param {number} paginationOptions.page - Current page number
   * @param {number} paginationOptions.limit - Number of items per page
   * @returns {Promise<Object>} Paginated list of members and pagination metadata
   */
  async getGuildMembers(guildId, { page = 1, limit = 10 }) {
    const guild = await prisma.guild.findUnique({ 
        where: { id: guildId }, 
        select: { id: true } // Minimal select to check existence
    });
    if (!guild) {
      throw new Error('Guild not found');
    }

    const offset = (page - 1) * limit;

    const [membershipsData, totalMembers] = await prisma.$transaction([
      prisma.guildMembership.findMany({
        where: { guildId },
        take: limit,
        skip: offset,
        orderBy: { joinedAt: 'asc' }, 
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
          assignedRoles: { // MODIFIED: Include assigned roles
            include: {
              role: {
                select: { 
                    id: true, 
                    name: true, 
                    displayColor: true, 
                    apiVisible: true 
                }
              }
            }
          }
          // rank is a direct field on GuildMembership, no need to include separately if selecting all scalar fields
        },
        // Select scalar fields from GuildMembership explicitly if not all are needed by default
        // This ensures `rank` and `joinedAt` are fetched.
        // If no specific select is here, all scalar fields are fetched by default with an include.
      }),
      prisma.guildMembership.count({
        where: { guildId },
      }),
    ]);

    const members = membershipsData.map(m => ({
      userId: m.user.id,
      username: m.user.username,
      displayName: m.user.displayName,
      avatar: m.user.avatar,
      roles: m.assignedRoles.map(ar => ({
        id: ar.role.id,
        name: ar.role.name,
        displayColor: ar.role.displayColor,
        apiVisible: ar.role.apiVisible
      })), 
      rank: m.rank, // ADDED: Include rank
      joinedAt: m.joinedAt
    }));

    return {
      members,
      pagination: {
        currentPage: page,
        limit,
        totalMembers,
        totalPages: Math.ceil(totalMembers / limit),
      },
    };
  }

  /**
   * Get current user's permissions for a specific guild
   * @param {string} guildId - Guild ID
   * @param {string} userId - User ID of the authenticated user
   * @returns {Promise<Object>} User's role and permissions within the guild
   */
  async getMyGuildPermissions(guildId, userId) {
    const guild = await prisma.guild.findUnique({ 
        where: { id: guildId }, 
        select: { id: true } // Minimal select to check existence
    });
    if (!guild) {
      throw new Error('Guild not found');
    }

    const membership = await prisma.guildMembership.findUnique({
      where: {
        uniqueUserGuildMembership: { userId, guildId } // MODIFIED: Use named unique constraint
      },
      include: {
        assignedRoles: { // Fetch assigned roles with their permissions
          include: {
            guildRole: { // CORRECTED: Use guildRole instead of role
              select: { // Select role details needed for the response
                id: true,
                name: true,
                name_ci: true, // For internal checks if needed, though name is usually for display
                isSystemRole: true,
                displayColor: true,
                apiVisible: true,
                permissions: { // Include permissions for each role
                  include: {
                    permission: { // Include the actual permission details
                      select: { key: true } // We only need the permission key string
                    }
                  }
                }
              }
            }
          }
        }
      },
    });

    if (!membership) {
      throw new Error('User not a member of this guild');
    }

    // Aggregate all permission keys from all assigned roles
    const allPermissionKeys = new Set();
    membership.assignedRoles.forEach(assignedRole => {
      assignedRole.guildRole.permissions.forEach(rolePermission => { // CORRECTED: Use guildRole instead of role
        allPermissionKeys.add(rolePermission.permission.key);
      });
    });

    // Prepare the roles data for the response
    const userRoles = membership.assignedRoles.map(ar => ({
        id: ar.guildRole.id, // CORRECTED: Use guildRole instead of role
        name: ar.guildRole.name, // Display name
        isSystemRole: ar.guildRole.isSystemRole,
        displayColor: ar.guildRole.displayColor,
        apiVisible: ar.guildRole.apiVisible
    }));

    return {
      guildId,
      userId,
      roles: userRoles, // Return the list of role objects user has
      permissions: Array.from(allPermissionKeys), // Return the aggregated list of permission keys
      rank: membership.rank, // Also include the member's rank
      guildMembershipId: membership.id // And their membership ID
    };
  }

  /**
   * Set a guild as primary for a specific category
   * @param {string} guildId - Guild ID
   * @param {string} categoryId - Category ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated category primary guild
   */
  async setCategoryPrimaryGuild(guildId, categoryId, userId) {
    // Check if category exists and allows primary guilds
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    if (!category.allowsGuildPrimary) {
      throw new Error('This category does not allow primary guilds');
    }

    // Check if guild exists and is in the category
    const guildCategory = await prisma.guildCategory.findUnique({
      where: {
        guildId_categoryId: {
          guildId,
          categoryId
        }
      }
    });

    if (!guildCategory) {
      throw new Error('Guild is not in this category');
    }

    // Check if user is a member of the guild
    const membership = await prisma.guildMembership.findUnique({
      where: {
        userId_guildId: {
          userId,
          guildId
        }
      }
    });

    if (!membership) {
      throw new Error('You are not a member of this guild');
    }

    // Check if user has changed category primary guild recently (within 4 weeks)
    const lastCategoryPrimaryChange = await prisma.userCategoryPrimaryGuild.findFirst({
      where: {
        userId,
        categoryId
      },
      orderBy: {
        setAt: 'desc'
      }
    });

    if (lastCategoryPrimaryChange?.setAt) {
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28); // 4 weeks = 28 days

      if (lastCategoryPrimaryChange.setAt > fourWeeksAgo) {
        const daysLeft = Math.ceil((lastCategoryPrimaryChange.setAt - fourWeeksAgo) / (1000 * 60 * 60 * 24));
        throw new Error(`You can only change your primary guild for this category once every 4 weeks. Please try again in ${daysLeft} days.`);
      }
    }

    // Create or update the category primary guild
    return prisma.userCategoryPrimaryGuild.upsert({
      where: {
        userId_categoryId: {
          userId,
          categoryId
        }
      },
      create: {
        userId,
        categoryId,
        guildId,
        setAt: new Date()
      },
      update: {
        guildId,
        setAt: new Date()
      }
    });
  }
}

module.exports = new GuildService(); 