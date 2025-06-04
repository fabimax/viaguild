# ViaGuild Database Schema Enhancements

This document outlines the enhancements needed for the ViaGuild database schema to support all features demonstrated in the mockups.

## Missing Elements from Current Schema

The existing schema is missing several key components:

1. **Guild Contacts Model** - For storing external contact information (Discord, Twitter, etc.)
2. **Guild Relationships Model** - For defining relationships between guilds (parent, child, partner, etc.)
3. **Badge System** - Models for badge templates, instances, and allocations
4. **Badge Cases** - For users and guilds to showcase badges
5. **Notification System** - For activity notifications

## Guild Relationships Implementation

Three options were considered for implementing guild relationships:

### Option 1: Bidirectional Relationship Model (Selected)

```prisma
model GuildRelationship {
  id             String           @id @default(uuid())
  sourceGuildId  String
  targetGuildId  String
  type           RelationshipType
  createdAt      DateTime         @default(now())
  createdById    String           // Track who created the relationship
  updatedAt      DateTime         @updatedAt

  // Relationships
  sourceGuild    Guild            @relation("SourceRelationships", fields: [sourceGuildId], references: [id], onDelete: Cascade)
  targetGuild    Guild            @relation("TargetRelationships", fields: [targetGuildId], references: [id], onDelete: Cascade)
  creator        User             @relation(fields: [createdById], references: [id])

  // Constraints
  @@unique([sourceGuildId, targetGuildId])
  @@index([sourceGuildId])
  @@index([targetGuildId])
}

enum RelationshipType {
  PARENT
  CHILD
  PARTNER
  CLUSTER
  RIVAL
}
```

**Selection Rationale:**
- Clearest directional relationship model
- Simple queries when displaying a guild's relationships
- Matches the business domain semantics in the UI mockups
- Efficiently stores relationship information

**Implementation Notes:**
- Application-level validation is needed to maintain relationship consistency
- When A is parent of B, B must be child of A

### Option 2: Self-referential Many-to-Many with Relation Table (Rejected)

This approach would have used a more complex model with approval flows.

### Option 3: Network Graph Approach (Rejected)

This approach would have modeled relationships as network memberships.

## Badge Case Implementation

For badge cases (trophy cases), three options were considered:

### Option 1: Polymorphic Owner Approach (Rejected)

Using a single model with discriminator field for owner type.

### Option 2: Direct Many-to-Many Relationships (Rejected)

Using simple join tables between owners and badges.

### Option 3: Separate Models Approach (Selected)

```prisma
// User Badge Case Models
model UserBadgeCase {
  id           String           @id @default(uuid())
  userId       String           @unique
  title        String?
  isPublic     Boolean          @default(true)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  
  // Relationships
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  badges       UserBadgeItem[]
}

model UserBadgeItem {
  id             String         @id @default(uuid())
  badgeCaseId    String
  badgeInstanceId String
  displayOrder   Int            @default(0)
  addedAt        DateTime       @default(now())
  
  // Relationships
  badgeCase      UserBadgeCase  @relation(fields: [badgeCaseId], references: [id], onDelete: Cascade)
  badge          BadgeInstance  @relation(fields: [badgeInstanceId], references: [id], onDelete: Cascade)
  
  @@unique([badgeCaseId, badgeInstanceId])
  @@index([badgeCaseId, displayOrder])
}

// Guild Badge Case Models with unique features
model GuildBadgeCase {
  id             String           @id @default(uuid())
  guildId        String           @unique
  title          String?
  isPublic       Boolean          @default(true)
  featuredBadgeId String?         // Optional featured badge for special display
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  
  // Relationships
  guild          Guild            @relation(fields: [guildId], references: [id], onDelete: Cascade)
  badges         GuildBadgeItem[]
  featuredBadge  GuildBadgeItem?  @relation("FeaturedBadge", fields: [featuredBadgeId], references: [id], onDelete: SetNull)
}

model GuildBadgeItem {
  id             String         @id @default(uuid())
  badgeCaseId    String
  badgeInstanceId String
  displayOrder   Int            @default(0)
  addedAt        DateTime       @default(now())
  
  // Relationships
  badgeCase      GuildBadgeCase @relation(fields: [badgeCaseId], references: [id], onDelete: Cascade)
  badge          BadgeInstance  @relation(fields: [badgeInstanceId], references: [id], onDelete: Cascade)
  featuredIn     GuildBadgeCase? @relation("FeaturedBadge")
  
  @@unique([badgeCaseId, badgeInstanceId])
  @@index([badgeCaseId, displayOrder])
}
```

**Selection Rationale:**
- Allows different features for user and guild badge cases
- Maximum flexibility as requirements evolve separately
- Type-safe with direct relationships

## Other Schema Enhancements

### 1. Guild Contacts

```prisma
enum ContactType {
  WEBSITE
  EMAIL
  DISCORD
  TWITTER
  BLUESKY
  TWITCH
  GITHUB
  LINKEDIN
  CUSTOM
}

model GuildContact {
  id           String      @id @default(uuid())
  guildId      String
  type         ContactType
  label        String?     // For custom contact types
  value        String      // The actual contact info (URL, username, etc.)
  displayOrder Int         @default(0)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  
  // Relationships
  guild        Guild       @relation(fields: [guildId], references: [id], onDelete: Cascade)
  
  @@index([guildId])
}
```

### 2. Badge System

```prisma
model BadgeTemplate {
  id          String      @id @default(uuid())
  name        String
  creatorId   String      // Reference to User who created the badge
  guildId     String?     // Optional reference to Guild
  imageUrl    String?     // URL to badge image
  shapeType   BadgeShape  @default(CIRCLE)
  borderColor String      // Hex color code (#RRGGBB)
  description String?     @db.Text
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  tier        BadgeTier?  // Gold, Silver, Bronze for default badges

  // Relationships
  creator     User            @relation(fields: [creatorId], references: [id], onDelete: Restrict)
  guild       Guild?          @relation(fields: [guildId], references: [id], onDelete: SetNull)
  instances   BadgeInstance[]

  @@index([creatorId])
  @@index([guildId])
}

enum BadgeShape {
  CIRCLE
  STAR
  HEART
  HEXAGON
}

enum BadgeTier {
  GOLD
  SILVER
  BRONZE
}

model BadgeInstance {
  id          String    @id @default(uuid())
  templateId  String    // Reference to BadgeTemplate
  receiverId  String    // Reference to User who received the badge
  giverId     String    // Reference to User who gave the badge
  givenAt     DateTime  @default(now())
  revokedAt   DateTime?
  message     String?   // Optional message from the giver

  // Relationships
  template    BadgeTemplate @relation(fields: [templateId], references: [id], onDelete: Restrict)
  receiver    User          @relation("ReceivedBadges", fields: [receiverId], references: [id], onDelete: Cascade)
  giver       User          @relation("GivenBadges", fields: [giverId], references: [id], onDelete: SetNull)
  
  // User badge items referencing this instance
  userBadgeItems UserBadgeItem[]
  // Guild badge items referencing this instance
  guildBadgeItems GuildBadgeItem[]

  @@index([templateId])
  @@index([receiverId])
  @@index([giverId])
}

model UserBadgeAllocation {
  id                String    @id @default(uuid())
  userId            String    // Reference to User
  tier              BadgeTier
  remaining         Int       @default(0)
  lastReplenishedAt DateTime  @default(now())

  // Relationships
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, tier])
  @@index([userId])
}
```

### 3. Notification System

```prisma
enum NotificationType {
  GUILD_INVITE
  BADGE_RECEIVED
  GUILD_JOIN_REQUEST
  RELATIONSHIP_REQUEST
  GUILD_UPDATE
  NEW_GUILD_MEMBER
}

model Notification {
  id          String           @id @default(uuid())
  userId      String
  type        NotificationType
  title       String
  content     String           @db.Text
  linkUrl     String?          // URL to relevant page when notification is clicked
  isRead      Boolean          @default(false)
  createdAt   DateTime         @default(now())
  
  // Additional fields for notification context
  sourceId    String?          // ID of related entity (guild, badge, etc)
  sourceType  String?          // Type of source ("guild", "badge", etc)
  actorId     String?          // User who triggered the notification  
  
  // Relationships
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  actor       User?            @relation("NotificationActor", fields: [actorId], references: [id], onDelete: SetNull)
  
  @@index([userId])
  @@index([userId, isRead])
  @@index([createdAt])
}
```

## Updated Model Relationships

### User Model Updates

```prisma
model User {
  // Existing fields...
  
  // Add these new relationships
  receivedBadges       BadgeInstance[]    @relation("ReceivedBadges")
  givenBadges          BadgeInstance[]    @relation("GivenBadges")
  badgeAllocations     UserBadgeAllocation[]
  badgeCase            UserBadgeCase?
  createdBadges        BadgeTemplate[]
  notifications        Notification[]
  actorNotifications   Notification[]     @relation("NotificationActor")
  createdRelationships GuildRelationship[]
}
```

### Guild Model Updates

```prisma
model Guild {
  // Existing fields...
  
  // Add these new relationships
  contacts                GuildContact[]
  badgeTemplates          BadgeTemplate[]
  badgeCase               GuildBadgeCase?
  outgoingRelationships   GuildRelationship[] @relation("SourceRelationships")
  incomingRelationships   GuildRelationship[] @relation("TargetRelationships")
}
```

## Implementation Notes

1. **Guild Relationships** - Require bidirectional consistency validation in application logic
2. **Badge Allocations** - Implement monthly replenishment system
3. **Badge Templates** - Create default templates for gold, silver, and bronze badges
4. **Badge Cases** - Auto-create empty cases when users and guilds are created
5. **Notification System** - Implement background job for notification cleanup

## Next Steps

1. Apply these schema changes as Prisma migrations
2. Create seed data for testing
3. Implement service layer with business logic validation
4. Connect front-end components to the real data layer 