# ViaGuild MVP Specification

## Overview
ViaGuild (VG) is a web application that enables users to create and join Guilds across social platforms, with a focus on badge assignment and community building. This document outlines the Minimum Viable Product (MVP) features.

## Existing Foundation (Already Implemented)
- ✅ User registration and authentication
- ✅ Social account linking (Twitter, Bluesky, Twitch)
- ✅ User profiles with avatars and privacy settings
- ✅ User search across platforms

## Guild System

### Creation & Management
- Guild creation with name, description, and avatar
- Guild privacy settings (public/private)
- Guild search functionality with filters
- Guild profiles displaying members and badges

### Origin Guilds
- Two default guilds: Scarlet and Azure
- Special "Origin Guilds" category
- Automatic assignment to one guild upon registration
- Users must belong to one of these guilds

### Membership Features
- Join/leave functionality for guilds
- View your guild memberships
- View guild members
- Designate one guild as your PRIMARY GUILD

## Role System
- **Three-tier hierarchy:**
  - **Owners**: Cannot be kicked, can disband guild, full permissions
  - **Admins**: Can manage members and badges
  - **Members**: Basic participation rights

## Guild Invite System
- Multiple invite methods:
  - Direct to ViaGuild users
  - Email invitations
  - Social media handle invitations
- Invite tracking and management
- Time-limited and usage-limited invites
- Pending invitation management for users

## Badge System

### Default Badges
- Stars and Hearts in different tier colors:
  - Gold/Yellow (highest tier)
  - Silver/Gray (mid tier)
  - Bronze/Copper (standard tier)
- Periodic replenishment (monthly)
- Tiered quantities per month:
  - 3 gold badges
  - 10 silver badges
  - 30 copper badges

### User-Created Badges
- Simple badge builder:
  - 3-5 basic shapes (circle, square, shield, star, etc.)
  - 8-10 predefined border colors
  - Custom image upload (under 100KB)
  - Badge name and description
- Creation limits:
  - Users: Up to 3 custom badge templates
  - Guild owners/admins: Up to 5 guild-specific badge templates

### Badge Attribution & Management
- Small giver's avatar embedded in badge corner
- Username and timestamp shown on hover
- Unique identifier for each badge instance
- Badge revocation capability (with time limits)
- Display sections for badges on profiles (user and guild)

## API Endpoints
- Read guild membership for a given social user
- Read/assign badges to a guild or user

## Database Considerations

### Guild Model
```
Guild {
  id: UUID
  name: String
  description: String
  avatar: String (URL/Base64)
  isPublic: Boolean
  isOriginGuild: Boolean
  categoryId: UUID (nullable)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### GuildMembership Model
```
GuildMembership {
  id: UUID
  userId: User.id
  guildId: Guild.id
  role: Enum (OWNER, ADMIN, MEMBER)
  isPrimary: Boolean
  joinedAt: DateTime
}
```

### BadgeTemplate Model
```
BadgeTemplate {
  id: UUID
  name: String
  creatorId: User.id
  guildId: Guild.id (optional)
  imageUrl: String
  shape: Enum (circle, square, etc.)
  borderColor: String (hex code)
  description: String
  createdAt: DateTime
  maxSupply: Integer (optional)
}
```

### BadgeInstance Model
```
BadgeInstance {
  id: UUID
  templateId: BadgeTemplate.id
  receiverId: User.id
  giverId: User.id
  givenAt: DateTime
  revokedAt: DateTime (nullable)
  uniqueCode: String
}
```

## UI/UX Considerations
- Profile pages should display:
  - Primary guild badge
  - Badge collection
  - Guild memberships
- Guild pages should display:
  - Member list with roles
  - Guild-specific badges
  - Badge recipients
- Intuitive badge-giving interface from user profiles
- Simple badge creation wizard

---

This MVP delivers the core functionality of ViaGuild while establishing both community foundation (through Origin Guilds) and the unique value proposition (through the badge system).