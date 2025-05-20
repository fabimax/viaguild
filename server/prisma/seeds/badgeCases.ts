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
function prepareCaseItems<T extends { id: string }>(badgeInstances: T[], count: number ): Array<{ badgeInstanceId: string; displayOrder: number }> {
  return faker.helpers.shuffle(badgeInstances)
    .slice(0, Math.min(badgeInstances.length, count))
    .map((instance, index) => ({
      badgeInstanceId: instance.id,
      displayOrder: index,
    }));
}

export async function seedBadgeCases(prisma: PrismaClient) {
  console.log('🌱 Seeding badge cases and their items (expanded)...');

  // --- 1. Fetch Prerequisites ---
  const testUserPrime = await prisma.user.findUnique({ where: { username: TEST_USER_PRIME_USERNAME }, select: {id: true, username: true} });
  const specialGuild = await prisma.guild.findUnique({ where: { name: SPECIAL_GUILD_NAME }, select: {id: true, name: true} });
  
  let nexusHubPrimaryCluster: { id: string, name: string } | null = null; 
  const cluster1 = await prisma.cluster.findFirst({ where: { name: 'Cluster1'}, select: {id: true, name:true}});
  if (cluster1) {
    nexusHubPrimaryCluster = cluster1;
  } else if (specialGuild) { 
    const assignment = await prisma.clusterMembership.findFirst({ 
        where: { guildId: specialGuild.id },
        select: { cluster: {select: {id: true, name: true}} } 
    });
    if (assignment && assignment.cluster) nexusHubPrimaryCluster = assignment.cluster;
  }
  if (!nexusHubPrimaryCluster) {
    nexusHubPrimaryCluster = await prisma.cluster.findFirst({select: {id: true, name: true}});
    if (nexusHubPrimaryCluster) {
        console.warn(`   ⚠️ Using first available cluster (${nexusHubPrimaryCluster.name}) for TheNexusHub related cluster badge case seeding.`);
    } else {
      console.warn(`   ⚠️ No clusters found at all. Cannot seed initial cluster badge case.`);
    }
  }

  const allUsers = await prisma.user.findMany({ select: { id: true, username: true }, take: 20 }); // Increased take
  const allGuilds = await prisma.guild.findMany({ select: { id: true, name: true }, take: 20 }); // Increased take
  const allClusters = await prisma.cluster.findMany({ select: { id: true, name: true }, take: 10 }); // Increased take

  let totalCasesCreated = 0;
  let totalItemsAdded = 0;
  const increasedTakeAmount = 75; 
  const specialEntityMaxBadgeCaseItems = 15; 

  // --- Seed for TestUserPrime ---
  if (testUserPrime) {
    const userInstances = await prisma.badgeInstance.findMany({
      where: { userReceiverId: testUserPrime.id, awardStatus: BadgeAwardStatus.ACCEPTED },
      select: { id: true },
      take: increasedTakeAmount, 
    });
    // console.log(`[DEBUG] TestUserPrime (${testUserPrime.username}) has ${userInstances.length} accepted badges.`); // Debug line
    if (userInstances.length > 0) {
      const userCase = await prisma.userBadgeCase.upsert({
        where: { userId: testUserPrime.id },
        update: { title: `${testUserPrime.username}'s Grand Collection`, isPublic: true },
        create: { userId: testUserPrime.id, title: `${testUserPrime.username}'s Grand Collection`, isPublic: true },
      });
      if(userCase) totalCasesCreated++;
      await prisma.userBadgeItem.deleteMany({ where: { badgeCaseId: userCase.id } });
      const maxUserItems = Math.min(userInstances.length, specialEntityMaxBadgeCaseItems);
      const itemsToCreate = prepareCaseItems(userInstances, maxUserItems); 
      if (itemsToCreate.length > 0) {
        await prisma.userBadgeItem.createMany({
          data: itemsToCreate.map(item => ({ ...item, badgeCaseId: userCase.id })),
        });
        totalItemsAdded += itemsToCreate.length;
        console.log(`   Populated UserBadgeCase for ${testUserPrime.username} with ${itemsToCreate.length} items.`);
      }
    }
  }

  // --- Seed for SpecialGuild (TheNexusHub) ---
  if (specialGuild) {
    const guildInstances = await prisma.badgeInstance.findMany({
      where: { guildReceiverId: specialGuild.id, awardStatus: BadgeAwardStatus.ACCEPTED },
      select: { id: true },
      take: increasedTakeAmount, 
    });
    // console.log(`[DEBUG] SpecialGuild (${specialGuild.name}) has ${guildInstances.length} accepted badges.`); // Debug line
    if (guildInstances.length > 0) {
      const guildCase = await prisma.guildBadgeCase.upsert({
        where: { guildId: specialGuild.id },
        update: { title: `${specialGuild.name} - The Grand Hall`, isPublic: true },
        create: { guildId: specialGuild.id, title: `${specialGuild.name} - The Grand Hall`, isPublic: true },
      });
      if(guildCase) totalCasesCreated++;
      await prisma.guildBadgeItem.deleteMany({ where: { badgeCaseId: guildCase.id } });
      const maxGuildItems = Math.min(guildInstances.length, specialEntityMaxBadgeCaseItems);
      const itemsToCreate = prepareCaseItems(guildInstances, maxGuildItems); 
      if (itemsToCreate.length > 0) {
        await prisma.guildBadgeItem.createMany({
          data: itemsToCreate.map(item => ({ ...item, badgeCaseId: guildCase.id })),
        });
        totalItemsAdded += itemsToCreate.length;
        if (itemsToCreate.length > 0) {
            const firstItem = await prisma.guildBadgeItem.findFirst({where: {badgeCaseId: guildCase.id}, orderBy: {displayOrder: 'asc'}, select: {id:true}}); 
            if(firstItem) await prisma.guildBadgeCase.update({where: {id: guildCase.id}, data: {featuredBadgeId: firstItem.id}});
        }
        console.log(`   Populated GuildBadgeCase for ${specialGuild.name} with ${itemsToCreate.length} items.`);
      }
    }
  }

  // --- Seed for NexusHub's Primary Cluster (Cluster1 if found) ---
  if (nexusHubPrimaryCluster) {
    const clusterInstances = await prisma.badgeInstance.findMany({
      where: { clusterReceiverId: nexusHubPrimaryCluster.id, awardStatus: BadgeAwardStatus.ACCEPTED },
      select: { id: true },
      take: increasedTakeAmount, 
    });
    // console.log(`[DEBUG] Cluster1 (${nexusHubPrimaryCluster.name}) has ${clusterInstances.length} accepted badges.`); // Debug line
    if (clusterInstances.length > 0) {
      const clusterCase = await prisma.clusterBadgeCase.upsert({
        where: { clusterId: nexusHubPrimaryCluster.id },
        update: { title: `Treasures of ${nexusHubPrimaryCluster.name}`, isPublic: true },
        create: { clusterId: nexusHubPrimaryCluster.id, title: `Treasures of ${nexusHubPrimaryCluster.name}`, isPublic: true },
      });
      if(clusterCase) totalCasesCreated++;
      await prisma.clusterBadgeItem.deleteMany({ where: { badgeCaseId: clusterCase.id } });
      const maxClusterItems = Math.min(clusterInstances.length, specialEntityMaxBadgeCaseItems);
      const itemsToCreate = prepareCaseItems(clusterInstances, maxClusterItems); 
      if (itemsToCreate.length > 0) {
        await prisma.clusterBadgeItem.createMany({
          data: itemsToCreate.map(item => ({ ...item, badgeCaseId: clusterCase.id })),
        });
        totalItemsAdded += itemsToCreate.length;
        if (itemsToCreate.length > 0) {
            const firstItem = await prisma.clusterBadgeItem.findFirst({where: {badgeCaseId: clusterCase.id}, orderBy: {displayOrder: 'asc'}, select: {id:true}}); 
            if(firstItem) await prisma.clusterBadgeCase.update({where: {id: clusterCase.id}, data: {featuredBadgeId: firstItem.id}});
        }
        console.log(`   Populated ClusterBadgeCase for ${nexusHubPrimaryCluster.name} with ${itemsToCreate.length} items.`);
      }
    }
  } else {
      console.log('   Skipping specific NexusHub Cluster badge case as it was not identified or Cluster1 was not found.')
  }
  
  // --- Seed UserBadgeCases for a selection of other users ---
  console.log('   Seeding additional UserBadgeCases...');
  for (const user of allUsers) {
    if (user.id === testUserPrime?.id) continue; 

    const userInstances = await prisma.badgeInstance.findMany({
      where: { userReceiverId: user.id, awardStatus: BadgeAwardStatus.ACCEPTED },
      select: { id: true },
      take: increasedTakeAmount, 
    });
    const requiredBadgeCount = 1; // Set to 1 for more case creation
    // console.log(`[DEBUG] User ${user.username} has ${userInstances.length} accepted badges. Required: ${requiredBadgeCount}.`); // Debug line

    if (userInstances.length >= requiredBadgeCount) { 
      // console.log(`[DEBUG] Creating/updating case for user ${user.username}.`); // Debug line
      const userCase = await prisma.userBadgeCase.upsert({
        where: { userId: user.id },
        update: { title: `${user.username}'s Showcase`, isPublic: faker.datatype.boolean(0.8) },
        create: { userId: user.id, title: `${user.username}'s Showcase`, isPublic: faker.datatype.boolean(0.8) },
      });
      if(userCase) totalCasesCreated++;
      await prisma.userBadgeItem.deleteMany({ where: { badgeCaseId: userCase.id } });
      const itemsToCreate = prepareCaseItems(userInstances, faker.number.int({ min: 1, max: Math.max(1, Math.min(userInstances.length, 8)) }));
      if (itemsToCreate.length > 0) {
        await prisma.userBadgeItem.createMany({
          data: itemsToCreate.map(item => ({ ...item, badgeCaseId: userCase.id })),
        });
        totalItemsAdded += itemsToCreate.length;
        // console.log(`   Populated additional UserBadgeCase for ${user.username} with ${itemsToCreate.length} items.`); // Debug line
      }
    }
  }

  // --- Seed GuildBadgeCases for a selection of other guilds ---
  console.log('   Seeding additional GuildBadgeCases...');
  for (const guild of allGuilds) {
    if (guild.id === specialGuild?.id) continue; 

    const guildInstances = await prisma.badgeInstance.findMany({
      where: { guildReceiverId: guild.id, awardStatus: BadgeAwardStatus.ACCEPTED },
      select: { id: true },
      take: increasedTakeAmount, 
    });
    const requiredBadgeCountGuild = 1; // Set to 1 for more case creation
    // console.log(`[DEBUG] Guild ${guild.name} has ${guildInstances.length} accepted badges. Required: ${requiredBadgeCountGuild}.`); // Debug line

    if (guildInstances.length >= requiredBadgeCountGuild) {
      // console.log(`[DEBUG] Creating/updating case for guild ${guild.name}.`); // Debug line
      const guildCase = await prisma.guildBadgeCase.upsert({
        where: { guildId: guild.id },
        update: { title: `Honors of ${guild.name}`, isPublic: faker.datatype.boolean(0.9) },
        create: { guildId: guild.id, title: `Honors of ${guild.name}`, isPublic: faker.datatype.boolean(0.9) },
      });
      if(guildCase) totalCasesCreated++;
      await prisma.guildBadgeItem.deleteMany({ where: { badgeCaseId: guildCase.id } });
      const maxItemsForGuildCase = faker.number.int({ min: 1, max: Math.max(1, Math.min(guildInstances.length, 10)) }); // Ensure min is 1
      const itemsToCreate = prepareCaseItems(guildInstances, maxItemsForGuildCase);
      if (itemsToCreate.length > 0) {
        await prisma.guildBadgeItem.createMany({
          data: itemsToCreate.map(item => ({ ...item, badgeCaseId: guildCase.id })),
        });
        totalItemsAdded += itemsToCreate.length;
        if (faker.datatype.boolean(0.5) && itemsToCreate.length > 0) { 
            const firstItem = await prisma.guildBadgeItem.findFirst({where: {badgeCaseId: guildCase.id}, orderBy: {displayOrder: 'asc'}, select: {id:true}});
            if(firstItem) await prisma.guildBadgeCase.update({where: {id: guildCase.id}, data: {featuredBadgeId: firstItem.id}});
        }
        // console.log(`   Populated additional GuildBadgeCase for ${guild.name} with ${itemsToCreate.length} items.`); // Debug line
      }
    }
  }

  // --- Seed ClusterBadgeCases for a selection of other clusters ---
  console.log('   Seeding additional ClusterBadgeCases...');
  for (const cluster of allClusters) {
    if (cluster.id === nexusHubPrimaryCluster?.id) continue; 

    const clusterInstances = await prisma.badgeInstance.findMany({
      where: { clusterReceiverId: cluster.id, awardStatus: BadgeAwardStatus.ACCEPTED },
      select: { id: true },
      take: increasedTakeAmount, 
    });
    const requiredBadgeCountCluster = 1; // Set to 1 for more case creation
    // console.log(`[DEBUG] Cluster ${cluster.name} has ${clusterInstances.length} accepted badges. Required: ${requiredBadgeCountCluster}.`); // Debug line

    if (clusterInstances.length >= requiredBadgeCountCluster) {
      // console.log(`[DEBUG] Creating/updating case for cluster ${cluster.name}.`); // Debug line
      const clusterCase = await prisma.clusterBadgeCase.upsert({
        where: { clusterId: cluster.id },
        update: { title: `Cluster Showcase: ${cluster.name}`, isPublic: true },
        create: { clusterId: cluster.id, title: `Cluster Showcase: ${cluster.name}`, isPublic: true },
      });
      if(clusterCase) totalCasesCreated++;
      await prisma.clusterBadgeItem.deleteMany({ where: { badgeCaseId: clusterCase.id } });
      const itemsToCreate = prepareCaseItems(clusterInstances, faker.number.int({ min: 1, max: Math.max(1, Math.min(clusterInstances.length, 7)) }));
      if (itemsToCreate.length > 0) {
        await prisma.clusterBadgeItem.createMany({
          data: itemsToCreate.map(item => ({ ...item, badgeCaseId: clusterCase.id })),
        });
        totalItemsAdded += itemsToCreate.length;
         if (faker.datatype.boolean(0.5) && itemsToCreate.length > 0) { 
            const firstItem = await prisma.clusterBadgeItem.findFirst({where: {badgeCaseId: clusterCase.id}, orderBy: {displayOrder: 'asc'}, select: {id:true}});
            if(firstItem) await prisma.clusterBadgeCase.update({where: {id: clusterCase.id}, data: {featuredBadgeId: firstItem.id}});
        }
        // console.log(`   Populated additional ClusterBadgeCase for ${cluster.name} with ${itemsToCreate.length} items.`); // Debug line
      }
    }
  }

  console.log(`✅ Badge cases seeding finished. Total cases created/updated: ${totalCasesCreated}, Total items added: ${totalItemsAdded}.`);
} 