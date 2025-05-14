import { PrismaClient, Guild, User, RelationshipType } from '@prisma/client';
import { faker } from '@faker-js/faker';

const relationshipTypes = Object.values(RelationshipType);
const SPECIAL_GUILD_NAME = 'TheNexusHub';

export async function seedGuildRelationships(prisma: PrismaClient) {
  console.log('Seeding guild relationships (including for Special Guild)...');

  const guilds = await prisma.guild.findMany();
  const users = await prisma.user.findMany();

  if (guilds.length < 5) { // Need at least 5 for special guild to have 4 distinct partners
    console.warn('⚠️ Not enough guilds (<5) for varied Special Guild relationships. Skipping or will be limited.');
    // return; // Or proceed with limitations
  }
  if (users.length === 0) {
    console.warn('⚠️ No users to act as creators of relationships. Skipping.');
    return;
  }

  let relationshipsCreated = 0;
  const existingRelations = new Set<string>(); // 'guild1Id-guild2Id' to track pairs with any relationship
  const creator = faker.helpers.arrayElement(users); // One creator for all for simplicity here

  // Ensure Special Guild gets its specific relationships
  const specialGuild = guilds.find(g => g.name === SPECIAL_GUILD_NAME);
  if (specialGuild && guilds.length >=5) {
    const otherGuilds = guilds.filter(g => g.id !== specialGuild.id);
    const shuffledOtherGuilds = faker.helpers.shuffle(otherGuilds);
    const requiredRelationshipTypes: RelationshipType[] = ['PARENT', 'CHILD', 'PARTNER', 'RIVAL'];

    for (let i = 0; i < requiredRelationshipTypes.length && i < shuffledOtherGuilds.length; i++) {
      const targetGuild = shuffledOtherGuilds[i];
      const type = requiredRelationshipTypes[i];
      const key1 = `${specialGuild.id}-${targetGuild.id}`;
      const key2 = `${targetGuild.id}-${specialGuild.id}`;

      if (existingRelations.has(key1) || existingRelations.has(key2)) continue; // Pair already has a relationship
      
      // For PARENT/CHILD, ensure directionality makes sense if we care about one guild being parent *of* another
      let sourceId = specialGuild.id;
      let targetId = targetGuild.id;
      if (type === 'CHILD') { // If TheNexusHub is CHILD, target is PARENT
          sourceId = targetGuild.id; 
          targetId = specialGuild.id;
      }
      // For PARTNER/RIVAL, direction might not matter as much conceptually but does for the DB record

      try {
        await prisma.guildRelationship.create({
          data: { sourceGuildId: sourceId, targetGuildId: targetId, type: type, createdById: creator.id },
        });
        existingRelations.add(key1); existingRelations.add(key2);
        relationshipsCreated++;
        console.log(`Created SPECIAL relationship: ${sourceId===specialGuild.id ? specialGuild.name : targetGuild.name} (${type}) -> ${targetId===specialGuild.id ? specialGuild.name : targetGuild.name}`);
      } catch (e: any) { if (e.code !== 'P2002') console.error(`Err Special Rel ${type}:`, e); else {existingRelations.add(key1); existingRelations.add(key2);}}
    }
  } else if (!specialGuild) {
      console.warn(`Special Guild ${SPECIAL_GUILD_NAME} not found for relationships.`);
  } else {
      console.warn(`Not enough other guilds for all special relationships for ${SPECIAL_GUILD_NAME}.`);
  }

  // Create some more random relationships for other guilds
  const maxRelationshipsPerGuild = Math.max(1, Math.floor(guilds.length / 4));
  for (const sourceGuild of guilds) {
    if(sourceGuild.name === SPECIAL_GUILD_NAME && guilds.length >=5) continue; // Skip special guild if it got its specific ones

    const potentialTargetGuilds = guilds.filter(g => g.id !== sourceGuild.id);
    const shuffledTargets = faker.helpers.shuffle(potentialTargetGuilds);
    let relationshipsForThisGuild = 0;

    for (const targetGuild of shuffledTargets) {
      if (relationshipsForThisGuild >= maxRelationshipsPerGuild) break;
      const key1 = `${sourceGuild.id}-${targetGuild.id}`;
      const key2 = `${targetGuild.id}-${sourceGuild.id}`;
      if (existingRelations.has(key1) || existingRelations.has(key2)) continue;

      const relationshipType = faker.helpers.arrayElement(relationshipTypes);
      try {
        await prisma.guildRelationship.create({
          data: { sourceGuildId: sourceGuild.id, targetGuildId: targetGuild.id, type: relationshipType, createdById: creator.id },
        });
        existingRelations.add(key1); existingRelations.add(key2);
        relationshipsCreated++; relationshipsForThisGuild++;
        // console.log(`Created relationship: ${sourceGuild.name} (${relationshipType}) -> ${targetGuild.name}`);
      } catch (e: any) { if (e.code !== 'P2002') console.error(`Err Gen Rel ${sourceGuild.name}:`, e); else {existingRelations.add(key1); existingRelations.add(key2);}}
    }
  }
  console.log(`Guild relationships seeding finished. ${relationshipsCreated} total relationships created.`);
} 