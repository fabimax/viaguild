import { PrismaClient, User } from '@prisma/client'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcryptjs'

export const TEST_USER_PRIME_USERNAME = 'TestUserPrime';
export const TEST_USER_PRIME_EMAIL = 'prime@example.com';

export async function seedUsers(prisma: PrismaClient) {
  console.log('Seeding users, ensuring TestUserPrime exists...')

  // --- Create/Upsert TestUserPrime ---
  const primePasswordHash = await bcrypt.hash('passwordPrime123', 10);
  try {
    const testUserPrime = await prisma.user.upsert({
      where: { username_ci: TEST_USER_PRIME_USERNAME.toLowerCase() },
      update: { 
        email: TEST_USER_PRIME_EMAIL, 
        email_ci: TEST_USER_PRIME_EMAIL.toLowerCase(),
        displayName: 'Test User Prime',
        bio: 'The primary user for testing all ViaGuild features, especially badges!',
        avatar: `https://picsum.photos/id/142/128/128`, // Consistent avatar
        isPublic: true,
      },
      create: {
        username: TEST_USER_PRIME_USERNAME,
        username_ci: TEST_USER_PRIME_USERNAME.toLowerCase(),
        email: TEST_USER_PRIME_EMAIL,
        email_ci: TEST_USER_PRIME_EMAIL.toLowerCase(),
        displayName: 'Test User Prime',
        passwordHash: primePasswordHash,
        bio: 'The primary user for testing all ViaGuild features, especially badges!',
        avatar: `https://picsum.photos/id/142/128/128`, 
        isPublic: true,
      },
    });
    console.log(`   Upserted special user: ${testUserPrime.username} (ID: ${testUserPrime.id})`);
  } catch (e: any) {
    // Catch if unique email constraint fails during an update attempt where username matched but email was different
    if (e.code === 'P2002' && e.meta?.target?.includes('email')) {
        console.warn(`Could not upsert TestUserPrime due to email conflict. Attempting to find by email.`);
        const existingByEmail = await prisma.user.findUnique({where: {email: TEST_USER_PRIME_EMAIL}});
        if(existingByEmail && existingByEmail.username !== TEST_USER_PRIME_USERNAME){
            console.error(`CRITICAL: TestUserPrime email (${TEST_USER_PRIME_EMAIL}) is taken by another user (${existingByEmail.username}). Manual intervention needed.`)
        } else if (existingByEmail && existingByEmail.username_ci === TEST_USER_PRIME_USERNAME.toLowerCase()) {
            console.log('TestUserPrime already exists with the correct username_ci and email_ci.');
        } else {
            console.error(`CRITICAL: TestUserPrime could not be reliably upserted due to email unique constraint. Error: ${e.message}`);
        }
    } else {
        console.error(`Error upserting TestUserPrime:`, e);
        // Decide if this is critical enough to stop further user seeding
    }
  }
  // --- End TestUserPrime --- 

  const usersToCreate = 50 // This is the target total, including TestUserPrime if they were just created
  const existingUsersCount = await prisma.user.count()
  let usersNeeded = Math.max(0, usersToCreate - existingUsersCount)

  if (usersNeeded === 0 && existingUsersCount >= usersToCreate) {
    console.log('Desired number of users (or more) already seeded, including TestUserPrime.')
    // return; // Keep it running to ensure at least some users are logged if needed by other seeders
  } else if (usersNeeded > 0) {
     console.log(`Need to create ${usersNeeded} additional random users.`);
  } else if (existingUsersCount < usersToCreate) {
    // This case means TestUserPrime existed, but we still need more users to reach the total.
    usersNeeded = usersToCreate - existingUsersCount;
    console.log(`TestUserPrime existed. Need to create ${usersNeeded} additional random users.`);
  }

  const createdUsers = []
  for (let i = 0; i < usersNeeded; i++) {
    const baseUsername = faker.internet.username();
    // Sanitize username: replace non-alphanumeric (excluding _) with underscore, ensure it doesn't start/end with _
    let sanitizedUsername = baseUsername.replace(/[^a-zA-Z0-9_]/g, '').replace(/^_+|_+$/g, '');
    if (sanitizedUsername.length < 3) {
        sanitizedUsername = `${sanitizedUsername}${faker.string.alphanumeric(3)}`; // Ensure min length
    }
    const randomNumber = Math.floor(Math.random() * 10000); // Increased randomness
    const username = `${sanitizedUsername.substring(0, 20)}_${randomNumber}`; // Ensure more unique usernames and cap length
    const email = faker.internet.email({ firstName: sanitizedUsername.substring(0, 10), lastName: randomNumber.toString() })
    const password = 'password123'
    const passwordHash = await bcrypt.hash(password, 10)

    try {
      const user = await prisma.user.create({
        data: {
          username,
          username_ci: username.toLowerCase(),
          email,
          email_ci: email.toLowerCase(),
          displayName: faker.person.fullName(),
          passwordHash,
          bio: faker.lorem.sentence(),
          avatar: faker.image.avatar(),
          isPublic: true,
        },
      })
      createdUsers.push(user)
      // console.log(`Created random user: ${user.username} (ID: ${user.id})`) // Made less verbose
    } catch (e: any) {
      if (e.code === 'P2002') { 
        console.warn(`Skipping random user creation due to conflict (username/email): ${username} / ${email}`)
      } else {
        console.error(`Error creating random user ${username}:`, e)
      }
    }
  }

  if (usersNeeded > 0 && createdUsers.length > 0) {
    console.log(`   Created ${createdUsers.length} additional random users.`);
  }
  if (usersNeeded > 0 && createdUsers.length === 0 && usersNeeded > 0) { 
    console.warn('No new random users were created despite needing them. Check for persistent unique constraint issues with Faker data generation.')
  }

  console.log('✅ Users seeding finished.')
}

// Main execution block (if running this file directly, keep it commented for library use)
/*
async function main() {
  const prisma = new PrismaClient();
  try {
    await seedUsers(prisma);
  } catch (e) {
    console.error('Error seeding users:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// main();
*/

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