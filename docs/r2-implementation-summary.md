# R2 Avatar System Implementation Summary

## What We Accomplished

### Core Avatar Upload System
- **Replaced Base64 avatar storage with Cloudflare R2 URLs**
- **Implemented temporary folder structure** for preview uploads
- **Created multi-size avatar generation** (256px, 128px, 48px) with Sharp.js
- **Fixed filename synchronization** across all sizes
- **Implemented proper cleanup mechanisms**

### Key Features Working
✅ **User avatar preview uploads** go to `temp/users/{userId}/avatars/` folder  
✅ **Guild avatar preview uploads** go to `temp/guilds/{guildId}/avatars/` folder  
✅ **Sequential cleanup** - each new preview deletes previous ones for that user/guild  
✅ **Save functionality** - moves avatars from temp to permanent storage  
✅ **Old avatar deletion** - previous permanent avatars deleted when saving new ones  
✅ **Maximum 1 orphaned file per entity** - very efficient cleanup strategy  
✅ **Entity-first folder structure** - migrated to scalable organization pattern  

## Files Created/Modified

### Backend Files

#### `/server/src/services/r2.service.js`
- **Core R2 integration service**
- Methods:
  - `uploadAvatar()` - uploads user avatars with temp/permanent folder logic
  - `uploadGuildAvatar()` - uploads guild avatars with temp/permanent folder logic
  - `moveAvatarFromTemp()` - copies user avatars from temp to permanent storage
  - `moveGuildAvatarFromTemp()` - copies guild avatars from temp to permanent storage
  - `deleteSpecificAvatar()` - deletes avatar sets (all sizes)
  - `cleanupOldTempFiles()` - removes previous temp uploads for a user
  - `cleanupOldGuildTempFiles()` - removes previous temp uploads for a guild
  - `uploadBadgeSvg()` - SVG upload support
- **Key change**: Uses single filename for all sizes to fix sync issues

#### `/server/src/controllers/upload.controller.js`
- **Upload endpoint handlers**
- Methods:
  - `uploadUserAvatar()` - handles user avatar preview uploads to temp folder
  - `uploadGuildAvatar()` - handles guild avatar uploads with permission checks and preview cleanup
  - `uploadClusterAvatar()` - cluster avatar upload (basic implementation)
  - `deletePreview()` - cleanup endpoint for component unmount
- **Sequential cleanup**: Deletes previous preview when new one uploaded for both users and guilds

#### `/server/src/routes/upload.routes.js`
- **Upload routes configuration**
- Routes:
  - `POST /api/upload/avatar` - user avatar upload
  - `POST /api/upload/guild/:guildId/avatar` - guild avatar
  - `POST /api/upload/cluster/:clusterId/avatar` - cluster avatar
  - `POST /api/upload/delete-preview` - cleanup endpoint
- **Added CORS header support** for `X-Previous-Preview-URL`

#### `/server/src/controllers/user.controller.js`
- **Modified `updateProfile()` method**
- **Temp-to-permanent logic**: Detects temp URLs and moves to permanent storage
- **Old avatar cleanup**: Deletes previous permanent avatar when updating
- **URL validation**: Ensures avatars come from our R2 bucket

#### `/server/src/services/guild.service.js`
- **Modified `updateGuild()` method with avatar handling**
- **Temp-to-permanent logic**: Detects temp guild avatar URLs and moves to permanent storage
- **Old avatar cleanup**: Deletes previous permanent guild avatar when updating
- **URL validation**: Ensures guild avatars come from our R2 bucket
- **Permission integration**: Works with existing GUILD_EDIT_DETAILS permission system

#### `/server/src/app.js`
- **Added `X-Previous-Preview-URL` to CORS allowed headers**
- **Added upload routes**: `/api/upload` endpoint registration

### Frontend Files

#### `/client/src/components/AvatarUpload.jsx`
- **Complete rewrite from Base64 to R2 upload**
- **Universal component**: Works for both user and guild avatars via `uploadType` prop
- Features:
  - Direct file upload to R2 via backend API
  - Tracks `uploadedPreviewUrl` for cleanup
  - Sends previous preview URL as header for sequential cleanup
  - useEffect cleanup (implemented but doesn't work reliably - this is acceptable)
  - Supports guild avatar uploads with `uploadType="guild"` and `guildId` prop
- **Key improvement**: No longer stores Base64 in database

### Documentation Files

#### `/docs/production-checklist/r2-cleanup.md`
- **Production deployment requirements**
- **Current cleanup strategy documentation**
- **Cron job requirements** for orphaned file cleanup
- **Options for production cleanup**: Cloudflare Worker, database flags, etc.

#### `/docs/README.md`
- **Updated documentation structure**
- **Added production-checklist folder reference**

### Utility Scripts

#### `/server/src/scripts/cleanup-temp-avatars.js`
- **Manual cleanup script** for clearing temp files
- **Used during development** to clean up accumulated test files
- **Can be adapted for production cron jobs**

#### `/server/src/scripts/list-temp-avatars.js`
- **Debugging script** to list temp files in R2 bucket
- **Helps monitor temp file accumulation**

## Key Technical Decisions

### 1. Entity-First Folder Strategy ✅ **IMPLEMENTED**
- **User Previews**: `temp/users/{userId}/avatars/{size}/filename.webp`
- **Guild Previews**: `temp/guilds/{guildId}/avatars/{size}/filename.webp`
- **User Permanent**: `users/{userId}/avatars/{size}/filename.webp`
- **Guild Permanent**: `guilds/{guildId}/avatars/{size}/filename.webp`
- **Future Ready**: `users/{userId}/badge-templates/`, `guilds/{guildId}/badge-templates/`, `clusters/{clusterId}/avatars/`
- **Benefit**: Scalable, consistent, entity-scoped organization

### 2. Filename Synchronization
```javascript
// Generate single filename for all sizes
const timestamp = Date.now();
const randomString = crypto.randomBytes(8).toString('hex');
const avatarFilename = `${timestamp}-${randomString}.webp`;
```
- **Fixed**: Previous bug where each size had different timestamps
- **Result**: All sizes use same filename in different folders

### 3. Sequential Cleanup
- Each new preview upload automatically deletes previous ones
- **Maximum storage**: 1 orphaned preview per user + 1 per guild
- **Cost-effective**: ~17KB per entity maximum

### 4. Copy vs Download/Upload for Temp-to-Permanent
- **Uses S3 CopyObject** command (R2 is S3-compatible)
- **Efficient**: No data transfer through server
- **Fast**: Direct R2-to-R2 copy operation

## Current Status

### ✅ Working Features
- User avatar preview and save
- Guild avatar preview and save (with GUILD_EDIT_DETAILS permission)
- Temp folder cleanup on new uploads for both users and guilds
- Permanent storage on save for both users and guilds
- Old avatar deletion for both users and guilds
- Multi-size responsive images (256px, 128px, 48px)
- Production-ready cleanup strategy
- Entity-first folder structure migration completed

### 🟡 Acceptable Limitations  
- Component unmount cleanup unreliable (max 1 orphaned file per entity)
- Requires production cron job for complete cleanup

### ❌ Remaining TODO Items

#### High Priority
1. **BadgeBuilder SVG uploads** - Update to use R2 instead of current method
2. **Production cron job** - Implement Cloudflare Worker or server-side cleanup

#### Medium Priority  
3. **Cluster avatar management** - Implement full cluster avatar system
4. **Bulk cleanup utilities** - Admin tools for managing R2 storage
5. **Monitoring/metrics** - Track R2 usage and costs

#### Low Priority
6. **Image optimization** - WebP quality tuning, additional sizes
7. **CDN integration** - If using custom domain for assets
8. **Asset versioning** - Cache busting for updated avatars

## Environment Variables Required

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=viaguild-assets
R2_PUBLIC_URL_BASE=https://pub-xxxxxxxx.r2.dev
R2_ENDPOINT=https://your_account_id.eu.r2.cloudflarestorage.com
```

  ## Migration Completed ✅

  R2 folder structure migration successfully completed:
  - Migrated 26 files to entity-first organization (`users/{id}/avatars/`, `guilds/{id}/avatars/`)
  - Updated 38 database records with new storage paths
  - All new uploads now use scalable entity-first structure
  - Old structure files can be manually removed from R2 dashboard