# Badge Template Creation Pipeline Implementation

## Overview

This document comprehensively covers the complete badge template creation, saving, and display pipeline in ViaGuild. It details how badge templates flow from initial creation in BadgeTemplateCreatePage through permanent storage to final display in BadgeTemplatesPage, with particular focus on asset management, SVG color transformations, and the R2 storage lifecycle.

## Complete Pipeline Flow

```
User Journey:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Create Template │ -> │ Save Template   │ -> │ View Templates  │
│ (Design Phase)  │    │ (Storage Phase) │    │ (Display Phase) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        v                       v                       v
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ BadgeTemplate   │    │ Badge Service   │    │ BadgeTemplates  │
│ CreatePage      │    │ createTemplate  │    │ Page            │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Phase 1: Template Creation (BadgeTemplateCreatePage)

### Core Components

#### Template State Management
```javascript
const [template, setTemplate] = useState({
  templateSlug: '',
  defaultBadgeName: 'New Badge Template',
  defaultSubtitleText: 'Achievement Badge',
  defaultDisplayDescription: '',
  inherentTier: null,
  
  // Visual properties
  defaultOuterShape: BadgeShape.CIRCLE,
  defaultBorderColor: '#FFD700',
  defaultBackgroundType: BackgroundContentType.SOLID_COLOR,
  defaultBackgroundValue: '#4A97FC',
  defaultForegroundType: ForegroundContentType.SYSTEM_ICON,
  defaultForegroundValue: 'Shield',
  defaultForegroundColor: '#FFFFFF',
  
  // Measure configuration
  definesMeasure: false,
  measureLabel: '',
  // ... other measure fields
});
```

#### Asset Upload Integration

**Badge Icons (BadgeIconUpload.jsx)**:
- **Temp Storage**: `temp/users/{userId}/badge-icons/temp-icon-{timestamp}-{random}.ext`
- **Live Transformation**: Real-time SVG color customization with preview
- **Single Global Preview**: One upload per user, replaces previous automatically
- **Cross-tab Sync**: localStorage synchronization across browser tabs
- **Upload Reference**: Returns `upload://assetId` for template storage

**Badge Backgrounds (BadgeBackgroundUpload.jsx)**:
- **Temp Storage**: `temp/users/{userId}/badge-backgrounds/temp-bg-{timestamp}-{random}.ext`
- **File Support**: JPEG, PNG, GIF, WebP, SVG formats
- **Size Limit**: 5MB maximum
- **Same Sync Pattern**: Single preview with cross-tab synchronization

#### Live Preview System

**BadgeDisplay Integration**:
```javascript
const badgePreviewProps = {
  name: template.defaultBadgeName,
  subtitle: template.defaultSubtitleText,
  shape: template.defaultOuterShape,
  borderColor: template.defaultBorderColor,
  backgroundType: template.defaultBackgroundType,
  backgroundValue: template.defaultBackgroundType === BackgroundContentType.HOSTED_IMAGE && uploadedBackgroundUrl
    ? uploadedBackgroundUrl  // Use actual URL for display
    : template.defaultBackgroundValue,
  foregroundType: template.defaultForegroundType,
  foregroundValue: displayableForegroundSvg || template.defaultForegroundValue,
  foregroundColor: template.defaultForegroundColor,
  foregroundScale: 100
};
```

**Key Features**:
- **WYSIWYG Preview**: Exact representation of final badge
- **Real-time Updates**: Changes reflected immediately
- **Asset Integration**: Uses actual uploaded URLs for preview
- **Badge Card Format**: Matches final display appearance

### SVG Color Transformation System

#### Color Detection and Mapping
```javascript
// Element-path-based color mapping
const colorConfig = {
  "path[0]": {
    "fill": {
      "original": "#000000FF",  // Preserved for reverting
      "current": "#FF0000FF"    // User's customization
    }
  },
  "circle[1]": {
    "stroke": {
      "original": "#CCCCCCFF",
      "current": "#00FF00FF"
    }
  }
};
```

#### Live Transformation Process
1. **Upload SVG** → BadgeIconUpload detects colorable elements
2. **User Changes Colors** → Real-time transformation applied to preview
3. **Element Path Tracking** → Maintains mapping between original and modified colors
4. **Configuration Storage** → Color mappings stored for template creation

## Phase 2: Template Saving (Badge Service)

### Template Creation API Flow

#### Data Preparation (Client-side)
```javascript
const handleSubmit = async (e) => {
  const templateData = {
    ...template,
    ownerType: 'USER',
    ownerId: user.id,
    authoredByUserId: user.id,
    // Include color config for future editing
    ...(iconSvgColorData && iconSvgColorData.elementColorMap && Object.keys(iconSvgColorData.elementColorMap).length > 0 && {
      defaultForegroundColorConfig: {
        type: 'element-path',
        version: 1,
        mappings: iconSvgColorData.elementColorMap
      }
    })
  };

  // Critical: Send transformed SVG content for colored icons
  if (template.defaultForegroundType === 'UPLOADED_ICON' && 
      uploadedIconSvg && 
      uploadedIconSvg.trim().startsWith('<svg') &&
      iconSvgColorData && 
      iconSvgColorData.elementColorMap && 
      Object.keys(iconSvgColorData.elementColorMap).length > 0) {
    
    templateData.transformedForegroundSvgContent = uploadedIconSvg;
  }

  await badgeService.createBadgeTemplate(templateData);
};
```

### Server-side Processing (badge.service.js)

#### Asset Movement Strategy

The service handles three asset scenarios:

**1. Transformed SVG Icons** (With Color Changes):
```javascript
if (transformedForegroundSvgContent && transformedForegroundSvgContent.trim().startsWith('<svg')) {
  // Store the client-transformed SVG content directly
  const transformedKey = `users/${ownerId}/badge-templates/${templateSlug}-icon-${asset.id}`;
  const permanentUrl = await r2Service.uploadContent(
    transformedKey,
    transformedForegroundSvgContent,
    'image/svg+xml'
  );
  
  // Delete temp file
  await r2Service.client.send(new DeleteObjectCommand({
    Bucket: r2Service.bucketName,
    Key: asset.storageIdentifier,
  }));
  
  // Update database with permanent location
  await prisma.uploadedAsset.update({
    where: { id: assetId },
    data: {
      status: 'PERMANENT',
      expiresAt: null,
      hostedUrl: permanentUrl,
      storageIdentifier: transformedKey,
      description: `Badge template icon for ${templateSlug} (color-transformed)`
    }
  });
}
```

**2. Regular Assets** (No Color Changes):
```javascript
else {
  // Fetch original content and move to proper template location
  const response = await fetch(asset.hostedUrl);
  const originalContent = await response.buffer();
  
  const permanentKey = `users/${ownerId}/badge-templates/${templateSlug}-icon-${asset.id}`;
  const permanentUrl = await r2Service.uploadContent(
    permanentKey,
    originalContent,
    asset.mimeType
  );
  
  // Delete temp file and update database
  // ... cleanup and database update
}
```

**3. Background Images**:
```javascript
// Same pattern as regular assets
// Move from temp/users/{userId}/badge-backgrounds/ 
// to users/{userId}/badge-templates/{templateSlug}-bg-{assetId}
```

#### Storage Structure Transformation

**Before Template Creation** (Temporary):
```
R2 Bucket/
├── temp/
│   └── users/{userId}/
│       ├── badge-icons/
│       │   └── temp-icon-{timestamp}-{random}.svg
│       └── badge-backgrounds/
│           └── temp-bg-{timestamp}-{random}.jpg
```

**After Template Creation** (Permanent):
```
R2 Bucket/
└── users/{userId}/
    └── badge-templates/
        ├── {templateSlug}-icon-{assetId}.svg    # Transformed content
        └── {templateSlug}-bg-{assetId}.jpg      # Background image
```

#### Database Template Record
```javascript
const template = await prisma.badgeTemplate.create({
  data: {
    templateSlug,
    templateSlug_ci: templateSlug.toLowerCase(),
    ownerType: 'USER',
    ownerId: user.id,
    authoredByUserId: user.id,
    
    // Visual properties (pointing to permanent URLs)
    defaultForegroundValue: processedForegroundValue,  // Permanent URL
    defaultBackgroundValue: processedBackgroundValue,  // Permanent URL
    
    // Preserved for future editing
    defaultForegroundColorConfig: defaultForegroundColorConfig || {},
    
    // All other template properties...
  }
});
```

## Phase 3: Template Display (BadgeTemplatesPage)

### Template Fetching
```javascript
const fetchTemplates = async () => {
  const templatesData = await badgeService.getUserBadgeTemplates(username);
  
  // Add usage count placeholder
  const templatesWithUsage = templatesData.map(template => ({
    ...template,
    usageCount: 0 // TODO: Fetch actual usage count from API
  }));
  
  setTemplates(templatesWithUsage);
};
```

### Template Rendering Pipeline

#### BadgeCard Component Processing
```javascript
const prepareBadgeProps = async () => {
  const props = {
    name: displayProps.name,
    subtitle: displayProps.subtitle,
    shape: displayProps.shape,
    borderColor: displayProps.borderColor,
    backgroundType: displayProps.backgroundType,
    backgroundValue: displayProps.backgroundValue,  // Pre-transformed URL
    foregroundType: displayProps.foregroundType,
    foregroundValue: displayProps.foregroundValue,  // Pre-transformed URL
    foregroundColor: displayProps.foregroundColor,
    foregroundScale: 100
  };
  
  // Only system icons need processing - uploaded assets are pre-processed
  if (displayProps.foregroundType === 'SYSTEM_ICON' && displayProps.foregroundValue) {
    try {
      const svg = await systemIconService.getSystemIconSvg(displayProps.foregroundValue);
      const coloredSvg = svg.replace(/currentColor/g, displayProps.foregroundColor || '#000000');
      props.foregroundValue = coloredSvg;
    } catch (err) {
      console.error('Failed to load system icon:', err);
      props.foregroundValue = null;
    }
  }
  
  // For uploaded icons, the SVG is already transformed and stored in R2
  // No additional processing needed - just use the URL directly
  
  setBadgePropsForDisplay(props);
};
```

#### BadgeDisplay Rendering
```javascript
{foregroundType === 'UPLOADED_ICON' && (
  foregroundValue ? (
    // Check if it's SVG content (starts with <svg) or an image URL
    foregroundValue.trim().startsWith('<svg') ? (
      <div 
        className="badge-svg-icon"
        dangerouslySetInnerHTML={{ __html: foregroundValue }}
      />
    ) : (
      <img src={foregroundValue} alt={name || 'badge icon'} className="badge-uploaded-icon" />
    )
  ) : (
    <span className="badge-icon-placeholder">IMG</span> 
  )
)}
```

## Key Implementation Benefits

### Performance Optimizations

**1. Pre-processed Assets**:
- No client-side transformation during display
- No async fetching of original content
- Immediate rendering of final assets

**2. Storage Efficiency**:
- Single global preview prevents upload spam
- Automatic temp file cleanup
- Proper asset lifecycle management

**3. Display Consistency**:
- WYSIWYG: Preview exactly matches final result
- No transformation logic differences
- Deterministic rendering

### Data Preservation

**1. Edit Capability Preservation**:
```javascript
// Color config preserved for future editing features
defaultForegroundColorConfig: {
  type: 'element-path',
  version: 1,
  mappings: {
    "path[0]": {
      "fill": {
        "original": "#000000FF",  // Can revert to this
        "current": "#FF0000FF"    // Current customization
      }
    }
  }
}
```

**2. Asset Traceability**:
- Original upload references maintained
- Asset lifecycle tracked in database
- Proper storage identifiers for management

## Error Handling and Edge Cases

### Upload Failures
- Temp files automatically cleaned on subsequent uploads
- Failed template creation doesn't leave orphaned assets
- Graceful degradation to default icons/backgrounds

### Cross-tab Synchronization
- localStorage sync prevents upload conflicts
- Server discovery ensures consistency
- Component unmount cleanup prevents resource leaks

### Asset Migration Failures
- Database transactions ensure data consistency
- Temp files retained if permanent storage fails
- Detailed error logging for troubleshooting

## Monitoring and Maintenance

### Key Metrics to Track
- Template creation success/failure rates
- Asset storage usage patterns
- Temp file cleanup effectiveness
- Display performance metrics

### Cleanup Systems
- **Automated**: Cron job cleans expired temp assets
- **Manual**: Admin endpoints for cleanup management
- **Component-level**: Unmount cleanup prevents leaks

## Future Enhancements

### Template Editing
With preserved color configs, future features could include:
- **In-place color editing**: Modify existing templates without re-upload
- **Color scheme variants**: Generate multiple versions of same template
- **Bulk operations**: Apply color changes across multiple templates

### Performance Improvements
- **CDN Integration**: Serve permanent assets through CDN
- **Image Optimization**: Automatic compression and format conversion
- **Caching Strategies**: Aggressive caching of transformed assets

## Testing and Validation

### End-to-End Testing Flow
1. **Create template** with uploaded SVG and color changes
2. **Verify temp storage** structure and content
3. **Save template** and confirm permanent migration
4. **Check temp cleanup** and database updates
5. **View template list** and verify display accuracy
6. **Cross-tab testing** for upload synchronization

### Database Queries for Validation
```sql
-- Check temp assets (should be minimal)
SELECT uploaderId, COUNT(*) as temp_count, MAX(expiresAt) as latest_expiry
FROM "UploadedAsset" 
WHERE status = 'TEMP' 
GROUP BY uploaderId;

-- Verify template asset structure
SELECT bt.templateSlug, ua.storageIdentifier, ua.status, ua.hostedUrl
FROM "BadgeTemplate" bt
JOIN "UploadedAsset" ua ON ua.hostedUrl = bt.defaultForegroundValue
WHERE bt.defaultForegroundType = 'UPLOADED_ICON'
ORDER BY bt.createdAt DESC;

-- Check for orphaned temp files
SELECT id, storageIdentifier, expiresAt, createdAt
FROM "UploadedAsset" 
WHERE status = 'TEMP' 
  AND (expiresAt < NOW() OR (expiresAt IS NULL AND createdAt < NOW() - INTERVAL '48 hours'));
```

## Conclusion

This implementation creates a robust, performant badge template pipeline that:

1. **Preserves user intent**: Color customizations persist exactly as previewed
2. **Optimizes performance**: Pre-processed assets enable instant display
3. **Maintains flexibility**: Preserved configurations enable future editing
4. **Ensures reliability**: Comprehensive cleanup and error handling
5. **Scales efficiently**: Single preview system prevents storage abuse

The pipeline successfully bridges the gap between creative template design and efficient storage/display, providing users with a seamless experience from conception to final template usage.