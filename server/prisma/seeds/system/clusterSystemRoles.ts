import { PrismaClient } from '@prisma/client';

/**
 * Seeds the database with default system roles for Clusters.
 * These roles are templates that can be assigned within specific clusters.
 * The cluster creator is typically assigned a role equivalent to CLUSTER_CREATOR for their cluster.
 * This script is idempotent.
 */
export async function seedClusterSystemRoles(prisma: PrismaClient) {
  console.log('🌱 Seeding Cluster system role definitions...');

  // Define only the role names and descriptions here
  const clusterSystemRolesData = [
    {
      name: 'CLUSTER_CREATOR',
      description: 'Full control over a cluster. Typically the user who created the cluster.',
      isSystemRole: true,
    },
    {
      name: 'CLUSTER_ADMIN',
      description: 'Broad administrative control over a cluster. Can manage members, content, and settings.',
      isSystemRole: true,
    },
    {
      name: 'CLUSTER_MODERATOR',
      description: 'Can manage cluster members and related content, with limited settings control.',
      isSystemRole: true,
    },
  ];

  for (const roleData of clusterSystemRolesData) {
    const nameCi = roleData.name.toLowerCase();
    let systemClusterRole = await prisma.clusterRole.findFirst({
        where: { 
          name_ci: nameCi,
          isSystemRole: true,
          clusterId: null
        },
    });

    if (!systemClusterRole) {
        systemClusterRole = await prisma.clusterRole.create({
            data: {
                name: roleData.name,
                name_ci: nameCi,
                description: roleData.description,
                isSystemRole: true,
                clusterId: null, //System roles are global (clusterId: null)
            },
        });
        console.log(`   Created cluster system role definition: ${systemClusterRole.name}`);
    } else {
        if (systemClusterRole.description !== roleData.description) {
            systemClusterRole = await prisma.clusterRole.update({
                where: { id: systemClusterRole.id },
                data: { description: roleData.description },
            });
            console.log(`   Updated description for cluster system role definition: ${systemClusterRole.name}`);
        }
        console.log(`   Cluster system role definition ${systemClusterRole.name} already exists.`);
    }
  }

  console.log('✅ Cluster system role definitions seeding process completed.');
}

// Example of how this might be called from your main seed file:
/*
import { PrismaClient } from '@prisma/client';
import { seedClusterSystemRoles } from './system/clusterSystemRoles'; // Adjust path as needed

const prisma = new PrismaClient();

async function main() {
  try {
    await seedClusterSystemRoles(prisma);
  } catch (e) {
    console.error('Error seeding cluster system role definitions:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
*/ 