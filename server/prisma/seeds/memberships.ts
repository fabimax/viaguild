import { PrismaClient } from '@prisma/client'

// Sample memberships with roles
const memberships = [
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
  console.log('👥 Seeding guild memberships...')
  
  try {
    for (const membershipData of memberships) {
      const { guildName, members } = membershipData
      
      // Find guild with raw query - add typing
      const guilds = await prisma.$queryRaw<GuildQueryResult[]>`
        SELECT id FROM "Guild" WHERE name = ${guildName} LIMIT 1
      `
      
      if (!guilds || !guilds[0]) {
        console.log(`Guild ${guildName} not found, skipping memberships...`)
        continue
      }
      
      const guildId = guilds[0].id
      
      // Create membership for each member
      for (const memberData of members) {
        const { username, role, isPrimary } = memberData
        
        // Find user
        const user = await prisma.user.findUnique({
          where: { username }
        })
        
        if (!user) {
          console.log(`User ${username} not found, skipping membership...`)
          continue
        }
        
        // Reset primary status if needed
        if (isPrimary) {
          await prisma.$executeRaw`
            UPDATE "GuildMembership" 
            SET "isPrimary" = false 
            WHERE "userId" = ${user.id} AND "isPrimary" = true
          `
        }
        
        // Create membership with raw query
        await prisma.$executeRaw`
          INSERT INTO "GuildMembership" (id, "userId", "guildId", role, "isPrimary", "joinedAt")
          VALUES (gen_random_uuid(), ${user.id}, ${guildId}, ${role}::Role, ${isPrimary}, now())
          ON CONFLICT ("userId", "guildId") DO NOTHING
        `
        
        console.log(`Created membership: ${username} in ${guildName} as ${role}`)
      }
    }
  } catch (error) {
    console.error('Error seeding memberships:', error)
  }
  
  console.log('✅ Guild memberships seeded successfully')
} 