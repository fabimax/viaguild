# Badge Creation & Giving Implementation Plan

## Overview

This document outlines the implementation plan for the badge creation, template management, and giving functionality in ViaGuild. This is Phase 2, building upon the completed badge case management system.

## Navigation Structure

All badge functionality will be accessible through a unified navigation bar on badge-related pages:

```
Badge Case | Inventory | Create | Templates | Give | Given
```

### Route Structure
```
/users/:username/badges/badgecase  → Badge Case (showcase)
/users/:username/badges/inventory  → Inventory (all received badges)
/users/:username/badges/create     → Create new badge templates
/users/:username/badges/templates  → Manage created templates
/users/:username/badges/give       → Give badges to others
/users/:username/badges/given      → Track badges you've given
```

## Phase 2.1: Refactor Current Badge Management

### Changes Required
1. Move current badge case functionality from `/users/:username/badges` to `/users/:username/badges/badgecase`
2. Move inventory to separate page at `/users/:username/badges/inventory`
3. Create shared `BadgeNavigation` component for consistent navigation
4. Update all badge-related routes

### Components to Create
- `BadgeNavigation.jsx` - Shared navigation component
- `BadgeCasePage.jsx` - Dedicated page for badge case (extract from current BadgeManagementPage)
- `BadgeInventoryPage.jsx` - Dedicated page for inventory (extract from current BadgeManagementPage)

## Phase 2.2: Badge Template Creation

### Database Considerations
- Badge templates have `templateSlug` that must be unique per owner
- Templates can be owned by users, guilds, or system (null owner)
- Templates define default visual properties and metadata fields
- Templates can allow or restrict instance modifications

### Create Page Features
1. **Visual Builder**
   - Reuse components from `BadgeBuilderPage`
   - Real-time preview using `BadgeDisplay` component
   - Shape selection (circle, square, star, heart, hexagon)
   - Color pickers for border, background, foreground
   - Background type (solid color vs uploaded image)
   - Foreground type (text, system icon, uploaded icon)

2. **Template Properties**
   - Name and subtitle
   - Description
   - Tier selection (Gold/Silver/Bronze/None)
   - Template slug (auto-generated from name, editable)

3. **Advanced Options**
   - Enable/disable measure tracking
   - Define metadata fields
   - Set modification permissions
   - Archive settings

### API Endpoints
```
POST   /api/users/:username/badge-templates
GET    /api/users/:username/badge-templates
PUT    /api/users/:username/badge-templates/:templateSlug
DELETE /api/users/:username/badge-templates/:templateSlug
```

## Phase 2.3: Template Management

### Templates Page Features
1. **List View**
   - Grid/list of user's created templates
   - Show usage count (how many times awarded)
   - Archive/unarchive functionality
   - Quick "Give This Badge" action

2. **Template Actions**
   - Edit template (if allowed)
   - Duplicate template
   - View all instances
   - Archive/restore
   - Delete (if no instances exist)

3. **Filters & Search**
   - Active vs archived
   - By tier
   - By usage count
   - Search by name/description

## Phase 2.4: Badge Giving

### Give Page Features
1. **Template Selection**
   - Browse own templates
   - Browse guild templates (if guild admin)
   - Search/filter templates
   - Preview selected template

2. **Recipient Selection**
   - Search users by username
   - Multiple recipient support (bulk giving)
   - Import recipient list (CSV)
   - Select from guild members (if guild badge)

3. **Instance Customization**
   - Override visual properties (if template allows)
   - Set measure value (if applicable)
   - Add personal message
   - Fill metadata values

4. **Allocation Management**
   - Show remaining allocations for tiered badges
   - Prevent over-allocation
   - Link to allocation info/replenishment

### API Endpoints
```
POST   /api/badges/give
GET    /api/users/:username/allocations
POST   /api/badges/give/bulk
```

## Phase 2.5: Given Badge Tracking

### Given Page Features
1. **List View**
   - All badges given by user
   - Recipient info and status
   - Date given
   - Acceptance status (pending/accepted/rejected)

2. **Filters**
   - By recipient
   - By template
   - By status
   - By date range

3. **Actions**
   - Revoke badge (sets revokedAt)
   - Modify instance (if allowed)
   - Resend notification
   - View recipient's profile

4. **Analytics**
   - Acceptance rate
   - Most given templates
   - Recent activity

### API Endpoints
```
GET    /api/users/:username/badges/given
PATCH  /api/badges/:instanceId
DELETE /api/badges/:instanceId (revoke)
POST   /api/badges/:instanceId/resend
```

## Phase 2.6: Allocation System

### Implementation Details
- Track allocations in `UserBadgeAllocation` table
- Enforce limits during badge giving
- Show allocation status in UI
- Implement replenishment logic (future phase)

### UI Components
- Allocation widget showing current limits
- Allocation history page (future)
- Purchase/earn more allocations (future)

## Technical Considerations

### Performance
- Each page loads only its required data
- Implement pagination for large lists
- Use React Query or SWR for caching
- Lazy load heavy components (visual builder)

### Code Reuse
- Extract visual builder components from BadgeBuilderPage
- Create shared badge preview component
- Reuse BadgeDisplay for all badge rendering
- Share validation logic between frontend/backend

### Security
- Validate template ownership
- Check allocation limits server-side
- Ensure slug uniqueness per owner
- Validate modification permissions

## Implementation Order

1. **Week 1**: Refactor current badge management into separate pages
2. **Week 2**: Implement badge template creation with visual builder
3. **Week 3**: Build template management page
4. **Week 4**: Create badge giving interface
5. **Week 5**: Implement given badge tracking
6. **Week 6**: Add allocation system and testing

## Future Enhancements

1. **Guild Badge Management** (Phase 3)
   - Guild admins can create/manage guild templates
   - Approval workflows for guild badges
   - Guild-specific allocations

2. **Cluster Badges** (Phase 4)
   - Cluster-level badge templates
   - Cross-guild badge recognition

3. **Advanced Features** (Phase 5)
   - Scheduled badge giving
   - Badge campaigns/events
   - Programmatic badge criteria
   - Badge trading/marketplace

## Success Criteria

- Users can create visually customized badge templates
- Users can give badges within their allocation limits
- Recipients receive notifications and can accept/reject badges
- Users can track and manage badges they've given
- All badge operations are performant and secure
- Consistent navigation across all badge pages