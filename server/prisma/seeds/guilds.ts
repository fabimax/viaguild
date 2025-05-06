import { PrismaClient } from '@prisma/client'

// Sample guilds with creators
const guilds = [
  {
    name: 'Design Masters',
    description: 'A guild for designers and creatives to share ideas, get feedback, and collaborate on projects. We focus on UI/UX, graphic design, illustration, and other creative fields.',
    isOpen: false,
    creatorUsername: 'janedoe'
  },
  {
    name: 'Code Ninjas',
    description: 'A community of developers passionate about coding. We discuss best practices, new technologies, and help each other solve programming challenges.',
    isOpen: true,
    creatorUsername: 'johndoe'
  },
  {
    name: 'Gaming League',
    description: 'For gamers of all levels to connect, organize tournaments, and discuss gaming news and strategies.',
    isOpen: true,
    creatorUsername: 'bobsmith'
  },
  {
    name: 'Tech Innovators',
    description: 'A guild dedicated to discussing emerging technologies, startups, and innovation in the tech space.',
    isOpen: false,
    creatorUsername: 'johndoe'
  },
  {
    name: 'Content Creators',
    description: 'For YouTubers, streamers, podcasters, and other content creators to network and share tips and strategies.',
    isOpen: false,
    creatorUsername: 'janedoe'
  }
]

export async function seedGuilds(prisma: PrismaClient) {
  console.log('🏰 Seeding guilds...')
  
  try {
    for (const guildData of guilds) {
      const { name, description, isOpen, creatorUsername } = guildData
      
      // We'll skip checking for existing guilds since we can't access guild model directly
      
      // Find creator user
      const creator = await prisma.user.findUnique({
        where: { username: creatorUsername }
      })
      
      if (!creator) {
        console.log(`Creator user ${creatorUsername} not found, skipping guild ${name}...`)
        continue
      }
      
      // Create guild with direct database query
      await prisma.$executeRaw`
        INSERT INTO "Guild" (id, name, description, "isOpen", "createdById", "updatedById", "createdAt", "updatedAt") 
        VALUES (gen_random_uuid(), ${name}, ${description}, ${isOpen}, ${creator.id}, ${creator.id}, now(), now())
        ON CONFLICT (name) DO NOTHING
      `
      
      console.log(`Created guild: ${name}`)
    }
  } catch (error) {
    console.error('Error seeding guilds:', error)
  }
  
  console.log('✅ Guilds seeded successfully')
} 