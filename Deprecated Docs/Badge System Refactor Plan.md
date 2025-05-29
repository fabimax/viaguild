# Badge System Refactor Plan

## 1. Goals

*   Allow both **Users** and **Guilds** to be **givers** of badges.
*   Allow both **Users** and **Guilds** to be **receivers** of badges.
*   Provide a mechanism for Guilds to have specific metadata associated with how they assign badges (e.g., member vote details), while User-assigned badges might have simpler metadata (e.g., a message).
*   Ensure that `UserBadgeCase` and `GuildBadgeCase` can correctly display all badges received by a user or guild, respectively, regardless of the giver type.
*   Maintain a clear and manageable database schema.

## 2. Proposed Schema Changes

The core idea is to modify the `BadgeInstance` model to be more flexible in terms of givers and receivers, and to introduce an optional related model for guild-specific assignment details.

### 2.1. `BadgeTemplate` Model (No Changes)

This model remains the same. It defines the appearance and meaning of a badge.

```prisma
model BadgeTemplate {
  id          String      @id @default(uuid())
  name        String
  creatorId   String      // User who created the template (can be a system user for default badges)
  guildId     String?     // Optional Guild that "owns" or designed this template
  imageUrl    String?
  shapeType   BadgeShape  @default(CIRCLE)
  borderColor String
  description String?     @db.Text
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  tier        BadgeTier?

  // Relationships
  creator     User            @relation(fields: [creatorId], references: [id])
  guild       Guild?          @relation(fields: [guildId], references: [id])
  instances   BadgeInstance[] // All instances of this badge that have been given
}
```

### 2.2. `BadgeInstance` Model (Significant Changes)

This model will represent a specific instance of a badge being awarded.

```prisma
model BadgeInstance {
  id            String    @id @default(uuid())
  templateId    String    // The BadgeTemplate being awarded

  // --- Giver ---
  // One of these will be populated
  userGiverId   String?   // ID of the User who gave the badge
  guildGiverId  String?   // ID of the Guild that gave the badge

  // --- Receiver ---
  // One of these will be populated
  userReceiverId  String?   // ID of the User who received the badge
  guildReceiverId String?   // ID of the Guild that received the badge

  message       String?   // Optional message from the giver
  assignedAt    DateTime  @default(now())
  revokedAt     DateTime?

  // Optional link to guild-specific assignment details
  guildAssignmentDetailsId String? @unique 
  
  // Relationships
  template               BadgeTemplate          @relation(fields: [templateId], references: [id])
  userGiver              User?                  @relation("UserGivenBadges", fields: [userGiverId], references: [id])
  guildGiver             Guild?                 @relation("GuildGivenBadges", fields: [guildGiverId], references: [id])
  userReceiver           User?                  @relation("UserReceivedBadges", fields: [userReceiverId], references: [id])
  guildReceiver          Guild?                 @relation("GuildReceivedBadges", fields: [guildReceiverId], references: [id])
  guildAssignmentDetails GuildAssignmentDetails? @relation(fields: [guildAssignmentDetailsId], references: [id])

  // Links to Badge Case Items
  userBadgeItems  UserBadgeItem[]
  guildBadgeItems GuildBadgeItem[]

  // Prisma-level check constraints are not directly supported in the schema file.
  // These would need to be implemented at the database level or via application logic.
  // Logical constraints:
  // 1. Exactly one of userGiverId or guildGiverId must be non-null.
  // 2. Exactly one of userReceiverId or guildReceiverId must be non-null.
  // 3. guildAssignmentDetailsId can only be non-null if guildGiverId is non-null.

  @@index([templateId])
  @@index([userGiverId])
  @@index([guildGiverId])
  @@index([userReceiverId])
  @@index([guildReceiverId])
}
```

### 2.3. `GuildAssignmentDetails` Model (New Model)

This new model will store specific information about how a guild decided to assign a badge.

```prisma
model GuildAssignmentDetails {
  id            String   @id @default(uuid())
  badgeInstanceId String   @unique // The specific BadgeInstance this refers to
  // Example fields for guild-specific assignment metadata:
  assignmentMethod String?  // e.g., "MEMBER_VOTE", "ADMIN_DECISION", "AUTOMATED_MILESTONE"
  voteRecordId     String?  // If applicable, link to a vote record
  approvalChain    Json?    // Store who approved it, if a multi-step process
  notes            String?  @db.Text // Internal notes about the assignment

  // Relationship
  badgeInstance BadgeInstance? @relation(fields: [badgeInstanceId], references: [id])
}
```
*Self-correction: The relation for `badgeInstance` in `GuildAssignmentDetails` was initially defined with `badgeInstanceId` as the foreign key field in `GuildAssignmentDetails` and linking back to `BadgeInstance`. This is correct. The `badgeInstanceId` in `GuildAssignmentDetails` should point to the `BadgeInstance` that it provides details for.*
*Correction 2: The `BadgeInstance` model has `guildAssignmentDetailsId String? @unique` and `guildAssignmentDetails GuildAssignmentDetails? @relation(fields: [guildAssignmentDetailsId], references: [id])`. The `GuildAssignmentDetails` model then has `badgeInstanceId String @unique` and `badgeInstance BadgeInstance? @relation(fields: [badgeInstanceId], references: [id])`. This creates a one-to-one relationship where `GuildAssignmentDetails` has a required `badgeInstanceId` pointing to its `BadgeInstance`, and `BadgeInstance` has an optional `guildAssignmentDetailsId` pointing to its details. This seems more robust.*


### 2.4. `User` Model (Update Relations)

```prisma
model User {
  id             String          @id @default(uuid())
  // ... other fields

  // Badges given by this user
  givenBadgesAsUser   BadgeInstance[]   @relation("UserGivenBadges")
  // Badges received by this user
  receivedBadgesAsUser BadgeInstance[]  @relation("UserReceivedBadges")
  
  createdBadgeTemplates BadgeTemplate[] // Templates this user created
  badgeAllocations    UserBadgeAllocation[]
  badgeCase           UserBadgeCase?
  actorNotifications  Notification[]    @relation("NotificationActor") // Already exists
  notifications       Notification[] // Already exists
  // ... other existing relationships
}
```

### 2.5. `Guild` Model (Update Relations)

```prisma
model Guild {
  id            String      @id @default(uuid())
  // ... other fields

  // Badges given by this guild
  givenBadgesAsGuild   BadgeInstance[] @relation("GuildGivenBadges")
  // Badges received by this guild
  receivedBadgesAsGuild BadgeInstance[] @relation("GuildReceivedBadges")

  badgeTemplates      BadgeTemplate[] // Templates "owned" or designed by this guild (already exists)
  badgeCase           GuildBadgeCase? // Already exists
  // ... other existing relationships
}
```

### 2.6. `UserBadgeItem` and `GuildBadgeItem` (Minor Change)

These models will now link directly to `BadgeInstance.id`. The logic to determine the giver/receiver type will be handled by inspecting the `BadgeInstance` record.

```prisma
model UserBadgeItem {
  id             String         @id @default(uuid())
  badgeCaseId    String
  badgeInstanceId String         // This now directly points to the BadgeInstance
  displayOrder   Int            @default(0)
  addedAt        DateTime       @default(now())
  
  // Relationships
  badgeCase      UserBadgeCase  @relation(fields: [badgeCaseId], references: [id])
  badge          BadgeInstance  @relation(fields: [badgeInstanceId], references: [id]) // Points to the awarded badge
  
  @@unique([badgeCaseId, badgeInstanceId])
  @@index([badgeCaseId, displayOrder])
}

model GuildBadgeItem {
  id             String         @id @default(uuid())
  badgeCaseId    String
  badgeInstanceId String         // This now directly points to the BadgeInstance
  displayOrder   Int            @default(0)
  addedAt        DateTime       @default(now())
  
  // Relationships
  badgeCase      GuildBadgeCase @relation(fields: [badgeCaseId], references: [id])
  badge          BadgeInstance  @relation(fields: [badgeInstanceId], references: [id]) // Points to the awarded badge
  featuredIn     GuildBadgeCase? @relation("FeaturedBadge") // Already exists
  
  @@unique([badgeCaseId, badgeInstanceId])
  @@index([badgeCaseId, displayOrder])
}
```
*Self-correction: The `UserBadgeItem` and `GuildBadgeItem` already linked to `BadgeInstance`, so no structural change is needed here other than ensuring the services that populate them can correctly create/find the modified `BadgeInstance`.*

## 3. Key Considerations and Logic Changes

*   **Database Constraints**: The logical constraints (e.g., "exactly one giver type") for `BadgeInstance` will need to be enforced at the database level using `CHECK` constraints (if the database supports them well with Prisma, e.g., PostgreSQL) or robustly within the application service layer before database operations.
*   **Service Layer**:
    *   The `badge.service.js` (or equivalent) will need significant updates to handle the creation of `BadgeInstance` records, correctly populating giver/receiver IDs.
    *   When a guild gives a badge, the service will also be responsible for creating the `GuildAssignmentDetails` record if necessary.
    *   Services fetching badges for display (e.g., for a badge case) will need to inspect the `BadgeInstance` to understand giver/receiver types and potentially include `GuildAssignmentDetails`.
*   **API Endpoints**:
    *   The API endpoint `POST /badges/assign` (or similar) will need to accept parameters to distinguish between user/guild givers and user/guild receivers.
    *   It may need to accept guild-specific assignment metadata if the giver is a guild.
*   **Frontend**:
    *   The frontend display for badge cases will query `BadgeInstance` records via the `UserBadgeItem`/`GuildBadgeItem` and then display giver/receiver information based on the populated fields in `BadgeInstance`.
    *   The UI for assigning badges will need to accommodate the different giver/receiver types.
*   **Data Migration**: A data migration strategy will be needed if there are existing `BadgeInstance` records. The current `giverId` (which is a User ID) would become `userGiverId`, and `receiverId` (User ID) would become `userReceiverId`. New fields would initially be null.

## 4. Advantages of this Approach

*   **Unified `BadgeInstance`**: Keeps the core concept of a badge being awarded as a single entity.
*   **Extensibility for Guilds**: Allows guilds to have unique, detailed processes for awarding badges without cluttering the main `BadgeInstance` model for user-to-user awards.
*   **Clear Foreign Keys**: `UserBadgeItem` and `GuildBadgeItem` maintain a straightforward link to the `BadgeInstance`.
*   **Addresses Requirements**: Directly supports the goal of users and guilds being both givers and receivers.

## 5. Next Steps (Implementation Outline)

1.  **Update Prisma Schema**: Apply the changes to `schema.prisma` as outlined above.
2.  **Generate Prisma Client**: Run `npx prisma generate`.
3.  **Database Migration**:
    *   Create a new migration: `npx prisma migrate dev --name refactor-badge-system`.
    *   Review and adjust the generated SQL, especially for adding `CHECK` constraints if desired at the DB level.
    *   If existing data needs transformation, a custom migration script might be required.
4.  **Update Backend Services**:
    *   Refactor `badge.service.js` to handle the new `BadgeInstance` structure.
    *   Implement logic for creating `GuildAssignmentDetails` when a guild assigns a badge and provides such details.
    *   Update services that fetch badge information for badge cases.
5.  **Update API Controllers/Routes**:
    *   Modify API endpoints for badge assignment to accept new parameters (giver type, receiver type, guild assignment details).
    *   Adjust API endpoints that return badge information.
6.  **Update Frontend Components**:
    *   Update UI for displaying badges in user/guild profiles/badge cases to correctly interpret the richer `BadgeInstance` data.
    *   Update UI for assigning badges.
7.  **Testing**: Thoroughly test all badge-related functionalities: assignment by users, assignment by guilds, display in badge cases, API interactions.

This plan provides a solid foundation for refactoring the badge system to meet the specified requirements. 