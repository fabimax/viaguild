import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcryptjs'

export async function seedUsers(prisma: PrismaClient) {
  console.log('Seeding users...')

  const usersToCreate = 50
  const existingUsers = await prisma.user.count()
  const usersNeeded = Math.max(0, usersToCreate - existingUsers)

  if (usersNeeded === 0) {
    console.log('Desired number of users already seeded.')
    // return; // Keep it running to ensure at least some users are logged if needed by other seeders
  }

  const createdUsers = []
  for (let i = 0; i < usersNeeded; i++) {
    const baseUsername = faker.internet.username();
    const sanitizedUsername = baseUsername.replace(/[^\w]/g, '_'); // Replace non-alphanumeric (excluding _) with underscore
    const randomNumber = Math.floor(Math.random() * 1000); // Random number between 0 and 999
    const username = `${sanitizedUsername}${randomNumber}`; // Ensure more unique usernames
    const email = faker.internet.email({ firstName: username })
    const password = 'password123' // Use a simple default password for all seeded users
    const passwordHash = await bcrypt.hash(password, 10)

    try {
      const user = await prisma.user.create({
        data: {
          username,
          email,
          displayName: faker.person.fullName(),
          passwordHash,
          bio: faker.lorem.sentence(),
          avatar: faker.image.avatar(),
          isPublic: true,
        },
      })
      createdUsers.push(user)
      console.log(`Created user: ${user.username} (ID: ${user.id})`)
    } catch (e: any) {
      if (e.code === 'P2002') { // Unique constraint violation
        console.warn(`Skipping user creation due to conflict (likely username or email): ${username} / ${email}`)
        // Optionally, retry with a new username/email or decrement i to try again
      } else {
        console.error(`Error creating user ${username}:`, e)
      }
    }
  }

  // If no new users were created but we needed them, it might indicate persistent conflicts.
  if (usersNeeded > 0 && createdUsers.length === 0) {
    console.warn('No new users were created despite needing them. Check for persistent unique constraint issues.')
  }

  console.log(`Users seeding finished. ${createdUsers.length} new users created.`)
}

// Example of how this might have looked before, for context if only a few users were made.
// export async function seedUsers(prisma: PrismaClient) {
//   console.log('Seeding users...');

//   const passwordHash = await bcrypt.hash('password123', 10);

//   const userData = [
//     {
//       username: 'AliceWonder',
//       email: 'alice@example.com',
//       displayName: 'Alice W.',
//       passwordHash,
//       bio: 'Curiouser and curiouser!',
//     },
//     {
//       username: 'BobTheBuilder',
//       email: 'bob@example.com',
//       displayName: 'Bob B.',
//       passwordHash,
//       bio: 'Can we fix it? Yes, we can!',
//     },
//     // Add more users as needed
//   ];

//   for (const data of userData) {
//     const user = await prisma.user.upsert({
//       where: { email: data.email },
//       update: {},
//       create: data,
//     });
//     console.log(\`Upserted user: ${user.username} (ID: ${user.id})\`);
//   }

//   console.log('Users seeded.');
// } 