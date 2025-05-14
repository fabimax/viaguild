import { PrismaClient, User, Guild, Role, GuildMemberRank, Category } from '@prisma/client';
import { faker } from '@faker-js/faker';

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

const SPECIAL_GUILD_NAME = 'TheNexusHub'; // Define the special guild name

export async function seedMemberships(prisma: PrismaClient) {
  console.log('Seeding memberships with advanced logic (including Special Guild)...');

  const users = await prisma.user.findMany();
  let guilds = await prisma.guild.findMany(); // Make it let for potential sorting
  
  const creatorSystemRole = await prisma.role.findFirst({ where: { name: 'CREATOR', isSystemRole: true, guildId: null } });
  const adminSystemRole = await prisma.role.findFirst({ where: { name: 'ADMIN', isSystemRole: true, guildId: null } });
  const moderatorSystemRole = await prisma.role.findFirst({ where: { name: 'MODERATOR', isSystemRole: true, guildId: null } }); // Added Moderator
  const memberSystemRole = await prisma.role.findFirst({ where: { name: 'MEMBER', isSystemRole: true, guildId: null } });

  if (users.length === 0) {
    console.warn('⚠️ No users found. Skipping membership seeding.');
    return;
  }
  if (guilds.length === 0) {
    console.warn('⚠️ No guilds found. Skipping membership seeding.');
    return;
  }
  if (!creatorSystemRole || !adminSystemRole || !moderatorSystemRole || !memberSystemRole) { // Added Moderator
    console.error('❌ Critical system roles (CREATOR, ADMIN, MODERATOR, MEMBER) not found. Cannot seed effectively.');
    return;
  }

  // Ensure Special Guild is processed first for its specific member count and roles
  const specialGuild = guilds.find(g => g.name === SPECIAL_GUILD_NAME);
  if (specialGuild) {
    guilds = [specialGuild, ...guilds.filter(g => g.id !== specialGuild.id)];
  }

  const membershipsToProcess: Array<{
    userId: string;
    guildId: string;
    roleId: string;
    rank: GuildMemberRank;
    isPrimary: boolean;
  }> = [];

  // 1. Ensure guild creators and admins (and moderators for special guild)
  for (const guild of guilds) {
    const isSpecial = guild.name === SPECIAL_GUILD_NAME;
    const potentialAdmins = users.filter(u => u.id !== guild.createdById);
    const shuffledAdmins = faker.helpers.shuffle(potentialAdmins);

    // Creator
    membershipsToProcess.push({
      userId: guild.createdById,
      guildId: guild.id,
      roleId: creatorSystemRole.id,
      rank: getWeightedRandomRank(),
      isPrimary: false, // Will be set later
    });

    // Admins
    let adminCount = 0;
    for (let i = 0; i < Math.min(2, shuffledAdmins.length); i++) {
      if(shuffledAdmins[i].id === guild.createdById) continue;
      membershipsToProcess.push({
        userId: shuffledAdmins[i].id,
        guildId: guild.id,
        roleId: adminSystemRole.id,
        rank: getWeightedRandomRank(),
        isPrimary: false,
      });
      adminCount++;
    }
    // Ensure 2 admins for special guild if possible, by picking more if first picks were creator etc.
    let currentAdminsOfSpecialGuild = membershipsToProcess.filter(m => m.guildId === guild.id && m.roleId === adminSystemRole.id);
    if(isSpecial && currentAdminsOfSpecialGuild.length < 2){
        const moreAdmins = users.filter(u => u.id !== guild.createdById && !currentAdminsOfSpecialGuild.find(ca => ca.userId === u.id)).slice(0, 2 - currentAdminsOfSpecialGuild.length);
        for(const adminUser of moreAdmins){
            membershipsToProcess.push({ userId: adminUser.id, guildId: guild.id, roleId: adminSystemRole.id, rank: getWeightedRandomRank(), isPrimary: false });
        }
    }

    // Moderators for Special Guild
    if (isSpecial) {
      currentAdminsOfSpecialGuild = membershipsToProcess.filter(m => m.guildId === guild.id && m.roleId === adminSystemRole.id);
      const creatorId = guild.createdById;
      const adminIds = new Set(currentAdminsOfSpecialGuild.map(m => m.userId));
      const potentialMods = users.filter(u => u.id !== creatorId && !adminIds.has(u.id));
      const shuffledMods = faker.helpers.shuffle(potentialMods).slice(0, 2); // Assign 2 moderators
      for (const modUser of shuffledMods) {
        membershipsToProcess.push({ userId: modUser.id, guildId: guild.id, roleId: moderatorSystemRole.id, rank: getWeightedRandomRank(), isPrimary: false });
      }
    }
  }

  // 2. Fulfill specific membership counts (Special Guild to 20, others >=15 for 2 more guilds)
  const minMembersPerNormalGuild = 15;
  const minMembersSpecialGuild = 20;

  for (const guild of guilds) {
    const isSpecial = guild.name === SPECIAL_GUILD_NAME;
    const targetMemberCount = isSpecial ? minMembersSpecialGuild : (guilds.indexOf(guild) < 3 ? minMembersPerNormalGuild : 0); // Ensure first 3 (incl special) meet targets
    if (targetMemberCount === 0 && !isSpecial) continue; // Skip if not special and not in first 3 for high count

    const currentMemberIdsInGuild = new Set(membershipsToProcess.filter(m => m.guildId === guild.id).map(m => m.userId));
    let membersNeeded = targetMemberCount - currentMemberIdsInGuild.size;

    if (membersNeeded <= 0) continue;

    const availableUsersForGuild = users.filter(u => !currentMemberIdsInGuild.has(u.id));
    const shuffledAvailableUsers = faker.helpers.shuffle(availableUsersForGuild);

    for (let i = 0; i < membersNeeded && i < shuffledAvailableUsers.length; i++) {
      membershipsToProcess.push({
        userId: shuffledAvailableUsers[i].id,
        guildId: guild.id,
        roleId: memberSystemRole.id,
        rank: getWeightedRandomRank(),
        isPrimary: false,
      });
    }
  }

  if (users.length > 0 && guilds.length >= 5) {
    const specialUser = users[0];
    const guildsForSpecialUser = faker.helpers.shuffle([...guilds]).slice(0, 5);
    for (const guild of guildsForSpecialUser) {
      if (!membershipsToProcess.some(m => m.userId === specialUser.id && m.guildId === guild.id)) {
        membershipsToProcess.push({
          userId: specialUser.id,
          guildId: guild.id,
          roleId: memberSystemRole.id,
          rank: getWeightedRandomRank(),
          isPrimary: false,
        });
      }
    }
  }
  
  // 3. Add more random memberships
  const desiredTotalMemberships = users.length * 2; // Approximate target
  let attempts = 0;
  const maxAttempts = users.length * guilds.length * 2;

  while(membershipsToProcess.length < desiredTotalMemberships && attempts < maxAttempts) {
    const randomUser = faker.helpers.arrayElement(users);
    const randomGuild = faker.helpers.arrayElement(guilds);
    attempts++;
    if(!membershipsToProcess.some(m => m.userId === randomUser.id && m.guildId === randomGuild.id)) {
        membershipsToProcess.push({
            userId: randomUser.id,
            guildId: randomGuild.id,
            roleId: memberSystemRole.id,
            rank: getWeightedRandomRank(),
            isPrimary: false,
        });
    }
    if(membershipsToProcess.length >= users.length * guilds.length) break; // Absolute max
  }


  // Deduplicate (user-guild unique, prioritize more specific roles if somehow duplicated)
  const uniqueMembershipMap = new Map<string, typeof membershipsToProcess[0]>();
  for (const m of membershipsToProcess) {
    const key = `${m.userId}-${m.guildId}`;
    const existing = uniqueMembershipMap.get(key);
    if (!existing || 
        (existing.roleId === memberSystemRole.id && m.roleId !== memberSystemRole.id) ||
        (existing.roleId === moderatorSystemRole.id && (m.roleId === adminSystemRole.id || m.roleId === creatorSystemRole.id)) ||
        (existing.roleId === adminSystemRole.id && m.roleId === creatorSystemRole.id)
        // Add more prioritization if Moderator role is used
      ) {
      uniqueMembershipMap.set(key, m);
    }
  }
  const finalMembershipsData = Array.from(uniqueMembershipMap.values());

  // 4. Set primary guild for most (but not all) members
  const usersWithMembership = new Set(finalMembershipsData.map(m => m.userId));
  const usersToSetPrimary = faker.helpers.shuffle(Array.from(usersWithMembership))
                             .slice(0, Math.floor(usersWithMembership.size * 0.8)); // ~80%

  for (const userId of usersToSetPrimary) {
    // Find first membership for this user and set it as primary
    const membershipToMakePrimary = finalMembershipsData.find(m => m.userId === userId);
    if (membershipToMakePrimary) {
      // Ensure no other membership for this user is primary
      finalMembershipsData.forEach(m => {
          if (m.userId === userId) m.isPrimary = false;
      });
      membershipToMakePrimary.isPrimary = true;
    }
  }
   // Ensure at least one member, if eligible, does NOT have a primary guild (if all got one)
   if (usersToSetPrimary.length === usersWithMembership.size && usersWithMembership.size > 1) {
    const memberToUnset = finalMembershipsData.find(m => m.userId === usersToSetPrimary[0] && m.isPrimary);
    if (memberToUnset) memberToUnset.isPrimary = false;
   }


  // 5. Upsert memberships
  let processedCount = 0;
  for (const data of finalMembershipsData) {
    await prisma.guildMembership.upsert({
      where: { uniqueUserGuild: { userId: data.userId, guildId: data.guildId } },
      update: { roleId: data.roleId, rank: data.rank, isPrimary: data.isPrimary },
      create: data,
    });
    processedCount++;
  }
  console.log(`Memberships: ${processedCount} processed (created or updated).`);

  // 6. Set category-primary for members
  // "most (but not all) members of guilds that belong to categories should have set one category-primary"
  const guildCategories = await prisma.guildCategory.findMany({
    include: { category: true },
  });
  if (guildCategories.length > 0) {
    const membershipsInCategorizedGuilds = await prisma.guildMembership.findMany({
      where: { guildId: { in: guildCategories.map(gc => gc.guildId) } },
    });

    const userCategoryPrimaryData: { userId: string, categoryId: string, guildId: string }[] = [];
    const assignedUserCategory = new Set<string>(); // Key: userId-categoryId

    const potentialAssignments: {userId: string, categoryId: string, guildId: string, guildName: string, userName: string, categoryName: string}[] = [];

    for (const membership of membershipsInCategorizedGuilds) {
        const categoriesOfThisGuild = guildCategories.filter(gc => gc.guildId === membership.guildId);
        for (const gcEntry of categoriesOfThisGuild) {
            if (gcEntry.category.allowsGuildPrimary) {
                 potentialAssignments.push({
                    userId: membership.userId,
                    categoryId: gcEntry.categoryId,
                    guildId: membership.guildId,
                    // For easier debugging if needed
                    guildName: "N/A", 
                    userName: "N/A",
                    categoryName: gcEntry.category.name
                 });
            }
        }
    }
    
    const shuffledPotentials = faker.helpers.shuffle(potentialAssignments);
    let numToAssign = Math.floor(shuffledPotentials.length * 0.7); // ~70%

    for(const pa of shuffledPotentials){
        if(numToAssign <= 0) break;
        const key = `${pa.userId}-${pa.categoryId}`;
        if(!assignedUserCategory.has(key)){
            userCategoryPrimaryData.push({userId: pa.userId, categoryId: pa.categoryId, guildId: pa.guildId});
            assignedUserCategory.add(key);
            numToAssign--;
        }
    }
    
    // Ensure not ALL if list was small and all got picked
    if (shuffledPotentials.length > 0 && userCategoryPrimaryData.length === shuffledPotentials.length && userCategoryPrimaryData.length > 1) {
        userCategoryPrimaryData.pop(); // Remove one to ensure "not all"
    }

    if (userCategoryPrimaryData.length > 0) {
      try {
        await prisma.userCategoryPrimaryGuild.createMany({
          data: userCategoryPrimaryData,
          skipDuplicates: true,
        });
        console.log(`Created ${userCategoryPrimaryData.length} UserCategoryPrimaryGuild links.`);
      } catch (e) {
         console.error('Error creating UserCategoryPrimaryGuild links:', e);
      }
    }
  }
  
  console.log('Advanced membership seeding finished (including Special Guild considerations).');
  // Add verification logs as needed
} 