import { PrismaClient } from '@prisma/client';

/**
 * Seeds the database with a comprehensive list of system permissions.
 * Permissions are organized into groups for clarity.
 * This script is idempotent.
 */
export async function seedPermissions(prisma: PrismaClient) {
  console.log('🔑 Seeding system permissions...');

  const permissionsToSeed = [
    // I. Guild Management Permissions
    {
      key: 'GUILD_VIEW_SETTINGS',
      description: 'Can see guild settings',
      permissionGroup: 'Guild Management',
    },
    {
      key: 'GUILD_EDIT_DETAILS',
      description: 'Change guild name, description, avatar, display name, open/closed status',
      permissionGroup: 'Guild Management',
    },
    {
      key: 'GUILD_MANAGE_RELATIONSHIPS',
      description: 'Add/remove parent/child/partner/rival/etc guilds',
      permissionGroup: 'Guild Management',
    },
    {
      key: 'GUILD_MANAGE_CONTACTS',
      description: 'Add/edit/remove guild contact links',
      permissionGroup: 'Guild Management',
    },
    {
      key: 'GUILD_DISBAND',
      description: 'Delete the guild',
      permissionGroup: 'Guild Management',
    },
    {
      key: 'GUILD_VIEW_AUDIT_LOG',
      description: 'View guild audit logs',
      permissionGroup: 'Guild Management',
    },

    // II. Guild Member Management Permissions
    {
      key: 'GUILD_INVITE_MEMBER',
      description: 'Send invitations to join guild',
      permissionGroup: 'Member Management',
    },
    {
      key: 'GUILD_MANAGE_JOIN_REQUESTS',
      description: 'View, approve, or deny requests from users to join the guild',
      permissionGroup: 'Member Management',
    },
    {
      key: 'GUILD_REVOKE_DIRECT_INVITATION',
      description: 'Revoke a pending direct invitation to the guild',
      permissionGroup: 'Member Management',
    },
    {
      key: 'GUILD_CREATE_INVITATION_LINK',
      description: 'Create a new shareable invitation link for the guild',
      permissionGroup: 'Member Management',
    },
    {
      key: 'GUILD_MANAGE_INVITATION_LINKS',
      description: 'View and revoke invitation links for the guild',
      permissionGroup: 'Member Management',
    },
    {
      key: 'GUILD_KICK_MEMBER',
      description: 'Remove a member from the guild',
      permissionGroup: 'Member Management',
    },
    {
      key: 'GUILD_BAN_MEMBER',
      description: 'Ban a user from the guild and prevent rejoining',
      permissionGroup: 'Member Management',
    },
    {
      key: 'GUILD_VIEW_MEMBERSHIP_DETAILS',
      description: 'See detailed info about members (join date, rank, etc.)',
      permissionGroup: 'Member Management',
    },

    // III. Guild Role & Rank Management Permissions
    {
      key: 'GUILD_ROLE_ASSIGN',
      description: 'Assign a role to a guild member',
      permissionGroup: 'Role & Rank Management',
    },
    {
      key: 'GUILD_ROLE_CREATE_CUSTOM',
      description: 'Define a new custom role for this guild',
      permissionGroup: 'Role & Rank Management',
    },
    {
      key: 'GUILD_ROLE_EDIT_CUSTOM',
      description: "Modify a custom role's name/description for this guild",
      permissionGroup: 'Role & Rank Management',
    },
    {
      key: 'GUILD_ROLE_DELETE_CUSTOM',
      description: 'Delete a custom role for this guild',
      permissionGroup: 'Role & Rank Management',
    },
    {
      key: 'GUILD_ROLE_MANAGE_PERMISSIONS',
      description: 'Add/remove permissions to/from a role within the guild',
      permissionGroup: 'Role & Rank Management',
    },
    {
      key: 'GUILD_MEMBER_RANK_SET',
      description: 'Assign/change the S-E rank of a guild member',
      permissionGroup: 'Role & Rank Management',
    },

    // IV. Badge Template & Creation Permissions (Guild context)
    {
      key: 'GUILD_BADGE_TEMPLATE_CREATE',
      description: 'Allow guild to create new badge templates associated with the guild',
      permissionGroup: 'Badge Management (Guild)',
    },
    {
      key: 'GUILD_BADGE_TEMPLATE_EDIT',
      description: 'Edit guild-associated badge templates',
      permissionGroup: 'Badge Management (Guild)',
    },
    {
      key: 'GUILD_BADGE_TEMPLATE_DELETE',
      description: 'Delete guild-associated badge templates',
      permissionGroup: 'Badge Management (Guild)',
    },

    // V. Badge Instance & Assignment Permissions (Guild context)
    {
      key: 'GUILD_BADGE_ASSIGN_TO_MEMBER',
      description: 'Guild as an entity gives a badge to one of its members',
      permissionGroup: 'Badge Management (Guild)',
    },
    {
      key: 'GUILD_BADGE_ASSIGN_TO_USER_EXTERNAL',
      description: 'Guild gives a badge to a user not in the guild',
      permissionGroup: 'Badge Management (Guild)',
    },
    {
      key: 'GUILD_BADGE_ASSIGN_TO_OTHER_GUILD',
      description: 'Guild gives a badge to another guild',
      permissionGroup: 'Badge Management (Guild)',
    },
    {
      key: 'GUILD_BADGE_REVOKE_GIVEN',
      description: 'Guild revokes a badge it previously gave',
      permissionGroup: 'Badge Management (Guild)',
    },

    // VI. Guild Badge Case Management Permissions
    {
      key: 'GUILD_BADGE_CASE_EDIT_DETAILS',
      description: "Edit title, public/private status of the guild's badge case",
      permissionGroup: 'Badge Case Management (Guild)',
    },
    {
      key: 'GUILD_BADGE_CASE_ADD_BADGE',
      description: "Guild adds one of its received badges to its showcase",
      permissionGroup: 'Badge Case Management (Guild)',
    },
    {
      key: 'GUILD_BADGE_CASE_REMOVE_BADGE',
      description: "Guild removes a badge from its showcase",
      permissionGroup: 'Badge Case Management (Guild)',
    },
    {
      key: 'GUILD_BADGE_CASE_REORDER_BADGES',
      description: "Change display order in guild's badge case",
      permissionGroup: 'Badge Case Management (Guild)',
    },
    {
      key: 'GUILD_BADGE_CASE_SET_FEATURED',
      description: "Set a featured badge in the guild's badge case",
      permissionGroup: 'Badge Case Management (Guild)',
    },

    // VII. User-Level Permissions (might not all be guild-role controlled)
    {
      key: 'USER_CREATE_BADGE_TEMPLATE',
      description: 'A user creating a general badge template, not tied to a guild',
      permissionGroup: 'Badge Management (User)',
    },
    {
      key: 'USER_ASSIGN_BADGE_FROM_ALLOCATION',
      description: 'User gives a badge from their personal G/S/B allocation',
      permissionGroup: 'Badge Management (User)',
    },
    // Note: USER_EDIT_PROFILE, USER_MANAGE_SOCIAL_ACCOUNTS etc. are intrinsic actions,
    // usually not controlled by this specific permission system but by user ownership.
    // If specific aspects need finer control, they could be added.
    {
      key: 'USER_BADGE_CASE_EDIT_DETAILS',
      description: "User edits their own badge case details",
      permissionGroup: 'Badge Case Management (User)',
    },
    {
      key: 'USER_BADGE_CASE_ADD_BADGE',
      description: "User adds a received badge to their showcase",
      permissionGroup: 'Badge Case Management (User)',
    },
    {
      key: 'USER_BADGE_CASE_REMOVE_BADGE',
      description: "User removes a badge from their showcase",
      permissionGroup: 'Badge Case Management (User)',
    },
    {
      key: 'USER_BADGE_CASE_REORDER_BADGES',
      description: "User reorders badges in their showcase",
      permissionGroup: 'Badge Case Management (User)',
    },

    // VIII. Category Management Permissions
    {
      key: 'GUILD_MANAGE_CATEGORIES',
      description: 'Guild can add/remove itself from categories',
      permissionGroup: 'Category Management',
    },
    {
      key: 'CATEGORY_CREATE_SYSTEM',
      description: 'System admin can create system-level categories',
      permissionGroup: 'Category Management (System)',
    },
    {
      key: 'CATEGORY_EDIT_SYSTEM',
      description: 'System admin can edit system-level categories',
      permissionGroup: 'Category Management (System)',
    },
    {
      key: 'CATEGORY_DELETE_SYSTEM',
      description: 'System admin can delete system-level categories',
      permissionGroup: 'Category Management (System)',
    },
    {
      key: 'CATEGORY_CREATE_USER',
      description: 'User can create a new category (if feature enabled)',
      permissionGroup: 'Category Management (User)',
    },
    {
      key: 'CATEGORY_EDIT_OWN',
      description: 'User can edit categories they created',
      permissionGroup: 'Category Management (User)',
    },
    {
      key: 'CATEGORY_DELETE_OWN',
      description: 'User can delete categories they created',
      permissionGroup: 'Category Management (User)',
    },

    // IX. System-Level Permissions (For Super Admins)
    {
      key: 'SYSTEM_MANAGE_USERS',
      description: 'System admin can manage all user accounts',
      permissionGroup: 'System Administration',
    },
    {
      key: 'SYSTEM_MANAGE_GUILDS',
      description: 'System admin can manage all guilds',
      permissionGroup: 'System Administration',
    },
    {
      key: 'SYSTEM_MANAGE_ROLES_PERMISSIONS',
      description: 'System admin can manage all roles and their permissions, including system roles',
      permissionGroup: 'System Administration',
    },
    {
      key: 'SYSTEM_MANAGE_BADGES_GLOBAL',
      description: 'System admin can manage all badge templates and instances globally',
      permissionGroup: 'System Administration',
    },
    {
      key: 'SYSTEM_MANAGE_CATEGORIES_GLOBAL',
      description: 'System admin can manage all categories globally',
      permissionGroup: 'System Administration',
    },
    {
      key: 'SYSTEM_VIEW_GLOBAL_ANALYTICS',
      description: 'System admin can view global platform analytics',
      permissionGroup: 'System Administration',
    },

    // X. Cluster Management (User) - Permissions for users to create and manage clusters they own/administer
    {
      key: 'CLUSTER_CREATE',
      description: 'Allows a user to create a new cluster of guilds.',
      permissionGroup: 'Cluster Management (User)',
    },
    {
      key: 'CLUSTER_EDIT_DETAILS',
      description: 'Change cluster name, description, avatar, open/invitation-only status for a cluster they manage.',
      permissionGroup: 'Cluster Management (User)',
    },
    {
      key: 'CLUSTER_MANAGE_MEMBERSHIP',
      description: 'Manage guild membership in a cluster, including inviting guilds, revoking pending invitations, accepting/rejecting guild join requests, and removing member guilds from the cluster.',
      permissionGroup: 'Cluster Management (User)',
    },
    {
      key: 'CLUSTER_ROLE_MANAGE_PERMISSIONS',
      description: 'Define roles, assign/manage permissions for those roles, and assign users to roles within a specific cluster they manage.',
      permissionGroup: 'Cluster Management (User)',
    },
    {
      key: 'CLUSTER_DISBAND',
      description: 'Delete a managed cluster. The cluster must be empty of all member guilds before it can be disbanded.',
      permissionGroup: 'Cluster Management (User)',
    },
    {
      key: 'CLUSTER_VIEW_AUDIT_LOG',
      description: 'View audit logs for a managed cluster.',
      permissionGroup: 'Cluster Management (User)',
    },
    {
      key: 'CLUSTER_MANAGE_CONTACTS',
      description: 'Add/edit/remove contact links for a managed cluster.',
      permissionGroup: 'Cluster Management (User)',
    },

    // XI. Cluster Management (Guild) - Permissions for guild leadership to manage their guild's participation in clusters
    {
      key: 'GUILD_MANAGE_CLUSTER_MEMBERSHIP',
      description: 'Allows a guild (via its authorized members) to manage its cluster affiliations, including requesting to join a cluster, responding to cluster invitations, or leaving a cluster.',
      permissionGroup: 'Cluster Management (Guild)',
    },
    {
      key: 'GUILD_SET_PRIMARY_CLUSTER',
      description: 'Allows a guild (via its authorized members) to set or change its primary cluster.',
      permissionGroup: 'Cluster Management (Guild)',
    },

    // XII. Badge Case Management (Cluster) - Permissions for managing a cluster's own badge case
    {
      key: 'CLUSTER_BADGE_CASE_EDIT_DETAILS',
      description: "Edit title, public/private status of the cluster's badge case",
      permissionGroup: 'Badge Case Management (Cluster)',
    },
    {
      key: 'CLUSTER_BADGE_CASE_ADD_BADGE',
      description: "Cluster adds one of its received badges to its showcase",
      permissionGroup: 'Badge Case Management (Cluster)',
    },
    {
      key: 'CLUSTER_BADGE_CASE_REMOVE_BADGE',
      description: "Cluster removes a badge from its showcase",
      permissionGroup: 'Badge Case Management (Cluster)',
    },
    {
      key: 'CLUSTER_BADGE_CASE_REORDER_BADGES',
      description: "Change display order in cluster's badge case",
      permissionGroup: 'Badge Case Management (Cluster)',
    },
    {
      key: 'CLUSTER_BADGE_CASE_SET_FEATURED',
      description: "Set a featured badge in the cluster's badge case",
      permissionGroup: 'Badge Case Management (Cluster)',
    },
  ];

  for (const permData of permissionsToSeed) {
    const existingPermission = await prisma.permission.findUnique({
      where: { key: permData.key },
    });

    if (!existingPermission) {
      await prisma.permission.create({
        data: permData,
      });
      console.log(`   Created permission: ${permData.key}`);
    } else {
      // Optionally update description or group if they differ
      if (existingPermission.description !== permData.description || existingPermission.permissionGroup !== permData.permissionGroup) {
        await prisma.permission.update({
          where: { key: permData.key },
          data: {
            description: permData.description,
            permissionGroup: permData.permissionGroup,
          },
        });
        console.log(`   Updated permission: ${permData.key}`);
      } else { // Added an 'else' block here for clarity
        console.log(`   Permission ${permData.key} already exists and is up to date.`);
      }
    }
  }

  console.log('✅ System permissions seeded successfully.');
}

// To run this script directly:
// npx ts-node server/prisma/seeds/system/permissions.ts
// (Ensure you have a main function or call it from your main seed.ts)

/*
async function main() {
  const prisma = new PrismaClient();
  try {
    await seedPermissions(prisma);
  } catch (e) {
    console.error('Error seeding permissions:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// main(); // Call main if you want to run this file directly
*/