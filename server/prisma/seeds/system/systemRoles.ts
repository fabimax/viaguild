import { PrismaClient } from '@prisma/client';

/**
 * Seeds the database with essential system-level roles.
 * These roles are global (guildId: null) and marked as system roles.
 * This script is designed to be idempotent, meaning it can be run multiple times
 * without creating duplicate system roles.
 */
export async function seedSystemRoles(prisma: PrismaClient) {
  console.log('🌱 Seeding system roles...');

  const systemRolesData = [
    {
      name: 'CREATOR',
      description: 'Full control over a guild. Typically the user who created the guild.',
      isSystemRole: true,
      isDefaultRole: false, // Not assigned by default to new members, but to the creator on guild creation
    },
    {
      name: 'ADMIN',
      description: 'Grants broad administrative permissions within a guild, but less than Owner.',
      isSystemRole: true,
      isDefaultRole: false,
      guildId: null, // Global system role
    },
    {
      name: 'MODERATOR',
      description: 'Can manage content and members within specific guidelines, less than Admin.',
      isSystemRole: true,
      isDefaultRole: false,
      guildId: null, // Global system role
    },
    {
      name: 'MEMBER',
      description: 'Basic membership role for a guild. Typically assigned to new members.',
      isSystemRole: true,
      isDefaultRole: true, // Often the default for new members joining a guild
      guildId: null, // Global system role
    },
  ];

  for (const roleData of systemRolesData) {
    const existingRole = await prisma.role.findFirst({
      where: {
        name: roleData.name,
        isSystemRole: true,
        guildId: null, // Ensure we are checking for the global system role
      },
    });

    if (!existingRole) {
      await prisma.role.create({
        data: roleData,
      });
      console.log(`   Created system role: ${roleData.name}`);
    } else {
      console.log(`   System role ${roleData.name} already exists, skipping.`);
    }
  }

  console.log('✅ System roles seeded successfully (or already existed).');
}

// If you want to run this script directly using `ts-node server/prisma/seeds/system/systemRoles.ts`
// uncomment the following lines:

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

main(); 