import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seeds/users';
import { seedGuilds } from './seeds/guilds';
import { seedCategories } from './seeds/categories';
import { seedClusters } from './seeds/clusters';
import { seedPermissions } from './seeds/system/permissions';
import { seedSystemRoles } from './seeds/system/systemRoles';
import { seedRolePermissions } from './seeds/system/rolePermissions';
import { seedClusterSystemRoles } from './seeds/system/clusterSystemRoles';
import { seedClusterRolePermissions } from './seeds/system/clusterRolePermissions';
import { seedMemberships } from './seeds/memberships';
import { seedCustomGuildRoles } from './seeds/customGuildRoles';
import { seedCustomClusterRoles } from './seeds/customClusterRoles';
import { seedGuildBans } from './seeds/guildBans';
import { seedGuildRelationships } from './seeds/guildRelationships';
import { seedGuildCategoryAssignments } from './seeds/guildCategoryAssignments';
import { seedGuildClusterAssignments } from './seeds/guildClusterAssignments';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed process...');
  
  // Core entities first
  await seedUsers(prisma);
  await seedCategories(prisma);
  await seedClusters(prisma);
  await seedGuilds(prisma);
  
  // System setup in order
  await seedPermissions(prisma);
  await seedSystemRoles(prisma);
  await seedRolePermissions(prisma);
  await seedClusterSystemRoles(prisma);
  await seedClusterRolePermissions(prisma);
  
  // Guild specific relations and assignments (These should come BEFORE memberships if memberships depend on them)
  await seedGuildCategoryAssignments(prisma); // Guilds to Categories - MOVED EARLIER
  await seedGuildClusterAssignments(prisma);  // Guilds to Clusters (and primary cluster for guild)
  await seedGuildBans(prisma);
  await seedGuildRelationships(prisma);

  // Memberships and then custom roles that might alter memberships or depend on them
  await seedMemberships(prisma);              // Now runs AFTER guild-category assignments
  await seedCustomGuildRoles(prisma);
  await seedCustomClusterRoles(prisma);
  
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