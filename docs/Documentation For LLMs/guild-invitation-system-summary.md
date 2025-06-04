# ViaGuild Invitation System Specification

## Direct Handle Invitations
- Users can be invited via any implemented social handle (currently Twitter, Bluesky, Twitch, Discord) or ViaGuild username
- Invitation UI includes:
  - Username input field
  - Platform dropdown (ViaGuild, Twitter, Bluesky, Twitch, Discord)
- Invited users see a "Join" button on the guild's profile page
- Users receive notifications when invited via any of their linked handles
- Guild admins/owners can revoke pending invitations
- System prevents inviting handles of users already in the guild
- When a user links a new social account, the system checks for pending invitations to that handle across all guilds they're already a member of and automatically consumes these invitations

## Invitation Links
- Generate shareable links anyone can use to join a guild
- Configurable settings for:
  - Expiration time options: 30 minutes, 1 hour, 6 hours, 12 hours, 24 hours, 1 week (default), 30 days, Never expires
  - Usage limit options: 1 use only (default), 5 uses, 10 uses, 25 uses, 50 uses, 100 uses, Unlimited
- All active invite links are listed in guild management section
- Links can be revoked at any time by guild admins/owners

## Invitation Management
- When a user accepts an invitation, system checks for and consumes all related invitations for their other linked accounts
- When a user links a new social account, system checks for pending invitations for that handle across all guilds they belong to and consumes matching invitations

## Join Requests
- Guilds can enable/disable join requests (enabled by default)
- Users can submit requests to join guilds without invitations
- Guild admins/owners review and approve/deny requests

## Implementation Notes
- The invitation system should be integrated with the notification system
- The system must maintain proper invitation state to prevent lingering invitations
- Guild profile pages need to be updated to show join buttons for invited users
- Guild management interface requires separate sections for direct invites and invite links
