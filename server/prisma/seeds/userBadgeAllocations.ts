import { PrismaClient, User, BadgeTier, UserBadgeAllocation } from '@prisma/client';
import { TEST_USER_PRIME_USERNAME } from './users'; // To give TestUserPrime allocations

interface UserAllocationSeed {
  username: string; // To find the user
  tierAllocations: {
    tier: BadgeTier;
    remaining: number;
  }[];
}

const allocationsToSeed: UserAllocationSeed[] = [
  {
    username: TEST_USER_PRIME_USERNAME,
    tierAllocations: [
      { tier: BadgeTier.GOLD, remaining: 3 },
      { tier: BadgeTier.SILVER, remaining: 10 },
      { tier: BadgeTier.BRONZE, remaining: 30 },
    ],
  },
  // Add another user or two if needed for testing varying allocation levels
  // For example, if you have another known admin/moderator username from your users.ts seed
  // {
  //   username: 'SomeOtherAdminUser', // Replace with an actual seeded username
  //   tierAllocations: [
  //     { tier: BadgeTier.GOLD, remaining: 1 },
  //     { tier: BadgeTier.SILVER, remaining: 5 },
  //     { tier: BadgeTier.BRONZE, remaining: 15 },
  //   ],
  // },
];

export async function seedUserBadgeAllocations(prisma: PrismaClient) {
  console.log('🌱 Seeding user badge allocations...');
  let processedCount = 0;

  for (const userAllocData of allocationsToSeed) {
    const user = await prisma.user.findUnique({
      where: { username: userAllocData.username },
      select: { id: true },
    });

    if (!user) {
      console.warn(`   ⚠️ User "${userAllocData.username}" not found. Skipping badge allocations for them.`);
      continue;
    }

    for (const alloc of userAllocData.tierAllocations) {
      try {
        await prisma.userBadgeAllocation.upsert({
          where: {
            userId_tier: { // Uses the @@unique([userId, tier]) constraint
              userId: user.id,
              tier: alloc.tier,
            },
          },
          update: {
            remaining: alloc.remaining,
            lastReplenishedAt: new Date(), // Update replenishment date on seed run
          },
          create: {
            userId: user.id,
            tier: alloc.tier,
            remaining: alloc.remaining,
            lastReplenishedAt: new Date(),
          },
        });
        processedCount++;
      } catch (error) {
        console.error(`Error upserting ${alloc.tier} allocation for user ${userAllocData.username}:`, error);
      }
    }
    console.log(`   Upserted ${userAllocData.tierAllocations.length} tier allocations for user ${userAllocData.username}.`);
  }

  console.log(`✅ User badge allocations seeding finished. ${processedCount} allocation records processed.`);
} 