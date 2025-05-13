import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seeds/users';
import { seedGuilds } from './seeds/guilds';
import { seedPermissions } from './seeds/system/permissions';
import { seedSystemRoles } from './seeds/system/systemRoles';
import { seedRolePermissions } from './seeds/system/rolePermissions';
import { seedClusterSystemRoles } from './seeds/system/clusterSystemRoles';
import { seedClusterRolePermissions } from './seeds/system/clusterRolePermissions';
import { seedMemberships } from './seeds/memberships';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed process...');
  
  await seedUsers(prisma);
  await seedGuilds(prisma);
  
  // System setup in order
  await seedPermissions(prisma);       // Defines all possible actions
  
  // Guild System Roles & Permissions
  await seedSystemRoles(prisma);       // Creates global system roles (CREATOR, ADMIN, MODERATOR, MEMBER)
  await seedRolePermissions(prisma);   // Assigns default permissions to those system roles for guilds

  // Cluster System Roles & Permissions
  await seedClusterSystemRoles(prisma);      // Defines global system role templates for clusters (CLUSTER_CREATOR, etc.)
  await seedClusterRolePermissions(prisma);  // Assigns default permissions to cluster system role templates
  
  await seedMemberships(prisma);       // Creates guild memberships with roles assigned
  
  console.log('✅ Seed completed successfully');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });