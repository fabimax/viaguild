import { PrismaClient, User, ContactType } from '@prisma/client';
import { faker } from '@faker-js/faker';

const contactTypes = Object.values(ContactType);
const SPECIAL_GUILD_NAME = 'TheNexusHub'; // Defined here as well

export async function seedGuilds(prisma: PrismaClient) {
  console.log('Seeding guilds with contacts (and Special Guild)...');

  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.warn('⚠️ No users found to assign as guild creators. Skipping guild seeding.');
    return;
  }

  const guildsToCreate = 10;
  const createdGuilds = [];

  for (let i = 0; i < guildsToCreate; i++) {
    // Ensure the first guild is the Special Guild
    const isSpecialGuild = i === 0;
    const guildName = isSpecialGuild ? SPECIAL_GUILD_NAME : faker.company.name().replace(/[^a-zA-Z0-9_]/g, '') + faker.string.alphanumeric(3);
    const displayName = isSpecialGuild ? 'The Nexus Hub' : faker.company.name();
    const description = isSpecialGuild ? 'The central hub for all extraordinary activities and collaborations.' : faker.lorem.paragraph();

    const creator = users[Math.floor(Math.random() * users.length)];

    try {
      const guild = await prisma.guild.create({
        data: {
          name: guildName,
          displayName: displayName,
          description: description,
          avatar: faker.image.urlLoremFlickr({ category: isSpecialGuild ? 'city' : 'abstract' }),
          isOpen: isSpecialGuild ? true : faker.datatype.boolean(),
          createdById: creator.id,
          updatedById: creator.id,
        },
      });
      createdGuilds.push(guild);
      console.log(`Created guild: ${guild.name} (ID: ${guild.id}) by ${creator.username}${isSpecialGuild ? ' [SPECIAL GUILD]' : ''}`);

      // Seed contacts for this guild
      const numberOfContacts = faker.number.int({ min: 1, max: 3 }); // 1 to 3 contacts per guild
      for (let j = 0; j < numberOfContacts; j++) {
        const contactType = faker.helpers.arrayElement(contactTypes);
        let value = '';
        switch (contactType) {
          case 'EMAIL':
            value = faker.internet.email();
            break;
          case 'WEBSITE':
            value = faker.internet.url();
            break;
          case 'DISCORD':
            value = `https://discord.gg/${faker.lorem.word()}${faker.string.alphanumeric(4)}`;
            break;
          case 'TWITTER':
            value = `https://twitter.com/${faker.internet.userName().replace(/[^a-zA-Z0-9_]/g, '')}`;
            break;
          case 'GITHUB':
            value = `https://github.com/${faker.internet.userName().replace(/[^a-zA-Z0-9_]/g, '')}`;
            break;
          default:
            value = faker.lorem.slug(); // Generic value for other types
        }
        await prisma.guildContact.create({
          data: {
            guildId: guild.id,
            type: contactType,
            value: value,
            label: contactType === 'CUSTOM' ? faker.lorem.words(2) : null,
            displayOrder: j,
          },
        });
      }
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.warn(`Skipping guild creation due to name conflict: ${guildName}`);
        if (isSpecialGuild) {
          console.error('CRITICAL: Special guild TheNexusHub conflict. Seeding might not meet all special requirements.');
        }
      } else {
        console.error(`Error creating guild ${guildName}:`, e);
      }
    }
  }
  console.log(`Guilds seeding finished. ${createdGuilds.length} new guilds created.`);
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