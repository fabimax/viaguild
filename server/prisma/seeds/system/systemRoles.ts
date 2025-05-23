import { PrismaClient } from '@prisma/client';

/**
 * Seeds the database with essential system-level roles.
 * These roles are global (guildId: null) and marked as system roles.
 * This script is designed to be idempotent.
 */
export async function seedSystemRoles(prisma: PrismaClient) {
  console.log('🌱 Seeding system GUILD roles (FOUNDER, ADMIN, MODERATOR, MEMBER) with colors and API visibility...');

  const systemRolesData = [
    {
      name: 'FOUNDER',
      description: 'Full control over a guild. Typically the user who founded the guild.',
      isSystemRole: true,
      isDefaultRole: false,
      displayColor: '#f59e0b', // Gold-ish
      apiVisible: true,
    },
    {
      name: 'ADMIN',
      description: 'Grants broad administrative permissions within a guild, but less than Founder.',
      isSystemRole: true,
      isDefaultRole: false,
      displayColor: '#4f46e5', // Indigo/Primary Purple
      apiVisible: true,
    },
    {
      name: 'MODERATOR',
      description: 'Can manage content and members within specific guidelines, less than Admin.',
      isSystemRole: true,
      isDefaultRole: false,
      displayColor: '#008F21', // Dark Green
      apiVisible: true,
    },
    {
      name: 'MEMBER',
      description: 'Basic membership role for a guild. Typically assigned to new members.',
      isSystemRole: true,
      isDefaultRole: true,
      displayColor: '#64748b', // Gray -- a distinct member color
      apiVisible: true, // Typically member role might be queryable
    },
  ];

  let createdCount = 0;
  let updatedCount = 0;

  for (const roleData of systemRolesData) {
    const nameCi = roleData.name.toLowerCase();
    try {
    const existingRole = await prisma.guildRole.findFirst({
      where: {
        name_ci: nameCi,
        guildId: null, //System roles are global (guildId: null)
        isSystemRole: true,
      },
    });

      if (existingRole) {
        // Check if an update is needed for any relevant field
        if (
          existingRole.description !== roleData.description ||
          existingRole.isDefaultRole !== roleData.isDefaultRole ||
          existingRole.displayColor !== roleData.displayColor ||
          existingRole.apiVisible !== roleData.apiVisible
        ) {
          await prisma.guildRole.update({
            where: { id: existingRole.id },
            data: {
              description: roleData.description,
              isDefaultRole: roleData.isDefaultRole,
              displayColor: roleData.displayColor,
              apiVisible: roleData.apiVisible,
              // isSystemRole and guildId are not changed for existing system roles
            },
          });
          console.log(`   Updated system guild role: ${roleData.name}`);
          updatedCount++;
        } else {
          console.log(`   System guild role ${roleData.name} already exists and is up-to-date.`);
        }
      } else {
      await prisma.guildRole.create({
          data: {
            name: roleData.name,
            name_ci: nameCi,
            description: roleData.description,
            isSystemRole: true,
            isDefaultRole: roleData.isDefaultRole,
            displayColor: roleData.displayColor,
            apiVisible: roleData.apiVisible,
            guildId: null, //System roles are global (guildId: null)
          },
      });
      console.log(`   Created system guild role: ${roleData.name}`);
        createdCount++;
      }
    } catch (error) {
      console.error(`Error processing system guild role ${roleData.name}:`, error);
    }
  }

  console.log(`✅ System guild roles seeding finished. ${createdCount} created, ${updatedCount} updated/verified.`);
}

// If you want to run this script directly using `ts-node server/prisma/seeds/system/systemRoles.ts`
// (ensure you have ts-node and necessary configs or use `npx prisma db seed` which handles it)
/*
async function main() {
  const prisma = new PrismaClient();
  try {
    await seedSystemRoles(prisma);
  } catch (e) {
    console.error('Error seeding system roles:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// main();
*/ 