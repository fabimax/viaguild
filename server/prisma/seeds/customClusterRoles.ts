import { PrismaClient, ClusterRole, Cluster, User, Permission } from '@prisma/client';
import { faker } from '@faker-js/faker';

// Define the names of the clusters seeded by clusters.ts that we want to target
const TARGET_CLUSTER_NAMES = ['Cluster1', 'Cluster2']; // Add more if clusters.ts seeds more named clusters

export async function seedCustomClusterRoles(prisma: PrismaClient) {
  console.log('Seeding custom cluster roles for specifically targeted seeded clusters...');

  // Fetch only the specific clusters we intend to add custom roles to
  const targetClusters = await prisma.cluster.findMany({
    where: {
      name: { in: TARGET_CLUSTER_NAMES }
    }
  });
  
  const users = await prisma.user.findMany(); // Needed for assigning roles to users later
  const allPermissions = await prisma.permission.findMany();

  if (targetClusters.length === 0) {
    console.warn(`⚠️ None of the target clusters (${TARGET_CLUSTER_NAMES.join(', ')}) found. Skipping custom cluster role seeding.`);
    return;
  }
  if (users.length === 0) {
    console.warn('⚠️ No users found. Skipping custom cluster role assignment to users.');
    // We can still create the roles, just not assign them to users if none exist
  }
  if (allPermissions.length === 0) {
    console.warn('No permissions found to assign to custom cluster roles.');
    // Roles will be created without permissions
  }

  const clusterRelevantPermissions = allPermissions.filter(p => 
    p.key.startsWith('CLUSTER_') || 
    p.permissionGroup?.toLowerCase().includes('cluster')
  );
  if (clusterRelevantPermissions.length === 0 && allPermissions.length > 0) {
    console.warn('No CLUSTER relevant permissions found. Custom cluster roles will not have permissions assigned.');
  }

  const customClusterRolesCreated: ClusterRole[] = [];

  for (const cluster of targetClusters) {
    // Create 1-2 custom roles for each targeted cluster
    const numberOfCustomRolesToCreate = faker.number.int({ min: 1, max: 2 });
    for (let i = 0; i < numberOfCustomRolesToCreate; i++) {
      const roleName = `Cluster ${cluster.name} ${faker.person.jobTitle()} ${i + 1}`.replace(/[^a-zA-Z0-9_\s-]/g, '').substring(0,50);
      const roleNameCi = roleName.toLowerCase();
      try {
        const customRole = await prisma.clusterRole.upsert({
          where: { 
            unique_cluster_role_name_ci: {
                clusterId: cluster.id, 
                name_ci: roleNameCi 
            }
          }, 
          update: {
            description: `Custom role for ${cluster.name}: ${faker.lorem.sentence()}`,
          },
          create: {
            name: roleName,
            name_ci: roleNameCi,
            description: `Custom role for ${cluster.name}: ${faker.lorem.sentence()}`,
            clusterId: cluster.id,
            isSystemRole: false,
          },
        });
        customClusterRolesCreated.push(customRole);
        console.log(`   Upserted custom cluster role: "${customRole.name}" for cluster "${cluster.name}".`);

        // Assign some relevant permissions if available
        if (clusterRelevantPermissions.length > 0) {
          const permissionsToAssign = faker.helpers.arrayElements(clusterRelevantPermissions, faker.number.int({ min: 1, max: Math.min(2, clusterRelevantPermissions.length) }));
          for (const perm of permissionsToAssign) {
            try {
              await prisma.clusterRolePermission.upsert({ 
                where: { clusterRoleId_permissionId: { clusterRoleId: customRole.id, permissionId: perm.id } },
                update: {},
                create: { clusterRoleId: customRole.id, permissionId: perm.id },
              });
            } catch (e: any) {
              // P2002 is unique constraint violation, means it already exists, which is fine for upsert logic
              if (e.code !== 'P2002') console.error(`Error assigning perm ${perm.key} to cluster role ${customRole.name}`, e);
            }
          }
        }
      } catch (e: any) {
        // P2002 on role upsert means role with that name for that clusterId already exists
        if (e.code === 'P2002') {
          console.warn(`   Custom cluster role named '${roleName}' likely already exists for cluster ${cluster.name}. Skipping or was updated.`);
        } else {
          console.error(`   Error upserting custom cluster role ${roleName} for cluster ${cluster.name}:`, e);
        }
      }
    }
  }

  if (customClusterRolesCreated.length === 0 && targetClusters.length > 0) {
    console.log('No new custom cluster roles were created (they likely existed). Checking for roles to assign to users.');
    // If no new roles created, fetch existing custom roles for target clusters to assign to users
    const existingCustomRoles = await prisma.clusterRole.findMany({
        where: { 
            clusterId: { in: targetClusters.map(c => c.id) },
            isSystemRole: false
        }
    });
    customClusterRolesCreated.push(...existingCustomRoles);
  }
  
  if (customClusterRolesCreated.length === 0 || users.length === 0) {
    console.log('No custom cluster roles available or no users to assign them to. Skipping assignment.');
    console.log(`✅ Custom cluster roles & permissions seeding finished. ${customClusterRolesCreated.length} total custom roles processed for assignment, 0 user assignments made.`);
    return;
  }

  let usersAssignedCustomClusterRolesCount = 0;
  const targetAssignments = Math.min(users.length * targetClusters.length, 10); // Try to make at least a few assignments, cap at 10
  const assignedUserClusterRoleCombo = new Set<string>();

  // Assign users to the custom roles created/found in the target clusters
  for (let attempt = 0; attempt < targetAssignments * 2 && usersAssignedCustomClusterRolesCount < targetAssignments; attempt++) {
    if (customClusterRolesCreated.length === 0) break;
    const randomUser = faker.helpers.arrayElement(users);
    const randomCustomRoleToAssign = faker.helpers.arrayElement(customClusterRolesCreated);

    if (!randomCustomRoleToAssign.clusterId) continue; // Should always have clusterId now

    const assignmentKey = `${randomUser.id}-${randomCustomRoleToAssign.clusterId}-${randomCustomRoleToAssign.id}`;
    if (assignedUserClusterRoleCombo.has(assignmentKey)) {
      continue;
    }

    try {
      await prisma.userClusterRole.create({
        data: {
          userId: randomUser.id,
          clusterId: randomCustomRoleToAssign.clusterId, // Ensured this role has a clusterId
          clusterRoleId: randomCustomRoleToAssign.id,
        },
      });
      assignedUserClusterRoleCombo.add(assignmentKey);
      usersAssignedCustomClusterRolesCount++;
    } catch (e: any) {
      if (e.code !== 'P2002') {
        // console.warn(`Could not assign custom cluster role ${randomCustomRoleToAssign.name} to user ${randomUser.username}: ${e.message}`);
      }
    }
  }

  console.log(`✅ Custom cluster roles & permissions seeding finished. ${customClusterRolesCreated.length} distinct custom roles in target clusters considered, ${usersAssignedCustomClusterRolesCount} user assignments made.`);
} 
