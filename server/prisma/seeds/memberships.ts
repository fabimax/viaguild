import { PrismaClient, User, Guild, Role, GuildMemberRank } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { TEST_USER_PRIME_USERNAME } from './users'; // Import TestUserPrime username
import { SPECIAL_GUILD_NAME } from './guilds';   // Import Special Guild name

// Helper function to get a weighted random rank
function getWeightedRandomRank(): GuildMemberRank {
  const ranks: GuildMemberRank[] = ['S', 'A', 'B', 'C', 'D', 'E'];
  // Weights: E is common, S is rare. Sum = 100 for easy percentage mapping if needed.
  const weights = [1, 4, 10, 20, 30, 35]; // S:1%, A:4%, B:10%, C:20%, D:30%, E:35%
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < ranks.length; i++) {
    if (random < weights[i]) {
      return ranks[i];
    }
    random -= weights[i];
  }
  return 'E'; // Fallback
}

interface MembershipCoreInput {
  userId: string;
  guildId: string;
  rank: GuildMemberRank;
  isPrimary: boolean;
  primarySetAt?: Date;
}

// Interface for UserGuildRole data, guildMembershipId will be populated after GuildMembership creation
interface UserGuildRoleCreateInput {
  guildMembershipId: string; 
  roleId: string;
}

// Interface for role intents before GuildMembership IDs are known
interface RoleIntent {
    userId: string;
    guildId: string;
    roleId: string;
}

export async function seedMemberships(prisma: PrismaClient) {
  console.log('🔄 Seeding memberships with multiple roles logic...');

  const users = await prisma.user.findMany({select: {id: true, username: true}}); // Select only needed fields
  let guilds = await prisma.guild.findMany({select: {id: true, name: true, createdById: true}}); // Select only needed fields

  const testUserPrime = users.find(u => u.username === TEST_USER_PRIME_USERNAME);
  const specialGuild = guilds.find(g => g.name === SPECIAL_GUILD_NAME);
  
  const creatorSystemRole = await prisma.role.findFirst({ where: { name: 'CREATOR', isSystemRole: true, guildId: null }, select: {id: true} });
  const adminSystemRole = await prisma.role.findFirst({ where: { name: 'ADMIN', isSystemRole: true, guildId: null }, select: {id: true} });
  const moderatorSystemRole = await prisma.role.findFirst({ where: { name: 'MODERATOR', isSystemRole: true, guildId: null }, select: {id: true} });
  const memberSystemRole = await prisma.role.findFirst({ where: { name: 'MEMBER', isSystemRole: true, guildId: null }, select: {id: true} });

  if (users.length === 0) {
    console.warn('⚠️ No users found. Skipping membership seeding.');
    return;
  }
  if (guilds.length === 0) {
    console.warn('⚠️ No guilds found. Skipping membership seeding.');
    return;
  }
  if (!creatorSystemRole || !adminSystemRole || !moderatorSystemRole || !memberSystemRole) {
    console.error('❌ Critical system roles (CREATOR, ADMIN, MODERATOR, MEMBER) not found. Cannot seed effectively.');
    return;
  }
  // Warnings for missing special user/guild are fine, logic will try to adapt.

  if (specialGuild) {
    guilds = [specialGuild, ...guilds.filter(g => g.id !== specialGuild.id)];
  }

  const membershipCoreMap = new Map<string, MembershipCoreInput>(); // Key: userId-guildId
  const roleIntents: RoleIntent[] = []; 

  const ensureMembershipCore = (userId: string, guildId: string, rankOverride?: GuildMemberRank) => {
    const key = `${userId}-${guildId}`;
    if (!membershipCoreMap.has(key)) {
      membershipCoreMap.set(key, {
        userId,
        guildId,
        rank: rankOverride || getWeightedRandomRank(),
        isPrimary: false,
      });
    } else if (rankOverride) { 
        const existing = membershipCoreMap.get(key)!;
        existing.rank = rankOverride;
    }
  };

  // 1. Guild creators get CREATOR role
  for (const guild of guilds) {
    if (users.find(u => u.id === guild.createdById)) {
        const key = `${guild.createdById}-${guild.id}`;
        ensureMembershipCore(guild.createdById, guild.id);
        roleIntents.push({ userId: guild.createdById, guildId: guild.id, roleId: creatorSystemRole.id });
    } else {
        console.warn(`Creator user ID ${guild.createdById} for guild ${guild.name} not found.`);
    }
    
    // Assign Admins
    const potentialAdmins = users.filter(u => u.id !== guild.createdById);
    const shuffledAdmins = faker.helpers.shuffle(potentialAdmins);
    let adminCount = 0;
    for (let i = 0; i < shuffledAdmins.length && adminCount < 2; i++) {
      const adminUser = shuffledAdmins[i];
      const key = `${adminUser.id}-${guild.id}`;
      ensureMembershipCore(adminUser.id, guild.id);
      roleIntents.push({ userId: adminUser.id, guildId: guild.id, roleId: adminSystemRole.id });
      adminCount++;
    }

    // Moderators for Special Guild
    if (guild.id === specialGuild?.id) {
      const currentMemberIdsInSpecialGuild = new Set<string>();
      membershipCoreMap.forEach((val, key) => { if (key.endsWith(`-${guild.id}`)) currentMemberIdsInSpecialGuild.add(val.userId); });
      roleIntents.forEach(ri => { if (ri.guildId === guild.id) currentMemberIdsInSpecialGuild.add(ri.userId); });

      const potentialMods = users.filter(u => !currentMemberIdsInSpecialGuild.has(u.id));
      const shuffledMods = faker.helpers.shuffle(potentialMods).slice(0, 2);
      for (const modUser of shuffledMods) {
        const key = `${modUser.id}-${guild.id}`;
        ensureMembershipCore(modUser.id, guild.id);
        roleIntents.push({ userId: modUser.id, guildId: guild.id, roleId: moderatorSystemRole.id });
      }
    }
  }
  
  // Explicitly ensure TestUserPrime is CREATOR of TheNexusHub if both exist
  if (testUserPrime && specialGuild) {
    const key = `${testUserPrime.id}-${specialGuild.id}`;
    ensureMembershipCore(testUserPrime.id, specialGuild.id, 'S');
    let i = roleIntents.length;
    while (i--) {
        if (roleIntents[i].userId === testUserPrime.id && roleIntents[i].guildId === specialGuild.id) {
            roleIntents.splice(i, 1);
        }
    }
    roleIntents.push({ userId: testUserPrime.id, guildId: specialGuild.id, roleId: creatorSystemRole.id });
    console.log(`   Ensured ${testUserPrime.username} is set for CREATOR role in ${specialGuild.name}.`);
  }

  // 2. Fulfill specific membership counts (add as MEMBER)
  const minMembersPerNormalGuild = 15;
  const minMembersSpecialGuild = 20;
  for (const guild of guilds) {
    const targetMemberCount = guild.id === specialGuild?.id ? minMembersSpecialGuild : (guilds.indexOf(guild) < 2 ? minMembersPerNormalGuild : 0);
    if (targetMemberCount === 0) continue;

    const membersInGuildSoFar = new Set<string>();
    membershipCoreMap.forEach((val, key) => { if (key.endsWith(`-${guild.id}`)) membersInGuildSoFar.add(val.userId); });
    
    let membersNeeded = targetMemberCount - membersInGuildSoFar.size;
    if (membersNeeded <= 0) continue;

    const availableUsers = users.filter(u => !membersInGuildSoFar.has(u.id));
    const shuffledAvailableUsers = faker.helpers.shuffle(availableUsers);
    for (let i = 0; i < membersNeeded && i < shuffledAvailableUsers.length; i++) {
      const userToAdd = shuffledAvailableUsers[i];
      ensureMembershipCore(userToAdd.id, guild.id);
      // Add as member only if no other specific role intent exists for this user-guild combo yet
      if (!roleIntents.some(ri => ri.userId === userToAdd.id && ri.guildId === guild.id)) {
        roleIntents.push({ userId: userToAdd.id, guildId: guild.id, roleId: memberSystemRole.id });
      }
    }
  }
  
  // 3. Assign TestUserPrime to other guilds with varied roles
  if (testUserPrime && guilds.length > 1) {
    const otherGuilds = guilds.filter(g => g.id !== specialGuild?.id);
    const guildsForTestUserPrime = faker.helpers.shuffle(otherGuilds).slice(0, Math.min(4, otherGuilds.length));
    for (let i = 0; i < guildsForTestUserPrime.length; i++) {
      const guild = guildsForTestUserPrime[i];
      const key = `${testUserPrime.id}-${guild.id}`;
      ensureMembershipCore(testUserPrime.id, guild.id);
      let roleForTestUser = memberSystemRole.id;
      if (i === 0 && adminSystemRole) roleForTestUser = adminSystemRole.id;
      else if (i === 1 && moderatorSystemRole) roleForTestUser = moderatorSystemRole.id;
      
      let k = roleIntents.length;
      while (k--) {
          if (roleIntents[k].userId === testUserPrime.id && roleIntents[k].guildId === guild.id) {
              roleIntents.splice(k, 1);
          }
      }
      roleIntents.push({ userId: testUserPrime.id, guildId: guild.id, roleId: roleForTestUser });
    }
    console.log(`   Assigned ${TEST_USER_PRIME_USERNAME} to ${guildsForTestUserPrime.length} additional guilds with varied roles.`);
  }
  
  // 4. Add more random memberships (as MEMBER)
  const desiredTotalMemberships = Math.min(users.length * 3, users.length * guilds.length * 0.5); // Adjusted target
  let attempts = 0;
  const maxAttempts = users.length * guilds.length;
  while(membershipCoreMap.size < desiredTotalMemberships && attempts < maxAttempts && users.length > 0 && guilds.length > 0) {
    const randomUser = faker.helpers.arrayElement(users);
    const randomGuild = faker.helpers.arrayElement(guilds);
    attempts++;
    const key = `${randomUser.id}-${randomGuild.id}`;
    if(!membershipCoreMap.has(key)) {
        ensureMembershipCore(randomUser.id, randomGuild.id);
        roleIntents.push({ userId: randomUser.id, guildId: randomGuild.id, roleId: memberSystemRole.id });
    }
  }

  let finalMembershipsToCreate = Array.from(membershipCoreMap.values());

  // 5. Set primary guild for ~80% of users who have memberships
  const usersWithAnyMembership = Array.from(new Set(finalMembershipsToCreate.map(m => m.userId)));
  const usersToSetPrimary = faker.helpers.shuffle(usersWithAnyMembership)
                             .slice(0, Math.floor(usersWithAnyMembership.length * 0.8));
  for (const userId of usersToSetPrimary) {
    const userMembershipEntries = finalMembershipsToCreate.filter(m => m.userId === userId);
    if (userMembershipEntries.length > 0) {
      finalMembershipsToCreate.forEach(m => { if (m.userId === userId) { m.isPrimary = false; m.primarySetAt = undefined; } });
      const primaryMembershipEntry = faker.helpers.arrayElement(userMembershipEntries);
      primaryMembershipEntry.isPrimary = true;
      primaryMembershipEntry.primarySetAt = new Date();
    }
  }

  // --- PHASE 2: Create GuildMembership records in DB & get their IDs ---
  console.log(`   Preparing to upsert ${finalMembershipsToCreate.length} core memberships...`);
  const createdMembershipMap = new Map<string, string>(); // Key: userId-guildId, Value: guildMembership.id
  for (const coreData of finalMembershipsToCreate) {
    try {
      const membership = await prisma.guildMembership.upsert({
        where: { uniqueUserGuildMembership: { userId: coreData.userId, guildId: coreData.guildId } },
        update: { 
            rank: coreData.rank, 
            isPrimary: coreData.isPrimary, 
            primarySetAt: coreData.isPrimary ? (coreData.primarySetAt || new Date()) : null 
        },
        create: { 
            userId: coreData.userId, 
            guildId: coreData.guildId, 
            rank: coreData.rank, 
            isPrimary: coreData.isPrimary, 
            primarySetAt: coreData.isPrimary ? (coreData.primarySetAt || new Date()) : null 
        },
      });
      createdMembershipMap.set(`${coreData.userId}-${coreData.guildId}`, membership.id);
    } catch (e) {
      console.error(`Error upserting core membership for user ${coreData.userId} in guild ${coreData.guildId}:`, e);
    }
  }
  console.log(`   ${createdMembershipMap.size} core memberships processed.`);

  // --- PHASE 3: Prepare and Create UserGuildRole assignments ---
  const userGuildRolesToCreate: UserGuildRoleCreateInput[] = [];
  const uniqueRoleAssignments = new Set<string>(); // Key: guildMembershipId-roleId

  for (const intent of roleIntents) {
      const key = `${intent.userId}-${intent.guildId}`;
      const guildMembershipId = createdMembershipMap.get(key);
      if (guildMembershipId) {
          const assignmentKey = `${guildMembershipId}-${intent.roleId}`;
          if (!uniqueRoleAssignments.has(assignmentKey)) {
            userGuildRolesToCreate.push({ guildMembershipId, roleId: intent.roleId });
            uniqueRoleAssignments.add(assignmentKey);
          }
      } else {
          console.warn(`   Could not find created GuildMembership for key ${key} to assign role ${intent.roleId}.`);
      }
  }

  if (userGuildRolesToCreate.length > 0) {
    const membershipIdsToClearRolesFor = Array.from(new Set(userGuildRolesToCreate.map(r => r.guildMembershipId)));
    
    if (membershipIdsToClearRolesFor.length > 0) {
        console.log(`   Attempting to clear existing roles for ${membershipIdsToClearRolesFor.length} memberships before re-assigning.`);
        try {
            await prisma.userGuildRole.deleteMany({
                where: { guildMembershipId: { in: membershipIdsToClearRolesFor } }
            });
            console.log(`   Cleared existing roles for ${membershipIdsToClearRolesFor.length} memberships.`);
        } catch (e) {
            console.error('Error clearing existing UserGuildRole assignments:', e);
        }
    }
    
    try {
      await prisma.userGuildRole.createMany({
        data: userGuildRolesToCreate,
        skipDuplicates: true, 
      });
      console.log(`   Created/Replaced ${userGuildRolesToCreate.length} UserGuildRole assignments.`);
    } catch (e) {
      console.error('Error creating UserGuildRole assignments:', e);
    }
  }

  // 7. Set category-primary for members (logic adapted slightly for new membership structure)
  const guildCategories = await prisma.guildCategory.findMany({
    include: { category: true },
  });
  if (guildCategories.length > 0) {
    const allMemberships = await prisma.guildMembership.findMany({ // Fetch all actual memberships
        select: {id: true, userId: true, guildId: true}
    });

    const userCategoryPrimaryDataToUpsert: { userId: string, categoryId: string, guildId: string, setAt: Date }[] = [];
    const assignedUserCategoryCombo = new Set<string>();

    const userMembershipsMap = new Map<string, string[]>(); 
    allMemberships.forEach(m => {
        const guilds = userMembershipsMap.get(m.userId) || [];
        guilds.push(m.guildId);
        userMembershipsMap.set(m.userId, guilds);
    });

    const allUsersForCategoryLoop = await prisma.user.findMany({select: {id: true}});
    const allCategoriesForLoop = await prisma.category.findMany({where: {allowsGuildPrimary: true}, select: {id: true}});

    for (const user of allUsersForCategoryLoop) {
        const memberOfGuilds = userMembershipsMap.get(user.id) || [];
        if (memberOfGuilds.length === 0) continue;

        for (const category of allCategoriesForLoop) {
            const eligibleGuildsForCategory = memberOfGuilds.filter(guildId => 
                guildCategories.some(gc => gc.guildId === guildId && gc.categoryId === category.id)
            );

            if (eligibleGuildsForCategory.length > 0) {
                if (Math.random() < 0.7) { 
                    const primaryGuildForCategory = faker.helpers.arrayElement(eligibleGuildsForCategory);
                    const key = `${user.id}-${category.id}`;
                    if (!assignedUserCategoryCombo.has(key)) {
                        userCategoryPrimaryDataToUpsert.push({
                            userId: user.id,
                            categoryId: category.id,
                            guildId: primaryGuildForCategory,
                            setAt: new Date()
                        });
                        assignedUserCategoryCombo.add(key);
                    }
                }
            }
        }
    }
    
    if (userCategoryPrimaryDataToUpsert.length > 0) {
      let upsertedUCPGCount = 0;
      for (const data of userCategoryPrimaryDataToUpsert) {
        try {
            await prisma.userCategoryPrimaryGuild.upsert({
                where: { userId_categoryId: { userId: data.userId, categoryId: data.categoryId } },
                update: { guildId: data.guildId, setAt: data.setAt }, 
                create: data,
            });
            upsertedUCPGCount++;
        } catch (e) {
            console.error(`Error upserting UserCategoryPrimaryGuild for user ${data.userId}, category ${data.categoryId}:`, e);
        }
      }
      console.log(`   Upserted ${upsertedUCPGCount} UserCategoryPrimaryGuild links.`);
    }
  }
  
  console.log('✅ Advanced membership & roles seeding finished.');
} 