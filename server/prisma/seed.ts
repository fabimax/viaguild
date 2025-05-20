import { PrismaClient } from '@prisma/client';
import { seedUsers, TEST_USER_PRIME_USERNAME } from './seeds/users';
import { seedGuilds, SPECIAL_GUILD_NAME } from './seeds/guilds';
import { seedSystemIcons } from './seeds/system/systemIcons';
import { seedUploadedAssets, seededUploadedAssets } from './seeds/uploadedAssets';
import { seedBadgeTemplates } from './seeds/badgeTemplates';
import { seedUserBadgeAllocations } from './seeds/userBadgeAllocations';
import { seedBadgeInstances } from './seeds/badgeInstances';
import { seedBadgeCases } from './seeds/badgeCases';
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
  await seedGuilds(prisma);
  
  // System setup & assets needed by badges
  await seedSystemIcons(prisma);
  await seedUploadedAssets(prisma);
  await seedPermissions(prisma);
  await seedSystemRoles(prisma);
  await seedRolePermissions(prisma);
  await seedClusterSystemRoles(prisma);
  await seedClusterRolePermissions(prisma);
  
  // Now seed core entities that might use system roles (like Cluster needing CLUSTER_CREATOR)
  await seedClusters(prisma);

  // Badge System - Foundational (Templates)
  await seedBadgeTemplates(prisma);

  await seedUserBadgeAllocations(prisma);
  
  // Guild specific relations and assignments (These should come BEFORE memberships if memberships depend on them)
  await seedGuildCategoryAssignments(prisma); // Guilds to Categories - MOVED EARLIER
  await seedGuildClusterAssignments(prisma);  // Guilds to Clusters (and primary cluster for guild)
  await seedGuildBans(prisma);
  await seedGuildRelationships(prisma);

  // Memberships and then custom roles that might alter memberships or depend on them
  await seedMemberships(prisma);              // Now runs AFTER guild-category assignments
  await seedCustomGuildRoles(prisma);
  await seedCustomClusterRoles(prisma);
  
  // Badge System - Usage (Instances & Cases)
  console.log('🌱 Seeding BadgeInstances & InstanceMetadataValues...');
  await seedBadgeInstances(prisma);     // Depends on all above, especially BadgeTemplates, Users, Guilds
  console.log('🌱 Seeding BadgeCases & Items...');
  await seedBadgeCases(prisma);         // Depends on BadgeInstances, Users, Guilds, Clusters
  
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