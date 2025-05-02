# MVP Database Considerations

This document outlines the improved database models for ViaGuild, incorporating better relational design, constraints, and tracking mechanisms to support the MVP feature set.

## Core Models

### Guild Model
```
Guild {
  id: UUID
  name: String (unique)
  description: String
  avatar: String (URL/Base64)
  isPublic: Boolean
  isOriginGuild: Boolean
  categoryId: UUID (nullable, foreign key to GuildCategory.id)
  createdById: UUID (foreign key to User.id)
  updatedById: UUID (nullable, foreign key to User.id)
  createdAt: DateTime
  updatedAt: DateTime
  
  indexes: [
    index('guild_name_idx', [name]),
    index('guild_category_idx', [categoryId])
  ]
  
  foreignKeys: [
    constraint('fk_guild_category', 'categoryId') references 'GuildCategory'('id') ON DELETE SET NULL,
    constraint('fk_guild_creator', 'createdById') references 'User'('id') ON DELETE RESTRICT,
    constraint('fk_guild_updater', 'updatedById') references 'User'('id') ON DELETE SET NULL
  ]
}
```

### GuildCategory Model
```
GuildCategory {
  id: UUID
  name: String (unique)
  description: String
  isDefault: Boolean
  isOriginCategory: Boolean
  order: Integer
  createdAt: DateTime
  updatedAt: DateTime
  
  indexes: [
    index('category_name_idx', [name]),
    index('category_order_idx', [order])
  ]
}
```

### GuildMembership Model
```
GuildMembership {
  id: UUID
  userId: UUID (foreign key to User.id)
  guildId: UUID (foreign key to Guild.id)
  role: Enum (OWNER, ADMIN, MEMBER)
  isPrimary: Boolean
  joinedAt: DateTime
  
  indexes: [
    index('membership_user_idx', [userId]),
    index('membership_guild_idx', [guildId]),
    index('membership_primary_idx', [userId, isPrimary])
  ]
  
  constraints: [
    unique('unique_user_guild', [userId, guildId]),
    check('check_primary_constraint', 'NOT (isPrimary = true AND NOT EXISTS (SELECT 1 FROM GuildMembership WHERE userId = userId AND isPrimary = true))')
  ]
  
  foreignKeys: [
    constraint('fk_membership_user', 'userId') references 'User'('id') ON DELETE CASCADE,
    constraint('fk_membership_guild', 'guildId') references 'Guild'('id') ON DELETE CASCADE
  ]
}
```

## Invite System Models

### GuildInvite Model
```
GuildInvite {
  id: UUID
  guildId: UUID (foreign key to Guild.id)
  creatorId: UUID (foreign key to User.id)
  code: String (unique)
  email: String (nullable)
  socialHandle: String (nullable)
  platformType: Enum (TWITTER, BLUESKY, TWITCH) (nullable)
  maxUses: Integer (nullable)
  usedCount: Integer (default: 0)
  expiresAt: DateTime (nullable)
  createdAt: DateTime
  revokedAt: DateTime (nullable)
  
  indexes: [
    index('invite_code_idx', [code]),
    index('invite_guild_idx', [guildId]),
    index('invite_creator_idx', [creatorId]),
    index('invite_email_idx', [email]),
    index('invite_social_idx', [socialHandle, platformType])
  ]
  
  constraints: [
    check('check_social_constraint', 'CASE WHEN socialHandle IS NOT NULL THEN platformType IS NOT NULL ELSE TRUE END')
  ]
  
  foreignKeys: [
    constraint('fk_invite_guild', 'guildId') references 'Guild'('id') ON DELETE CASCADE,
    constraint('fk_invite_creator', 'creatorId') references 'User'('id') ON DELETE CASCADE
  ]
}
```

### GuildInviteUsage Model
```
GuildInviteUsage {
  id: UUID
  inviteId: UUID (foreign key to GuildInvite.id)
  userId: UUID (nullable, foreign key to User.id)
  email: String (nullable)
  socialHandle: String (nullable)
  platformType: Enum (TWITTER, BLUESKY, TWITCH) (nullable)
  usedAt: DateTime
  
  indexes: [
    index('invite_usage_invite_idx', [inviteId]),
    index('invite_usage_user_idx', [userId])
  ]
  
  foreignKeys: [
    constraint('fk_invite_usage_invite', 'inviteId') references 'GuildInvite'('id') ON DELETE CASCADE,
    constraint('fk_invite_usage_user', 'userId') references 'User'('id') ON DELETE SET NULL
  ]
}
```

## Badge System Models

### BadgeTemplate Model
```
BadgeTemplate {
  id: UUID
  name: String
  creatorId: UUID (foreign key to User.id)
  guildId: UUID (nullable, foreign key to Guild.id)
  imageUrl: String
  shape: Enum (CIRCLE, SQUARE, SHIELD, STAR, PENTAGON)
  borderColor: String (hex code)
  description: String
  createdAt: DateTime
  maxSupply: Integer (nullable)
  isDefault: Boolean (default: false)
  tier: Enum (GOLD, SILVER, BRONZE) (nullable)
  
  indexes: [
    index('badge_template_creator_idx', [creatorId]),
    index('badge_template_guild_idx', [guildId]),
    index('badge_template_default_idx', [isDefault, tier])
  ]
  
  foreignKeys: [
    constraint('fk_badge_template_creator', 'creatorId') references 'User'('id') ON DELETE RESTRICT,
    constraint('fk_badge_template_guild', 'guildId') references 'Guild'('id') ON DELETE SET NULL
  ]
}
```

### BadgeInstance Model
```
BadgeInstance {
  id: UUID
  templateId: UUID (foreign key to BadgeTemplate.id)
  receiverId: UUID (foreign key to User.id)
  giverId: UUID (foreign key to User.id)
  givenAt: DateTime
  revokedAt: DateTime (nullable)
  uniqueCode: String (unique)
  
  indexes: [
    index('badge_instance_template_idx', [templateId]),
    index('badge_instance_receiver_idx', [receiverId]),
    index('badge_instance_giver_idx', [giverId]),
    index('badge_instance_code_idx', [uniqueCode])
  ]
  
  foreignKeys: [
    constraint('fk_badge_instance_template', 'templateId') references 'BadgeTemplate'('id') ON DELETE RESTRICT,
    constraint('fk_badge_instance_receiver', 'receiverId') references 'User'('id') ON DELETE CASCADE,
    constraint('fk_badge_instance_giver', 'giverId') references 'User'('id') ON DELETE SET NULL
  ]
}
```

### UserBadgeAllocation Model
```
UserBadgeAllocation {
  id: UUID
  userId: UUID (foreign key to User.id)
  tier: Enum (GOLD, SILVER, BRONZE)
  remaining: Integer
  lastReplenishedAt: DateTime
  
  indexes: [
    index('allocation_user_idx', [userId]),
    index('allocation_tier_idx', [userId, tier])
  ]
  
  constraints: [
    unique('unique_user_tier', [userId, tier])
  ]
  
  foreignKeys: [
    constraint('fk_allocation_user', 'userId') references 'User'('id') ON DELETE CASCADE
  ]
}
```

## Database Design Benefits

### Improved Data Integrity
- **Foreign Keys**: All relationships between entities are explicitly defined with appropriate ON DELETE behaviors.
- **Unique Constraints**: Prevents duplicate records where business logic requires uniqueness.
- **Check Constraints**: Ensures data consistency with business rules.

### Query Performance
- **Strategic Indexes**: Added indexes on frequently queried fields to improve performance.
- **Optimal Join Paths**: Index design supports efficient joins across related tables.

### Audit and Tracking
- **Creator/Updater Fields**: Track who created or modified records.
- **Timestamps**: Comprehensive tracking of when records were created, updated, or deleted.

### Badge Allocation Management
- **Allocation Tracking**: The UserBadgeAllocation model enables proper tracking and replenishment of tiered badges.
- **Usage Constraints**: Clear path to enforce monthly limits on badge distribution.

### Invite System Support
- **Flexible Invite Types**: Support for email, direct, and social media invitations.
- **Usage Tracking**: Complete record of invite usage and acceptance.

### Guild Categorization
- **Hierarchical Organization**: Support for categorizing guilds, including special handling for Origin Guilds.
- **Order Management**: Ability to control display order of categories.

This database design fully supports the MVP features while providing a solid foundation for future expansion.