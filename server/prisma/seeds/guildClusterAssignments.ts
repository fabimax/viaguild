import { PrismaClient, Guild, Cluster } from '@prisma/client';
import { faker } from '@faker-js/faker';

const SPECIAL_GUILD_NAME = 'TheNexusHub';

export async function seedGuildClusterAssignments(prisma: PrismaClient) {
  console.log('Seeding guild cluster assignments (including for Special Guild)...');

  const guilds = await prisma.guild.findMany();
  const clusters = await prisma.cluster.findMany();

  if (guilds.length === 0 || clusters.length < 2) { // Need at least 2 clusters for special guild
    console.warn('⚠️ Not enough guilds or clusters (need >=2 for Special Guild). Skipping.');
    return;
  }

  let clusterMembershipsCreated = 0;
  let primaryClustersSet = 0;
  const guildsWithoutClusterTarget = 1;
  let assignedGuildToClusterCount = 0;

  const generalGuilds = guilds.filter(g => g.name !== SPECIAL_GUILD_NAME);
  const shuffledGeneralGuilds = faker.helpers.shuffle([...generalGuilds]);

  // Assign general guilds to clusters first
  for (const guild of shuffledGeneralGuilds) {
    const currentUnassignedCount = guilds.length - assignedGuildToClusterCount -1; // -1 for special guild potentially
    if (currentUnassignedCount <= guildsWithoutClusterTarget && assignedGuildToClusterCount > 0) break;

    const targetCluster = faker.helpers.arrayElement(clusters);
    try {
      await prisma.clusterMembership.create({ data: { guildId: guild.id, clusterId: targetCluster.id } });
      clusterMembershipsCreated++;
      assignedGuildToClusterCount++;
      // console.log(`Assigned guild ${guild.name} to cluster ${targetCluster.name}`);
      if (faker.datatype.boolean(0.8)) {
        await prisma.guild.update({ where: { id: guild.id }, data: { primaryClusterId: targetCluster.id } });
        primaryClustersSet++;
        // console.log(`Set ${targetCluster.name} as primary for ${guild.name}`);
      }
    } catch (e: any) { if (e.code !== 'P2002') console.error(`Error general guild ${guild.name} to cluster ${targetCluster.name}:`, e); }
  }

  // Ensure Special Guild (TheNexusHub) is in 2 clusters and has one primary
  const specialGuild = guilds.find(g => g.name === SPECIAL_GUILD_NAME);
  if (specialGuild && clusters.length >= 2) {
    const existingSpecialGuildClusterLinks = await prisma.clusterMembership.findMany({ where: { guildId: specialGuild.id }, select: { clusterId: true }});
    const existingClusterIdsForSpecial = new Set(existingSpecialGuildClusterLinks.map(cm => cm.clusterId));
    let neededClustersForSpecial = 2 - existingClusterIdsForSpecial.size;
    
    const availableClustersForSpecial = clusters.filter(c => !existingClusterIdsForSpecial.has(c.id));
    const shuffledAvailableClusters = faker.helpers.shuffle(availableClustersForSpecial);

    let assignedToNewClusterInThisRun = false;
    for (let i = 0; i < neededClustersForSpecial && i < shuffledAvailableClusters.length; i++) {
        const clusterToAssign = shuffledAvailableClusters[i];
        try {
            await prisma.clusterMembership.create({ data: { guildId: specialGuild.id, clusterId: clusterToAssign.id }});
            clusterMembershipsCreated++;
            assignedToNewClusterInThisRun = true;
            console.log(`Assigned SPECIAL guild ${specialGuild.name} to cluster ${clusterToAssign.name}`);
            existingClusterIdsForSpecial.add(clusterToAssign.id); // Add to set for primary logic
        } catch (e: any) { if (e.code !== 'P2002') console.error(`Error assigning special guild ${specialGuild.name} to cluster ${clusterToAssign.name}:`, e);}
    }

    // Set primary cluster for Special Guild if it doesn't have one and is in at least one cluster
    const currentSpecialGuildData = await prisma.guild.findUnique({where: {id: specialGuild.id}});
    if (currentSpecialGuildData && !currentSpecialGuildData.primaryClusterId && existingClusterIdsForSpecial.size > 0) {
        const clusterToSetPrimary = faker.helpers.arrayElement(Array.from(existingClusterIdsForSpecial));
         try {
            await prisma.guild.update({ where: { id: specialGuild.id }, data: { primaryClusterId: clusterToSetPrimary }});
            primaryClustersSet++;
            console.log(`Set cluster ${clusterToSetPrimary} as primary for SPECIAL guild ${specialGuild.name}`);
        } catch (e:any) {if(e.code !== 'P2002') console.error(`Error setting primary cluster for ${specialGuild.name}`,e);}
    }
    if (assignedToNewClusterInThisRun) assignedGuildToClusterCount++;

  } else if (specialGuild && clusters.length < 2) {
      console.warn(`Not enough clusters (found ${clusters.length}) for Special Guild assignments.`);
  } else if (!specialGuild) {
      console.warn(`Special Guild ${SPECIAL_GUILD_NAME} not found for cluster assignment.`);
  }
  
  const finalGuildsInClusters = await prisma.clusterMembership.groupBy({ by: ['guildId'], _count: { guildId: true } });
  const finalUnassignedGuildCount = guilds.length - finalGuildsInClusters.length;
  console.log(`Guild cluster assignments: ${clusterMembershipsCreated} new. ${primaryClustersSet} primary. Guilds in clusters: ${finalGuildsInClusters.length}. Guilds w/o cluster: ${finalUnassignedGuildCount}. Target unassigned: >= ${guildsWithoutClusterTarget}`);
} 