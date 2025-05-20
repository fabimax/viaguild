import {
  PrismaClient,
  User, Guild, Cluster,
  BadgeInstance,
  UserBadgeCase, GuildBadgeCase, ClusterBadgeCase, // The cases
  UserBadgeItem, GuildBadgeItem, ClusterBadgeItem, // The case items (join tables)
  BadgeAwardStatus
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { TEST_USER_PRIME_USERNAME } from './users';
import { SPECIAL_GUILD_NAME } from './guilds';

// Helper function to get a subset of items and assign displayOrder
function prepareCaseItems<T extends { id: string }>(
  badgeInstances: T[], 
  maxItems: number = 5
): Array<{ badgeInstanceId: string; displayOrder: number }> {
  return faker.helpers.shuffle(badgeInstances)
    .slice(0, Math.min(badgeInstances.length, maxItems))
    .map((instance, index) => ({
      badgeInstanceId: instance.id,
      displayOrder: index,
    }));
}

export async function seedBadgeCases(prisma: PrismaClient) {
  console.log('🌱 Seeding badge cases and their items...');

  // --- 1. Fetch Prerequisites ---
  const testUserPrime = await prisma.user.findUnique({ where: { username: TEST_USER_PRIME_USERNAME }, select: {id: true, username: true} });
  const specialGuild = await prisma.guild.findUnique({ where: { name: SPECIAL_GUILD_NAME }, select: {id: true, name: true} });
  
  // For cluster, let's assume TheNexusHub might be in one, or pick a general one
  // This part might need adjustment based on how guildClusterAssignments are seeded
  let nexusHubCluster: { id: string, name: string } | null = null;
  if (specialGuild) {
    const assignment = await prisma.clusterMembership.findFirst({
        where: { guildId: specialGuild.id },
        select: { cluster: {select: {id: true, name: true}} }
    });
    if (assignment && assignment.cluster) nexusHubCluster = assignment.cluster;
  }
  if (!nexusHubCluster) {
    // Fallback to the first cluster if TheNexusHub isn't in one or no special guild
    nexusHubCluster = await prisma.cluster.findFirst({select: {id: true, name: true}});
    if (nexusHubCluster) {
        console.warn(`   ⚠️ Using first available cluster (${nexusHubCluster.name}) for TheNexusHub related cluster badge case seeding.`);
    } else {
      console.warn(`   ⚠️ No clusters found at all. Cannot seed cluster badge case.`);
    }
  }

  // Log identified cluster for debugging
  if (nexusHubCluster) {
    console.log(`[badgeCases.ts] Identified nexusHubPrimaryCluster for seeding: ID=${nexusHubCluster.id}, Name=${nexusHubCluster.name}`);
  } else {
    console.log('[badgeCases.ts] nexusHubPrimaryCluster could NOT be identified for seeding.');
  }

  let totalCasesCreated = 0;
  let totalItemsAdded = 0;

  // --- 2. Seed UserBadgeCase for TestUserPrime ---
  if (testUserPrime) {
    const userInstances = await prisma.badgeInstance.findMany({
      where: { userReceiverId: testUserPrime.id, awardStatus: BadgeAwardStatus.ACCEPTED },
      select: { id: true },
      take: 10, // Take a sample of accepted badges
    });

    if (userInstances.length > 0) {
      const userCase = await prisma.userBadgeCase.upsert({
        where: { userId: testUserPrime.id },
        update: { title: `${testUserPrime.username}'s Accolades` },
        create: {
          userId: testUserPrime.id,
          title: `${testUserPrime.username}'s Accolades`,
          isPublic: true,
        },
      });
      totalCasesCreated++;

      // Clear existing items for this case and re-add
      await prisma.userBadgeItem.deleteMany({ where: { badgeCaseId: userCase.id } });
      const itemsToCreate = prepareCaseItems(userInstances, 5); // Showcase up to 5
      if (itemsToCreate.length > 0) {
        await prisma.userBadgeItem.createMany({
          data: itemsToCreate.map(item => ({ ...item, badgeCaseId: userCase.id })),
        });
        totalItemsAdded += itemsToCreate.length;
        console.log(`   Populated UserBadgeCase for ${testUserPrime.username} with ${itemsToCreate.length} items.`);
      }
    }
  }

  // --- 3. Seed GuildBadgeCase for TheNexusHub ---
  if (specialGuild) {
    const guildInstances = await prisma.badgeInstance.findMany({
      where: { guildReceiverId: specialGuild.id, awardStatus: BadgeAwardStatus.ACCEPTED },
      select: { id: true },
      take: 10,
    });

    if (guildInstances.length > 0) {
      const guildCase = await prisma.guildBadgeCase.upsert({
        where: { guildId: specialGuild.id },
        update: { title: `${specialGuild.name} - Hall of Fame` },
        create: {
          guildId: specialGuild.id,
          title: `${specialGuild.name} - Hall of Fame`,
          isPublic: true,
        },
      });
      totalCasesCreated++;

      await prisma.guildBadgeItem.deleteMany({ where: { badgeCaseId: guildCase.id } });
      const itemsToCreate = prepareCaseItems(guildInstances, 7); // Showcase up to 7
      if (itemsToCreate.length > 0) {
        await prisma.guildBadgeItem.createMany({
          data: itemsToCreate.map(item => ({ ...item, badgeCaseId: guildCase.id })),
        });
        totalItemsAdded += itemsToCreate.length;
        // Set a featured badge if items were added
        const firstItem = await prisma.guildBadgeItem.findFirst({where: {badgeCaseId: guildCase.id}, select: {id:true}}); 
        if(firstItem){
            await prisma.guildBadgeCase.update({where: {id: guildCase.id}, data: {featuredBadgeId: firstItem.id}});
        }
        console.log(`   Populated GuildBadgeCase for ${specialGuild.name} with ${itemsToCreate.length} items.`);
      }
    }
  }

  // --- 4. Seed ClusterBadgeCase for TheNexusHub's Primary Cluster (if found) ---
  if (nexusHubCluster) {
    const clusterInstances = await prisma.badgeInstance.findMany({
      where: { clusterReceiverId: nexusHubCluster.id, awardStatus: BadgeAwardStatus.ACCEPTED },
      select: { id: true },
      take: 10,
    });
    console.log(`[badgeCases.ts] Found ${clusterInstances.length} ACCEPTED badges for cluster ${nexusHubCluster.name} (ID: ${nexusHubCluster.id})`);

    if (clusterInstances.length > 0) {
      const clusterCase = await prisma.clusterBadgeCase.upsert({
        where: { clusterId: nexusHubCluster.id },
        update: { title: `Triumphs of ${nexusHubCluster.name}` },
        create: {
          clusterId: nexusHubCluster.id,
          title: `Triumphs of ${nexusHubCluster.name}`,
          isPublic: true,
        },
      });
      totalCasesCreated++;

      await prisma.clusterBadgeItem.deleteMany({ where: { badgeCaseId: clusterCase.id } });
      const itemsToCreate = prepareCaseItems(clusterInstances, 6); // Showcase up to 6
      if (itemsToCreate.length > 0) {
        await prisma.clusterBadgeItem.createMany({
          data: itemsToCreate.map(item => ({ ...item, badgeCaseId: clusterCase.id })),
        });
        totalItemsAdded += itemsToCreate.length;
        const firstItem = await prisma.clusterBadgeItem.findFirst({where: {badgeCaseId: clusterCase.id}, select: {id:true}}); 
        if(firstItem){
            await prisma.clusterBadgeCase.update({where: {id: clusterCase.id}, data: {featuredBadgeId: firstItem.id}});
        }
        console.log(`   Populated ClusterBadgeCase for ${nexusHubCluster.name} with ${itemsToCreate.length} items.`);
      }
    }
  }
  
  // TODO: Optionally add cases for a few other random users/guilds/clusters to have more populated showcases.

  console.log(`✅ Badge cases seeding finished. ${totalCasesCreated} cases created/updated, ${totalItemsAdded} items added.`);
} 