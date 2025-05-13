const { PrismaClient } = require('@prisma/client');
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
      // Validate input
      if (!guildData.name || !guildData.description) {
        throw new Error('Guild name and description are required');
      }

      // Create guild
      const guild = await prisma.guild.create({
        data: {
          name: guildData.name,
          displayName: guildData.displayName || guildData.name, // Use name as fallback
          description: guildData.description,
          avatar: guildData.avatar,
          isOpen: guildData.isOpen || false,
          createdById: userId,
          updatedById: userId
        }
      });

      // Fetch the system OWNER role ID
      const ownerRole = await prisma.appRole.findFirst({
        where: {
          name: 'OWNER',
          isSystemRole: true,
          guildId: null, // Ensure it's a global system role
        },
        select: { id: true },
      });

      if (!ownerRole) {
        // This should ideally not happen if system roles were seeded correctly.
        // In a real app, you might have a more robust way to get these IDs (e.g., constants or cache).
        throw new Error('System OWNER role not found. Please ensure system roles are seeded.');
      }

      // Create membership for creator as OWNER
      await prisma.guildMembership.create({
        data: {
          userId,
          guildId: guild.id,
          roleId: ownerRole.id, // Assign the roleId of the fetched OWNER AppRole
          // If user has no primary guild yet, make this one primary
          isPrimary: await this.shouldBeSetAsPrimary(userId)
        }
      });

      return guild;
    } catch (error) {
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        throw new Error('A guild with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Get guild by ID
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>} Guild
   */
  async getGuildById(guildId) {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            // avatar: true // Keep or remove depending on whether guild.avatar is the primary source
          }
        },
        memberships: { // Still useful for other potential checks, but not for count if _count is used
          // select: { userId: true, role: true } // Example: select only what's needed if memberships array is large
        },
        _count: {
          select: { memberships: true }
        }
      }
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Structure the response
    return {
      id: guild.id,
      name: guild.name,
      description: guild.description,
      avatar: guild.avatar, // Prioritize guild's own avatar
      isOpen: guild.isOpen,
      createdById: guild.createdById,
      updatedById: guild.updatedById,
      createdAt: guild.createdAt,
      updatedAt: guild.updatedAt,
      creator: guild.creator, // Contains creator's id and username
      memberCount: guild._count.memberships
      // Optionally, include a limited set of members if needed for an overview,
      // but the plan specifies a separate endpoint for detailed member listing.
      // memberships: guild.memberships (if still needed and selected appropriately)
    };
  }

  /**
   * Update guild
   * @param {string} guildId - Guild ID
   * @param {Object} guildData - New guild data
   * @param {string} userId - ID of the user updating the guild
   * @returns {Promise<Object>} Updated guild
   */
  async updateGuild(guildId, guildData, userId) {
    // Check if guild exists
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      // Include memberships AND the role object within each membership for permission check
      include: {
        memberships: {
          where: { userId }, // Optimization: only fetch the relevant user's membership
          include: {
            role: true, // Include the AppRole object associated with the membership
          },
        },
      },
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Since we filtered memberships to the specific userId, we can take the first (and only) one.
    const membership = guild.memberships[0];

    if (!membership || !membership.role || (membership.role.name !== 'OWNER' && membership.role.name !== 'ADMIN')) {
      throw new Error('You do not have permission to update this guild');
    }

    // Update guild
    return prisma.guild.update({
      where: { id: guildId },
      data: {
        name: guildData.name,
        displayName: guildData.displayName || guildData.name, // Use name as fallback
        description: guildData.description,
        avatar: guildData.avatar,
        isOpen: guildData.isOpen,
        updatedById: userId
      }
    });
  }

  /**
   * Delete guild
   * @param {string} guildId - Guild ID
   * @param {string} userId - ID of the user deleting the guild
   * @returns {Promise<Object>} Deleted guild
   */
  async deleteGuild(guildId, userId) {
    // Check if guild exists
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        memberships: {
          where: { userId }, // Optimization: only fetch the relevant user's membership
          include: {
            role: true, // Include the AppRole object
          },
        },
      },
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    const membership = guild.memberships[0]; // User's specific membership

    // Check if user has permission (only OWNER can delete)
    if (!membership || !membership.role || membership.role.name !== 'OWNER') {
      throw new Error('Only the guild owner can delete this guild');
    }

    // Delete guild
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
                avatar: true
              }
            },
            _count: {
              select: { memberships: true }
            }
          }
        },
        role: {
          select: { name: true }
        }
      }
    });

    return memberships.map(membership => ({
      ...membership.guild,
      role: membership.role ? membership.role.name : null,
      isPrimary: membership.isPrimary,
      memberCount: membership.guild._count.memberships
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
    
    const where = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    };

    // Add isOpen filter if specified
    if (typeof isOpen === 'boolean') {
      where.isOpen = isOpen;
    }

    return prisma.guild.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        memberships: {
          select: {
            _count: true
          }
        }
      },
      take: 20
    });
  }

  /**
   * Join guild
   * @param {string} guildId - Guild ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Guild membership
   */
  async joinGuild(guildId, userId) {
    // Check if guild exists
    const guild = await prisma.guild.findUnique({
      where: { id: guildId }
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check if guild is open for joining
    if (!guild.isOpen) {
      throw new Error('This guild requires an invitation to join');
    }

    // Check if user is already a member
    const existingMembership = await prisma.guildMembership.findUnique({
      where: {
        userId_guildId: {
          userId,
          guildId
        }
      }
    });

    if (existingMembership) {
      throw new Error('You are already a member of this guild');
    }

    // Fetch the system MEMBER role ID
    const memberRole = await prisma.appRole.findFirst({
      where: {
        name: 'MEMBER',
        isSystemRole: true,
        guildId: null, // Ensure it's a global system role
      },
      select: { id: true },
    });

    if (!memberRole) {
      // This should ideally not happen if system roles were seeded correctly.
      throw new Error('System MEMBER role not found. Please ensure system roles are seeded.');
    }

    // Create membership
    return prisma.guildMembership.create({
      data: {
        userId,
        guildId,
        roleId: memberRole.id, // Assign the roleId of the fetched MEMBER AppRole
        isPrimary: await this.shouldBeSetAsPrimary(userId)
      }
    });
  }

  /**
   * Leave guild
   * @param {string} guildId - Guild ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deleted membership
   */
  async leaveGuild(guildId, userId) {
    // Check if guild exists
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      // We don't need all memberships initially, just confirm guild exists
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check if user is a member and get their role
    const membership = await prisma.guildMembership.findUnique({
      where: {
        userId_guildId: { // Assuming the @@unique([userId, guildId], name: "uniqueUserGuild") exists
          userId,
          guildId,
        },
      },
      include: {
        role: { select: { name: true } }, // Include the role name
      },
    });

    if (!membership) {
      throw new Error('You are not a member of this guild');
    }

    // Check if user is the owner
    if (membership.role && membership.role.name === 'OWNER') {
      throw new Error('The owner cannot leave the guild. Transfer ownership first or delete the guild');
    }

    // Delete membership
    return prisma.guildMembership.delete({
      where: {
        userId_guildId: {
          userId,
          guildId
        }
      }
    });
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
    // Fetch guild and include actor's and target's memberships with their roles
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        memberships: {
          where: {
            OR: [{ userId: actorUserId }, { userId: targetUserId }],
          },
          include: {
            role: { select: { id: true, name: true } }, // Include role id and name
          },
        },
      },
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    const actorMembership = guild.memberships.find(m => m.userId === actorUserId);
    const targetMembership = guild.memberships.find(m => m.userId === targetUserId);

    // Check if actor has permission (must be OWNER)
    if (!actorMembership || !actorMembership.role || actorMembership.role.name !== 'OWNER') {
      throw new Error('Only the guild owner can update member roles');
    }

    if (!targetMembership) {
      throw new Error('User is not a member of this guild');
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
    // Ensure guild exists
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      throw new Error('Guild not found');
    }

    const offset = (page - 1) * limit;

    const [memberships, totalMembers] = await prisma.$transaction([
      prisma.guildMembership.findMany({
        where: { guildId },
        take: limit,
        skip: offset,
        orderBy: { joinedAt: 'asc' }, // Or by role, then joinedAt, etc.
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          role: { // Include the AppRole object
            select: { name: true }, // Select only the name
          },
        },
      }),
      prisma.guildMembership.count({
        where: { guildId },
      }),
    ]);

    const members = memberships.map(m => ({
      userId: m.user.id,
      username: m.user.username,
      avatar: m.user.avatar,
      role: m.role ? m.role.name : null, // Use the role name
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
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      throw new Error('Guild not found');
    }

    const membership = await prisma.guildMembership.findUnique({
      where: {
        userId_guildId: { // Using the compound unique key name from schema.prisma
          userId,
          guildId,
        },
      },
      include: {
        role: { select: { name: true } }, // Include the AppRole name
      },
    });

    if (!membership) {
      // Or, instead of throwing, one could return a default object indicating no membership/permissions
      // For now, throwing an error aligns with typical API behavior for unauthorized access/not found resources.
      throw new Error('User not a member of this guild');
    }

    const roleName = membership.role ? membership.role.name : null;
    const isOwnerOrAdmin = roleName === 'OWNER' || roleName === 'ADMIN';

    const permissions = {
      canEditGuildDetails: isOwnerOrAdmin,
      canManageMembers: isOwnerOrAdmin,
      canManageInvitations: isOwnerOrAdmin, // For future Phase 3 functionality
      canManageGuildBadges: isOwnerOrAdmin, // For MVP: viewing guild's received badges, managing trophy case
      canManageSettings: isOwnerOrAdmin,
    };

    return {
      guildId,
      userId,
      role: roleName, // Return the role name
      permissions,
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