import { PrismaClient } from '@prisma/client'
import { seedUsers } from './seeds/users'
import { seedGuilds } from './seeds/guilds'
import { seedMemberships } from './seeds/memberships'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed process...')
  
  // Order matters for relationships
  await seedUsers(prisma)
  await seedGuilds(prisma)
  await seedMemberships(prisma)
  
  console.log('✅ Seed completed successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e)
    await prisma.$disconnect()
    process.exit(1)
  }) 