# R2 Badge Icon Cleanup Implementation Documentation

## Overview

This document details the implementation of a comprehensive cleanup system for Cloudflare R2 temporary uploads, specifically designed for the badge icon upload feature. The final implementation uses a **single global preview per user** approach with cross-tab synchronization to prevent storage abuse while maintaining excellent user experience.

## Design Decision: Single Global Preview System

After evaluating multiple approaches for handling temporary uploads and preventing storage abuse, we chose the single global preview system for its simplicity and effectiveness:

### Options Considered:

1. **Multi-tab tracking with componentId**: Track each browser tab separately with complex orphan detection
   - **Pros**: Allows multiple simultaneous previews per user
   - **Cons**: Complex implementation, race conditions, difficult orphan identification

2. **Orphan cleanup on upload**: Clean up orphaned uploads during new upload operations
   - **Pros**: Self-healing system, no storage limits needed
   - **Cons**: Complex logic to identify "active" vs "orphaned" components

3. **Higher limits with aggressive cleanup**: Allow many uploads but clean frequently
   - **Pros**: Generous user experience
   - **Cons**: Still vulnerable to abuse, complex limit management

4. **Single global preview with tab sync** ✅ **CHOSEN**
   - **Pros**: Simple implementation, impossible to abuse, excellent UX with sync
   - **Cons**: Only one preview per user (acceptable for most use cases)

### Why Single Global Preview Won:
- **Storage abuse impossible**: Maximum 1 temp upload per user (2MB limit)
- **Simple architecture**: No complex tracking or limits needed
- **Great UX**: Real-time synchronization across all tabs
- **Predictable behavior**: Users always see their latest upload everywhere
- **Zero orphaned uploads**: Impossible by design

## Architecture

### Database Schema Changes

Added to `UploadedAsset` model:
```prisma
status      AssetStatus  @default(PERMANENT)  // Asset lifecycle state
expiresAt   DateTime?                        // Expiration time for TEMP assets
metadata    Json?                            // Cached metadata (colors, dimensions)

enum AssetStatus {
  UPLOADING   // Asset is being uploaded
  PROCESSING  // Asset is being processed
  TEMP        // Temporary asset with expiration
  PERMANENT   // Permanently stored asset
  DELETED     // Asset has been deleted from storage
}
```

### Storage Structure

```
R2 Bucket/
├── temp/                          # Temporary uploads (max 1 per user)
│   └── users/{userId}/
│       └── badge-icons/
│           └── temp-icon-{timestamp}-{random}.{ext}  # Generic naming
└── users/{userId}/                # Permanent storage
    └── badge-templates/
        └── {templateSlug}-{templateId}.{ext}         # Template-specific naming
```

**Key Changes:**
- **Generic temp naming**: `temp-icon-{timestamp}-{random}.{ext}` (no false template relationships)
- **Template-specific permanent naming**: Proper naming when template is actually created
- **Single file per user**: Only one temp upload allowed in temp folder per user

## Implementation Details

### 1. Backend Upload Controller

**File**: `/server/src/controllers/upload.controller.js`

#### Enhanced `uploadBadgeIcon` Method
- **Single global preview**: Deletes any existing temp upload before creating new one
- Creates temporary uploads with 24-hour expiration  
- Extracts and stores metadata for SVGs and images
- Returns upload reference (`upload://assetId`) instead of direct URLs
- 2MB file size limit for badge icons

```javascript
// SINGLE PREVIEW SYSTEM: Delete existing temp upload first
const existingTempAsset = await req.prisma.uploadedAsset.findFirst({
  where: {
    uploaderId: req.user.id,
    assetType: 'badge-icon', 
    status: 'TEMP'
  }
});

if (existingTempAsset) {
  // Delete from R2 and database
  await r2Service.deleteAsset(existingTempAsset);
}

// Create new temp upload with generic naming
const filename = `temp-icon-${timestamp}-${randomString}.${fileExtension}`;
const uploadedAsset = await req.prisma.uploadedAsset.create({
  data: {
    // ... other fields
    status: 'TEMP',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    metadata,
    description: 'Temporary badge icon upload' // Generic description
  }
});
```

#### New Endpoints

1. **Discovery Endpoint**: `GET /api/upload/badge-icon/current`
   - Returns user's current temp badge icon (if any)
   - Used for tab synchronization and discovery
   - Includes metadata, expiration, and URLs

2. **Manual Deletion**: `DELETE /api/upload/badge-icon/:assetId`
   - Validates ownership
   - Only allows deletion of TEMP assets
   - Removes from both R2 and database

3. **Beacon Deletion**: `POST /api/upload/badge-icon-beacon`
   - Accepts auth token in request body
   - Used for component unmount cleanup
   - Designed for `navigator.sendBeacon` compatibility

### 2. Frontend Tab Synchronization Strategy

**File**: `/client/src/components/BadgeIconUpload.jsx`

#### Discovery System
```javascript
// Check for existing uploads when component loads
const discoverExistingUpload = async () => {
  const response = await fetch('/api/upload/badge-icon/current', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.data.tempAsset;
};

// Initialize: check localStorage first (fast), then server (authoritative)
useEffect(() => {
  const initializeComponent = async () => {
    const localSync = checkLocalStorageSync();
    if (localSync) {
      // Quick load from localStorage
      setUploadedUrl(localSync.iconUrl);
      setUploadId(localSync.assetId);
    }
    
    // Then verify with server
    const serverAsset = await discoverExistingUpload();
    if (serverAsset) {
      await loadTempUpload(serverAsset);
    }
  };
  
  initializeComponent();
}, []);
```

#### Real-time Cross-tab Sync
```javascript
// Store sync data when uploading
const storeSyncData = (iconUrl, assetId, metadata) => {
  const syncData = { iconUrl, assetId, timestamp: Date.now(), metadata };
  localStorage.setItem('badgeIconPreview', JSON.stringify(syncData));
};

// Listen for uploads in other tabs
useEffect(() => {
  const handleStorageChange = (e) => {
    if (e.key === 'badgeIconPreview') {
      const newSyncData = JSON.parse(e.newValue);
      if (newSyncData.assetId !== uploadId) {
        // Update this tab with upload from other tab
        setUploadedUrl(newSyncData.iconUrl);
        setUploadId(newSyncData.assetId);
        setPreviewIcon(newSyncData.iconUrl);
        onIconChange(`upload://${newSyncData.assetId}`, null, newSyncData.iconUrl);
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, [uploadId]);
```

#### Component Unmount Cleanup
```javascript
useEffect(() => {
  return () => {
    if (uploadId) {
      const payload = JSON.stringify({
        assetId: uploadId,
        authToken: token
      });
      navigator.sendBeacon(
        'http://localhost:3000/api/upload/badge-icon-beacon',
        new Blob([payload], { type: 'application/json' })
      );
    }
  };
}, [uploadId]);
```

### 3. R2 Service Enhancements

**File**: `/server/src/services/r2.service.js`

#### Move from Temp to Permanent
```javascript
async moveFromTempToPermanent(tempAsset) {
  // Copy to permanent location
  await this.client.send(new CopyObjectCommand({
    Bucket: this.bucketName,
    CopySource: copySource,
    Key: permanentKey,
  }));
  
  // Delete temp file
  await this.client.send(new DeleteObjectCommand({
    Bucket: this.bucketName,
    Key: tempAsset.storageIdentifier,
  }));
  
  return permanentUrl;
}
```

### 4. Automated Cleanup Script

**File**: `/server/src/scripts/cleanup-expired-assets.js`

Scheduled cleanup job that:
- Finds all expired TEMP assets (`expiresAt < now`)
- Deletes orphaned TEMP assets (>48 hours old with no expiration)
- Handles R2 and database cleanup
- Logs detailed results

#### Cron Setup
```bash
# Run every hour
0 * * * * cd /path/to/server && node src/scripts/cleanup-expired-assets.js

# Or run every 6 hours for less frequent cleanup
0 */6 * * * cd /path/to/server && node src/scripts/cleanup-expired-assets.js
```

## API Flow

### Upload Flow (Single Global Preview)
1. User selects icon file in BadgeIconUpload component
2. **Backend automatically deletes existing temp upload** (single preview enforcement)
3. File uploaded to `/api/upload/badge-icon` with 2MB limit
4. Backend stores in `temp/users/{userId}/badge-icons/` with generic filename
5. Database record created with `status: TEMP` and 24hr expiration
6. Frontend receives `upload://assetId` reference + sync data
7. **Sync data stored in localStorage for other tabs**

### Tab Synchronization Flow
1. **Tab A uploads icon** → stores sync data in localStorage
2. **Tab B detects storage change** → updates UI with new icon
3. **Tab C loads/refreshes** → discovers existing upload from server
4. **All tabs show same preview** → consistent user experience

### Badge Template Creation Flow
1. User submits badge template with `defaultForegroundValue: "upload://assetId"`
2. Backend validates upload reference and ownership
3. Asset moved from temp to permanent storage using `moveFromTempToPermanent`
4. Database updated: `status: PERMANENT`, `expiresAt: null`
5. Template saved with permanent URL

### Cleanup Flows

#### Frontend-Initiated
- **New Upload**: Backend automatically deletes existing temp upload (single preview system)
- **Component Unmount**: Beacon API deletes unsaved temp
- **Manual Delete**: User can explicitly delete temp uploads
- **Tab Sync**: Real-time synchronization prevents confusion about current upload

#### Backend-Automated
- **Cron Job**: Runs hourly to delete expired assets
- **Orphan Cleanup**: Removes old temps without expiration (rare due to single preview system)

#### Why Cleanup is Simpler Now
- **No orphan uploads**: Single preview system eliminates orphaned uploads by design
- **Predictable storage**: Maximum 2MB per user for temp uploads
- **Simplified limits**: No complex per-tab or multi-component tracking needed

## Security Considerations

1. **Storage Abuse Prevention**: Single preview system makes abuse impossible (max 2MB per user)
2. **Ownership Validation**: All delete operations verify user ownership
3. **TEMP-Only Deletion**: Permanent assets protected from accidental deletion
4. **Token Validation**: Beacon endpoint manually validates JWT tokens
5. **Graceful Failures**: Cleanup errors logged but don't block operations
6. **Generic Temp Naming**: No false template relationships in filenames
7. **Cross-tab Security**: localStorage sync only contains references, not sensitive data

## Monitoring & Maintenance

### Key Metrics to Track
- Number of expired assets cleaned per run (should be minimal with single preview)
- Storage space reclaimed
- Cleanup job execution time
- Failed deletion attempts
- User upload patterns and tab synchronization usage
- Discovery endpoint performance

### Logging
```javascript
console.log('=== Cleanup Summary ===');
console.log(`Total assets processed: ${totalProcessed}`);
console.log(`Successfully deleted: ${deletedCount}`);
console.log(`Errors: ${errorCount}`);
console.log(`Duration: ${duration.toFixed(2)} seconds`);
```

### Error Handling
- R2 deletion failures (NoSuchKey) still clean database
- Individual asset failures don't stop batch processing
- All errors logged with asset details

## Future Enhancements

1. **Cleanup Log Table**: Track cleanup history in database
2. **Configurable Expiration**: Allow different expiration times per asset type
3. **S3 Lifecycle Rules**: Use R2's native expiration policies as backup
4. **Usage Analytics**: Track upload/cleanup patterns
5. **CDN Integration**: Serve permanent assets through CDN
6. **Batch Operations**: Use R2's batch delete API for efficiency

## Testing

### Manual Testing
```bash
# Upload test file (should auto-delete any existing temp upload)
curl -X POST http://localhost:3000/api/upload/badge-icon \
  -H "Authorization: Bearer $TOKEN" \
  -F "icon=@test.svg"

# Check current temp upload (discovery endpoint)
curl -X GET http://localhost:3000/api/upload/badge-icon/current \
  -H "Authorization: Bearer $TOKEN"

# Upload second file (should replace first)
curl -X POST http://localhost:3000/api/upload/badge-icon \
  -H "Authorization: Bearer $TOKEN" \
  -F "icon=@test2.svg"

# Verify only one temp upload exists
curl -X GET http://localhost:3000/api/upload/badge-icon/current \
  -H "Authorization: Bearer $TOKEN"

# Check cleanup script (should find very few expired assets)
node src/scripts/cleanup-expired-assets.js --dry-run

# Force cleanup of specific asset
curl -X DELETE http://localhost:3000/api/upload/badge-icon/$ASSET_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Integration Tests
- **Single preview enforcement**: Verify second upload deletes first
- **Tab synchronization**: Test localStorage sync across multiple browser tabs
- **Discovery system**: Test component initialization with existing temp uploads
- **Ownership validation**: Ensure users can't access other users' uploads
- **Beacon endpoint**: Test with expired tokens and component unmount scenarios
- **Permanent asset protection**: Confirm permanent assets aren't deleted
- **File size limits**: Test 2MB limit enforcement

## Troubleshooting

### Common Issues

1. **Cleanup job not running**
   - Check cron logs: `grep CRON /var/log/syslog`
   - Verify script permissions: `chmod +x cleanup-expired-assets.js`
   - Test manually: `node cleanup-expired-assets.js`

2. **Assets not being deleted**
   - Check asset status in database
   - Verify R2 credentials and permissions
   - Look for R2 API errors in logs

3. **Frontend cleanup failing**
   - Check browser console for beacon errors
   - Verify auth token is available
   - Test DELETE endpoint manually

4. **Tab synchronization not working**
   - Check localStorage for `badgeIconPreview` key
   - Verify storage event listeners are working
   - Test discovery endpoint manually

5. **Multiple temp uploads per user**
   - Should be impossible with single preview system
   - Check upload endpoint logic for existing temp deletion
   - Verify database constraints

### Debug Queries
```sql
-- Find expired TEMP assets (should be rare with single preview)
SELECT id, originalFilename, expiresAt, status 
FROM "UploadedAsset" 
WHERE status = 'TEMP' AND expiresAt < NOW();

-- Find multiple temp uploads per user (should be impossible)
SELECT uploaderId, COUNT(*) as temp_count
FROM "UploadedAsset" 
WHERE status = 'TEMP' AND assetType = 'badge-icon'
GROUP BY uploaderId 
HAVING COUNT(*) > 1;

-- Find current temp uploads by user
SELECT uploaderId, id, originalFilename, expiresAt, createdAt
FROM "UploadedAsset" 
WHERE status = 'TEMP' AND assetType = 'badge-icon'
ORDER BY uploaderId, createdAt;

-- Find orphaned assets (rare with single preview system)
SELECT id, originalFilename, createdAt 
FROM "UploadedAsset" 
WHERE status = 'TEMP' 
  AND expiresAt IS NULL 
  AND createdAt < NOW() - INTERVAL '48 hours';
```

## Migration Notes

When deploying to production:

1. Run database migration to add new fields
2. Deploy backend changes first (backwards compatible)
3. Set up cleanup cron job
4. Deploy frontend changes
5. Monitor first few cleanup runs closely
6. Adjust expiration times based on usage patterns