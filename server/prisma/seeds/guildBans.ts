import { PrismaClient, Guild, User } from '@prisma/client';
import { faker } from '@faker-js/faker';

const SPECIAL_GUILD_NAME = 'TheNexusHub';

export async function seedGuildBans(prisma: PrismaClient) {
  console.log('Seeding guild bans (including for Special Guild)...');

  let guilds = await prisma.guild.findMany({ include: { memberships: { select: { userId: true } } } });
  const users = await prisma.user.findMany();

  const specialGuild = guilds.find(g => g.name === SPECIAL_GUILD_NAME);
  if (!specialGuild) {
    console.warn(`⚠️ Special Guild ${SPECIAL_GUILD_NAME} not found for bans...`);
  } else {
    guilds = [specialGuild, ...guilds.filter(g => g.id !== specialGuild.id)];
  }

  if (guilds.length === 0 || users.length < 3) {
    console.warn('⚠️ Not enough guilds or users for bans.');
    return;
  }

  let bansCreatedTotal = 0;
  const guildsToProcessForBans = specialGuild ? [specialGuild] : (guilds.length > 0 ? [faker.helpers.arrayElement(guilds)] : []);

  for (const targetGuild of guildsToProcessForBans) {
    const memberIdsOfTargetGuild = new Set(targetGuild.memberships.map(m => m.userId));
    const nonMembers = users.filter(u => !memberIdsOfTargetGuild.has(u.id));
    let bansForThisGuild = 0;
    const targetBansCount = (targetGuild.name === SPECIAL_GUILD_NAME) ? 2 : 1;

    if (nonMembers.length < targetBansCount) {
      console.warn(`⚠️ Guild ${targetGuild.name} non-members (${nonMembers.length}) < target bans (${targetBansCount}). Skipping.`);
      continue;
    }

    const usersToBan = faker.helpers.shuffle(nonMembers).slice(0, targetBansCount);
    
    let banIssuer: User | undefined = undefined;
    const potentialMemberIssuers = users.filter(u => memberIdsOfTargetGuild.has(u.id) && !usersToBan.some(b => b.id === u.id));
    if (potentialMemberIssuers.length > 0) {
        banIssuer = faker.helpers.arrayElement(potentialMemberIssuers);
    } else {
        const fallbackIssuers = users.filter(u => !usersToBan.some(b => b.id === u.id));
        if (fallbackIssuers.length > 0) {
            banIssuer = faker.helpers.arrayElement(fallbackIssuers);
            console.warn(`No member issuer found for bans in ${targetGuild.name}. Using a non-member issuer.`);
        } else {
            console.error(`❌ CRITICAL: No valid ban issuer found for guild ${targetGuild.name}. Cannot create bans.`);
            continue;
        }
    }

    if (!banIssuer) {
        console.error(`❌ CRITICAL: Ban issuer is undefined for guild ${targetGuild.name}.`);
        continue;
    }

    for (const userToBan of usersToBan) {
      try {
        await prisma.guildBan.create({
          data: {
            guildId: targetGuild.id,
            bannedUserId: userToBan.id,
            bannedByUserId: banIssuer.id,
            reason: faker.lorem.sentence(),
            expiresAt: faker.datatype.boolean(0.3) ? faker.date.future({ years: 1 }) : null,
            isActive: true,
            notes: faker.lorem.paragraph(1),
          },
        });
        console.log(`Banned user ${userToBan.username} from guild ${targetGuild.name} by ${banIssuer.username}.`);
        bansForThisGuild++;
      } catch (e: any) {
        if (e.code === 'P2002') {
          console.warn(`User ${userToBan.username} already banned in ${targetGuild.name}.`);
        } else {
          console.error(`Error banning ${userToBan.username} from ${targetGuild.name}:`, e);
        }
      }
    }
    bansCreatedTotal += bansForThisGuild;
    if (targetGuild.name === SPECIAL_GUILD_NAME && bansForThisGuild < targetBansCount) {
        console.warn(`⚠️ Special guild ${SPECIAL_GUILD_NAME} only got ${bansForThisGuild} bans (target ${targetBansCount}).`);
    }
  }
  console.log(`Guild ban seeding finished. ${bansCreatedTotal} total bans created.`);
} 