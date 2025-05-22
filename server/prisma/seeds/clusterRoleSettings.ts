import { PrismaClient, Cluster, ClusterRole, User } from '@prisma/client';
import { faker } from '@faker-js/faker'; // Not strictly needed for this logic but good for consistency

export async function seedClusterRoleSettings(prisma: PrismaClient) {
  console.log('🌱 Seeding cluster role settings...');

  const clusters = await prisma.cluster.findMany({
    select: { id: true, name: true, createdById: true, customRoles: { select: { id: true, name: true } } }
  });

  const systemClusterCreatorRole = await prisma.clusterRole.findFirst({
    where: { name: 'CLUSTER_CREATOR', isSystemRole: true, clusterId: null },
    select: { id: true }
  });

  const systemClusterAdminRole = await prisma.clusterRole.findFirst({
    where: { name: 'CLUSTER_ADMIN', isSystemRole: true, clusterId: null },
    select: { id: true }
  });

  if (!systemClusterCreatorRole) {
    console.warn('⚠️ CLUSTER_CREATOR system role not found. Cannot seed its settings.');
  }
  if (!systemClusterAdminRole) {
    console.warn('⚠️ CLUSTER_ADMIN system role not found. Cannot seed its settings.');
  }

  let settingsUpsertedCount = 0;

  for (const cluster of clusters) {
    const assignedById = cluster.createdById; // User who created the cluster assigns settings

    // --- System Role Settings for this Cluster ---
    if (systemClusterCreatorRole) {
      try {
        await prisma.clusterRoleSetting.upsert({
          where: { clusterId_clusterRoleId: { clusterId: cluster.id, clusterRoleId: systemClusterCreatorRole.id } },
          update: { 
            hierarchyOrder: 0, 
            displaySequence: 0,
            assignedById: assignedById
          },
          create: {
            clusterId: cluster.id,
            clusterRoleId: systemClusterCreatorRole.id,
            hierarchyOrder: 0,
            displaySequence: 0,
            assignedById: assignedById,
          },
        });
        settingsUpsertedCount++;
      } catch (e) {
        console.error(`Error upserting CLUSTER_CREATOR setting for cluster ${cluster.name}:`, e);
      }
    }

    if (systemClusterAdminRole) {
      try {
        await prisma.clusterRoleSetting.upsert({
          where: { clusterId_clusterRoleId: { clusterId: cluster.id, clusterRoleId: systemClusterAdminRole.id } },
          update: { 
            hierarchyOrder: 1, 
            displaySequence: 1,
            assignedById: assignedById
          },
          create: {
            clusterId: cluster.id,
            clusterRoleId: systemClusterAdminRole.id,
            hierarchyOrder: 1,
            displaySequence: 1,
            assignedById: assignedById,
          },
        });
        settingsUpsertedCount++;
      } catch (e) {
        console.error(`Error upserting CLUSTER_ADMIN setting for cluster ${cluster.name}:`, e);
      }
    }

    // --- Custom Role Settings for this Cluster ---
    let customRoleHierarchyStart = 15;
    if (cluster.customRoles && cluster.customRoles.length > 0) {
      // Sort custom roles by name or ID for consistent displaySequence if not explicitly set otherwise
      const sortedCustomRoles = [...cluster.customRoles].sort((a, b) => a.name.localeCompare(b.name));

      for (const customRole of sortedCustomRoles) {
        try {
          await prisma.clusterRoleSetting.upsert({
            where: { clusterId_clusterRoleId: { clusterId: cluster.id, clusterRoleId: customRole.id } },
            update: {
              hierarchyOrder: customRoleHierarchyStart,
              displaySequence: customRoleHierarchyStart, // Match hierarchy for simplicity
              assignedById: assignedById,
              // overrideRoleName: customRole.name, // Example: default to its own name
              // overrideDisplayColor: faker.internet.color() 
            },
            create: {
              clusterId: cluster.id,
              clusterRoleId: customRole.id,
              hierarchyOrder: customRoleHierarchyStart,
              displaySequence: customRoleHierarchyStart,
              assignedById: assignedById,
              // overrideRoleName: customRole.name,
              // overrideDisplayColor: faker.internet.color() 
            },
          });
          settingsUpsertedCount++;
          customRoleHierarchyStart++; // Increment for the next custom role in this cluster
        } catch (e) {
          console.error(`Error upserting setting for custom role ${customRole.name} in cluster ${cluster.name}:`, e);
        }
      }
    }
  }

  console.log(`✅ Cluster role settings seeding finished. ${settingsUpsertedCount} settings records upserted.`);
} 