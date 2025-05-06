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
          description: guildData.description,
          avatar: guildData.avatar,
          isOpen: guildData.isOpen || false,
          createdById: userId,
          updatedById: userId
        }
      });

      // Create membership for creator as OWNER
      await prisma.guildMembership.create({
        data: {
          userId,
          guildId: guild.id,
          role: 'OWNER',
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
      include: {
        memberships: true
      }
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check if user has permission (must be OWNER or ADMIN)
    const membership = guild.memberships.find(m => m.userId === userId);
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new Error('You do not have permission to update this guild');
    }

    // Update guild
    return prisma.guild.update({
      where: { id: guildId },
      data: {
        name: guildData.name,
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
        memberships: true
      }
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check if user has permission (only OWNER can delete)
    const membership = guild.memberships.find(m => m.userId === userId);
    if (!membership || membership.role !== 'OWNER') {
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
        }
      }
    });

    return memberships.map(membership => ({
      ...membership.guild,
      role: membership.role,
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

    // Create membership
    return prisma.guildMembership.create({
      data: {
        userId,
        guildId,
        role: 'MEMBER',
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
      include: {
        memberships: true
      }
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check if user is a member
    const membership = guild.memberships.find(m => m.userId === userId);
    if (!membership) {
      throw new Error('You are not a member of this guild');
    }

    // Check if user is the owner
    if (membership.role === 'OWNER') {
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
   * @param {string} role - New role
   * @param {string} actorUserId - ID of the user performing the update
   * @returns {Promise<Object>} Updated membership
   */
  async updateMemberRole(guildId, targetUserId, role, actorUserId) {
    // Check if guild exists
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        memberships: true
      }
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check if actor has permission (must be OWNER)
    const actorMembership = guild.memberships.find(m => m.userId === actorUserId);
    if (!actorMembership || actorMembership.role !== 'OWNER') {
      throw new Error('Only the guild owner can update member roles');
    }

    // Check if target user is a member
    const targetMembership = guild.memberships.find(m => m.userId === targetUserId);
    if (!targetMembership) {
      throw new Error('User is not a member of this guild');
    }

    // Validate role
    const validRoles = ['OWNER', 'ADMIN', 'MEMBER'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    // If changing to OWNER, update the current owner to ADMIN
    if (role === 'OWNER') {
      await prisma.guildMembership.updateMany({
        where: {
          guildId,
          role: 'OWNER'
        },
        data: {
          role: 'ADMIN'
        }
      });
    }

    // Update membership
    return prisma.guildMembership.update({
      where: {
        userId_guildId: {
          userId: targetUserId,
          guildId
        }
      },
      data: {
        role
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

    // Reset all user's primary guilds
    await prisma.guildMembership.updateMany({
      where: {
        userId,
        isPrimary: true
      },
      data: {
        isPrimary: false
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
        isPrimary: true
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
      role: m.role,
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
        uniqueUserGuild: { // Using the compound unique key name from schema.prisma
          userId,
          guildId,
        },
      },
    });

    if (!membership) {
      // Or, instead of throwing, one could return a default object indicating no membership/permissions
      // For now, throwing an error aligns with typical API behavior for unauthorized access/not found resources.
      throw new Error('User not a member of this guild');
    }

    const role = membership.role;
    const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

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
      role,
      permissions,
    };
  }
}

module.exports = new GuildService(); 