# ViaGuild Badge System Documentation

## Overview
The ViaGuild badge system provides a comprehensive way to recognize and reward users and guilds through badges. It supports both user-to-user and guild-to-guild badge assignments, with customizable templates and allocation limits.

## Key Components

### BadgeTemplate
```prisma
model BadgeTemplate {
  id            String    @id @default(cuid())
  name          String
  description   String?
  image         String?   // URL or base64
  shape         BadgeShape
  tier          BadgeTier? // Optional default tier
  creatorUserId String?   // User who created this template
  ownedByGuildId String?  // Guild that owns this template
  // ... relations
}
```

### BadgeInstance
```prisma
model BadgeInstance {
  id            String    @id @default(cuid())
  templateId    String
  giverUserId   String?   // User who gave the badge
  giverGuildId  String?   // Guild that gave the badge
  receiverUserId String?  // User who received the badge
  receiverGuildId String? // Guild that received the badge
  // ... relations
}
```

### Badge Cases
```prisma
model UserBadgeCase {
  id            String    @id @default(cuid())
  userId        String
  items         UserBadgeItem[]
  // ... relations
}

model GuildBadgeCase {
  id            String    @id @default(cuid())
  guildId       String
  items         GuildBadgeItem[]
  // ... relations
}
```

## Badge Tiers and Allocation

### BadgeTier
```prisma
enum BadgeTier {
  GOLD
  SILVER
  BRONZE
}
```

### UserBadgeAllocation
```prisma
model UserBadgeAllocation {
  id            String    @id @default(cuid())
  userId        String
  tier          BadgeTier
  // ... relations
}
```

## Usage Guidelines

1. **Creating Badge Templates**
   - Can be created by users or guilds
   - Must specify a shape and optional tier
   - Can include custom images

2. **Assigning Badges**
   - Users can give badges to other users or guilds
   - Guilds can give badges to users or other guilds
   - Badge assignments are tracked with timestamps

3. **Badge Cases**
   - Users and guilds can showcase received badges
   - Badge cases can be customized
   - Badges can be featured or hidden

4. **Badge Allocation**
   - Users have tiered allocations (Gold, Silver, Bronze)
   - Allocations can be replenished periodically
   - Different tiers may have different limits

## Best Practices

1. **Template Creation**
   - Use clear, descriptive names
   - Provide meaningful descriptions
   - Choose appropriate shapes and tiers

2. **Badge Assignment**
   - Consider the impact of badge assignments
   - Use appropriate tiers
   - Include meaningful messages

3. **Badge Case Management**
   - Curate badge displays
   - Feature significant achievements
   - Maintain a balanced showcase

## Migration Notes

The badge system was implemented with the following key features:

1. Flexible template creation
2. Support for both user and guild badges
3. Tiered allocation system
4. Customizable badge cases

## Future Considerations

1. **Badge Categories**
   - Organize badges by type
   - Support for badge collections
   - Category-based showcases

2. **Badge Analytics**
   - Track badge distribution
   - Analyze badge patterns
   - Generate badge insights

3. **Enhanced Customization**
   - Animated badges
   - Custom badge frames
   - Interactive badge elements 