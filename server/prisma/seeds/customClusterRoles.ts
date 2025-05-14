import { PrismaClient, ClusterRole, Cluster, User, Permission } from '@prisma/client';
import { faker } from '@faker-js/faker';

export async function seedCustomClusterRoles(prisma: PrismaClient) {
  console.log('Seeding custom cluster roles and their permissions...');

  const clusters = await prisma.cluster.findMany();
  const users = await prisma.user.findMany();
  const allPermissions = await prisma.permission.findMany();

  if (clusters.length < 3 && clusters.length > 0) {
    console.warn('⚠️ Less than 3 clusters found. Will create custom roles for all available clusters.');
  } else if (clusters.length === 0) {
    console.warn('⚠️ No clusters found. Skipping custom cluster role seeding.');
    return;
  }
  if (users.length === 0) {
    console.warn('⚠️ No users found. Skipping custom cluster role assignment.');
    return;
  }
  if (allPermissions.length === 0) {
    console.warn('No permissions found to assign to custom cluster roles.');
    return;
  }

  const clusterRelevantPermissions = allPermissions.filter(p => 
    p.key.startsWith('CLUSTER_') || 
    p.permissionGroup?.toLowerCase().includes('cluster')
  );
  if (clusterRelevantPermissions.length === 0) {
    console.warn('No CLUSTER relevant permissions found. Custom cluster roles will not have permissions assigned.');
  }

  const customClusterRolesCreated: ClusterRole[] = [];
  const numberOfClustersForRoles = Math.min(clusters.length, 3);
  const clustersUsedForCustomRoles = faker.helpers.shuffle([...clusters]).slice(0, numberOfClustersForRoles);

  for (let i = 0; i < clustersUsedForCustomRoles.length; i++) {
    const cluster = clustersUsedForCustomRoles[i];
    const roleName = `Cluster Custom ${faker.commerce.department()} Head ${i + 1}`;
    try {
      const customRole = await prisma.clusterRole.create({
        data: {
          name: roleName,
          description: `A custom cluster role for ${cluster.name}: ${faker.lorem.sentence()}`,
          clusterId: cluster.id,
          isSystemRole: false,
        },
      });
      customClusterRolesCreated.push(customRole);
      console.log(`Created custom cluster role: ${customRole.name} for cluster ${cluster.name}`);

      if (clusterRelevantPermissions.length > 0) {
        const permissionsToAssign = faker.helpers.arrayElements(clusterRelevantPermissions, faker.number.int({ min: 1, max: Math.min(2, clusterRelevantPermissions.length) }));
        for (const perm of permissionsToAssign) {
          try {
            await prisma.clusterRolePermission.create({ data: { clusterRoleId: customRole.id, permissionId: perm.id } });
          } catch (e: any) {
            if (e.code !== 'P2002') console.error(`Error assigning perm ${perm.key} to cluster role ${customRole.name}`, e);
          }
        }
      }
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.warn(`Custom cluster role named '${roleName}' likely already exists for cluster ${cluster.name}. Skipping.`);
      } else {
        console.error(`Error creating custom cluster role ${roleName} for cluster ${cluster.name}:`, e);
      }
    }
  }

  if (customClusterRolesCreated.length === 0) {
    console.log('No new custom cluster roles were created. Skipping assignment.');
    return;
  }

  let usersAssignedCustomClusterRolesCount = 0;
  const targetAssignments = 20;
  const assignedUserClusterRoleCombo = new Set<string>();

  for (let attempt = 0; attempt < 10 && usersAssignedCustomClusterRolesCount < targetAssignments; attempt++) {
    const randomUser = faker.helpers.arrayElement(users);
    const randomCustomRole = faker.helpers.arrayElement(customClusterRolesCreated);

    if (!randomCustomRole.clusterId) continue;

    const assignmentKey = `${randomUser.id}-${randomCustomRole.clusterId}-${randomCustomRole.id}`;
    if (assignedUserClusterRoleCombo.has(assignmentKey)) {
      continue;
    }

    try {
      await prisma.userClusterRole.create({
        data: {
          userId: randomUser.id,
          clusterId: randomCustomRole.clusterId,
          clusterRoleId: randomCustomRole.id,
        },
      });
      assignedUserClusterRoleCombo.add(assignmentKey);
      usersAssignedCustomClusterRolesCount++;
    } catch (e: any) {
      if (e.code !== 'P2002') {
        // console.warn(`Could not assign custom cluster role ${randomCustomRole.name} to user ${randomUser.username}: ${e.message}`);
      }
    }
    if (usersAssignedCustomClusterRolesCount >= targetAssignments) break;
  }

  console.log(`Custom cluster roles & permissions seeding finished. ${customClusterRolesCreated.length} roles created, ${usersAssignedCustomClusterRolesCount} user assignments made.`);
} 