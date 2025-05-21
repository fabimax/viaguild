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
          uniqueUserGuildMembership: { // Based on @@unique([userId, guildId], name: "uniqueUserGuildMembership")
            userId,
            guildId
          }
        },
        include: {
          assignedRoles: { // Fetch the list of UserGuildRole entries
            include: {
              role: { // For each UserGuildRole, include the actual Role
                select: { name: true }, // And select its name
              },
            },
          },
        },
      });
      
      // Check if user is a member of the guild
      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this guild' });
      }
      
      const userRoles = membership.assignedRoles.map(assignedRole => assignedRole.role.name);
      const hasRequiredRole = userRoles.some(roleName => allowedRoles.includes(roleName));

      if (!hasRequiredRole) {
        return res.status(403).json({ 
          error: `This action requires one of the following roles: ${allowedRoles.join(', ')}` 
        });
      }
      
      // Store membership in request for potential future use
      req.guildMembership = membership; // Membership now includes assignedRoles
      
      // User has required role, proceed
      next();
    } catch (error) {
      // Log the error for debugging purposes on the server
      console.error('Error in hasGuildRole middleware:', error);
      // Pass a generic error to the client or use a centralized error handler
      next(new Error('An internal server error occurred while checking permissions.'));
    }
  };
};

/**
 * Middleware to check if user is the guild founder
 */
const isGuildFounder = hasGuildRole(['FOUNDER']);

/**
 * Middleware to check if user is an admin or founder
 */
const isGuildAdmin = hasGuildRole(['FOUNDER', 'ADMIN']);

/**
 * Middleware to check if user is a moderator, admin, or founder
 */
const isGuildModerator = hasGuildRole(['FOUNDER', 'ADMIN', 'MODERATOR']);

/**
 * Middleware to check if user is a member of the guild (includes any assigned role)
 * For specific member checks, use hasGuildRole(['FOUNDER', 'ADMIN', 'MODERATOR', 'MEMBER', 'ANY_CUSTOM_ROLE_NAME'])
 * This broad check confirms they have *a* role, effectively making them a member.
 * If you need to ensure they are at least a 'MEMBER' level or higher (including custom roles that might be less privileged),
 * this check might need refinement or rely on application logic post-middleware.
 * For now, assuming any assigned role makes them a "member" for basic access.
 */
const isGuildMember = (req, res, next) => {
  // This middleware will effectively check if a user has *any* role in the guild.
  // If a user has a GuildMembership record and at least one UserGuildRole,
  // the hasGuildRole([]) check would be problematic.
  // Instead, we rely on the fact that if hasGuildRole passes with specific roles, they are a member.
  // A more direct "is member" check might just verify existence of GuildMembership
  // if the goal is *only* to check membership, not specific role privileges.
  // However, to fit the pattern, we list common roles.
  // The `hasGuildRole` function will verify against the provided list.
  // If `allowedRoles` is very broad, it becomes more of an "is active in guild" check.
  return hasGuildRole(['FOUNDER', 'ADMIN', 'MODERATOR', 'MEMBER'])(req, res, next);
  // Note: If you have custom roles and want to ensure a user is at least a "MEMBER",
  // you'd list all roles that satisfy that condition. The current `hasGuildRole` checks
  // if *any* of the user's roles are in the `allowedRoles` list.
};

module.exports = {
  hasGuildRole,
  isGuildFounder, // Renamed from isGuildOwner
  isGuildAdmin,
  isGuildModerator, // New specific check
  isGuildMember
}; 