import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

// Sample test users
const users = [
  {
    email: 'john@example.com',
    username: 'johndoe',
    password: 'Password123!',
    bio: 'Tech enthusiast and gamer',
    isPublic: true,
    socialAccounts: [
      {
        provider: 'twitter',
        providerId: '123456789',
        username: 'johndoe_twitter'
      },
      {
        provider: 'bluesky',
        providerId: 'bsky123456',
        username: 'johndoe.bsky'
      }
    ]
  },
  {
    email: 'jane@example.com',
    username: 'janedoe',
    password: 'Password123!',
    bio: 'Artist and designer',
    isPublic: true,
    socialAccounts: [
      {
        provider: 'twitter',
        providerId: '987654321',
        username: 'janedoe_twitter'
      },
      {
        provider: 'twitch',
        providerId: 'twitch987654',
        username: 'janedoe_twitch'
      }
    ]
  },
  {
    email: 'bob@example.com',
    username: 'bobsmith',
    password: 'Password123!',
    bio: 'Software developer and open source contributor',
    isPublic: true,
    socialAccounts: [
      {
        provider: 'discord',
        providerId: 'discord123456',
        username: 'bobsmith#1234'
      }
    ]
  }
]

export async function seedUsers(prisma: PrismaClient) {
  console.log('🧑 Seeding users...')
  
  for (const userData of users) {
    const { email, username, password, bio, isPublic, socialAccounts } = userData
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    })
    
    if (existingUser) {
      console.log(`User ${username} already exists, skipping...`)
      continue
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        bio,
        isPublic
      }
    })
    
    // Create social accounts
    for (const accountData of socialAccounts) {
      await prisma.socialAccount.create({
        data: {
          ...accountData,
          userId: user.id
        }
      })
    }
    
    console.log(`Created user: ${username} (${user.id})`)
  }
  
  console.log('✅ Users seeded successfully')
} 