import {
  PrismaClient,
  BadgeAwardStatus, BadgeShape, // Enums for overrides
  BackgroundContentType, ForegroundContentType,
  EntityType // For discriminated unions
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
  // Measure Value & Overrides
  measureValue?: number | null; // Using number for Float compatibility
  overrideMeasureBest?: number | null;
  overrideMeasureWorst?: number | null;
  overrideMeasureIsNormalizable?: boolean | null;
  overrideMeasureBestLabel?: string | null;
  overrideMeasureWorstLabel?: string | null;
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
      ownerType: true,
      ownerId: true,
      definesMeasure: true,
      defaultBadgeName: true, 
      measureBest: true, 
      measureWorst: true,
      higherIsBetter: true, // Added for logic if needed, though instance overrides are separate
      // We don't strictly need measureBestLabel/WorstLabel from template for instance seeding 
      // unless we want to use them as a base for instance overrides IF instance overrides are not present.
      // For now, instance overrides will be explicit in the seed data if used.
      metadataFieldDefinitions: {
        select: { fieldKeyForInstanceData: true, id: true },
      },
    },
  });
  const systemIcons = await prisma.systemIcon.findMany({select: {id: true, name: true}});

  const testUserPrime = users.find(u => u.username === TEST_USER_PRIME_USERNAME);
  const specialGuild = guilds.find(g => g.name === SPECIAL_GUILD_NAME);
  const artisanCraftersGuild = guilds.find(g => g.name === 'ArtisanCrafters'); // Fetch ArtisanCrafters guild
  
  const otherUsers = users.filter(u => u.id !== testUserPrime?.id);
  const otherGuilds = guilds.filter(g => g.id !== specialGuild?.id && g.id !== artisanCraftersGuild?.id);

  const nexusHubPrimaryCluster = clusters.find(c => c.name === 'Cluster1'); 
  const secondCluster = clusters.find(c => c.name === 'Cluster2'); 

  if (!testUserPrime) console.warn('TestUserPrime not found for badge instance seeding!');
  if (!specialGuild) console.warn(`${SPECIAL_GUILD_NAME} not found for badge instance seeding!`);
  if (!artisanCraftersGuild) console.warn('ArtisanCrafters guild not found for badge instance seeding! Badge awards from/to it might be skipped.');
  if (!nexusHubPrimaryCluster) console.warn('Cluster1 (nexusHubPrimaryCluster) not found for badge instance seeding!');

  if (badgeTemplates.length === 0) {
    console.warn('No badge templates found. Cannot seed instances.');
    return;
  }
  if (otherUsers.length < 5) console.warn('Fewer than 5 other users available for diverse badge seeding.');
  if (otherGuilds.length < 3) console.warn('Fewer than 3 other guilds available for diverse badge seeding.');

  const getEntityId = (entityInfo: any, type: 'USER' | 'GUILD' | 'CLUSTER'): string | undefined => {
    if (entityInfo.id) return entityInfo.id;
    if (type === 'USER' && entityInfo.username) return users.find(u => u.username === entityInfo.username)?.id;
    if (type === 'GUILD' && entityInfo.guildName) return guilds.find(g => g.name === entityInfo.guildName)?.id;
    if (type === 'CLUSTER' && entityInfo.clusterName) return clusters.find(c => c.name === entityInfo.clusterName)?.id;
    return undefined;
  };

  const getSystemIconIdByName = (name: string): string | undefined => systemIcons.find(si => si.name === name)?.name;

  let instancesToSeed: BadgeInstanceSeedEntry[] = [
    // Scenario 1: TestUserPrime receives "Site Pioneer"
    {
      description: 'TestUserPrime receives Site Pioneer',
      templateTarget: { slug: 'system_site_pioneer', ownedByUserId: null, ownedByGuildId: null },
      giver: { type: 'USER', username: TEST_USER_PRIME_USERNAME }, 
      receiver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: 'Welcome, Pioneer! Thank you for your early support of ViaGuild.',
      metadataValues: {
        joinDate: faker.date.past({years: 1}).toISOString().split('T')[0],
        userNumber: faker.number.int({min: 1, max: 100}).toString(),
      },
    },
    // Scenario 2: TestUserPrime receives "Nexus Visionary" from TheNexusHub
    {
      description: `TestUserPrime receives Nexus Visionary from ${SPECIAL_GUILD_NAME}`,
      templateTarget: { slug: `guild_${SPECIAL_GUILD_NAME}_founder`, ownedByGuildId: specialGuild?.id, ownedByUserId: null },
      giver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      receiver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: `For founding and leading ${SPECIAL_GUILD_NAME} with unparalleled vision.`,
      overrideBorderColor: '#FFD700',
      metadataValues: { foundingDate: '2024-01-01' },
    },
    // Scenario 3: TestUserPrime awards "Project Completion" to another user (WITH OVERRIDES FOR MEASURE)
    {
      description: `TestUserPrime awards Project Completion to another user with measure overrides`,
      templateTarget: { slug: `user_${TEST_USER_PRIME_USERNAME}_project_alpha`, ownedByUserId: testUserPrime?.id, ownedByGuildId: null },
      giver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      receiver: { type: 'USER', id: otherUsers[0]?.id || users[0]?.id },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: true,
      message: 'Great work on completing the Alpha Project! This one had a special difficulty range.',
      measureValue: 8,
      overrideMeasureBest: 12, // Template default is 10
      overrideMeasureWorst: 2,  // Template default is 1
      overrideMeasureIsNormalizable: true,
      overrideMeasureBestLabel: 'Max Special Difficulty',
      overrideMeasureWorstLabel: 'Min Special Difficulty',
      overrideForegroundValue: getSystemIconIdByName('Glowing Star'),
      overrideForegroundColor: '#f59e0b',
      metadataValues: {
        projectName: 'Project Alpha - Internal Tools Suite',
        completionDate: faker.date.recent({days: 30}).toISOString().split('T')[0],
        hoursSpent: faker.number.int({min: 40, max: 120}).toString(),
      },
    },
    // Scenario 4: TheNexusHub awards "Nexus Contributor" to members
    {
      description: `${SPECIAL_GUILD_NAME} awards Nexus Contributor to User2`,
      templateTarget: { slug: `guild_${SPECIAL_GUILD_NAME}_contributor`, ownedByGuildId: specialGuild?.id, ownedByUserId: null },
      giver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      receiver: { type: 'USER', id: otherUsers[1]?.id || users[0]?.id },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: 'Thanks for your valuable contributions to the Hub discussions!',
      metadataValues: {
        contributionType: 'Forum Activity & Support',
        contributionDate: faker.date.recent({days: 10}).toISOString().split('T')[0],
      }
    },
    {
      description: `${SPECIAL_GUILD_NAME} awards Nexus Contributor to User3 (now ACCEPTED)`,
      templateTarget: { slug: `guild_${SPECIAL_GUILD_NAME}_contributor`, ownedByGuildId: specialGuild?.id, ownedByUserId: null },
      giver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      receiver: { type: 'USER', id: otherUsers[2]?.id || users[0]?.id }, 
      awardStatus: BadgeAwardStatus.ACCEPTED, 
      apiVisible: false,
      message: 'Your recent project proposal was outstanding! Please accept this recognition.',
      metadataValues: {
        contributionType: 'Project Proposal - Gamma Initiative',
        contributionDate: new Date().toISOString().split('T')[0],
      }
    },
    // Scenario 5: TestUserPrime's "Live Rank Badge"
    {
      description: `TestUserPrime receives Live Rank Badge (initial)`,
      templateTarget: { slug: `user_${TEST_USER_PRIME_USERNAME}_live_rank`, ownedByUserId: testUserPrime?.id, ownedByGuildId: null },
      giver: {type: 'USER', username: TEST_USER_PRIME_USERNAME}, 
      receiver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: true,
      message: 'Your rank is being tracked.',
      measureValue: 50, 
      overrideForegroundValue: '50th',
      metadataValues: { rankNameDetail: 'Silver III', lastUpdated: new Date().toISOString() }
    },
    // Scenario 7: TheNexusHub receives "Generic Participation" from TestUserPrime
    {
      description: `TheNexusHub receives Generic Participation from ${TEST_USER_PRIME_USERNAME}`,
      templateTarget: { slug: 'system_generic_participation', ownedByUserId: null, ownedByGuildId: null },
      giver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      receiver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: `${SPECIAL_GUILD_NAME} participated in the 'Annual Community Summit'! Congratulations!`,
      metadataValues: { eventName: 'Annual Community Summit 2024' },
    },
    // Scenario 8: TheNexusHub recognized as "Nexus Visionary"
    {
      description: `${SPECIAL_GUILD_NAME} is recognized as a Visionary Hub (System Award)`,
      templateTarget: { slug: `guild_${SPECIAL_GUILD_NAME}_founder`, ownedByGuildId: specialGuild?.id, ownedByUserId: null },
      giver: { type: 'USER', username: TEST_USER_PRIME_USERNAME }, 
      receiver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: `Recognizing ${SPECIAL_GUILD_NAME} for its foundational vision and community leadership.`,
      overrideBorderColor: '#DAA520',
      metadataValues: { foundingDate: '2024-01-01' },
    },
    // Scenario 9: Cluster1 receives "Generic Participation" from TheNexusHub
    ...(nexusHubPrimaryCluster && specialGuild ? [{
      description: `${nexusHubPrimaryCluster.name} Cluster receives Generic Participation from ${SPECIAL_GUILD_NAME}`,
      templateTarget: { slug: 'system_generic_participation', ownedByUserId: null, ownedByGuildId: null },
      giver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME }, 
      receiver: { type: 'CLUSTER', clusterName: nexusHubPrimaryCluster.name },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: `The ${nexusHubPrimaryCluster.name} cluster successfully hosted the regional tech fair, sponsored by ${SPECIAL_GUILD_NAME}!`,
      metadataValues: { eventName: 'Regional Tech Fair 2024' },
    } as BadgeInstanceSeedEntry] : []),
    // Scenario 10: TestUserPrime awards "Project Completion" to TheNexusHub
    {
      description: `TestUserPrime awards Project Completion to ${SPECIAL_GUILD_NAME}`,
      templateTarget: { slug: `user_${TEST_USER_PRIME_USERNAME}_project_alpha`, ownedByUserId: testUserPrime?.id, ownedByGuildId: null },
      giver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      receiver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME }, 
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: true, 
      message: `TheNexusHub successfully completed the 'Community Onboarding Module' project!`,
      measureValue: 9, 
      overrideBackgroundValue: getAssetUrl('BADGE_BACKGROUND_IMAGE_40'),
      metadataValues: {
        projectName: 'Community Onboarding Module',
        completionDate: faker.date.recent({days: 5}).toISOString().split('T')[0],
        hoursSpent: '150',
      },
    },
    // Scenario 11: TheNexusHub awards "Lore Master" to TestUserPrime
    {
      description: `TheNexusHub awards Lore Master to TestUserPrime`,
      templateTarget: { slug: `guild_${SPECIAL_GUILD_NAME}_lore_master`, ownedByGuildId: specialGuild?.id, ownedByUserId: null },
      giver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      receiver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: 'Your knowledge of our history is unparalleled, TestUserPrime!',
      metadataValues: { knownTopic: 'The Founding Era and Ancient Artifacts', sourceVerification: 'Guild Archives, Elder Council Confirmation' },
    },
    // Scenario 12: ArtisanCrafters awards TestUserPrime "Bronze Craftsmanship"
    {
      description: `ArtisanCrafters Guild awards Bronze Craftsmanship to TestUserPrime`,
      templateTarget: { slug: 'guild_ArtisanCrafters_bronze_craft', ownedByGuildId: artisanCraftersGuild?.id || null, ownedByUserId: null },
      giver: { type: 'GUILD', guildName: 'ArtisanCrafters' }, 
      receiver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: 'TestUserPrime, your dedication to the craft is commendable!',
      metadataValues: { craftType: 'Digital Sculpting' },
    },
    // Scenario 13: TestUserPrime awards "Generic Participation" to TheNexusHub (Meetup)
    {
      description: `TestUserPrime awards Generic Participation to TheNexusHub`,
      templateTarget: { slug: 'system_generic_participation', ownedByUserId: null, ownedByGuildId: null },
      giver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      receiver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: 'Thank you, TheNexusHub, for hosting the regional design meetup!',
      overrideBadgeName: 'Meetup Host 2024',
      metadataValues: { eventName: 'Regional Design Meetup Q1 2024' },
    },
    // Scenario 14: TestUserPrime self-awards another "Project Completion" (Accepted)
    {
      description: `TestUserPrime self-awards another Project Completion (Accepted)`,
      templateTarget: { slug: `user_${TEST_USER_PRIME_USERNAME}_project_alpha`, ownedByUserId: testUserPrime?.id, ownedByGuildId: null },
      giver: { type: 'USER', username: TEST_USER_PRIME_USERNAME },
      receiver: { type: 'USER', username: TEST_USER_PRIME_USERNAME }, 
      awardStatus: BadgeAwardStatus.ACCEPTED, 
      apiVisible: true, 
      message: 'Just wrapped up Project Beta!',
      measureValue: 5, 
      metadataValues: {
        projectName: 'Project Beta - API Documentation Portal',
        completionDate: new Date().toISOString().split('T')[0],
        hoursSpent: '75',
      },
    },
    // Scenario 15: TheNexusHub awards "Nexus Contributor" to Cluster1
    ...(nexusHubPrimaryCluster && specialGuild ? [{
      description: `${SPECIAL_GUILD_NAME} awards Nexus Contributor to ${nexusHubPrimaryCluster.name}`,
      templateTarget: { slug: `guild_${SPECIAL_GUILD_NAME}_contributor`, ownedByGuildId: specialGuild.id, ownedByUserId: null },
      giver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      receiver: { type: 'CLUSTER', clusterName: nexusHubPrimaryCluster.name },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: `The ${nexusHubPrimaryCluster.name} cluster has shown exemplary inter-guild collaboration this cycle.`,
      metadataValues: {
        contributionType: 'Inter-Guild Collaboration Events',
        contributionDate: faker.date.recent({days: 3}).toISOString().split('T')[0],
      }
    } as BadgeInstanceSeedEntry] : []),
    // Scenario 16: Random User 1 awards "Site Pioneer" to Random User 2
    {
      description: 'Random User 1 awards Site Pioneer to Random User 2',
      templateTarget: { slug: 'system_site_pioneer', ownedByUserId: null, ownedByGuildId: null },
      giver: { type: 'USER', id: otherUsers[1]?.id || users[1]?.id }, 
      receiver: { type: 'USER', id: otherUsers[2]?.id || users[2]?.id },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false, 
      message: 'Recognizing your early presence!',
      metadataValues: {
        joinDate: faker.date.past({years: 1, refDate: '2023-01-01'}).toISOString().split('T')[0],
        userNumber: faker.number.int({min: 101, max: 200}).toString(),
      },
    },
    // Scenario 17: TheNexusHub awards "Lore Master" to another member
    {
      description: `${SPECIAL_GUILD_NAME} awards Lore Master to another member`,
      templateTarget: { slug: `guild_${SPECIAL_GUILD_NAME}_lore_master`, ownedByGuildId: specialGuild?.id, ownedByUserId: null },
      giver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      receiver: { type: 'USER', id: otherUsers[3]?.id || users[3]?.id },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: 'Your dedication to the archives is noted!',
      metadataValues: { knownTopic: 'The Second Age Narratives', sourceVerification: 'Cross-referenced with the Elder Scrolls (in-game joke)' },
    },
    // Scenario 18: TestUserPrime's "Live Rank Badge" for another user
    {
      description: `TestUserPrime sets Live Rank Badge for another user`,
      templateTarget: { slug: `user_${TEST_USER_PRIME_USERNAME}_live_rank`, ownedByUserId: testUserPrime?.id, ownedByGuildId: null },
      giver: {type: 'USER', username: TEST_USER_PRIME_USERNAME}, 
      receiver: { type: 'USER', id: otherUsers[4]?.id || users[4]?.id },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: true,
      message: 'Current ranking status.',
      measureValue: 25,
      overrideForegroundValue: '25th',
      metadataValues: { rankNameDetail: 'Gold I', lastUpdated: new Date().toISOString() }
    },
    // Scenario 19: Cluster2 receives "Generic Participation" from TheNexusHub
    ...(secondCluster && specialGuild ? [{
      description: `${secondCluster.name} Cluster receives Generic Participation from ${SPECIAL_GUILD_NAME} for a different event`,
      templateTarget: { slug: 'system_generic_participation', ownedByUserId: null, ownedByGuildId: null },
      giver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME },
      receiver: { type: 'CLUSTER', clusterName: secondCluster.name },
      awardStatus: BadgeAwardStatus.ACCEPTED,
      apiVisible: false,
      message: `The ${secondCluster.name} cluster launched a successful community initiative, supported by ${SPECIAL_GUILD_NAME}!`,
      metadataValues: { eventName: 'Community Initiative Launch 2024' },
    } as BadgeInstanceSeedEntry] : []),
    // Scenario 20: TheNexusHub receives badge from External Guild (Accepted)
    {
      description: `External Guild 'ChampionsLeague' awards badge to ${SPECIAL_GUILD_NAME} (Accepted)`,
      templateTarget: { slug: 'system_generic_participation', ownedByUserId: null, ownedByGuildId: null },
      giver: { type: 'GUILD', guildName: otherGuilds[0]?.name || 'ExternalChampions' }, 
      receiver: { type: 'GUILD', guildName: SPECIAL_GUILD_NAME }, 
      awardStatus: BadgeAwardStatus.ACCEPTED, 
      apiVisible: false,
      message: 'An invitation to the grand tournament! Please accept this token.',
      metadataValues: { eventName: 'Grand Tournament Invitation' }
    },
  ];

  const dynamicInstanceCount = 50; 
  // Using new discriminated union fields
  const systemTemplates = badgeTemplates.filter(bt => !bt.ownerType);
  const userOwnedTemplates = badgeTemplates.filter(bt => bt.ownerType === 'USER' && users.find(u => u.id === bt.ownerId));
  const guildOwnedTemplates = badgeTemplates.filter(bt => bt.ownerType === 'GUILD' && guilds.find(g => g.id === bt.ownerId));
  const allAvailableTemplates = [...systemTemplates, ...userOwnedTemplates, ...guildOwnedTemplates];

  if (allAvailableTemplates.length > 0 && users.length > 1 && guilds.length > 0) {
    for (let i = 0; i < dynamicInstanceCount; i++) {
      const template = faker.helpers.arrayElement(allAvailableTemplates);
      let receiver: BadgeInstanceSeedEntry['receiver']; 
      let giver: BadgeInstanceSeedEntry['giver'] = {} as any; // Initialize giver
      const receiverType = faker.helpers.arrayElement(['USER', 'GUILD', 'CLUSTER']);
      const giverType = faker.datatype.boolean() ? 'USER' : 'GUILD';

      if (receiverType === 'USER') {
        const receivingUser = faker.helpers.arrayElement(users);
        receiver = { type: 'USER', id: receivingUser.id, username: receivingUser.username };
      } else if (receiverType === 'GUILD') {
        const receivingGuild = faker.helpers.arrayElement(guilds);
        receiver = { type: 'GUILD', id: receivingGuild.id, guildName: receivingGuild.name };
      } else { 
        if (clusters.length > 0) {
          const receivingCluster = faker.helpers.arrayElement(clusters);
          receiver = { type: 'CLUSTER', id: receivingCluster.id, clusterName: receivingCluster.name };
        } else { 
          const receivingUser = faker.helpers.arrayElement(users); 
          receiver = { type: 'USER', id: receivingUser.id, username: receivingUser.username };
        }
      }

      if (giverType === 'USER') {
        let givingUser = faker.helpers.arrayElement(users);
        if (receiver.type === 'USER' && givingUser.id === receiver.id && !(template.ownerType === 'USER' && template.ownerId === givingUser.id)) {
          const otherPossibleGivers = users.filter(u => u.id !== receiver.id);
          if (otherPossibleGivers.length > 0) {
            givingUser = faker.helpers.arrayElement(otherPossibleGivers);
          } else { 
            const fallbackGiverGuild = faker.helpers.arrayElement(guilds);
            if (!fallbackGiverGuild) continue; 
            giver = { type: 'GUILD', id: fallbackGiverGuild.id, guildName: fallbackGiverGuild.name };
          }
        }
        if (!giver.type) giver = { type: 'USER', id: givingUser.id, username: givingUser.username }; 
      } else { 
        let givingGuild = faker.helpers.arrayElement(guilds);
        if (receiver.type === 'GUILD' && givingGuild.id === receiver.id && !(template.ownerType === 'GUILD' && template.ownerId === givingGuild.id)) {
          const otherPossibleGivers = guilds.filter(g => g.id !== receiver.id);
          if (otherPossibleGivers.length > 0) {
            givingGuild = faker.helpers.arrayElement(otherPossibleGivers);
          } else { 
            const fallbackGiverUser = faker.helpers.arrayElement(users);
            if (!fallbackGiverUser) continue;
            giver = { type: 'USER', id: fallbackGiverUser.id, username: fallbackGiverUser.username };
          }
        }
        if (!giver.type) giver = { type: 'GUILD', id: givingGuild.id, guildName: givingGuild.name }; 
      }

      const metadataValues: Record<string, string> = {};
      if (template.metadataFieldDefinitions && template.metadataFieldDefinitions.length > 0) {
        template.metadataFieldDefinitions.forEach(def => {
          metadataValues[def.fieldKeyForInstanceData] = faker.lorem.words(faker.number.int({ min: 1, max: 3 }));
        });
      }

      instancesToSeed.push({
        description: `Dynamic Badge: ${template.defaultBadgeName} from ${giver.type} ${giver.username || giver.guildName} to ${receiver.type} ${receiver.username || receiver.guildName || receiver.clusterName}`,
        templateTarget: {
          slug: template.templateSlug,
          ownedByUserId: template.ownerType === 'USER' ? template.ownerId : null,
          ownedByGuildId: template.ownerType === 'GUILD' ? template.ownerId : null,
        },
        giver,
        receiver,
        awardStatus: BadgeAwardStatus.ACCEPTED,
        apiVisible: template.definesMeasure,
        message: `A special award for ${receiver.type === 'USER' ? receiver.username : (receiver.type === 'GUILD' ? receiver.guildName : receiver.clusterName)}: ${faker.lorem.sentence()}`,
        metadataValues,
        measureValue: template.definesMeasure ? faker.number.int({ min: 1, max: (template.measureBest ?? 10) }) : undefined,
      });
    }
    console.log(`   Added ${dynamicInstanceCount} dynamically generated accepted badge instances.`);
  } else {
      console.warn('   Could not dynamically generate additional badge instances due to lack of templates, users, or guilds.');
  }

  const createTargetedInstances = (
    targetReceiver: { type: 'USER' | 'GUILD' | 'CLUSTER'; id?: string; username?: string; guildName?: string; clusterName?: string },
    receiverName: string,
    count: number,
    descriptionPrefix: string
  ) => {
    if (!targetReceiver.id && !targetReceiver.username && !targetReceiver.guildName && !targetReceiver.clusterName) {
      console.warn(`   Target receiver ${receiverName} is not defined, skipping targeted badge seeding.`);
      return;
    }
    if (allAvailableTemplates.length === 0) {
        console.warn(`   No templates available to award to ${receiverName}.`);
        return;
    }
    console.log(`   Targeting ${count} additional accepted badges for ${receiverName}...`);
    let createdForTarget = 0;
    for (let i = 0; i < count; i++) {
      const template = faker.helpers.arrayElement(allAvailableTemplates);
      let giver: BadgeInstanceSeedEntry['giver'];
      const giverType = faker.datatype.boolean() ? 'USER' : 'GUILD';

      if (giverType === 'USER') {
        const possibleGivers = users.filter(u => targetReceiver.type !== 'USER' || u.id !== targetReceiver.id);
        const givingUser = possibleGivers.length > 0 ? faker.helpers.arrayElement(possibleGivers) : faker.helpers.arrayElement(users); 
        giver = { type: 'USER', id: givingUser.id, username: givingUser.username };
      } else {
        const possibleGivers = guilds.filter(g => targetReceiver.type !== 'GUILD' || g.id !== targetReceiver.id);
        const givingGuild = possibleGivers.length > 0 ? faker.helpers.arrayElement(possibleGivers) : faker.helpers.arrayElement(guilds);
        giver = { type: 'GUILD', id: givingGuild.id, guildName: givingGuild.name };
      }

      const metadataValues: Record<string, string> = {};
      if (template.metadataFieldDefinitions && template.metadataFieldDefinitions.length > 0) {
        template.metadataFieldDefinitions.forEach(def => {
          metadataValues[def.fieldKeyForInstanceData] = faker.lorem.words(faker.number.int({ min: 1, max: 3 }));
        });
      }

      instancesToSeed.push({
        description: `${descriptionPrefix}: ${template.defaultBadgeName} from ${giver.type} ${giver.username || giver.guildName}`,
        templateTarget: {
          slug: template.templateSlug,
          ownedByUserId: template.ownerType === 'USER' ? template.ownerId : null,
          ownedByGuildId: template.ownerType === 'GUILD' ? template.ownerId : null,
        },
        giver,
        receiver: targetReceiver,
        awardStatus: BadgeAwardStatus.ACCEPTED,
        apiVisible: template.definesMeasure,
        message: `A special award for ${receiverName}: ${faker.lorem.sentence()}`,
        metadataValues,
        measureValue: template.definesMeasure ? faker.number.int({ min: 1, max: (template.measureBest ?? 10) }) : undefined,
      });
      createdForTarget++;
    }
    console.log(`   Added ${createdForTarget} targeted accepted badges for ${receiverName}.`);
  };

  if (testUserPrime) {
    createTargetedInstances({ type: 'USER', id: testUserPrime.id, username: testUserPrime.username }, TEST_USER_PRIME_USERNAME, 20, 'TUP Targeted');
  }
  if (specialGuild) {
    createTargetedInstances({ type: 'GUILD', id: specialGuild.id, guildName: specialGuild.name }, SPECIAL_GUILD_NAME, 20, 'NexusHub Targeted');
  }
  if (nexusHubPrimaryCluster) {
    createTargetedInstances({ type: 'CLUSTER', id: nexusHubPrimaryCluster.id, clusterName: nexusHubPrimaryCluster.name }, nexusHubPrimaryCluster.name, 15, 'Cluster1 Targeted');
  }

  console.log(`   Preparing to seed ${instancesToSeed.length} badge instances.`);
  let createdInstanceCount = 0;
  let createdMetadataValuesCount = 0;

  for (const instanceEntry of instancesToSeed) {
    type TemplateWithMetadataDefs = typeof badgeTemplates[0];
    let foundTemplate: TemplateWithMetadataDefs | undefined;

    if (instanceEntry.templateTarget.ownedByUserId) {
      foundTemplate = badgeTemplates.find(t => 
        t.templateSlug === instanceEntry.templateTarget.slug && 
        t.ownerType === 'USER' &&
        t.ownerId === instanceEntry.templateTarget.ownedByUserId
      ) as TemplateWithMetadataDefs | undefined;
    } else if (instanceEntry.templateTarget.ownedByGuildId) {
      foundTemplate = badgeTemplates.find(t => 
        t.templateSlug === instanceEntry.templateTarget.slug && 
        t.ownerType === 'GUILD' &&
        t.ownerId === instanceEntry.templateTarget.ownedByGuildId
      ) as TemplateWithMetadataDefs | undefined;
    } else { 
      foundTemplate = badgeTemplates.find(t => 
        t.templateSlug === instanceEntry.templateTarget.slug && 
        !t.ownerType
      ) as TemplateWithMetadataDefs | undefined;
    }

    if (!foundTemplate) {
      console.warn(`   Skipping instance "${instanceEntry.description}": Template with slug "${instanceEntry.templateTarget.slug}" (owner context: U:${instanceEntry.templateTarget.ownedByUserId || 'N/A'} G:${instanceEntry.templateTarget.ownedByGuildId || 'N/A'}) not found.`);
      continue;
    }
    const template = foundTemplate;

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
        (instanceEntry.receiver.type === 'CLUSTER' && !receiverClusterId && instanceEntry.receiver.type === 'CLUSTER') ) { 
        console.warn(`   Skipping instance "${instanceEntry.description}": Receiver not found (Type: ${instanceEntry.receiver.type}, U:${receiverUserId}, G:${receiverGuildId}, C:${receiverClusterId}).`); continue;
    }
    
    try {
      const createData: any = {
        templateId: template.id,
        giverType: instanceEntry.giver.type as EntityType,
        giverId: instanceEntry.giver.type === 'USER' ? giverUserId! : giverGuildId!,
        receiverType: instanceEntry.receiver.type as EntityType,
        receiverId: instanceEntry.receiver.type === 'USER' ? receiverUserId! : (instanceEntry.receiver.type === 'GUILD' ? receiverGuildId! : receiverClusterId!),
        awardStatus: instanceEntry.awardStatus || BadgeAwardStatus.ACCEPTED,
        apiVisible: instanceEntry.apiVisible !== undefined 
            ? instanceEntry.apiVisible 
            : (template.definesMeasure && 
              ((instanceEntry.awardStatus || BadgeAwardStatus.ACCEPTED) === BadgeAwardStatus.ACCEPTED) 
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
        measureValue: instanceEntry.measureValue,
        overrideMeasureBest: instanceEntry.overrideMeasureBest,
        overrideMeasureWorst: instanceEntry.overrideMeasureWorst,
        overrideMeasureIsNormalizable: instanceEntry.overrideMeasureIsNormalizable,
        overrideMeasureBestLabel: instanceEntry.overrideMeasureBestLabel,
        overrideMeasureWorstLabel: instanceEntry.overrideMeasureWorstLabel,
      };
      
      for (const key in createData) {
        if (createData[key] === undefined || createData[key] === null) {
          if (typeof createData[key] !== 'boolean' && createData[key] !== 0) {
             delete createData[key];
          }
        }
      }

      const createdInstance = await prisma.badgeInstance.create({ data: createData });
      createdInstanceCount++;

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
            skipDuplicates: true, 
          });
          createdMetadataValuesCount += metadataToCreate.length;
        }
      }
    } catch (error) {
      console.error(`Error creating instance "${instanceEntry.description}":`, error);
    }
  }

  console.log(`✅ Badge instances seeding finished.`);
  console.log(`   Created ${createdInstanceCount} badge instances.`);
  console.log(`   Created ${createdMetadataValuesCount} instance metadata values.`);
} 