import { PrismaClient, Guild, User, RelationshipType } from '@prisma/client';
import { faker } from '@faker-js/faker';

// const relationshipTypes = Object.values(RelationshipType); // CHILD is removed
const relationshipTypes: RelationshipType[] = [RelationshipType.PARENT, RelationshipType.PARTNER, RelationshipType.RIVAL];

const SPECIAL_GUILD_NAME = 'TheNexusHub';

export async function seedGuildRelationships(prisma: PrismaClient) {
  console.log('Seeding guild relationships (including for Special Guild)...');

  const guilds = await prisma.guild.findMany();
  const users = await prisma.user.findMany();

  if (guilds.length < 5) { // Need at least 5 for special guild to have 4 distinct partners/hierarchies
    console.warn('⚠️ Not enough guilds (<5) for varied Special Guild relationships. Skipping or will be limited.');
  }
  if (users.length === 0) {
    console.warn('⚠️ No users to act as proposers/accepters of relationships. Skipping.');
    return;
  }

  let relationshipsCreated = 0;
  const existingRelations = new Set<string>(); // 'guild1Id-guild2Id' to track pairs with any relationship
  
  const proposerUser = faker.helpers.arrayElement(users);
  let accepterUser = proposerUser;
  if (users.length > 1) {
    accepterUser = faker.helpers.arrayElement(users.filter(u => u.id !== proposerUser.id));
  }


  // Ensure Special Guild gets its specific relationships
  const specialGuild = guilds.find(g => g.name === SPECIAL_GUILD_NAME);
  if (specialGuild && guilds.length >=5) {
    const otherGuilds = guilds.filter(g => g.id !== specialGuild.id);
    const shuffledOtherGuilds = faker.helpers.shuffle(otherGuilds);
    
    // Order: TheNexusHub is PARENT, TheNexusHub is CHILD (target of PARENT), PARTNER, RIVAL
    const requiredRelationshipSetups: {type: RelationshipType, nexusIsSource: boolean}[] = [
        { type: RelationshipType.PARENT, nexusIsSource: true },  // TheNexusHub is PARENT
        { type: RelationshipType.PARENT, nexusIsSource: false }, // TheNexusHub is CHILD
        { type: RelationshipType.PARTNER, nexusIsSource: true }, // For partner/rival, nexusIsSource can be true; canonical order for symmetric types handled by DB or later logic if needed
        { type: RelationshipType.RIVAL, nexusIsSource: true },
    ];


    for (let i = 0; i < requiredRelationshipSetups.length && i < shuffledOtherGuilds.length; i++) {
      const targetPartnerGuild = shuffledOtherGuilds[i]; // The "other" guild in the relationship
      const setup = requiredRelationshipSetups[i];
      
      let sourceId: string;
      let targetId: string;
      const type = setup.type;

      if (setup.nexusIsSource) {
          sourceId = specialGuild.id;
          targetId = targetPartnerGuild.id;
      } else { // TheNexusHub is the target (e.g., the child in a PARENT relationship)
          sourceId = targetPartnerGuild.id;
          targetId = specialGuild.id;
      }
      
      // For symmetrical types PARTNER & RIVAL, enforce canonical order (smaller ID first as source)
      // to align with potential application logic for @@unique([sourceGuildId, targetGuildId])
      if (type === RelationshipType.PARTNER || type === RelationshipType.RIVAL) {
        if (sourceId > targetId) {
          [sourceId, targetId] = [targetId, sourceId];
        }
      }

      const key1 = `${sourceId}-${targetId}`; // Key based on actual source/target
      const key2 = `${targetId}-${sourceId}`; // Reverse key

      if (existingRelations.has(key1)) continue; // Pair already has this specific directional relationship (should be caught by DB unique anyway)
      // For symmetric relationships, check existingRelations.has(key2) is implicitly handled by canonical ordering and then existingRelations.has(key1)

      try {
        await prisma.guildRelationship.create({
          data: { 
            sourceGuildId: sourceId, 
            targetGuildId: targetId, 
            type: type, 
            proposerUserId: proposerUser.id,
            accepterUserId: accepterUser.id 
          },
        });
        existingRelations.add(key1);
        relationshipsCreated++;
        console.log(`Created SPECIAL relationship: ${sourceId === specialGuild.id ? specialGuild.name : targetPartnerGuild.name} (${type}) ${targetId === specialGuild.id ? specialGuild.name : targetPartnerGuild.name}`);
      } catch (e: any) { 
        if (e.code !== 'P2002') { // P2002 is unique constraint violation
            console.error(`Err Special Rel ${type} between ${sourceId} and ${targetId}:`, e);
        } else {
            // If P2002, means this specific source-target pair already exists. Add to set to prevent retries.
            existingRelations.add(key1); 
        }
      }
    }
  } else if (!specialGuild) {
      console.warn(`Special Guild ${SPECIAL_GUILD_NAME} not found for relationships.`);
  } else {
      console.warn(`Not enough other guilds for all special relationships for ${SPECIAL_GUILD_NAME}.`);
  }

  // Create some more random relationships for other guilds
  const maxRelationshipsPerGuild = Math.max(1, Math.floor(guilds.length / 4));
  for (const sourceGuildIter of guilds) {
    if(sourceGuildIter.name === SPECIAL_GUILD_NAME && guilds.length >=5) continue; 

    const potentialTargetGuilds = guilds.filter(g => g.id !== sourceGuildIter.id);
    const shuffledTargets = faker.helpers.shuffle(potentialTargetGuilds);
    let relationshipsForThisGuild = 0;

    for (const targetGuildIter of shuffledTargets) {
      if (relationshipsForThisGuild >= maxRelationshipsPerGuild) break;

      let sourceIdRand = sourceGuildIter.id;
      let targetIdRand = targetGuildIter.id;
      const relationshipTypeRand = faker.helpers.arrayElement(relationshipTypes);

      // For symmetrical types PARTNER & RIVAL, enforce canonical order
      if (relationshipTypeRand === RelationshipType.PARTNER || relationshipTypeRand === RelationshipType.RIVAL) {
        if (sourceIdRand > targetIdRand) {
          [sourceIdRand, targetIdRand] = [targetIdRand, sourceIdRand];
        }
      }
      
      const key1Rand = `${sourceIdRand}-${targetIdRand}`;
      const key2Rand = `${targetIdRand}-${sourceIdRand}`; // Though for canonical, key2Rand might not be needed for check if key1Rand is canonical

      // Check if this specific canonical relationship already exists
      if (existingRelations.has(key1Rand)) continue;


      try {
        await prisma.guildRelationship.create({
          data: { 
            sourceGuildId: sourceIdRand, 
            targetGuildId: targetIdRand, 
            type: relationshipTypeRand, 
            proposerUserId: proposerUser.id,
            accepterUserId: accepterUser.id
          },
        });
        existingRelations.add(key1Rand);
        relationshipsCreated++; 
        relationshipsForThisGuild++;
      } catch (e: any) { 
        if (e.code !== 'P2002') {
          console.error(`Err Gen Rel ${sourceGuildIter.name} (${relationshipTypeRand}) ${targetGuildIter.name}:`, e);
        } else {
          existingRelations.add(key1Rand); // Add to set even if caught by DB, to avoid re-logging for same pair
        }
      }
    }
  }
  console.log(`Guild relationships seeding finished. ${relationshipsCreated} total relationships created.`);
} 