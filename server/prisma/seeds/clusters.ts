import { PrismaClient, User, ContactType, ClusterRole as PrismaClusterRole } from '@prisma/client';
import { faker } from '@faker-js/faker';

const contactTypes = Object.values(ContactType);

function getRandomPicsumUrl(width: number, height: number): string {
  const imageNumber = faker.number.int({ min: 0, max: 999 });
  return `https://picsum.photos/id/${imageNumber}/${width}/${height}`;
}

export async function seedClusters(prisma: PrismaClient) {
  console.log('Seeding clusters, contacts, and system roles (creator/admin)...');

  const users = await prisma.user.findMany();
  const clusterCreatorSystemRole = await prisma.clusterRole.findFirst({ where: { name: 'CLUSTER_CREATOR', isSystemRole: true, clusterId: null }});
  const clusterAdminSystemRole = await prisma.clusterRole.findFirst({ where: { name: 'CLUSTER_ADMIN', isSystemRole: true, clusterId: null }});

  if (users.length === 0) {
    console.log('⚠️ No users found. Skipping cluster seeding.');
    return;
  }
  if (!clusterCreatorSystemRole || !clusterAdminSystemRole) {
    console.error('❌ CLUSTER_CREATOR or CLUSTER_ADMIN system roles not found. Cannot assign default roles to clusters.');
    // Continue to seed clusters, but roles won't be assigned.
  }

  const clusterData = [
    {
      name: 'Cluster1',
      displayName: 'The First Cluster',
      description: faker.lorem.paragraph(),
      avatar: getRandomPicsumUrl(128, 128),
      isOpen: faker.datatype.boolean(),
      createdById: users[Math.floor(Math.random() * users.length)].id,
    },
    {
      name: 'Cluster2',
      displayName: 'The Second Cluster',
      description: faker.lorem.paragraph(),
      avatar: getRandomPicsumUrl(128, 128),
      isOpen: faker.datatype.boolean(),
      createdById: users[Math.floor(Math.random() * users.length)].id,
    },
  ];

  for (const data of clusterData) {
    const cluster = await prisma.cluster.upsert({
      where: { name: data.name },
      update: { avatar: data.avatar, description: data.description, isOpen: data.isOpen, displayName: data.displayName },
      create: data,
    });
    console.log(`Upserted cluster: ${cluster.displayName} (ID: ${cluster.id})`);

    // Assign CLUSTER_CREATOR role to the creator
    if (clusterCreatorSystemRole) {
      try {
        await prisma.userClusterRole.create({
          data: {
            userId: cluster.createdById,
            clusterId: cluster.id,
            clusterRoleId: clusterCreatorSystemRole.id,
          }
        });
        console.log(`Assigned CLUSTER_CREATOR to ${cluster.createdById} for cluster ${cluster.name}`);
      } catch (e:any) { if (e.code !== 'P2002') console.error(`Error assigning CLUSTER_CREATOR for ${cluster.name}`, e);}
    }

    // Assign CLUSTER_ADMIN role to 2 other users
    if (clusterAdminSystemRole) {
      const potentialAdmins = users.filter(u => u.id !== cluster.createdById);
      const shuffledAdmins = faker.helpers.shuffle(potentialAdmins).slice(0, 2);
      for (const adminUser of shuffledAdmins) {
        try {
          await prisma.userClusterRole.create({
            data: {
              userId: adminUser.id,
              clusterId: cluster.id,
              clusterRoleId: clusterAdminSystemRole.id,
            }
          });
          console.log(`Assigned CLUSTER_ADMIN to ${adminUser.username} for cluster ${cluster.name}`);
        } catch (e:any) { if (e.code !== 'P2002') console.error(`Error assigning CLUSTER_ADMIN for ${cluster.name}`, e);}
      }
    }

    // Seed contacts for this cluster
    const numberOfContacts = faker.number.int({ min: 1, max: 3 });
    for (let j = 0; j < numberOfContacts; j++) {
      const contactType = faker.helpers.arrayElement(contactTypes);
      let value = '';
      switch (contactType) {
        case 'EMAIL':
          value = faker.internet.email();
          break;
        case 'WEBSITE':
          value = faker.internet.url();
          break;
        case 'DISCORD':
          value = `https://discord.gg/${faker.lorem.word()}${faker.string.alphanumeric(4)}`;
          break;
        default:
          value = faker.internet.url();
      }
      await prisma.clusterContact.create({
        data: {
          clusterId: cluster.id,
          type: contactType,
          value: value,
          label: contactType === 'CUSTOM' ? faker.lorem.words(2) : null,
          displayOrder: j,
        },
      });
    }
  }

  console.log('Clusters, contacts, and system role assignments seeded.');
} 