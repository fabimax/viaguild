import {
  PrismaClient,
  User, Guild, Cluster, // For Giver/Receiver IDs
  BadgeTemplate, MetadataFieldDefinition, // To link and know metadata keys
  BadgeInstance, InstanceMetadataValue, // To create
  BadgeAwardStatus, BadgeShape, // Enums for overrides
  BackgroundContentType, ForegroundContentType, UploadedAsset, SystemIcon,
  BadgeTier // Added BadgeTier for potential use if needed for filtering templates implicitly
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { TEST_USER_PRIME_USERNAME } from './users';
import { SPECIAL_GUILD_NAME } from './guilds';
import { seededUploadedAssets } from './uploadedAssets';
// We might need to fetch systemIcon details if overrides use system icon IDs
// For simplicity, let's assume we have a few known system icon IDs/names

// Helper to get a specific seeded asset URL by its key used in uploadedAssets.ts
function getAssetUrl(key: string): string | undefined {
  return seededUploadedAssets.get(key)?.hostedUrl;
}

interface BadgeInstanceSeedEntry {
  description: string; // For logging/identification of this seed entry
  templateTarget: {
    slug: string; // This is the BadgeTemplate.templateSlug
    ownedByUserId?: string | null; // ID of the user owning the template, or null
    ownedByGuildId?: string | null; // ID of the guild owning the template, or null
                                   // If both are null, it's a system template
  };
  giver: { type: 'USER' | 'GUILD'; id?: string; username?: string; guildName?: string }; // Use ID if known, or name/username to look up
  receiver: { type: 'USER' | 'GUILD' | 'CLUSTER'; id?: string; username?: string; guildName?: string; clusterName?: string };
  awardStatus?: BadgeAwardStatus;
  apiVisible?: boolean;
  message?: string;
  revokedAt?: Date | null;
  // Visual Overrides
  overrideBadgeName?: string | null;
  overrideSubtitle?: string | null;
  overrideOuterShape?: BadgeShape | null;
  overrideBorderColor?: string | null;
  overrideBackgroundType?: BackgroundContentType | null;
  overrideBackgroundValue?: string | null; // Hex or HostedAsset.hostedUrl
  overrideForegroundType?: ForegroundContentType | null;
  overrideForegroundValue?: string | null; // Text, SystemIcon.id, or HostedAsset.hostedUrl
  overrideForegroundColor?: string | null;
  overrideTextFont?: string | null;
  overrideTextSize?: number | null;
  overrideDisplayDescription?: string | null;
  // Credential Value
  credentialValue?: number | null; // Using number for Float compatibility
  // Metadata Values: object where keys match MetadataFieldDefinition.fieldKeyForInstanceData
  metadataValues?: Record<string, string>;
}

export async function seedBadgeInstances(prisma: PrismaClient) {
  console.log('🌱 Seeding badge instances and their metadata (using templateSlug)...');

  // --- 1. Fetch Prerequisites ---
  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  const guilds = await prisma.guild.findMany({ select: { id: true, name: true } });
  const clusters = await prisma.cluster.findMany({ select: { id: true, name: true } });
  const badgeTemplates = await prisma.badgeTemplate.findMany({
    select: { 
      id: true,
      templateSlug: true,
      ownedByUserId: true,
      ownedByGuildId: true,
      definesCredential: true,
      defaultBadgeName: true, // Kept for now for the heuristic, but aim to remove heuristic
      metadataFieldDefinitions: { // This structure should make it available
        select: { fieldKeyForInstanceData: true, id: true },
      },
    },
  });
  const systemIcons = await prisma.systemIcon.findMany({select: {id: true, name: true}});

  const testUserPrime = users.find(u => u.username === TEST_USER_PRIME_USERNAME);
  const specialGuild = guilds.find(g => g.name === SPECIAL_GUILD_NAME);
  // Assuming TheNexusHub's primary cluster is the first one for simplicity in seeding
  const nexusHubPrimaryCluster = clusters.length > 0 ? clusters[0] : null; 

  if (!testUserPrime) console.warn('TestUserPrime not found for badge instance seeding!');
  if (!specialGuild) console.warn(`${SPECIAL_GUILD_NAME} not found for badge instance seeding!`);
  if (badgeTemplates.length === 0) {
    console.warn('No badge templates found. Cannot seed instances.');
    return;
  }

  // --- Helper to resolve entity IDs ---
  const getEntityId = (entityInfo: any, type: 'USER' | 'GUILD' | 'CLUSTER'): string | undefined => {
    if (entityInfo.id) return entityInfo.id;
    if (type === 'USER' && entityInfo.username) return users.find(u => u.username === entityInfo.username)?.id;
    if (type === 'GUILD' && entityInfo.guildName) return guilds.find(g => g.name === entityInfo.guildName)?.id;
    if (type === 'CLUSTER' && entityInfo.clusterName) return clusters.find(c => c.name === entityInfo.clusterName)?.id;
    return undefined;
  };

  const getSystemIconIdByName = (name: string): string | undefined => systemIcons.find(si => si.name === name)?.id;

  // --- 2. Define Badge Instance Seed Data ---
  const instancesToSeed: BadgeInstanceSeedEntry[] = [
    // Scenario 1: TestUserPrime receives "Site Pioneer" badge (System gives)
    {
      description: 'TestUserPrime receives Site Pioneer',
      templateTarget: { 
        slug: 'system_site_pioneer', 
        ownedByUserId: null, 
        ownedByGuildId: null 
      },
      giver: { type: 'USER', username: TEST_USER_PRIME_USERNAME }, 
      receiver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false, // It's not a credential badge
      message: 'Welcome, Pioneer! Thank you for your early support of ViaGuild.',
      metadataValues: {
        joinDate: faker.date.past({years: 1}).toISOString().split('T')[0],
        userNumber: faker.number.int({min: 1, max: 100}).toString(),
      },
    },
    // Scenario 2: TestUserPrime (as TheNexusHub Founder) receives the "Nexus Visionary" badge from TheNexusHub itself
    {
      description: `TestUserPrime receives Nexus Visionary from ${SPECIAL_GUILD_NAME}`,
      templateTarget: { 
        slug: `guild_${SPECIAL_GUILD_NAME}_founder`, 
        ownedByGuildId: specialGuild?.id, 
        ownedByUserId: null 
      },
      giver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      receiver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: `For founding and leading ${SPECIAL_GUILD_NAME} with unparalleled vision.`,
      overrideBorderColor: '#FFD700', // Special gold border for the founder's own badge
      metadataValues: {
        foundingDate: '2024-01-01', // Example fixed date
      },
    },
    // Scenario 3: TestUserPrime awards their "Project Completion" badge to another user
    {
      description: `TestUserPrime awards Project Completion to another user`,
      templateTarget: { 
        slug: `user_${TEST_USER_PRIME_USERNAME}_project_alpha`, 
        ownedByUserId: testUserPrime?.id, 
        ownedByGuildId: null 
      },
      giver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      receiver: { type: 'USER', id: users.filter(u => u.id !== testUserPrime?.id)[0]?.id || users[0]?.id }, // Another user
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: true, // This template defines a credential
      message: 'Great work on completing the Alpha Project!',
      credentialValue: 8, // Project difficulty was 8
      overrideForegroundValue: getSystemIconIdByName('Glowing Star'), // Override with a different icon for this award
      overrideForegroundColor: '#f59e0b',
      metadataValues: {
        projectName: 'Project Alpha - Internal Tools Suite',
        completionDate: faker.date.recent({days: 30}).toISOString().split('T')[0],
        hoursSpent: faker.number.int({min: 40, max: 120}).toString(),
      },
    },
    // Scenario 4: TheNexusHub awards "Nexus Contributor" to a couple of members
    {
      description: `${SPECIAL_GUILD_NAME} awards Nexus Contributor to User2`,
      templateTarget: { 
        slug: `guild_${SPECIAL_GUILD_NAME}_contributor`, 
        ownedByGuildId: specialGuild?.id, 
        ownedByUserId: null 
      },
      giver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      receiver: { type: 'USER', id: users[1]?.id || users[0]?.id }, // User different from TUP ideally
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: 'Thanks for your valuable contributions to the Hub discussions!',
      metadataValues: {
        contributionType: 'Forum Activity & Support',
        contributionDate: faker.date.recent({days: 10}).toISOString().split('T')[0],
      }
    },
    {
      description: `${SPECIAL_GUILD_NAME} awards Nexus Contributor to User3 (pending)`,
      templateTarget: { 
        slug: `guild_${SPECIAL_GUILD_NAME}_contributor`, 
        ownedByGuildId: specialGuild?.id, 
        ownedByUserId: null 
      },
      giver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      receiver: { type: 'USER', id: users[2]?.id || users[0]?.id }, 
      awardStatus: BadgeAwardStatus.PENDING_ACCEPTANCE,
      apiVisible: false,
      message: 'Your recent project proposal was outstanding! Please accept this recognition.',
      metadataValues: {
        contributionType: 'Project Proposal - Gamma Initiative',
        contributionDate: new Date().toISOString().split('T')[0],
      }
    },
    // Scenario 5: TestUserPrime gets a "Live Rank Badge" instance (will need credentialValue pushed later)
    {
      description: `TestUserPrime receives Live Rank Badge (initial)`,
      templateTarget: { 
        slug: `user_${TEST_USER_PRIME_USERNAME}_live_rank`, 
        ownedByUserId: testUserPrime?.id, 
        ownedByGuildId: null 
      },
      giver: {type: 'USER', username: TEST_USER_PRIME_USERNAME}, // Self-awarded or system awarded
      receiver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: true,
      message: 'Your rank is being tracked.',
      credentialValue: 50, // Initial rank
      // Visuals mostly come from template default or will be overridden when rank changes by instanceData update
      overrideForegroundValue: '50th', // Example initial text override
      metadataValues: {
        rankNameDetail: 'Silver III',
        lastUpdated: new Date().toISOString(),
      }
    },
    // ADDING NEW SCENARIOS FOR GUILD & CLUSTER
    // Scenario 7: TheNexusHub receives a "Generic Participation Badge" from TestUserPrime
    {
      description: `TheNexusHub receives Generic Participation from ${TEST_USER_PRIME_USERNAME}`,
      templateTarget: { 
        slug: 'system_generic_participation', 
        ownedByUserId: null, 
        ownedByGuildId: null 
      },
      giver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      receiver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: `${SPECIAL_GUILD_NAME} participated in the 'Annual Community Summit'! Congratulations!`,
      metadataValues: {
        eventName: 'Annual Community Summit 2024',
      },
    },
    // Scenario 8: TheNexusHub receives the "Nexus Visionary" badge (conceptually, from a system or high admin)
    // Re-using the template, but a guild is receiving it.
    {
      description: `${SPECIAL_GUILD_NAME} is recognized as a Visionary Hub (System Award)`,
      templateTarget: { 
        slug: `guild_${SPECIAL_GUILD_NAME}_founder`, // Using the template TUP authored but making it a system award to the guild
        ownedByGuildId: specialGuild?.id, // Still references the guild-owned template
        ownedByUserId: null 
      },
      giver: { type: 'USER', username: TEST_USER_PRIME_USERNAME }, // TestUserPrime acting as a high-level system awarder
      receiver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: `Recognizing ${SPECIAL_GUILD_NAME} for its foundational vision and community leadership.`,
      overrideBorderColor: '#DAA520', // A slightly different gold
      metadataValues: {
        foundingDate: '2024-01-01', // This metadata still fits
      },
    },
    // Scenario 9: TheNexusHub's Primary Cluster receives a badge from TheNexusHub
    ...(nexusHubPrimaryCluster && specialGuild ? [{
      description: `${nexusHubPrimaryCluster.name} Cluster receives Generic Participation from ${SPECIAL_GUILD_NAME}`,
      templateTarget: { slug: 'system_generic_participation', ownedByUserId: null, ownedByGuildId: null },
      giver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME }, // TheNexusHub gives the badge
      receiver: { type: 'CLUSTER', clusterName: nexusHubPrimaryCluster.name },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: `The ${nexusHubPrimaryCluster.name} cluster actively participated in the inter-cluster design challenge! Well done!`,
      metadataValues: {
        eventName: 'Inter-Cluster Design Challenge Q1 2024',
      },
    } as BadgeInstanceSeedEntry] : []),
     // Scenario 10: TestUserPrime gives TheNexusHub a custom project badge (TUP owns the template)
    {
      description: `TestUserPrime awards Project Completion to ${SPECIAL_GUILD_NAME}`,
      templateTarget: { 
        slug: `user_${TEST_USER_PRIME_USERNAME}_project_alpha`, 
        ownedByUserId: testUserPrime?.id, 
        ownedByGuildId: null 
      },
      giver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      receiver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME }, 
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: true, // Template defines a credential
      message: `TheNexusHub successfully completed the 'Community Onboarding Module' project!`,
      credentialValue: 9, // Project difficulty was 9 for this guild effort
      overrideBackgroundValue: getAssetUrl('BADGE_BACKGROUND_IMAGE_40'), // city scape for a project
      metadataValues: {
        projectName: 'Community Onboarding Module',
        completionDate: faker.date.recent({days: 5}).toISOString().split('T')[0],
        hoursSpent: '150', // Team effort
      },
    },
  ];

  // --- 3. Seed Logic --- 
  console.log(`   Preparing to seed ${instancesToSeed.length} badge instances.`);
  let createdInstanceCount = 0;
  let createdMetadataValuesCount = 0;

  // Optional: Clear existing instances for a clean seed (be careful with relations like badge case items)
  // await prisma.instanceMetadataValue.deleteMany({});
  // await prisma.badgeInstance.deleteMany({});
  // console.log('   Cleared existing badge instances and metadata values.');

  for (const instanceEntry of instancesToSeed) {
    // Define a more specific type for what we expect from badgeTemplates elements
    type TemplateWithMetadataDefs = typeof badgeTemplates[0];

    let foundTemplate: TemplateWithMetadataDefs | undefined;

    if (instanceEntry.templateTarget.ownedByUserId) {
      foundTemplate = badgeTemplates.find(t => 
        t.templateSlug === instanceEntry.templateTarget.slug && 
        t.ownedByUserId === instanceEntry.templateTarget.ownedByUserId
      ) as TemplateWithMetadataDefs | undefined; // Type assertion might be needed if find doesn't preserve full type
    } else if (instanceEntry.templateTarget.ownedByGuildId) {
      foundTemplate = badgeTemplates.find(t => 
        t.templateSlug === instanceEntry.templateTarget.slug && 
        t.ownedByGuildId === instanceEntry.templateTarget.ownedByGuildId
      ) as TemplateWithMetadataDefs | undefined;
    } else { // System template
      foundTemplate = badgeTemplates.find(t => 
        t.templateSlug === instanceEntry.templateTarget.slug && 
        !t.ownedByUserId && !t.ownedByGuildId
      ) as TemplateWithMetadataDefs | undefined;
    }

    if (!foundTemplate) {
      console.warn(`   Skipping instance "${instanceEntry.description}": Template with slug "${instanceEntry.templateTarget.slug}" (owner context: U:${instanceEntry.templateTarget.ownedByUserId || 'N/A'} G:${instanceEntry.templateTarget.ownedByGuildId || 'N/A'}) not found.`);
      continue;
    }
    const template = foundTemplate; // For type safety hereafter

    const giverUserId = instanceEntry.giver.type === 'USER' ? getEntityId(instanceEntry.giver, 'USER') : null;
    const giverGuildId = instanceEntry.giver.type === 'GUILD' ? getEntityId(instanceEntry.giver, 'GUILD') : null;
    const receiverUserId = instanceEntry.receiver.type === 'USER' ? getEntityId(instanceEntry.receiver, 'USER') : null;
    const receiverGuildId = instanceEntry.receiver.type === 'GUILD' ? getEntityId(instanceEntry.receiver, 'GUILD') : null;
    const receiverClusterId = instanceEntry.receiver.type === 'CLUSTER' ? getEntityId(instanceEntry.receiver, 'CLUSTER') : null;

    if ((instanceEntry.giver.type === 'USER' && !giverUserId) || (instanceEntry.giver.type === 'GUILD' && !giverGuildId)) {
        console.warn(`   Skipping instance "${instanceEntry.description}": Giver not found.`); continue;
    }
    if ((instanceEntry.receiver.type === 'USER' && !receiverUserId) || 
        (instanceEntry.receiver.type === 'GUILD' && !receiverGuildId) || 
        (instanceEntry.receiver.type === 'CLUSTER' && !receiverClusterId && instanceEntry.receiver.type === 'CLUSTER') ) { // Ensure clusterId is only required if type is CLUSTER
        console.warn(`   Skipping instance "${instanceEntry.description}": Receiver not found.`); continue;
    }
    
    try {
      const createData: any = {
        templateId: template.id,
        userGiverId: giverUserId,
        guildGiverId: giverGuildId,
        userReceiverId: receiverUserId,
        guildReceiverId: receiverGuildId,
        clusterReceiverId: receiverClusterId,
        awardStatus: instanceEntry.awardStatus || BadgeAwardStatus.ACCEPTED,
        apiVisible: instanceEntry.apiVisible !== undefined 
            ? instanceEntry.apiVisible 
            : (template.definesCredential && 
              (instanceEntry.awardStatus === BadgeAwardStatus.ACCEPTED || instanceEntry.awardStatus === undefined)
              ? true : false),
        message: instanceEntry.message,
        revokedAt: instanceEntry.revokedAt,
        overrideBadgeName: instanceEntry.overrideBadgeName,
        overrideSubtitle: instanceEntry.overrideSubtitle,
        overrideOuterShape: instanceEntry.overrideOuterShape,
        overrideBorderColor: instanceEntry.overrideBorderColor,
        overrideBackgroundType: instanceEntry.overrideBackgroundType,
        overrideBackgroundValue: instanceEntry.overrideBackgroundValue,
        overrideForegroundType: instanceEntry.overrideForegroundType,
        overrideForegroundValue: instanceEntry.overrideForegroundValue,
        overrideForegroundColor: instanceEntry.overrideForegroundColor,
        overrideTextFont: instanceEntry.overrideTextFont,
        overrideTextSize: instanceEntry.overrideTextSize,
        overrideDisplayDescription: instanceEntry.overrideDisplayDescription,
        credentialValue: instanceEntry.credentialValue,
      };
      
      // Prisma doesn't like undefined for nullable fields that are not explicitly set.
      // So, ensure optional fields are truly absent if null/undefined in instanceEntry
      for (const key in createData) {
        if (createData[key] === undefined || createData[key] === null) {
          // For boolean, false is a valid value, null/undefined means not set for optional field
          if (typeof createData[key] !== 'boolean' && createData[key] !== 0) {
             delete createData[key];
          }
        }
      }

      const createdInstance = await prisma.badgeInstance.create({ data: createData });
      createdInstanceCount++;

      // Create InstanceMetadataValue records
      if (instanceEntry.metadataValues && template.metadataFieldDefinitions.length > 0) {
        const metadataToCreate = [];
        for (const def of template.metadataFieldDefinitions) {
          if (instanceEntry.metadataValues.hasOwnProperty(def.fieldKeyForInstanceData)) {
            metadataToCreate.push({
              badgeInstanceId: createdInstance.id,
              dataKey: def.fieldKeyForInstanceData,
              dataValue: instanceEntry.metadataValues[def.fieldKeyForInstanceData],
            });
          }
        }
        if (metadataToCreate.length > 0) {
          await prisma.instanceMetadataValue.createMany({
            data: metadataToCreate,
            skipDuplicates: true, // Should be fine as keys are unique per instance by schema
          });
          createdMetadataValuesCount += metadataToCreate.length;
        }
      }
    //   console.log(`   Created instance: "${instanceEntry.description}"`);
    } catch (error) {
      console.error(`Error creating instance "${instanceEntry.description}":`, error);
    }
  }

  console.log(`✅ Badge instances seeding finished.`);
  console.log(`   Created ${createdInstanceCount} badge instances.`);
  console.log(`   Created ${createdMetadataValuesCount} instance metadata values.`);
} 