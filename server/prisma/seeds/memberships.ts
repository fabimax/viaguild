import { PrismaClient, Role } from '@prisma/client'

// Sample memberships with roles
const membershipsData = [
  {
    guildName: 'Design Masters',
    members: [
      { username: 'janedoe', role: 'OWNER', isPrimary: true },
      { username: 'johndoe', role: 'MEMBER', isPrimary: false },
      { username: 'bobsmith', role: 'ADMIN', isPrimary: false }
    ]
  },
  {
    guildName: 'Code Ninjas',
    members: [
      { username: 'johndoe', role: 'OWNER', isPrimary: true },
      { username: 'bobsmith', role: 'ADMIN', isPrimary: false }
    ]
  },
  {
    guildName: 'Gaming League',
    members: [
      { username: 'bobsmith', role: 'OWNER', isPrimary: true },
      { username: 'johndoe', role: 'MEMBER', isPrimary: false },
      { username: 'janedoe', role: 'MEMBER', isPrimary: false }
    ]
  },
  {
    guildName: 'Tech Innovators',
    members: [
      { username: 'johndoe', role: 'OWNER', isPrimary: false },
      { username: 'bobsmith', role: 'MEMBER', isPrimary: false }
    ]
  },
  {
    guildName: 'Content Creators',
    members: [
      { username: 'janedoe', role: 'OWNER', isPrimary: false }
    ]
  }
]

// Define interface for guild query result
interface GuildQueryResult {
  id: string;
}

export async function seedMemberships(prisma: PrismaClient) {
  console.log('👥 Seeding guild memberships (using Role IDs)...')
  
  try {
    // 1. Fetch System Role IDs
    const ownerRole = await prisma.role.findFirst({ where: { name: 'OWNER', isSystemRole: true, guildId: null }, select: { id: true } });
    const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN', isSystemRole: true, guildId: null }, select: { id: true } });
    const memberRole = await prisma.role.findFirst({ where: { name: 'MEMBER', isSystemRole: true, guildId: null }, select: { id: true } });

    if (!ownerRole || !adminRole || !memberRole) {
      console.error('❌ Critical error: System roles (OWNER, ADMIN, MEMBER) not found in Role table. Aborting membership seeding.');
      console.error('   Please ensure `seedSystemRoles` has been run successfully before this script.');
      return; // Stop execution if system roles aren't found
    }

    const roleIdMap: Record<string, string> = {
      OWNER: ownerRole.id,
      ADMIN: adminRole.id,
      MEMBER: memberRole.id,
    };

    for (const guildMembershipData of membershipsData) {
      const { guildName, members } = guildMembershipData
      
      // Find guild using Prisma Client
      const guild = await prisma.guild.findUnique({
        where: { name: guildName },
        select: { id: true },
      })
      
      if (!guild) {
        console.log(`Guild ${guildName} not found, skipping memberships...`)
        continue
      }
      
      const guildId = guild.id
      
      for (const memberData of members) {
        const { username, role: roleName, isPrimary } = memberData
        
        const user = await prisma.user.findUnique({
          where: { username },
          select: { id: true },
        })
        
        if (!user) {
          console.log(`User ${username} not found, skipping membership in ${guildName}...`)
          continue
        }
        
        const userId = user.id
        
        const targetRoleId = roleIdMap[roleName]
        if (!targetRoleId) {
          console.log(`Warning: Role name "${roleName}" for user ${username} in ${guildName} is not a recognized system role. Skipping.`)
          continue
        }
        
        // Reset primary status if needed, using Prisma Client
        if (isPrimary) {
          await prisma.guildMembership.updateMany({
            where: { userId, isPrimary: true },
            data: { isPrimary: false },
          })
        }
        
        // Create membership using Prisma Client and roleId
        try {
          const newMembership = await prisma.guildMembership.create({
            data: {
              userId,
              guildId,
              roleId: targetRoleId, // Use the mapped role ID
              isPrimary,
              // joinedAt will default to now() as per schema
              // rank will default to 'E' as per schema
            },
          })
          console.log(`Created membership: ${username} in ${guildName} as ${roleName} (roleId: ${newMembership.roleId})`)
        } catch (error: any) {
          if (error.code === 'P2002') { // Unique constraint violation (user already member of guild)
            console.log(`Membership for ${username} in ${guildName} already exists, skipping.`)
          } else {
            console.error(`Error creating membership for ${username} in ${guildName}:`, error)
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error seeding memberships:', error)
  }
  
  console.log('✅ Guild memberships seeding process completed.')
} 