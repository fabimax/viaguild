import { PrismaClient } from '@prisma/client';

/**
 * Seeds the database with default permissions for system roles.
 * This script is idempotent.
 */
export async function seedRolePermissions(prisma: PrismaClient) {
  console.log('🔗 Seeding default role permissions for system roles...');

  const rolesWithPermissions: Array<{ roleName: string; permissionKeys: string[] }> = [
    {
      roleName: 'OWNER',
      permissionKeys: [
        'GUILD_VIEW_SETTINGS', 'GUILD_EDIT_DETAILS', 'GUILD_MANAGE_RELATIONSHIPS', 'GUILD_MANAGE_CONTACTS', 'GUILD_DISBAND', 'GUILD_VIEW_AUDIT_LOG',
        'GUILD_INVITE_MEMBER', 'GUILD_ACCEPT_JOIN_REQUEST', 'GUILD_KICK_MEMBER', 'GUILD_BAN_MEMBER', 'GUILD_VIEW_MEMBERSHIP_DETAILS',
        'GUILD_ROLE_ASSIGN', 'GUILD_ROLE_CREATE_CUSTOM', 'GUILD_ROLE_EDIT_CUSTOM', 'GUILD_ROLE_DELETE_CUSTOM', 'GUILD_ROLE_MANAGE_PERMISSIONS', 'GUILD_MEMBER_RANK_SET',
        'GUILD_BADGE_TEMPLATE_CREATE', 'GUILD_BADGE_TEMPLATE_EDIT', 'GUILD_BADGE_TEMPLATE_DELETE',
        'GUILD_BADGE_ASSIGN_TO_MEMBER', 'GUILD_BADGE_ASSIGN_TO_USER_EXTERNAL', 'GUILD_BADGE_ASSIGN_TO_OTHER_GUILD', 'GUILD_BADGE_REVOKE_GIVEN',
        'GUILD_BADGE_CASE_EDIT_DETAILS', 'GUILD_BADGE_CASE_ADD_BADGE', 'GUILD_BADGE_CASE_REMOVE_BADGE', 'GUILD_BADGE_CASE_REORDER_BADGES', 'GUILD_BADGE_CASE_SET_FEATURED',
        'GUILD_MANAGE_CATEGORIES',
      ],
    },
    {
      roleName: 'ADMIN',
      permissionKeys: [
        'GUILD_VIEW_SETTINGS', 'GUILD_EDIT_DETAILS', 'GUILD_MANAGE_RELATIONSHIPS', 'GUILD_MANAGE_CONTACTS', 'GUILD_VIEW_AUDIT_LOG',
        'GUILD_INVITE_MEMBER', 'GUILD_ACCEPT_JOIN_REQUEST', 'GUILD_KICK_MEMBER', 'GUILD_BAN_MEMBER', 'GUILD_VIEW_MEMBERSHIP_DETAILS',
        'GUILD_ROLE_ASSIGN', 'GUILD_ROLE_CREATE_CUSTOM', 'GUILD_ROLE_EDIT_CUSTOM', 'GUILD_ROLE_DELETE_CUSTOM', 'GUILD_MEMBER_RANK_SET',
        'GUILD_BADGE_TEMPLATE_CREATE', 'GUILD_BADGE_TEMPLATE_EDIT', 'GUILD_BADGE_TEMPLATE_DELETE',
        'GUILD_BADGE_ASSIGN_TO_MEMBER', 'GUILD_BADGE_ASSIGN_TO_USER_EXTERNAL', 'GUILD_BADGE_ASSIGN_TO_OTHER_GUILD', 'GUILD_BADGE_REVOKE_GIVEN',
        'GUILD_BADGE_CASE_EDIT_DETAILS', 'GUILD_BADGE_CASE_ADD_BADGE', 'GUILD_BADGE_CASE_REMOVE_BADGE', 'GUILD_BADGE_CASE_REORDER_BADGES', 'GUILD_BADGE_CASE_SET_FEATURED',
        'GUILD_MANAGE_CATEGORIES',
      ],
    },
    {
      roleName: 'MODERATOR',
      permissionKeys: [
        'GUILD_VIEW_SETTINGS',
        'GUILD_INVITE_MEMBER', 'GUILD_ACCEPT_JOIN_REQUEST', 'GUILD_KICK_MEMBER', 'GUILD_VIEW_MEMBERSHIP_DETAILS',
      ],
    },
    {
      roleName: 'MEMBER',
      permissionKeys: [
        'GUILD_VIEW_SETTINGS',
        'GUILD_VIEW_MEMBERSHIP_DETAILS',
      ],
    },
  ];

  for (const { roleName, permissionKeys } of rolesWithPermissions) {
    const role = await prisma.role.findFirst({
      where: { name: roleName, isSystemRole: true, guildId: null },
      select: { id: true },
    });

    if (!role) {
      console.warn(`   ⚠️ System role "${roleName}" not found. Skipping permission assignment for it.`);
      continue;
    }

    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true, key: true }, // Select key for logging
    });

    if (permissions.length !== permissionKeys.length) {
      const foundKeys = permissions.map(p => p.key);
      const missingKeys = permissionKeys.filter(k => !foundKeys.includes(k));
      console.warn(`   ⚠️ For role "${roleName}", could not find all specified permissions. Missing: ${missingKeys.join(', ')}. Please ensure all permissions are seeded first.`);
    }

    let assignedCount = 0;
    for (const permission of permissions) {
      try {
        await prisma.rolePermission.upsert({
          where: { 
            roleId_permissionId: { // Ensure your @@unique constraint is named this way or adjust
              roleId: role.id,
              permissionId: permission.id,
            }
          },
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
          update: {},
        });
        assignedCount++;
      } catch (error: any) {
        console.error(`   Error assigning permission "${permission.key}" to role "${roleName}":`, error);
      }
    }
    if (assignedCount > 0) {
        console.log(`   Assigned/verified ${assignedCount} permissions for system role: ${roleName}`);
    }
  }
  console.log('✅ Default role permissions seeding process completed.');
}

// To run this script directly:
// npx ts-node server/prisma/seeds/system/rolePermissions.ts
/*
async function main() {
  const prisma = new PrismaClient();
  try {
    await seedRolePermissions(prisma);
  } catch (e) {
    console.error('Error seeding role permissions:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
// main();
*/ 