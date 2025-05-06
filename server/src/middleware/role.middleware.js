const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware to check if user has a specific role in a guild
 * @param {Array} allowedRoles - Array of roles allowed to access the resource
 * @returns {Function} Express middleware
 */
const hasGuildRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Get guild ID from params or body
      const guildId = req.params.guildId || req.params.id || req.body.guildId;
      
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      // Get user ID from authenticated request
      const userId = req.user.id;
      
      // Find user's membership in this guild
      const membership = await prisma.guildMembership.findUnique({
        where: {
          userId_guildId: {
            userId,
            guildId
          }
        }
      });
      
      // Check if user is a member of the guild
      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this guild' });
      }
      
      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({ 
          error: `This action requires ${allowedRoles.join(' or ')} role` 
        });
      }
      
      // Store membership in request for potential future use
      req.guildMembership = membership;
      
      // User has required role, proceed
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user is the guild owner
 */
const isGuildOwner = hasGuildRole(['OWNER']);

/**
 * Middleware to check if user is an admin or owner
 */
const isGuildAdmin = hasGuildRole(['OWNER', 'ADMIN']);

/**
 * Middleware to check if user is a member of the guild
 */
const isGuildMember = hasGuildRole(['OWNER', 'ADMIN', 'MEMBER']);

module.exports = {
  hasGuildRole,
  isGuildOwner,
  isGuildAdmin,
  isGuildMember
}; 