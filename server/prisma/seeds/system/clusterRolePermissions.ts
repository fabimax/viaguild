import { PrismaClient } from '@prisma/client';

/**
 * Seeds the database with default permissions for system roles specific to Clusters.
 * This script is idempotent.
 */
export async function seedClusterRolePermissions(prisma: PrismaClient) {
  console.log('🔗 Seeding default permissions for Cluster system roles...');

  const clusterRolesWithPermissions: Array<{ roleName: string; permissionKeys: string[] }> = [
    {
      roleName: 'CLUSTER_CREATOR',
      permissionKeys: [
        'CLUSTER_EDIT_DETAILS',
        'CLUSTER_MANAGE_MEMBERSHIP',
        'CLUSTER_ROLE_MANAGE_PERMISSIONS',
        'CLUSTER_DISBAND',
        'CLUSTER_VIEW_AUDIT_LOG',
        'CLUSTER_MANAGE_CONTACTS',
        'CLUSTER_BADGE_CASE_EDIT_DETAILS',
        'CLUSTER_BADGE_CASE_ADD_BADGE',
        'CLUSTER_BADGE_CASE_REMOVE_BADGE',
        'CLUSTER_BADGE_CASE_REORDER_BADGES',
        'CLUSTER_BADGE_CASE_SET_FEATURED',
      ],
    },
    {
      roleName: 'CLUSTER_ADMIN',
      permissionKeys: [
        'CLUSTER_EDIT_DETAILS',
        'CLUSTER_MANAGE_MEMBERSHIP',
        'CLUSTER_VIEW_AUDIT_LOG',
        'CLUSTER_MANAGE_CONTACTS',
        'CLUSTER_BADGE_CASE_EDIT_DETAILS',
        'CLUSTER_BADGE_CASE_ADD_BADGE',
        'CLUSTER_BADGE_CASE_REMOVE_BADGE',
        'CLUSTER_BADGE_CASE_REORDER_BADGES',
        'CLUSTER_BADGE_CASE_SET_FEATURED',
      ],
    },
    {
      roleName: 'CLUSTER_MODERATOR',
      permissionKeys: [
        'CLUSTER_MANAGE_MEMBERSHIP', // Primarily focused on member management
        'CLUSTER_VIEW_AUDIT_LOG',    // Can see logs
      ],
    },
  ];

  for (const { roleName, permissionKeys } of clusterRolesWithPermissions) {
    // Find the system cluster role template (clusterId is null)
    const clusterSystemRole = await prisma.clusterRole.findFirst({
      where: { name: roleName, isSystemRole: true, clusterId: null },
      select: { id: true },
    });

    if (!clusterSystemRole) {
      console.warn(`   ⚠️ Cluster system role template "${roleName}" not found. Skipping permission assignment. Ensure cluster system roles are seeded first.`);
      continue;
    }

    const permissionsToAssign = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true, key: true }, // Select key for logging
    });

    if (permissionsToAssign.length !== permissionKeys.length) {
      const foundKeys = permissionsToAssign.map(p => p.key);
      const missingKeys = permissionKeys.filter(k => !foundKeys.includes(k));
      // Filter out the explicitly removed key from missingKeys warning if it was there
      const trulyMissingKeys = missingKeys.filter(k => k !== 'CLUSTER_REVOKE_DIRECT_GUILD_INVITATION');
      if (trulyMissingKeys.length > 0) {
         console.warn(`   ⚠️ For cluster system role "${roleName}", could not find all specified permissions. Missing: ${trulyMissingKeys.join(', ')}. Ensure all permissions are seeded first.`);
      }
    }

    let assignedCount = 0;
    for (const permission of permissionsToAssign) {
      try {
        await prisma.clusterRolePermission.upsert({
          where: {
            clusterRoleId_permissionId: {
              clusterRoleId: clusterSystemRole.id,
              permissionId: permission.id,
            },
          },
          create: {
            clusterRoleId: clusterSystemRole.id,
            permissionId: permission.id,
          },
          update: {},
        });
        assignedCount++;
      } catch (error: any) {
        console.error(`   Error assigning permission "${permission.key}" to cluster system role "${roleName}":`, error.message);
      }
    }
    if (assignedCount > 0) {
        console.log(`   Assigned/verified ${assignedCount} permissions for cluster system role: ${roleName}`);
    }
  }
  console.log('✅ Default Cluster system role permissions seeding process completed.');
}

// Example of how this might be called from your main seed file:
/*
import { PrismaClient } from '@prisma/client';
import { seedClusterRolePermissions } from './system/clusterRolePermissions'; // Adjust path as needed

const prisma = new PrismaClient();

async function main() {
  try {
    await seedClusterRolePermissions(prisma);
  } catch (e) {
    console.error('Error seeding cluster role permissions:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
*/ 