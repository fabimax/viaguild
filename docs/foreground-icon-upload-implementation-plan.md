# Foreground Icon Upload Implementation Plan

## Overview

This document outlines the implementation plan for secure foreground icon uploads in badge templates, using a two-step API approach with temporary uploads and smart cleanup.

## Problem Statement

The current system has security and usability issues:
- Blob URLs in API preview (temporary, client-only)
- No proper file upload mechanism for third-party APIs
- Potential for orphaned files
- No color customization data persistence

## Multi-Color SVG Management

### Index-Based Color Mapping

For SVGs with multiple colors, we use an index-based approach where colors are referenced by their position in the detected color array:

```json
{
  "foregroundColorConfig": {
    "colors": {
      "0": { "original": "#FF0000", "current": "#FFD700" },  // Change 1st color to gold
      "2": { "original": "#0000FF", "current": "#C0C0C0" }   // Change 3rd color to silver
      // Leave other colors unchanged
    }
  }
}
```

### How Color Detection Works

1. **SVG Upload**: System extracts all hex colors from SVG in document order
2. **Color Array**: Creates ordered array: `["#FF0000", "#00FF00", "#0000FF"]`
3. **UI Display**: Badge builder shows: "Color 0: Red, Color 1: Green, Color 2: Blue"
4. **API Mapping**: Third parties reference by index to change specific colors

### Why Index-Based?

- **Handles Duplicate Colors**: SVG can have multiple elements with same color
- **Position-Specific**: Change sword blade (color 2) without affecting gems (also blue)
- **Simple API**: Clear `{ "2": { ... } }` syntax
- **Validation**: Can verify original color matches expected value at index

### Fragility Considerations

Index mapping breaks if SVG structure changes (elements reordered/added). However:
- **Acceptable for badge templates**: Templates rarely change after creation
- **Validation catches issues**: Original color validation prevents wrong mappings
- **Template versioning**: Major changes warrant new template creation

### Fallback for currentColor Elements

For SVGs using `fill="currentColor"` without hex colors:
```json
{
  "foregroundColorConfig": {
    "fallbackColor": "#FFD700",  // Applied to all currentColor elements
    "fallbackAlpha": 1.0
  }
}
```

## Solution: Two-Step Upload Process

### Step 1: Upload File (Third-party API)
```bash
POST /api/uploads
Content-Type: multipart/form-data
Authorization: Bearer YOUR_API_TOKEN

[Binary file data]
```

**Response:**
```json
{
  "uploadId": "temp_abc123",
  "url": "https://r2.viaguild.com/temp/users/123/abc123.svg",
  "expires": "2024-01-01T12:00:00Z",
  "metadata": {
    "extractedColors": ["#FF0000", "#00FF00"],
    "hasCurrentColor": true,
    "dimensions": { "width": 100, "height": 100 }
  }
}
```

### Step 2: Create Badge Template with Reference
```json
{
  "templateSlug": "winner-badge",
  "defaultForegroundType": "UPLOADED_ICON",
  "defaultForegroundValue": "upload://temp_abc123",
  "foregroundColorConfig": {
    "colors": {
      "0": { "original": "#FF0000", "current": "#FFD700" }
    }
  }
}
```

## Schema Changes

### UploadedAsset Model Updates

```prisma
enum AssetStatus {
  UPLOADING
  PROCESSING  
  TEMP
  PERMANENT
  DELETED
}

model UploadedAsset {
  id                String      @id @default(uuid())
  uploaderId        String
  originalFilename  String
  mimeType          String
  sizeBytes         Int
  hostedUrl         String
  storageIdentifier String      @unique
  assetType         String      // "avatar", "badge-icon", "badge-bg"...
  description       String?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  // NEW FIELDS
  status            AssetStatus @default(PERMANENT)
  expiresAt         DateTime?   // For temp file cleanup
  metadata          Json?       // Cache extracted data
  
  uploader User @relation(fields: [uploaderId], references: [id], onDelete: Cascade)

  @@index([uploaderId])
  @@index([assetType])
  @@index([status, expiresAt]) // For cleanup queries
}
```

### BadgeTemplate Model (Consider Future Enhancement)

Current `defaultForegroundColor` is a String. For complex color configurations, consider:

```prisma
model BadgeTemplate {
  // ... existing fields ...
  
  // FUTURE: Replace defaultForegroundColor with JSON
  foregroundColorConfig Json? // Store index-based color mappings
  
  // OR keep both for backward compatibility
  defaultForegroundColor    String? // Simple cases
  foregroundColorConfig     Json?   // Complex multi-color SVGs
}
```

## Metadata Structure

### SVG Assets
```json
{
  "type": "svg",
  "extractedColors": ["#FF0000FF", "#00FF00FF", "#0000FFFF"],
  "hasCurrentColor": true,
  "dimensions": { "width": 100, "height": 100 },
  "fileSize": 1234,
  "colorSlots": [
    {
      "id": "custom-color-0",
      "label": "SVG Color 1", 
      "originalColor": "#FF0000FF",
      "hasTransparency": false
    }
  ]
}
```

### Image Assets
```json
{
  "type": "image",
  "dimensions": { "width": 512, "height": 512 },
  "aspectRatio": 1.0,
  "format": "png",
  "fileSize": 5678,
  "hasTransparency": true
}
```

## Frontend Implementation

### BadgeIconUpload Component Changes

1. **Track Upload ID**: Store `uploadId` separately from preview URLs
2. **One-at-a-time**: Delete previous temp upload before creating new one
3. **Upload Reference**: Pass `upload://assetId` to parent, not blob URLs
4. **Color Data**: Store extracted colors in component state
5. **Cleanup**: Clear temp uploads on component unmount

### API Preview Enhancement

Show actual upload references that third parties can use:
```json
{
  "_comment": "The defaultForegroundValue contains a reference to an uploaded file.",
  "defaultForegroundValue": "upload://temp_abc123",
  "foregroundColorConfig": {
    "colors": {
      "0": { "original": "#FF0000", "current": "#FFD700" }
    }
  }
}
```

## Backend Implementation

### Upload Controller Updates

```javascript
// Modified uploadBadgeIcon method
async uploadBadgeIcon(req, res) {
  // ... existing validation ...
  
  // Create temp asset with metadata
  const metadata = file.mimetype === 'image/svg+xml' 
    ? await extractSvgMetadata(svgContent)
    : await extractImageMetadata(file.buffer);
  
  const asset = await prisma.uploadedAsset.create({
    data: {
      uploaderId: req.user.id,
      assetType: 'badge-icon',
      status: 'TEMP',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      metadata,
      // ... other fields
    }
  });
  
  return { uploadId: asset.id, url: asset.hostedUrl, metadata };
}
```

### Badge Template Creation

```javascript
async createBadgeTemplate(req, res) {
  let { defaultForegroundValue, ...templateData } = req.body;
  
  // Handle upload references
  if (defaultForegroundValue?.startsWith('upload://')) {
    const uploadId = defaultForegroundValue.replace('upload://', '');
    
    // Validate ownership and existence
    const upload = await prisma.uploadedAsset.findFirst({
      where: {
        id: uploadId,
        uploaderId: req.user.id,
        status: 'TEMP'
      }
    });
    
    if (!upload) {
      throw new Error('Invalid upload reference');
    }
    
    // Move to permanent storage
    const permanentUrl = await r2Service.moveFromTempToPermanent(upload);
    
    // Update asset status
    await prisma.uploadedAsset.update({
      where: { id: uploadId },
      data: {
        status: 'PERMANENT',
        expiresAt: null
      }
    });
    
    defaultForegroundValue = permanentUrl;
  }
  
  // Create template with permanent URL
  const template = await prisma.badgeTemplate.create({
    data: { ...templateData, defaultForegroundValue }
  });
}
```

## Cleanup Strategy

### One-at-a-Time Frontend Cleanup
```javascript
const handleFileChange = async (file) => {
  // Delete previous temp upload
  if (previousUploadId) {
    try {
      await fetch(`/api/uploads/${previousUploadId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete previous upload:', error);
      // Don't block new upload
    }
  }
  
  // Upload new file
  const response = await uploadToR2(file);
  setPreviousUploadId(response.data.assetId);
};
```

### Backup Cleanup Job
```javascript
// Cron job for expired temps
async function cleanupExpiredUploads() {
  const expired = await prisma.uploadedAsset.findMany({
    where: {
      status: 'TEMP',
      expiresAt: { lt: new Date() }
    }
  });
  
  for (const asset of expired) {
    await r2Service.deleteAsset(asset.storageIdentifier);
    await prisma.uploadedAsset.delete({ where: { id: asset.id } });
  }
}
```

### Component Unmount Cleanup
```javascript
// Track temp uploads in localStorage
useEffect(() => {
  if (uploadId) {
    localStorage.setItem(`badge-icon-temp-${user?.id}`, uploadId);
  }
  
  return () => {
    // Cleanup on unmount
    if (uploadId) {
      fetch(`/api/uploads/${uploadId}`, { method: 'DELETE' }).catch(() => {});
      localStorage.removeItem(`badge-icon-temp-${user?.id}`);
    }
  };
}, [uploadId]);
```

## Security Considerations

1. **Ownership Validation**: Always verify `uploaderId` matches authenticated user
2. **Asset Type Validation**: Ensure temps are only used for appropriate asset types
3. **Expiry Enforcement**: Hard limit of 24 hours for temp files
4. **Rate Limiting**: Limit uploads per user per time period
5. **File Validation**: Server-side SVG sanitization and file type validation
6. **One-time Use**: Consider marking uploads as "consumed" after template creation

## API Endpoints

### New/Modified Endpoints

```
POST   /api/uploads                    # Upload temp file
DELETE /api/uploads/:uploadId          # Delete temp file
GET    /api/uploads/:uploadId/metadata # Get cached metadata
POST   /api/badge-templates            # Create template (handles upload refs)
```

## Performance Benefits

1. **Reduced R2 Calls**: Color data cached in metadata
2. **Faster Template Lists**: No need to download SVGs for color preview
3. **Instant Validation**: Check file compatibility without downloads
4. **Better UX**: Upload progress separate from template creation

## Migration Plan

1. **Phase 1**: Add schema fields, default existing assets to PERMANENT
2. **Phase 2**: Update upload controller to use new fields
3. **Phase 3**: Implement frontend one-at-a-time deletion
4. **Phase 4**: Add badge template creation logic for upload references
5. **Phase 5**: Deploy cleanup job
6. **Phase 6**: Update API documentation and examples

## Future Enhancements

1. **Upload Progress**: Real-time upload progress bars
2. **Batch Uploads**: Upload multiple assets at once
3. **Asset Management**: User dashboard for managing their uploads
4. **CDN Integration**: Serve frequently accessed assets via CDN
5. **Asset Versioning**: Track changes to permanent assets