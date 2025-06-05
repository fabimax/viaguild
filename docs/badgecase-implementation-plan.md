# Badge Case Implementation Plan

## Overview

This document outlines the implementation plan for badge case management in ViaGuild. The system allows users (and later guilds/clusters) to manage which badges they display publicly vs keep in their inventory.

## Key Decisions from Planning Session

1. **Start with badge case management** instead of badge creation/awarding
   - Simpler scope, no complex permissions needed
   - Users only manage their own received badges
   - Seeded data already exists for testing

2. **Use entity names in routes, not IDs**
   - `/api/users/TestUserPrime/badgecase` instead of `/api/users/{uuid}/badgecase`
   - More user-friendly and shareable URLs
   - Badge instance IDs still used for individual badge operations

3. **"badgecase" naming** (no hyphen)
   - Consistent throughout codebase

4. **Two-state system**
   - **Badge Case**: Badges on public display
   - **Inventory**: All received badges not in the case

## Database Schema Notes

The existing schema supports this implementation:
- `UserBadgeCase` / `GuildBadgeCase` / `ClusterBadgeCase` tables exist
- `UserBadgeItem` / `GuildBadgeItem` / `ClusterBadgeItem` for case contents
- `BadgeInstance` table has all awarded badges with discriminated unions for giver/receiver
- Case visibility controlled by `isPublic` boolean

## API Endpoints

### User Badge Management
```
GET    /api/users/:username/badges/received      # All badges received by user
GET    /api/users/:username/badgecase           # User's public badge case
POST   /api/users/:username/badgecase/badges/:badgeInstanceId    # Add badge to case
DELETE /api/users/:username/badgecase/badges/:badgeInstanceId    # Remove from case
PATCH  /api/users/:username/badgecase/order     # Reorder badges
PATCH  /api/users/:username/badgecase/visibility # Toggle public/private
DELETE /api/users/:username/badges/:badgeInstanceId # Delete badge forever
```

### Guild Badge Management (future)
Same pattern, replace `users/:username` with `guilds/:guildname`

### Cluster Badge Management (future)
Same pattern, replace with `clusters/:clustername`

## Implementation Order

### Phase 1: Backend API (2-3 days)
1. Create `badge.controller.js` with user endpoints
2. Create `badge.service.js` with business logic
3. Add routes to `user.routes.js` or create `badge.routes.js`
4. Implement permission checks (users can only modify their own badges)
5. Write tests for API endpoints

### Phase 2: Frontend Components (2-3 days)
1. Create badge management page structure
2. Build reusable components:
   - `BadgeInventory.jsx` - Grid view of all received badges
   - `BadgeCase.jsx` - Displayed badges with management
   - `BadgeCard.jsx` - Individual badge display (reuse `BadgeShapes.jsx`)
3. Implement drag-and-drop for reordering (optional MVP)
4. Add visibility toggle

### Phase 3: Integration & Polish (1-2 days)
1. Connect frontend to API
2. Add loading states and error handling
3. Test with seeded data
4. Polish UI/UX

## Key Implementation Details

### Service Layer Pattern
```javascript
// badge.service.js
async getUserReceivedBadges(username) {
  const user = await prisma.user.findUnique({
    where: { username_ci: username.toLowerCase() },
    select: { id: true }
  });
  
  if (!user) throw new Error('User not found');
  
  // Get all badges where user is receiver
  const badges = await prisma.badgeInstance.findMany({
    where: {
      receiverType: 'USER',
      receiverId: user.id,
      awardStatus: 'ACCEPTED',
      revokedAt: null
    },
    include: {
      template: true,
      userBadgeItem: true  // To check if in case
    }
  });
  
  return badges;
}
```

### Permissions Middleware
```javascript
// Ensure users can only modify their own badge case
async function ownBadgeCaseOnly(req, res, next) {
  const username = req.params.username;
  const user = await prisma.user.findUnique({
    where: { username_ci: username.toLowerCase() }
  });
  
  if (!user || user.id !== req.user.id) {
    return res.status(403).json({ error: 'Cannot modify another user\'s badges' });
  }
  
  req.targetUser = user;
  next();
}
```

## Frontend State Management

### Badge Categories
```javascript
const [allBadges, setAllBadges] = useState([]);         // All received badges
const [caseBadges, setCaseBadges] = useState([]);       // Badges in case
const [inventoryBadges, setInventoryBadges] = useState([]); // Badges not in case

// Derive inventory from all badges minus case badges
useEffect(() => {
  const caseIds = new Set(caseBadges.map(b => b.id));
  setInventoryBadges(allBadges.filter(b => !caseIds.has(b.id)));
}, [allBadges, caseBadges]);
```

## Entity-Agnostic Design

The implementation should be designed to work for all entity types:

```javascript
// Reusable service method
async getEntityReceivedBadges(entityType, entityIdentifier) {
  // Handle USER, GUILD, or CLUSTER
  const entity = await this.findEntityByIdentifier(entityType, entityIdentifier);
  
  return prisma.badgeInstance.findMany({
    where: {
      receiverType: entityType,
      receiverId: entity.id,
      awardStatus: 'ACCEPTED',
      revokedAt: null
    }
  });
}
```

## Badge Display Resolution

Remember the inheritance system:
1. Check instance override properties first
2. Fall back to template defaults
3. Handle all visual properties (shape, colors, foreground type, etc.)

```javascript
const getBadgeDisplayProps = (badgeInstance) => {
  const template = badgeInstance.template;
  return {
    name: badgeInstance.overrideBadgeName || template.defaultBadgeName,
    shape: badgeInstance.overrideOuterShape || template.defaultOuterShape,
    borderColor: badgeInstance.overrideBorderColor || template.defaultBorderColor,
    // ... etc for all properties
  };
};
```

## R2 Integration Notes

- Badge template SVGs are stored in R2 using entity-first structure
- When implementing guild/cluster badges, follow same pattern as user avatars
- Path structure: `{entityType}/{entityId}/badge-templates/`

## Testing Considerations

- Use seeded badges for testing (TestUserPrime has 25+ badges)
- Test empty states (users with no badges)
- Test permission boundaries (can't modify others' badges)
- Test badge case visibility toggle

## Future Enhancements

1. **Badge sorting/filtering** in inventory
2. **Badge search** functionality  
3. **Drag-and-drop reordering** in badge case
4. **Badge statistics** (received by type, giver, etc.)
5. **Notification on badge receipt** (already in schema)

## Migration Completed During Session

### R2 Folder Structure Migration ✅
- Successfully migrated 26 files to entity-first organization
- Updated 38 database records
- Old structure: `avatars/{userId}/`, `guilds/{guildId}/{size}/`
- New structure: `users/{userId}/avatars/`, `guilds/{guildId}/avatars/`
- Ready for badge templates: `users/{userId}/badge-templates/`, etc.

This provides a solid foundation for the badge system's asset storage needs.