import { 
  PrismaClient, 
  User, 
  Guild, 
  SystemIcon, 
  UploadedAsset, 
  BadgeTemplate, 
  MetadataFieldDefinition,
  BadgeShape,
  BadgeTier,
  EntityType,
  Prisma
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { TEST_USER_PRIME_USERNAME } from './users';
import { SPECIAL_GUILD_NAME } from './guilds';
import { seededUploadedAssets } from './uploadedAssets'; // Assuming this exports the Map
import { systemIconSeedData } from './system/systemIcons'; // Assuming this exports the array of icon data (we'll need their names or IDs)

// Helper to get a specific seeded asset URL by its key used in uploadedAssets.ts
function getAssetUrl(key: string): string {
  const asset = seededUploadedAssets.get(key);
  if (!asset) {
    console.warn(`⚠️ Seeded asset with key "${key}" not found. Using placeholder.`);
    // Fallback to a generic Picsum URL if a specific asset isn't found
    return `https://picsum.photos/seed/${key.replace(/[^a-zA-Z0-9]/g, '')}/200/200`;
  }
  return asset.hostedUrl;
}

// Helper to get a system icon ID by its unique name
// This assumes systemIconSeedData contains objects with at least { id: string, name: string }
// If systemIconSeedData only contains data for creation (without ID), we'd fetch from DB instead.
function getSystemIconId(name: string, allSystemIcons: SystemIcon[]): string {
    const icon = allSystemIcons.find(i => i.name === name);
    if (!icon) {
        console.warn(`⚠️ System icon with name "${name}" not found. Using a default or placeholder NAME.`);
        // Fallback to the first available system icon's name or a known placeholder NAME
        return allSystemIcons[0]?.name || 'QuestionMarkIcon_FallbackName'; 
    }
    return icon.name; // Return the name, not the ID
}


interface BadgeTemplateSeedData extends Omit<BadgeTemplate, 'id' | 'createdAt' | 'updatedAt' | 'instances' | 'metadataFieldDefinitions' | 'templateSlug_ci' | 'authoredByUser'> { 
  templateSlug: string;
  authoredByUserId: string | null;
  ownedByUserId: string | null;
  ownedByGuildId: string | null;
  // New discriminated union fields
  ownerType: EntityType | null;
  ownerId: string | null;
  // Add the new "measure" fields
  definesMeasure: boolean;
  measureLabel: string | null;
  measureBest: number | null;
  measureWorst: number | null;
  measureNotes: string | null;
  measureIsNormalizable: boolean;
  higherIsBetter: boolean | null;
  measureBestLabel: string | null;
  measureWorstLabel: string | null;
  metadataFields?: Omit<MetadataFieldDefinition, 'id' | 'badgeTemplateId' | 'badgeTemplate'>[];
  
  
  // New unified config fields (required for seeds)
  defaultBorderConfig: Prisma.JsonValue | null;
  defaultBackgroundConfig: Prisma.JsonValue | null;
  defaultForegroundConfig: Prisma.JsonValue | null;
}

// Helper functions for creating config objects
function createSimpleColorConfig(color: string): Prisma.JsonValue {
  return {
    type: 'simple-color',
    version: 1,
    color: color
  };
}

function createSystemIconConfig(iconName: string, color: string): Prisma.JsonValue {
  return {
    type: 'system-icon',
    version: 1,
    value: iconName,
    color: color
  };
}

function createHostedAssetConfig(url: string): Prisma.JsonValue {
  return {
    type: 'static-image-asset',
    version: 1,
    url: url
  };
}

export async function seedBadgeTemplates(prisma: PrismaClient) {
  console.log('🌱 Seeding badge templates...');

  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  const guilds = await prisma.guild.findMany({ select: { id: true, name: true } });
  const allSystemIcons = await prisma.systemIcon.findMany(); // Fetch all seeded system icons

  const testUserPrime = users.find(u => u.username === TEST_USER_PRIME_USERNAME);
  const specialGuild = guilds.find(g => g.name === SPECIAL_GUILD_NAME);
  const systemDesignerUser = users[0]; // Fallback or a designated system content creator user
  const artisanCraftersGuild = guilds.find(g => g.name === 'ArtisanCrafters'); // Fetch ArtisanCrafters guild

  if (!testUserPrime) {
    console.warn(`⚠️ TestUserPrime not found. Some templates might not be correctly authored/owned.`);
  }
  if (!specialGuild) {
    console.warn(`⚠️ Special Guild ${SPECIAL_GUILD_NAME} not found. Some templates might not be correctly owned.`);
  }
  if (!artisanCraftersGuild) { // Add warning for ArtisanCrafters
    console.warn('⚠️ Guild "ArtisanCrafters" not found. Template 7 might not be correctly owned or might fail if it depends on it.');
  }
  if (allSystemIcons.length === 0) {
    console.warn('⚠️ No system icons found. Foreground icons for templates might be missing.');
  }
   if (seededUploadedAssets.size === 0) {
    console.warn('⚠️ No uploaded assets found from seeder. Image backgrounds/icons might be missing.');
  }

  const badgeTemplatesData: BadgeTemplateSeedData[] = [
    // Template 1: "Site Pioneer" (Static, System Owned, Gold Tier, basic metadata)
    {
      templateSlug: 'system_site_pioneer',
      internalNotes: 'Awarded to the first 100 users who joined ViaGuild.',
      authoredByUserId: systemDesignerUser?.id || null,
      ownedByUserId: null,
      ownedByGuildId: null,
      ownerType: null, // System template - no owner
      ownerId: null,
      isArchived: false,
      isModifiableByIssuer: false,
      allowsPushedInstanceUpdates: false,
      inherentTier: BadgeTier.GOLD,
      defaultBadgeName: 'Site Pioneer',
      defaultSubtitleText: 'Early Adopter',
      defaultOuterShape: BadgeShape.HEXAGON,
      // New unified config fields
      defaultBorderConfig: createSimpleColorConfig('#FFD700'),
      defaultBackgroundConfig: createSimpleColorConfig('#4A0404'),
      defaultForegroundConfig: createSystemIconConfig(getSystemIconId('Glowing Star', allSystemIcons), '#FFD700'),
      defaultDisplayDescription: 'This badge is awarded to users who joined ViaGuild in its very early days, recognizing their foundational support.',
      definesMeasure: false,
      measureLabel: null,
      measureBest: null,
      measureWorst: null,
      measureNotes: null,
      measureIsNormalizable: false,
      higherIsBetter: null,
      measureBestLabel: null,
      measureWorstLabel: null,
      metadataFields: [
        {
          fieldKeyForInstanceData: 'joinDate',
          label: 'Joined On:',
          prefix: null, 
          suffix: null, 
          style: 'METADATA_DATE',
          displayOrder: 0,
        },
        {
          fieldKeyForInstanceData: 'userNumber',
          label: 'Pioneer #:',
          prefix: null,
          suffix: null,
          style: 'METADATA_NUMBER',
          displayOrder: 1,
        },
      ],
    },

    // Template 2: "TheNexusHub Founder" (Static, Owned by TheNexusHub, TestUserPrime author, special styling)
    {
      templateSlug: `guild_${SPECIAL_GUILD_NAME}_founder`,
      internalNotes: 'Awarded to the founder of TheNexusHub.',
      authoredByUserId: testUserPrime?.id || systemDesignerUser?.id,
      ownedByUserId: null,
      ownedByGuildId: specialGuild?.id || null,
      ownerType: specialGuild ? ('GUILD' as EntityType) : null,
      ownerId: specialGuild?.id || null,
      isArchived: false,
      isModifiableByIssuer: false,
      allowsPushedInstanceUpdates: false,
      inherentTier: BadgeTier.GOLD,
      defaultBadgeName: 'Nexus Visionary',
      defaultSubtitleText: `Founder of ${SPECIAL_GUILD_NAME}`,
      defaultOuterShape: BadgeShape.SQUARE,
      // New unified config fields
      defaultBorderConfig: createSimpleColorConfig('#C0C0C0'),
      defaultBackgroundConfig: createHostedAssetConfig(getAssetUrl('BADGE_BACKGROUND_IMAGE_10')),
      defaultForegroundConfig: createSystemIconConfig(getSystemIconId('Shield', allSystemIcons), '#FFFFFF'),
      defaultDisplayDescription: `Awarded to the esteemed founder of ${SPECIAL_GUILD_NAME}, for their vision and leadership.`,
      definesMeasure: false,
      measureLabel: null,
      measureBest: null,
      measureWorst: null,
      measureNotes: null,
      measureIsNormalizable: false,
      higherIsBetter: null,
      measureBestLabel: null,
      measureWorstLabel: null,
      metadataFields: [
        {
          fieldKeyForInstanceData: 'foundingDate',
          label: 'Established:',
          prefix: null,
          suffix: null,
          style: 'METADATA_INFO',
          displayOrder: 0,
        },
      ],
    },

    // Template 3: "TestUserPrime's Project Completion" (Modifiable, Owned by TUP, uses measure)
    {
        templateSlug: `user_${TEST_USER_PRIME_USERNAME}_project_alpha`,
        internalNotes: 'A badge TestUserPrime can award for completing their personal projects.',
        authoredByUserId: testUserPrime?.id || systemDesignerUser?.id,
        ownedByUserId: testUserPrime?.id || null,
        ownedByGuildId: null,
        ownerType: testUserPrime ? ('USER' as EntityType) : null,
        ownerId: testUserPrime?.id || null,
        isArchived: false,
        isModifiableByIssuer: true,
        allowsPushedInstanceUpdates: true,
        inherentTier: BadgeTier.SILVER,
        defaultBadgeName: 'Project Complete',
        defaultSubtitleText: 'Milestone Achieved',
        defaultOuterShape: BadgeShape.CIRCLE,
        // New unified config fields
        defaultBorderConfig: createSimpleColorConfig('#0284c7'),
        defaultBackgroundConfig: createSimpleColorConfig('#e0f2fe'),
        defaultForegroundConfig: createSystemIconConfig(getSystemIconId('Checkmark Seal', allSystemIcons), '#0284c7'),
        defaultDisplayDescription: 'Awarded upon successful completion of a significant project phase or the entire project.',
        definesMeasure: true,
        measureLabel: 'Project Difficulty',
        measureBest: 10,
        measureWorst: 1,
        measureNotes: 'Difficulty scale from 1 (easy) to 10 (very hard).',
        measureIsNormalizable: true,
        higherIsBetter: true,
        measureBestLabel: 'Max Difficulty',
        measureWorstLabel: 'Min Difficulty',
        metadataFields: [
          {
            fieldKeyForInstanceData: 'projectName',
            label: 'Project:',
            prefix: null,
            suffix: null,
            style: 'METADATA_HEADER',
            displayOrder: 0,
          },
          {
            fieldKeyForInstanceData: 'completionDate',
            label: 'Completed On:',
            prefix: null,
            suffix: null,
            style: 'METADATA_DATE',
            displayOrder: 1,
          },
          {
            fieldKeyForInstanceData: 'hoursSpent',
            label: 'Effort (hrs):',
            prefix: null,
            suffix: null,
            style: 'METADATA_NUMBER',
            displayOrder: 2,
          },
        ],
    },
    // Template 4: "Nexus Hub Contributor" (Guild-owned by TheNexusHub, Silver tier, modifiable content)
    {
      templateSlug: `guild_${SPECIAL_GUILD_NAME}_contributor`,
      internalNotes: 'Recognizes consistent and valuable contributions to TheNexusHub.',
      authoredByUserId: testUserPrime?.id || systemDesignerUser?.id, // Authored by TUP or system admin
      ownedByUserId: null,
      ownedByGuildId: specialGuild?.id || null,
      ownerType: specialGuild ? ('GUILD' as EntityType) : null,
      ownerId: specialGuild?.id || null,
      isArchived: false,
      isModifiableByIssuer: true, // Guild admins can update the look/description of this badge type
      allowsPushedInstanceUpdates: false, // Instance data (metadata) is set at award, not typically live-updated by issuer
      inherentTier: BadgeTier.SILVER,
      defaultBadgeName: 'Nexus Contributor',
      defaultSubtitleText: 'Valued Member',
      defaultOuterShape: BadgeShape.HEART,
      // New unified config fields
      defaultBorderConfig: createSimpleColorConfig('#A0A0A0'),
      defaultBackgroundConfig: createSimpleColorConfig('#E9E9E9'),
      defaultForegroundConfig: createSystemIconConfig(getSystemIconId('Filled Heart', allSystemIcons), '#CD7F32'),
      defaultDisplayDescription: 'Awarded to members who consistently make positive contributions to The Nexus Hub community, discussions, or projects.',
      definesMeasure: false,
      measureLabel: null, 
      measureBest: null,    
      measureWorst: null,   
      measureNotes: null,   
      measureIsNormalizable: false, 
      higherIsBetter: null,
      measureBestLabel: null,
      measureWorstLabel: null,
      metadataFields: [
        {
          fieldKeyForInstanceData: 'contributionType',
          label: 'Area:',
          prefix: null, suffix: null,
          style: 'METADATA_CATEGORY',
          displayOrder: 0,
        },
        {
          fieldKeyForInstanceData: 'contributionDate',
          label: 'Date:',
          prefix: null, suffix: null,
          style: 'METADATA_DATE',
          displayOrder: 1,
        },
      ],
    },
    // Template 5: "Generic Participation Badge" (System template, no tier, very basic)
    {
      templateSlug: 'system_generic_participation',
      internalNotes: 'A simple badge to acknowledge participation in any event or activity.',
      authoredByUserId: systemDesignerUser?.id || null,
      ownedByUserId: null,
      ownedByGuildId: null,
      ownerType: null, // System template
      ownerId: null, // System template
      isArchived: false,
      isModifiableByIssuer: false,
      allowsPushedInstanceUpdates: false,
      inherentTier: null, // No specific tier
      defaultBadgeName: 'Participant',
      defaultSubtitleText: 'Thank You!',
      defaultOuterShape: BadgeShape.CIRCLE,
      // New unified config fields
      defaultBorderConfig: createSimpleColorConfig('#6B7280'),
      defaultBackgroundConfig: createSimpleColorConfig('#F3F4F6'),
      defaultForegroundConfig: createSystemIconConfig(getSystemIconId('Checkmark Seal', allSystemIcons), '#4B5563'),
      defaultDisplayDescription: 'This badge acknowledges participation in an event or activity.',
      definesMeasure: false,
      measureLabel: null, 
      measureBest: null,    
      measureWorst: null,   
      measureNotes: null,   
      measureIsNormalizable: false, 
      higherIsBetter: null,
      measureBestLabel: null,
      measureWorstLabel: null,
      metadataFields: [
        {
          fieldKeyForInstanceData: 'eventName',
          label: 'Event:',
          prefix: null, suffix: null,
          style: 'METADATA_EVENT_NAME',
          displayOrder: 0,
        },
      ],
    },
    // Template 6: "TestUserPrime's Live Rank Badge" (User-owned by TUP, allows pushed instance updates for measureValue)
    {
      templateSlug: `user_${TEST_USER_PRIME_USERNAME}_live_rank`,
      internalNotes: 'A badge TestUserPrime uses to show a live-updated rank or score.',
      authoredByUserId: testUserPrime?.id || systemDesignerUser?.id,
      ownedByUserId: testUserPrime?.id || null,
      ownedByGuildId: null,
      ownerType: testUserPrime ? ('USER' as EntityType) : null,
      ownerId: testUserPrime?.id || null,
      isArchived: false,
      isModifiableByIssuer: true, // TUP might change the base look of their rank badge
      allowsPushedInstanceUpdates: true, // Crucial: TUP's system will push updates to measureValue
      inherentTier: null, // Rank itself is the value, not tied to G/S/B allocation
      defaultBadgeName: 'Current Rank',
      defaultSubtitleText: 'Player Standing',
      defaultOuterShape: BadgeShape.SQUARE,
      // New unified config fields
      defaultBorderConfig: createSimpleColorConfig('#3B82F6'),
      defaultBackgroundConfig: createHostedAssetConfig(getAssetUrl('BADGE_BACKGROUND_IMAGE_20')),
      defaultForegroundConfig: createSimpleColorConfig('#FFFFFF'),
      defaultDisplayDescription: 'Displays the current competitive ranking, updated periodically.',
      definesMeasure: true,
      measureLabel: 'Rank Tier',
      measureBest: 1,    // Lower is better for rank
      measureWorst: 100, // e.g. 100 ranks
      measureNotes: 'Player rank, where 1 is the highest. Updated by external system.',
      measureIsNormalizable: true, // Can be normalized (e.g. 1st out of 100 is 100th percentile)
      higherIsBetter: false, // Lower rank number is better
      measureBestLabel: 'Top Rank',
      measureWorstLabel: 'Lowest Rank',
      metadataFields: [
        {
          fieldKeyForInstanceData: 'rankNameDetail',
          label: 'Tier:',
          prefix: null, suffix: null,
          style: 'METADATA_INFO',
          displayOrder: 0,
        },
        {
          fieldKeyForInstanceData: 'lastUpdated',
          label: 'As of:',
          prefix: null, suffix: null,
          style: 'METADATA_TIMESTAMP',
          displayOrder: 1,
        },
      ],
    },
    // Template 7: "Artisan Guild - Bronze Achievement" (Owned by ArtisanCrafters guild, Bronze, static)
    {
      templateSlug: 'guild_ArtisanCrafters_bronze_craft', 
      internalNotes: 'Standard bronze crafting achievement for the Artisan Crafters guild.',
      authoredByUserId: systemDesignerUser?.id, 
      ownedByUserId: null,
      ownedByGuildId: artisanCraftersGuild?.id || null, // Use the fetched ID
      ownerType: artisanCraftersGuild ? ('GUILD' as EntityType) : null,
      ownerId: artisanCraftersGuild?.id || null,
      isArchived: false,
      isModifiableByIssuer: false,
      allowsPushedInstanceUpdates: false,
      inherentTier: BadgeTier.BRONZE,
      defaultBadgeName: 'Bronze Craftsmanship',
      defaultSubtitleText: 'Artisan Guild Award',
      defaultOuterShape: BadgeShape.HEXAGON,
      // New unified config fields
      defaultBorderConfig: createSimpleColorConfig('#CD7F32'),
      defaultBackgroundConfig: createSimpleColorConfig('#6B4226'),
      defaultForegroundConfig: createSystemIconConfig(getSystemIconId('Ribbon Award', allSystemIcons), '#CD7F32'),
      defaultDisplayDescription: 'Recognizes foundational skill and dedication in craftsmanship within the Artisan Guild.',
      definesMeasure: false,
      measureLabel: null, 
      measureBest: null,    
      measureWorst: null,   
      measureNotes: null,   
      measureIsNormalizable: false, 
      higherIsBetter: null,
      measureBestLabel: null,
      measureWorstLabel: null,
      metadataFields: [
        {
          fieldKeyForInstanceData: 'craftType',
          label: 'Specialty:',
          prefix: null, suffix: null,
          style: 'METADATA_TAG',
          displayOrder: 0,
        },
      ],
    },
    // Template 8: "Lore Master" (Owned by TheNexusHub, text-based foreground, detailed metadata)
    {
      templateSlug: `guild_${SPECIAL_GUILD_NAME}_lore_master`,
      internalNotes: 'For members who demonstrate exceptional knowledge of TheNexusHub lore.',
      authoredByUserId: testUserPrime?.id || systemDesignerUser?.id,
      ownedByUserId: null,
      ownedByGuildId: specialGuild?.id || null,
      ownerType: specialGuild ? ('GUILD' as EntityType) : null,
      ownerId: specialGuild?.id || null,
      isArchived: false,
      isModifiableByIssuer: false,
      allowsPushedInstanceUpdates: false,
      inherentTier: BadgeTier.SILVER,
      defaultBadgeName: 'Lore Keeper',
      defaultSubtitleText: 'Hub Historian',
      defaultOuterShape: BadgeShape.CIRCLE,
      // New unified config fields
      defaultBorderConfig: createSimpleColorConfig('#71717a'),
      defaultBackgroundConfig: createHostedAssetConfig(getAssetUrl('BADGE_BACKGROUND_IMAGE_30')),
      defaultForegroundConfig: createSimpleColorConfig('#27272a'),
      defaultDisplayDescription: 'Bestowed upon those who have delved deep into the annals of TheNexusHub, preserving its history and tales.',
      definesMeasure: false,
      measureLabel: null, 
      measureBest: null,    
      measureWorst: null,   
      measureNotes: null,   
      measureIsNormalizable: false, 
      higherIsBetter: null,
      measureBestLabel: null,
      measureWorstLabel: null,
      metadataFields: [
        {
          fieldKeyForInstanceData: 'knownTopic',
          label: 'Area of Expertise:',
          prefix: null, suffix: null,
          style: 'METADATA_LONGTEXT',
          displayOrder: 0
        },
        {
          fieldKeyForInstanceData: 'sourceVerification',
          label: 'Verified By:',
          prefix: null, suffix: null,
          style: 'METADATA_AUTHORITY',
          displayOrder: 1
        }
      ]
    }
  ];

  let createdTemplateCount = 0;
  let updatedTemplateCount = 0;
  let createdMetadataFieldsCount = 0;

  for (const templateData of badgeTemplatesData) {
    const { metadataFields, templateSlug, ...badgeTemplateCoreData } = templateData;
    const templateSlugCi = templateSlug.toLowerCase();

    try {
      let existingTemplate: BadgeTemplate | null = null;

      if (badgeTemplateCoreData.ownerType === 'USER' && badgeTemplateCoreData.ownerId) {
        existingTemplate = await prisma.badgeTemplate.findFirst({
            where: { 
              ownerType: 'USER',
              ownerId: badgeTemplateCoreData.ownerId,
              templateSlug_ci: templateSlugCi 
            }
        });
      } else if (badgeTemplateCoreData.ownerType === 'GUILD' && badgeTemplateCoreData.ownerId) {
        existingTemplate = await prisma.badgeTemplate.findFirst({
            where: { 
              ownerType: 'GUILD',
              ownerId: badgeTemplateCoreData.ownerId,
              templateSlug_ci: templateSlugCi 
            }
        });
      } else {
        // System template (ownerType is null)
        existingTemplate = await prisma.badgeTemplate.findFirst({
          where: { 
            templateSlug_ci: templateSlugCi,
            ownerType: null,
            ownerId: null
          }
        });
      }

      let upsertedTemplate: BadgeTemplate;

      if (existingTemplate) {
        // Prepare update payload: only update non-key fields
        const { 
            authoredByUserId, 
            ownedByUserId,      // Exclude: legacy field
            ownedByGuildId,     // Exclude: legacy field
            ownerType,          // Exclude: part of key
            ownerId,            // Exclude: part of key
            templateSlug: ts,   // Exclude: immutable part of unique key
            // templateSlug_ci will be derived and is also part of unique key
            ...updatableCoreData 
        } = badgeTemplateCoreData as any; // Cast to any to allow destructuring potentially non-existent props if not all are always there

        const updatePayload: Prisma.BadgeTemplateUpdateInput = {
          ...updatableCoreData,
        };
        if (authoredByUserId) {
          updatePayload.authoredByUser = { connect: { id: authoredByUserId } };
        }

        upsertedTemplate = await prisma.badgeTemplate.update({
          where: { id: existingTemplate.id },
          data: updatePayload,
        });
        updatedTemplateCount++;
      } else {
        // Prepare create payload
        const { 
            authoredByUserId, 
            ownedByUserId,      // Remove: legacy field
            ownedByGuildId,     // Remove: legacy field
            templateSlug: ts, // already have templateSlug separately
            ...restOfCoreData 
        } = badgeTemplateCoreData as any;

        const createPayload: Prisma.BadgeTemplateCreateInput = {
          ...restOfCoreData, 
          templateSlug: templateSlug, 
          templateSlug_ci: templateSlugCi,
        };
        
        if (authoredByUserId) {
          createPayload.authoredByUser = { connect: { id: authoredByUserId } };
        }

        upsertedTemplate = await prisma.badgeTemplate.create({
          data: createPayload,
        });
        createdTemplateCount++;
      }

      if (metadataFields && metadataFields.length > 0) {
        await prisma.metadataFieldDefinition.deleteMany({
          where: { badgeTemplateId: upsertedTemplate.id },
        });
        const definitionsToCreate = metadataFields.map(mdf => ({ ...mdf, badgeTemplateId: upsertedTemplate.id }));
        await prisma.metadataFieldDefinition.createMany({
          data: definitionsToCreate,
          skipDuplicates: true, 
        });
        createdMetadataFieldsCount += definitionsToCreate.length;
      }

    } catch (error) {
      console.error(`Error processing badge template (templateSlug: ${templateSlug}):`, error);
    }
  }

  console.log(`✅ Badge templates seeding finished.`);
  console.log(`   ${createdTemplateCount} templates created, ${updatedTemplateCount} templates updated.`);
  console.log(`   ${createdMetadataFieldsCount} metadata field definitions created.`);
}

// To call this, ensure you pass the prisma client, and potentially the fetched users, guilds, etc.
// if you don't want to fetch them inside this function every time. 