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

  // Ensure TestUserPrime and Special Guild are handled, then ArtisanCrafters, then others
  const predefinedGuilds = [
    { name: SPECIAL_GUILD_NAME, displayName: 'The Nexus Hub', description: 'The central hub for all extraordinary activities and collaborations.', isSpecial: true, byTestUserPrime: true },
    { name: 'ArtisanCrafters', displayName: 'Artisan Crafters Collective', description: 'A guild for dedicated craftspeople and artisans.', isSpecial: false, byTestUserPrime: false },
  ];

  for (const predefinedGuild of predefinedGuilds) {
    let creator = testUserPrime; // Default for special, can be changed for others
    if (!predefinedGuild.byTestUserPrime) {
      // Find a random creator that isn't TestUserPrime if possible
      const otherUsers = users.filter(u => u.id !== testUserPrime?.id);
      creator = otherUsers.length > 0 ? faker.helpers.arrayElement(otherUsers) : users[0];
    }
    if (!creator) creator = users[0]; // Absolute fallback

    try {
      const guild = await prisma.guild.upsert({
        where: { name: predefinedGuild.name },
        update: {
          displayName: predefinedGuild.displayName,
          description: predefinedGuild.description,
          avatar: getRandomPicsumUrl(128, 128),
          isOpen: predefinedGuild.isSpecial ? true : faker.datatype.boolean(),
          updatedById: creator.id,
        },
        create: {
          name: predefinedGuild.name,
          displayName: predefinedGuild.displayName,
          description: predefinedGuild.description,
          avatar: getRandomPicsumUrl(128, 128),
          isOpen: predefinedGuild.isSpecial ? true : faker.datatype.boolean(),
          createdById: creator.id,
          updatedById: creator.id,
        },
      });
      createdGuilds.push(guild);
      console.log(`   Upserted predefined guild: ${guild.name} by ${creator.username}${predefinedGuild.isSpecial ? ' [SPECIAL GUILD]' : ''}`);
      // Contacts for predefined guilds (same logic as before)
      const existingContacts = await prisma.guildContact.count({ where: { guildId: guild.id } });
      if (existingContacts === 0) {
        const numberOfContacts = faker.number.int({ min: 1, max: 2 });
        for (let j = 0; j < numberOfContacts; j++) {
          const contactType = faker.helpers.arrayElement(contactTypes.filter(ct => ct !== 'CUSTOM'));
          let value = '';
          switch (contactType) {
            case 'EMAIL': value = faker.internet.email(); break;
            case 'WEBSITE': value = faker.internet.url(); break;
            case 'DISCORD': value = `https://discord.gg/${faker.string.alphanumeric(7)}`; break;
            case 'TWITTER': value = `https://twitter.com/${faker.internet.username().replace(/[^a-zA-Z0-9_]/g, '')}`; break;
            case 'GITHUB': value = `https://github.com/${faker.internet.username().replace(/[^a-zA-Z0-9_]/g, '')}`; break;
            default: value = faker.lorem.slug();
          }
          await prisma.guildContact.create({
            data: { guildId: guild.id, type: contactType, value: value, label: undefined, displayOrder: j },
          });
        }
      }
    } catch (e: any) {
      console.error(`Error upserting predefined guild ${predefinedGuild.name}:`, e);
    }
  }

  // Create remaining faker guilds if needed (guildsToCreate - predefinedGuilds.length)
  const remainingGuildsToCreate = Math.max(0, guildsToCreate - predefinedGuilds.length);

  for (let i = 0; i < remainingGuildsToCreate; i++) {
    let guildName = faker.company.name().replace(/[^a-zA-Z0-9_]/g, '') + faker.string.alphanumeric(3);
    let attempt = 0;
    let existingGuildByName = await prisma.guild.findUnique({where: {name: guildName}});
    while(existingGuildByName && attempt < 5) {
        guildName = faker.company.name().replace(/[^a-zA-Z0-9_]/g, '') + faker.string.alphanumeric(3+attempt);
        existingGuildByName = await prisma.guild.findUnique({where: {name: guildName}});
        attempt++;
    }
    if(existingGuildByName) continue; // Skip if still can't find unique name

    const displayName = faker.company.name();
    const description = faker.lorem.paragraph();
    const randomCreator = users.filter(u => u.id !== testUserPrime?.id).length > 0 
                        ? faker.helpers.arrayElement(users.filter(u => u.id !== testUserPrime?.id)) 
                        : users[0];
    if(!randomCreator) {console.error("No user found for random guild creation"); continue; }

    try {
      const guild = await prisma.guild.create({ // Using create for these as name is now more reliably unique
        data: {
          name: guildName,
          displayName: displayName,
          description: description,
          avatar: getRandomPicsumUrl(128, 128),
          isOpen: faker.datatype.boolean(),
          createdById: randomCreator.id,
          updatedById: randomCreator.id,
        },
      });
      createdGuilds.push(guild);
      console.log(`   Created faker guild: ${guild.name} by ${randomCreator.username}`);
      // Contacts for faker guilds
      const numberOfContacts = faker.number.int({ min: 0, max: 2 });
      for (let j = 0; j < numberOfContacts; j++) {
        const contactType = faker.helpers.arrayElement(contactTypes.filter(ct => ct !== 'CUSTOM'));
        let value = '';
        switch (contactType) {
          case 'EMAIL': value = faker.internet.email(); break;
          case 'WEBSITE': value = faker.internet.url(); break;
          case 'DISCORD': value = `https://discord.gg/${faker.string.alphanumeric(7)}`; break;
          case 'TWITTER': value = `https://twitter.com/${faker.internet.username().replace(/[^a-zA-Z0-9_]/g, '')}`; break;
          case 'GITHUB': value = `https://github.com/${faker.internet.username().replace(/[^a-zA-Z0-9_]/g, '')}`; break;
          default: value = faker.lorem.slug();
        }
        await prisma.guildContact.create({
          data: { guildId: guild.id, type: contactType, value: value, label: undefined, displayOrder: j },
        });
      }
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.warn(`Skipping faker guild creation due to name conflict: ${guildName}`);
      } else {
        console.error(`Error creating faker guild ${guildName}:`, e);
      }
    }
  }
  // console.log(`✅ Guilds seeding finished. ${createdGuilds.length} total guilds in this run (predefined + faker).`);
  // Final count should be done by counting actual guilds in DB or based on upsert results
  const totalGuilds = await prisma.guild.count();
  console.log(`✅ Guilds seeding finished. Total guilds in DB: ${totalGuilds}. Guilds processed in this run: ${createdGuilds.length}.`);
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