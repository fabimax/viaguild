import { PrismaClient, Guild, Category, User } from '@prisma/client';
import { faker } from '@faker-js/faker';

const SPECIAL_GUILD_NAME = 'TheNexusHub';

export async function seedGuildCategoryAssignments(prisma: PrismaClient) {
  console.log('Seeding guild category assignments (including for Special Guild)...');
  const guilds = await prisma.guild.findMany();
  const categories = await prisma.category.findMany();
  const users = await prisma.user.findMany();

  if (guilds.length === 0 || categories.length < 2 || users.length === 0) {
    console.warn('⚠️ Not enough guilds, categories (need >=2), or users. Skipping.');
    return;
  }
  let assignmentsMade = 0;
  const guildsWithoutCategoryTarget = 4;
  let guildsAssignedToAnyCategoryCount = 0;

  const generalGuilds = guilds.filter(g => g.name !== SPECIAL_GUILD_NAME);
  const shuffledGeneralGuilds = faker.helpers.shuffle([...generalGuilds]);

  for (const guild of shuffledGeneralGuilds) {
    const currentUnassignedCount = guilds.length - guildsAssignedToAnyCategoryCount;
    if (currentUnassignedCount <= guildsWithoutCategoryTarget && guildsAssignedToAnyCategoryCount > 0) {
        // If we have already met the target for unassigned guilds, stop assigning general guilds.
        break;
    }
    const numberOfCategoriesForGuild = faker.number.int({ min: 1, max: 2 });
    const catsToAssign = faker.helpers.shuffle([...categories]).slice(0, numberOfCategoriesForGuild);
    let assignedThisGuildAtLeastOneCat = false;
    for (const category of catsToAssign) {
      const assigner = faker.helpers.arrayElement(users);
      try {
        await prisma.guildCategory.create({ data: { guildId: guild.id, categoryId: category.id, assignedById: assigner.id } });
        assignmentsMade++; assignedThisGuildAtLeastOneCat = true;
        // console.log(`Assigned guild ${guild.name} to category ${category.name}`);
      } catch (e: any) { if (e.code !== 'P2002') console.error(`Error assigning ${guild.name} to ${category.name}:`, e); }
    }
    if(assignedThisGuildAtLeastOneCat) guildsAssignedToAnyCategoryCount++;
  }

  const specialGuild = guilds.find(g => g.name === SPECIAL_GUILD_NAME);
  if (specialGuild && categories.length >= 2) {
    const existingSpecialGuildCatLinks = await prisma.guildCategory.findMany({ where: { guildId: specialGuild.id }, select: { categoryId: true } });
    const existingCategoryIdsForSpecial = new Set(existingSpecialGuildCatLinks.map(gc => gc.categoryId));
    let neededCategoriesForSpecial = 2 - existingCategoryIdsForSpecial.size;

    const availableCategoriesForSpecial = categories.filter(c => !existingCategoryIdsForSpecial.has(c.id));
    const shuffledAvailableCats = faker.helpers.shuffle(availableCategoriesForSpecial);

    for (let i = 0; i < neededCategoriesForSpecial && i < shuffledAvailableCats.length; i++) {
        const category = shuffledAvailableCats[i];
        const assigner = faker.helpers.arrayElement(users);
        try {
            await prisma.guildCategory.create({ data: { guildId: specialGuild.id, categoryId: category.id, assignedById: assigner.id } });
            assignmentsMade++;
            console.log(`Assigned SPECIAL guild ${specialGuild.name} to category ${category.name}`);
            if(!existingCategoryIdsForSpecial.has(category.id)) guildsAssignedToAnyCategoryCount++; // Count if it's a new guild getting a category
        } catch (e: any) { if (e.code !== 'P2002') console.error(`Error assigning special ${specialGuild.name} to cat ${category.name}:`, e);}
    }
  } else if (specialGuild && categories.length < 2) {
      console.warn(`Not enough categories (found ${categories.length}) to assign 2 to Special Guild.`);
  } else if (!specialGuild) {
      console.warn(`Special Guild ${SPECIAL_GUILD_NAME} not found for category assignment.`);
  }
  
  const finalGuildsWithCategories = await prisma.guild.count({where: {categories: {some: {}}}});
  const finalUnassignedCount = guilds.length - finalGuildsWithCategories;
  console.log(`Guild category assignments: ${assignmentsMade} new. Guilds with at least one cat: ${finalGuildsWithCategories}. Guilds w/o category: ${finalUnassignedCount}. Target unassigned: >= ${guildsWithoutCategoryTarget}`);
} 