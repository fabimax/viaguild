# R2 Temporary File Cleanup

## Current State (Final Implementation)
- Preview avatars upload to `temp/avatars/{userId}/` folder
- Each new preview automatically deletes previous previews for that user
- When user saves profile, avatar moves from temp to permanent storage
- Old permanent avatars are deleted when new ones are saved
- **Maximum orphaned files: 1 preview per user** (last upload before abandoning)

## How It Works
1. User uploads preview → goes to temp folder
2. User uploads another preview → previous temp deleted, new one created
3. User saves → temp moved to permanent, old permanent deleted
4. User abandons page → last temp preview remains (cleaned by cron job)

## Production Requirements
- Cleanup for orphaned files happens when:
  - User uploads a new preview (cleans their old previews)
  - User saves their profile (moves temp to permanent)
  - **Cron job runs** (cleans all orphaned temp files older than X hours)
  
## Required for Production

### Option 1: Cloudflare Worker with Cron Trigger
```javascript
// Run every hour
export default {
  async scheduled(event, env, ctx) {
    // List all objects with temp/ prefix
    // Delete if older than 1 hour
  }
}
```

### Option 2: Temporary Folder Pattern
- Upload previews to `temp/userId/timestamp-filename.webp`
- Move to permanent location on save
- Cleanup job deletes temp/ files older than 1 hour

### Option 3: Database Flag
- Add to UploadedAsset model:
  ```prisma
  isTemporary Boolean @default(false)
  expiresAt   DateTime?
  ```
- Background job queries and deletes expired temporary assets

## Implementation Notes
- Current cleanup uses `deleteSpecificAvatar()` for single file sets
- Need bulk cleanup for orphaned previews
- Consider R2 usage costs for list operations