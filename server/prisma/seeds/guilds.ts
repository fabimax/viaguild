import { PrismaClient, User, ContactType } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { TEST_USER_PRIME_USERNAME } from './users'; // Import the special username

const contactTypes = Object.values(ContactType);
export const SPECIAL_GUILD_NAME = 'TheNexusHub'; // Export for use in other seeders if needed

function getRandomPicsumUrl(width: number, height: number): string {
  const imageNumber = faker.number.int({ min: 0, max: 999 }); // Picsum IDs are 0-1084, use a safe range
  return `https://picsum.photos/id/${imageNumber}/${width}/${height}`;
}

export async function seedGuilds(prisma: PrismaClient) {
  console.log('Seeding guilds, ensuring TestUserPrime creates TheNexusHub...');

  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.warn('⚠️ No users found to assign as guild creators. Skipping guild seeding.');
    return;
  }

  const testUserPrime = await prisma.user.findUnique({ 
    where: { username: TEST_USER_PRIME_USERNAME }
  });

  if (!testUserPrime) {
    console.error(`CRITICAL: User "${TEST_USER_PRIME_USERNAME}" not found. Cannot assign as creator of TheNexusHub. Please ensure TestUserPrime is seeded first.`);
    // Optionally, throw an error or assign a fallback creator if that's acceptable.
    // For now, we'll proceed but TheNexusHub might get a random creator or fail if no fallback.
    // return; // Or stop seeding if TestUserPrime is absolutely essential for TheNexusHub creator
  }

  const guildsToCreate = 10;
  const createdGuilds = [];

  for (let i = 0; i < guildsToCreate; i++) {
    const isSpecialGuild = i === 0;
    let guildName = isSpecialGuild ? SPECIAL_GUILD_NAME : faker.company.name().replace(/[^a-zA-Z0-9_]/g, '') + faker.string.alphanumeric(3);
    // Ensure unique guild name for faker ones too, as upsert will be by name
    if (!isSpecialGuild) {
        const existingGuildByName = await prisma.guild.findUnique({where: {name: guildName}});
        if(existingGuildByName) {
            guildName = guildName + faker.string.alphanumeric(3); // Try to make it unique
        }
    }

    const displayName = isSpecialGuild ? 'The Nexus Hub' : faker.company.name();
    const description = isSpecialGuild ? 'The central hub for all extraordinary activities and collaborations.' : faker.lorem.paragraph();

    let creator = users[Math.floor(Math.random() * users.length)]; // Default random creator
    if (isSpecialGuild && testUserPrime) {
      creator = testUserPrime; // Assign TestUserPrime as creator for TheNexusHub
    }
    if (!creator) { // Fallback if somehow testUserPrime was not found and users array is tricky
        console.warn("Could not determine a creator for a guild, using first available user.")
        creator = users[0]; 
        if(!creator) { // Should not happen if initial users.length check passes
            console.error("CRITICAL: No user available to create guild: " + guildName);
            continue; // Skip this guild
        }
    }

    try {
      const guild = await prisma.guild.upsert({
        where: { name: guildName }, // Upsert based on unique guild name
        update: { // Define what to update if it exists, or leave empty {} to only create if not found
            displayName: displayName,
            description: description,
            avatar: getRandomPicsumUrl(128, 128),
            isOpen: isSpecialGuild ? true : faker.datatype.boolean(),
            // createdById should generally not be updated if guild exists
            updatedById: creator.id, 
        },
        create: {
          name: guildName,
          displayName: displayName,
          description: description,
          avatar: getRandomPicsumUrl(128, 128),
          isOpen: isSpecialGuild ? true : faker.datatype.boolean(),
          createdById: creator.id,
          updatedById: creator.id,
        },
      });
      createdGuilds.push(guild);
      console.log(`   ${guild.name === guildName && guild.createdById === creator.id ? 'Created/Verified' : 'Updated'} guild: ${guild.name} (ID: ${guild.id}) by ${creator.username}${isSpecialGuild ? ' [SPECIAL GUILD]' : ''}`);

      // Seed contacts for this guild (only if newly created or on specific logic)
      // For simplicity, let's assume we add/update contacts each time for upserted guilds
      const existingContacts = await prisma.guildContact.count({ where: { guildId: guild.id } });
      if (existingContacts === 0) { // Only seed contacts if none exist, to avoid duplicates on re-run
        const numberOfContacts = faker.number.int({ min: 1, max: 3 });
      for (let j = 0; j < numberOfContacts; j++) {
          const contactType = faker.helpers.arrayElement(contactTypes.filter(ct => ct !== 'CUSTOM')); // Avoid too many custom for now
        let value = '';
        switch (contactType) {
            case 'EMAIL': value = faker.internet.email(); break;
            case 'WEBSITE': value = faker.internet.url(); break;
            case 'DISCORD': value = `https://discord.gg/${faker.string.alphanumeric(7)}`; break;
            case 'TWITTER': value = `https://twitter.com/${faker.internet.username().replace(/[^a-zA-Z0-9_]/g, '')}`; break;
            case 'GITHUB': value = `https://github.com/${faker.internet.username().replace(/[^a-zA-Z0-9_]/g, '')}`; break;
            // Add BLUESKY, TWITCH, LINKEDIN if specific formats are desired, otherwise they use default
            default: value = faker.lorem.slug(); // Generic value for other types like BLUESKY, TWITCH, LINKEDIN
        }
        await prisma.guildContact.create({
          data: {
            guildId: guild.id,
            type: contactType,
            value: value,
              label: undefined, // Since CUSTOM type is filtered out, label will always be undefined for these random ones
            displayOrder: j,
          },
        });
        }
      }
    } catch (e: any) {
      // Catching P2002 on upsert is less common if where clause is solid, but other errors can occur
      console.error(`Error upserting guild ${guildName}:`, e);
    }
  }
  console.log(`✅ Guilds seeding finished. ${createdGuilds.length} guilds processed (created or updated).`);
}

// Example of how this might have looked before for context:
// export async function seedGuilds(prisma: PrismaClient) {
//   console.log('Seeding guilds...');

//   // Ensure users are seeded first or handle user creation here
//   // For simplicity, assuming users exist. Fetch one to be a creator.
//   const user = await prisma.user.findFirst();
//   if (!user) {
//     console.error('No users found to be guild creators. Please seed users first.');
//     return;
//   }

//   const guildData = [
//     {
//       name: 'TheAdventurersPact',
//       displayName: 'The Adventurer\'s Pact',
//       description: 'A guild for brave adventurers seeking quests and camaraderie.',
//       createdById: user.id, // Assign a creator
//       isOpen: true,
//     },
//     {
//       name: 'ArtisansCollective',
//       displayName: 'Artisans Collective',
//       description: 'A place for craftsmen and artists to share their work.',
//       createdById: user.id, // Assign a creator
//       isOpen: false,
//     },
//     // Add more guilds as needed
//   ];

//   for (const data of guildData) {
//     const guild = await prisma.guild.upsert({
//       where: { name: data.name },
//       update: {},
//       create: data,
//     });
//     console.log(`Upserted guild: ${guild.displayName} (ID: ${guild.id})`);
//   }

//   console.log('Guilds seeded.');
// } 