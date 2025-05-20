import { PrismaClient } from '@prisma/client';

/**
 * Seeds the database with essential system-level roles.
 * These roles are global (guildId: null) and marked as system roles.
 * This script is designed to be idempotent.
 */
export async function seedSystemRoles(prisma: PrismaClient) {
  console.log('🌱 Seeding system roles (FOUNDER, ADMIN, MODERATOR, MEMBER)...');

  const systemRolesData = [
    {
      name: 'FOUNDER',
      description: 'Full control over a guild. Typically the user who founded the guild.',
      isSystemRole: true,
      isDefaultRole: false,
    },
    {
      name: 'ADMIN',
      description: 'Grants broad administrative permissions within a guild, but less than Founder.',
      isSystemRole: true,
      isDefaultRole: false,
    },
    {
      name: 'MODERATOR',
      description: 'Can manage content and members within specific guidelines, less than Admin.',
      isSystemRole: true,
      isDefaultRole: false,
    },
    {
      name: 'MEMBER',
      description: 'Basic membership role for a guild. Typically assigned to new members.',
      isSystemRole: true,
      isDefaultRole: true,
    },
  ];

  let createdCount = 0;
  let updatedCount = 0;

  for (const roleData of systemRolesData) {
    try {
      const existingRole = await prisma.role.findFirst({
        where: {
          name: roleData.name,
          guildId: null, // System roles have null guildId
          isSystemRole: true,
        },
      });

      if (existingRole) {
        // Update if necessary (e.g., if description changed)
        if (existingRole.description !== roleData.description || existingRole.isDefaultRole !== roleData.isDefaultRole) {
          await prisma.role.update({
            where: { id: existingRole.id },
            data: {
              description: roleData.description,
              isDefaultRole: roleData.isDefaultRole,
            },
          });
          console.log(`   Updated system role: ${roleData.name}`);
          updatedCount++;
        } else {
          console.log(`   System role ${roleData.name} already exists and is up-to-date.`);
        }
      } else {
        await prisma.role.create({
          data: {
            name: roleData.name,
            description: roleData.description,
            isSystemRole: true,
            isDefaultRole: roleData.isDefaultRole,
            guildId: null, // Explicitly set guildId to null for system roles
          },
        });
        console.log(`   Created system role: ${roleData.name}`);
        createdCount++;
      }
    } catch (error) {
      console.error(`Error processing system role ${roleData.name}:`, error);
    }
  }

  console.log(`✅ System roles seeding finished. ${createdCount} created, ${updatedCount} updated.`);
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