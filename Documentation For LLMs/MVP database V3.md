# Improved ViaGuild MVP Database Considerations

This document outlines the database models for ViaGuild's MVP, with emphasis on practical implementation using Prisma ORM.

## Core Models

### Guild Model
```prisma
model Guild {
  id            String      @id @default(uuid())
  name          String      @unique
  description   String      @db.Text
  avatar        String?     // URL to image storage
  isOpen        Boolean     @default(false)
  createdById   String      // Reference to User who created the guild
  updatedById   String?     // Reference to User who last updated the guild
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  // Relationships
  creator        User            @relation("GuildCreator", fields: [createdById], references: [id], onDelete: Restrict)
  updatedBy      User?           @relation("GuildUpdater", fields: [updatedById], references: [id], onDelete: SetNull)
  memberships    GuildMembership[]
  badges         BadgeTemplate[] @relation("GuildBadges")
  invites        GuildInvite[]

  // Indexes
  @@index([name])
}
```



### GuildMembership Model
```prisma
model GuildMembership {
  id        String   @id @default(uuid())
  userId    String   // Reference to User
  guildId   String   // Reference to Guild
  role      Role     @default(MEMBER)
  isPrimary Boolean  @default(false)
  joinedAt  DateTime @default(now())

  // Relationships
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  guild     Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)

  // Constraints
  @@unique([userId, guildId], name: "uniqueUserGuild")
  
  // Indexes
  @@index([userId])
  @@index([guildId])
  @@index([userId, isPrimary])
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}
```

## Invite System Models

### GuildInvite Model
```prisma
model GuildInvite {
  id           String        @id @default(uuid())
  guildId      String        // Reference to Guild
  creatorId    String        // Reference to User who created the invite
  code         String        @unique
  email        String?       // For email invites
  socialHandle String?       // For social media invites
  platformType PlatformType? // Required if socialHandle is provided
  maxUses      Int?          // Null means unlimited
  usedCount    Int           @default(0)
  expiresAt    DateTime?     // Null means never expires
  createdAt    DateTime      @default(now())
  revokedAt    DateTime?     // Null means not revoked

  // Relationships
  guild        Guild           @relation(fields: [guildId], references: [id], onDelete: Cascade)
  creator      User            @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  usages       GuildInviteUsage[]

  // Indexes
  @@index([code])
  @@index([guildId])
  @@index([creatorId])
  @@index([email])
  @@index([socialHandle, platformType])
}

enum PlatformType {
  TWITTER
  BLUESKY
  TWITCH
}
```

### GuildInviteUsage Model
```prisma
model GuildInviteUsage {
  id           String        @id @default(uuid())
  inviteId     String        // Reference to GuildInvite
  userId       String?       // Reference to User who used the invite
  email        String?       // Email used (if invite was redeemed via email)
  socialHandle String?       // Social handle used (if invite was via social)
  platformType PlatformType? // Platform for social invites
  usedAt       DateTime      @default(now())

  // Relationships
  invite       GuildInvite    @relation(fields: [inviteId], references: [id], onDelete: Cascade)
  user         User?          @relation(fields: [userId], references: [id], onDelete: SetNull)

  // Indexes
  @@index([inviteId])
  @@index([userId])
}
```

## Badge System Models

### BadgeTemplate Model
```prisma
model BadgeTemplate {
  id          String      @id @default(uuid())
  name        String      @db.VarChar(100)
  creatorId   String      // Reference to User who created the badge
  guildId     String?     // Optional reference to Guild
  imageUrl    String      // URL to badge image
  shapeId     String      // Reference to BadgeShape
  borderColor String      @db.VarChar(7) // Hex color code (#RRGGBB)
  description String      @db.Text
  createdAt   DateTime    @default(now())
  maxSupply   Int?        // Null means unlimited
  isDefault   Boolean     @default(false)
  tier        BadgeTier?  // Gold, Silver, Bronze for default badges

  // Relationships
  creator     User            @relation(fields: [creatorId], references: [id], onDelete: Restrict)
  guild       Guild?          @relation("GuildBadges", fields: [guildId], references: [id], onDelete: SetNull)
  shape       BadgeShape      @relation(fields: [shapeId], references: [id], onDelete: Restrict)
  instances   BadgeInstance[]

  // Indexes
  @@index([creatorId])
  @@index([guildId])
  @@index([shapeId])
  @@index([isDefault, tier])
}

model BadgeShape {
  id          String      @id @default(uuid())
  name        String      @unique
  displayName String
  svgPath     String?     // For custom rendering
  isActive    Boolean     @default(true)
  order       Int         @default(0)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  // Relationships
  badges      BadgeTemplate[]
}

enum BadgeTier {
  GOLD
  SILVER
  BRONZE
}
```

### BadgeInstance Model
```prisma
model BadgeInstance {
  id          String    @id @default(uuid())
  templateId  String    // Reference to BadgeTemplate
  receiverId  String    // Reference to User who received the badge
  giverId     String    // Reference to User who gave the badge
  givenAt     DateTime  @default(now())
  revokedAt   DateTime? // Null means not revoked
  uniqueCode  String    @unique // Unique identifier for this badge instance

  // Relationships
  template    BadgeTemplate @relation(fields: [templateId], references: [id], onDelete: Restrict)
  receiver    User          @relation("ReceivedBadges", fields: [receiverId], references: [id], onDelete: Cascade)
  giver       User          @relation("GivenBadges", fields: [giverId], references: [id], onDelete: SetNull)

  // Indexes
  @@index([templateId])
  @@index([receiverId])
  @@index([giverId])
  @@index([uniqueCode])
}
```

### UserBadgeAllocation Model
```prisma
model UserBadgeAllocation {
  id                String    @id @default(uuid())
  userId            String    // Reference to User
  tier              BadgeTier
  remaining         Int       @default(0)
  lastReplenishedAt DateTime  @default(now())

  // Relationships
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Constraints
  @@unique([userId, tier], name: "uniqueUserTier")
  
  // Indexes
  @@index([userId])
}
```

## User Model Updates

```prisma
model User {
  // Existing fields...
  
  // Relationships
  createdGuilds           Guild[]         @relation("GuildCreator")
  updatedGuilds           Guild[]         @relation("GuildUpdater")
  guildMemberships        GuildMembership[]
  createdInvites          GuildInvite[]
  usedInvites             GuildInviteUsage[]
  createdBadgeTemplates   BadgeTemplate[]
  receivedBadges          BadgeInstance[] @relation("ReceivedBadges")
  givenBadges             BadgeInstance[] @relation("GivenBadges")
  badgeAllocations        UserBadgeAllocation[]
  
  // Existing indexes and constraints...
}
```

## Implementation Notes

### Core Business Rules

1. **Primary Guild Enforcement**  
   The application layer must ensure only one `isPrimary = true` exists per user by:
   ```typescript
   // In the service layer when setting a primary guild
   async setPrimaryGuild(userId: string, guildId: string) {
     // Transaction to ensure atomicity
     return prisma.$transaction(async (tx) => {
       // First, set all user's guilds to non-primary
       await tx.guildMembership.updateMany({
         where: { userId, isPrimary: true },
         data: { isPrimary: false }
       });
       
       // Then set the selected guild as primary
       return tx.guildMembership.update({
         where: { userId_guildId: { userId, guildId } },
         data: { isPrimary: true }
       });
     });
   }
   ```

2. **Origin Guild Requirement**  
   Every user must belong to an Origin Guild. This should be enforced in:
   - User registration flow
   - Guild leaving validation logic

3. **Badge Self-Assignment Prevention**  
   The application should validate that `giverId !== receiverId` when creating badge instances.

### Data Validation Guidelines

1. **Guild Names**: 3-50 characters, alphanumeric with spaces and basic punctuation
2. **Descriptions**: Up to 40000 characters 
3. **Badge Names**: 1-100 characters
4. **Badge Border Colors**: Valid hex code validation (#RRGGBB)
5. **Email Invites**: Standard email format validation

### Default Badge Setup

To set up the default badges, create a seeder that:
1. Creates default badge shapes (circle, star, heart, rhombus, shield, hexagon)
2. Creates the default badge templates with their tiers
3. Initializes UserBadgeAllocation for all users with:
   - 3 GOLD badges
   - 10 SILVER badges
   - 30 BRONZE badges

### Badge Replenishment Process

Implement a scheduled job that runs monthly to reset badge allocations:

```typescript
async function replenishBadges() {
  const now = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  await prisma.userBadgeAllocation.updateMany({
    where: {
      lastReplenishedAt: { lt: lastMonth }
    },
    data: {
      remaining: {
        set: (allocation) => {
          switch (allocation.tier) {
            case 'GOLD': return 3;
            case 'SILVER': return 10;
            case 'BRONZE': return 30;
          }
        }
      },
      lastReplenishedAt: now
    }
  });
}
```

## Design Benefits & Considerations

### Why This Design Works for MVP

1. **Simplified Constraints**: Complex validation is moved to the application layer where it's more flexible.
2. **Clear Relationships**: All entity relationships are explicitly defined.
3. **Performance Focused**: Strategic indexes on lookup fields without over-engineering.
4. **Extensible Badge System**: Supports both default and custom badges with proper allocation.
5. **Configurable Badge Shapes**: Using a configuration table allows adding new badge shapes without schema migrations.

### Future Considerations (Post-MVP)

1. **Soft Delete**: Consider implementing for users, guilds, and badges when data retention becomes important.
2. **Database Sharding**: Plan for potential growth by designing with future sharding in mind.
3. **Advanced Analytics**: Consider read replicas or data warehousing for analytics as user activity grows.
4. **Caching Strategy**: Implement Redis or similar caching for frequently accessed data like guild membership.
