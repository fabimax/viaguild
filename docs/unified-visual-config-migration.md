# Unified Visual Configuration Migration Plan

## Executive Summary

This migration consolidates all badge visual properties (foreground, background, border colors) into a unified JSON configuration system. Currently, the system uses a mix of simple string fields for basic colors and JSON configs for complex SVG color mappings. This creates inconsistency and limits future visual features.

**What This Changes:**
- Replace separate color fields (`defaultForegroundColor`, `defaultBorderColor`, etc.) with unified config objects
- Establish consistent patterns for simple colors, hosted assets, and complex color mappings
- Prepare foundation for advanced visual effects like gradients, SVG patterns, and animations
- Enable system icons to have the same color customization as uploaded SVG icons

**Why Now:**
- We're in early development with only seed data (no user migration complexity)
- System icons will soon need color customization using the same element-path mappings as uploaded SVGs
- Future plans include customizable SVG backgrounds and premium border effects
- Establishing unified patterns now avoids technical debt and complex migrations later

**What Gets Unified:**
1. **Foreground Colors**: Text colors, system icon colors, uploaded icon color mappings
2. **Background Colors**: Solid colors, hosted images, future SVG patterns
3. **Border Colors**: Simple colors, future gradients and multi-stroke effects

**Key Benefits:**
- Single color management system for all visual properties
- Reusable components and helper functions across all color types
- Ready for monetization through premium visual effects
- Consistent API for frontend and backend
- Future-proof architecture for any visual complexity

**Impact:**
- **Database Schema**: Add three new JSON columns (`defaultBorderConfig`, `defaultBackgroundConfig`, `defaultForegroundConfig`) to both `BadgeTemplate` and `BadgeInstance` tables, migrate existing string color values into JSON format, then remove six legacy color columns
- **Seed Data**: Transform all badge template definitions in `badgeTemplates.ts` from simple color strings to JSON config objects (affects ~8 template definitions)
- **Backend Services**: Rewrite `getBadgeDisplayProps()` method in `badge.service.js` to extract colors from configs instead of direct field access, update `createBadgeTemplate()` and `giveBadge()` functions to accept config objects, create new utility functions for color extraction and config validation
- **Frontend Components**: Modify `BadgeDisplay.jsx` to render borders/backgrounds/foregrounds using config objects, update `BadgeTemplateCreatePage.jsx` color picker inputs to read/write JSON configs instead of simple strings, revise `BadgeGiveModal.jsx` customization controls to work with config objects
- **New Utilities**: Create `colorConfig.js` helper files in both frontend and backend to handle config creation, color extraction, and validation across all components
- **API Changes**: Update badge template creation and badge giving endpoints to accept the new config format while maintaining backward compatibility during transition

**Timeline:** 9-13 days with comprehensive testing

## Overview

This document outlines the plan to unify all visual properties (foreground, background, border) in the badge system to use JSON configuration objects instead of separate simple and complex fields. This provides a consistent architecture ready for future visual complexity while maintaining simplicity for basic use cases.

## Current State vs Target State

### Current Schema
```prisma
model BadgeTemplate {
  defaultBorderColor              String?  // Simple hex color
  defaultBackgroundType           String   // 'SOLID_COLOR' | 'HOSTED_IMAGE'
  defaultBackgroundValue          String?  // Hex color or URL
  defaultForegroundType           String   // 'TEXT' | 'SYSTEM_ICON' | 'UPLOADED_ICON'
  defaultForegroundValue          String?  // Text, icon name, or URL
  defaultForegroundColor          String?  // Simple hex color
  defaultForegroundColorConfig    Json?    // Complex color mappings (recently added)
}

model BadgeInstance {
  overrideBorderColor             String?
  overrideBackgroundType          String?
  overrideBackgroundValue         String?
  overrideForegroundType          String?
  overrideForegroundValue         String?
  overrideForegroundColor         String?
  overrideForegroundColorConfig   Json?
}
```

### Target Schema
```prisma
model BadgeTemplate {
  # Unified configuration approach  
  defaultBorderConfig           Json?    # All border styling
  defaultBackgroundConfig       Json?    # All background styling (includes type + value)
  defaultForegroundConfig       Json?    # All foreground styling (includes type + value + text properties + scaling)
  
  # Keep structural/content fields (not visual styling)
  defaultBadgeName              String   # Badge name
  defaultSubtitleText           String?  # Badge subtitle
  defaultOuterShape             BadgeShape # Container shape (affects foreground space)
  defaultDisplayDescription     String?  # Badge description
  
  # All visual properties moved to configs:
  # - defaultBackgroundType/Value → defaultBackgroundConfig
  # - defaultForegroundType/Value → defaultForegroundConfig  
  # - defaultTextFont/Size → defaultForegroundConfig (for text type)
  # - defaultBorderColor → defaultBorderConfig
  # - defaultForegroundColor → defaultForegroundConfig
}

model BadgeInstance {
  # Same pattern for overrides
  overrideBorderConfig          Json?
  overrideBackgroundConfig      Json?
  overrideForegroundConfig      Json?
  
  # Keep structural/content overrides
  overrideBadgeName             String?
  overrideSubtitle              String?
  overrideOuterShape            BadgeShape?
  overrideDisplayDescription    String?
  
  # All visual override properties moved to configs
}
```

## Configuration Object Types

### 1. Simple Color
Used for: TEXT foreground, solid backgrounds, simple borders
```json
{
  "type": "simple-color",
  "version": 1,
  "color": "#4A97FC"
}
```

### 2. Static Image Asset
Used for: Background images, uploaded raster images (JPG/PNG/GIF/WebP)
```json
{
  "type": "static-image-asset", 
  "version": 1,
  "url": "upload://clu2x8p9v0001...",
  "scale": 0.9
}
```

### 3. Text Content
Used for: Text foregrounds with typography
```json
{
  "type": "text",
  "version": 1,
  "value": "WIN",
  "color": "#FFFFFF",
  "font": "Arial",
  "size": 24,
  "scale": 0.8
}
```

### 4. System Icon
Used for: Built-in icons from SystemIcon catalog
```json
{
  "type": "system-icon",
  "version": 1,
  "value": "Shield",
  "color": "#FFFFFF",
  "scale": 1.0
}
```

### 5. Customizable SVG
Used for: Uploaded SVGs with color customization
```json
{
  "type": "customizable-svg",
  "version": 1,
  "url": "upload://asset-id",
  "scale": 0.8,
  "colorMappings": {
    "svg": {
      "fill": {
        "original": "#000000",
        "current": "#FF0000"
      }
    },
    "g[0]/path[0]": {
      "fill": {
        "original": "#333333",
        "current": "#0066CC"
      }
    },
    "g[0]/path[1]": {
      "stroke": {
        "original": "#666666", 
        "current": "#00FF00"
      }
    },
    "circle[0]": {
      "fill": {
        "original": "#FFFFFF",
        "current": "#FFFF00"
      }
    },
    "g[1]/rect[0]": {
      "fill": {
        "original": "#888888",
        "current": "#FF6600"
      }
    }
  }
}
```

**Note:** In the UI, "Uploaded Image" automatically becomes either `static-image-asset` (for raster images) or `customizable-svg` (for SVGs with color detection) based on the file type.

**Supported Elements**: `path`, `circle`, `rect`, `ellipse`, `polygon`, `line`, `polyline`, and `svg` root
**Path Structure**: Hierarchical paths like `g[0]/path[1]`, `svg/g[2]/circle[0]`, supporting nested groups and complex SVG structures
**Color Properties**: Both `fill` and `stroke` colors detected from attributes and inline styles

### 4. Future Extensions
Ready for: Gradients, patterns, animations
```json
{
  "type": "gradient",
  "version": 1,
  "direction": "45deg",
  "stops": [
    {"position": 0, "color": "#FF0000"},
    {"position": 1, "color": "#0000FF"}
  ]
}
```

## Migration Steps

### Phase 1: Database Migration

#### 1.1 Update Schema
```prisma
# Add new config fields
model BadgeTemplate {
  # ... existing fields ...
  
  # New unified config fields
  defaultBorderConfig           Json?
  defaultBackgroundConfig       Json? 
  defaultForegroundConfig       Json?
  
  # Mark old fields for removal (keep during transition)
  # defaultBorderColor              String?
  # defaultBackgroundValue          String?
  # defaultForegroundColor          String?
  # defaultForegroundColorConfig    Json?    # Will be merged into defaultForegroundConfig
}

model BadgeInstance {
  # ... existing fields ...
  
  # New unified config fields  
  overrideBorderConfig          Json?
  overrideBackgroundConfig      Json?
  overrideForegroundConfig      Json?
  
  # Mark old fields for removal
  # overrideBorderColor             String?
  # overrideBackgroundValue         String?
  # overrideForegroundColor         String?
  # overrideForegroundColorConfig   Json?
}
```

#### 1.2 Create Migration
```sql
-- Add new configuration columns
ALTER TABLE "BadgeTemplate" 
  ADD COLUMN "defaultBorderConfig" JSONB,
  ADD COLUMN "defaultBackgroundConfig" JSONB,
  ADD COLUMN "defaultForegroundConfig" JSONB;

ALTER TABLE "BadgeInstance"
  ADD COLUMN "overrideBorderConfig" JSONB,
  ADD COLUMN "overrideBackgroundConfig" JSONB, 
  ADD COLUMN "overrideForegroundConfig" JSONB;
```

#### 1.3 Data Migration Script
```sql
-- Migrate BadgeTemplate border colors
UPDATE "BadgeTemplate" 
SET "defaultBorderConfig" = jsonb_build_object(
  'type', 'simple-color',
  'version', 1,
  'color', "defaultBorderColor"
)
WHERE "defaultBorderColor" IS NOT NULL;

-- Migrate BadgeTemplate background values
UPDATE "BadgeTemplate"
SET "defaultBackgroundConfig" = CASE
  WHEN "defaultBackgroundType" = 'SOLID_COLOR' THEN 
    jsonb_build_object('type', 'simple-color', 'version', 1, 'color', "defaultBackgroundValue")
  WHEN "defaultBackgroundType" = 'HOSTED_IMAGE' THEN
    jsonb_build_object('type', 'hosted-asset', 'version', 1, 'url', "defaultBackgroundValue")
  ELSE NULL
END
WHERE "defaultBackgroundValue" IS NOT NULL;

-- Migrate BadgeTemplate foreground colors
UPDATE "BadgeTemplate"
SET "defaultForegroundConfig" = CASE
  WHEN "defaultForegroundColorConfig" IS NOT NULL THEN "defaultForegroundColorConfig"
  WHEN "defaultForegroundColor" IS NOT NULL THEN
    jsonb_build_object('type', 'simple-color', 'version', 1, 'color', "defaultForegroundColor")
  ELSE NULL
END;

-- Similar migrations for BadgeInstance overrides...
```

#### 1.4 Remove Legacy Fields (After Migration Complete)
```sql
ALTER TABLE "BadgeTemplate"
  DROP COLUMN "defaultBorderColor",
  DROP COLUMN "defaultBackgroundType",
  DROP COLUMN "defaultBackgroundValue", 
  DROP COLUMN "defaultForegroundColor",
  DROP COLUMN "defaultForegroundColorConfig";

ALTER TABLE "BadgeInstance"
  DROP COLUMN "overrideBorderColor",
  DROP COLUMN "overrideBackgroundType",
  DROP COLUMN "overrideBackgroundValue",
  DROP COLUMN "overrideForegroundColor", 
  DROP COLUMN "overrideForegroundColorConfig";
```

### Phase 2: Update Seeds

#### 2.1 Badge Template Seeds
Transform all seed data from:
```javascript
// Old format
{
  defaultBorderColor: '#FFD700',
  defaultBackgroundType: 'SOLID_COLOR',
  defaultBackgroundValue: '#4A97FC',
  defaultForegroundColor: '#FFFFFF',
}
```

To:
```javascript
// New format
{
  defaultBorderConfig: { 
    type: 'simple-color', 
    version: 1, 
    color: '#FFD700' 
  },
  defaultBackgroundConfig: { 
    type: 'simple-color', 
    version: 1, 
    color: '#4A97FC' 
  },
  defaultForegroundConfig: { 
    type: 'simple-color', 
    version: 1, 
    color: '#FFFFFF' 
  },
}
```

#### 2.2 Files to Update
- `server/prisma/seeds/badgeTemplates.ts` - All template definitions
- `server/prisma/seeds/badgeInstances.ts` - Any instance overrides

### Phase 3: Backend Service Updates

#### 3.1 Helper Functions
Create unified color extraction utilities:

```javascript
// server/src/utils/colorConfig.js
export function extractColor(config, fallback = '#000000') {
  if (!config) return fallback;
  
  switch (config.type) {
    case 'simple-color':
      return config.color;
    case 'element-path':
      // Extract representative color from mappings
      const firstMapping = Object.values(config.mappings || {})[0];
      return firstMapping?.fill?.current || 
             firstMapping?.stroke?.current || 
             fallback;
    default:
      return fallback;
  }
}

export function extractBackgroundStyle(config) {
  if (!config) return {};
  
  switch (config.type) {
    case 'simple-color':
      return { backgroundColor: config.color };
    case 'hosted-asset':
      return { 
        backgroundImage: `url(${config.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    default:
      return {};
  }
}

export function createSimpleColorConfig(color) {
  return {
    type: 'simple-color',
    version: 1,
    color: color
  };
}
```

#### 3.2 Update Badge Service
Update `server/src/services/badge.service.js`:

```javascript
// In getBadgeDisplayProps() method
getBadgeDisplayProps(badgeInstance) {
  const template = badgeInstance.template;
  
  return {
    // ... other properties ...
    
    // Extract colors from configs with fallbacks
    borderColor: extractColor(
      badgeInstance.overrideBorderConfig || template.defaultBorderConfig,
      '#000000'
    ),
    backgroundStyle: extractBackgroundStyle(
      badgeInstance.overrideBackgroundConfig || template.defaultBackgroundConfig
    ),
    foregroundColor: extractColor(
      badgeInstance.overrideForegroundConfig || template.defaultForegroundConfig,
      '#FFFFFF'
    ),
    
    // Pass full configs for complex rendering
    borderConfig: badgeInstance.overrideBorderConfig || template.defaultBorderConfig,
    backgroundConfig: badgeInstance.overrideBackgroundConfig || template.defaultBackgroundConfig,
    foregroundConfig: badgeInstance.overrideForegroundConfig || template.defaultForegroundConfig,
  };
}

// Update createBadgeTemplate() to accept config objects
async createBadgeTemplate(templateData) {
  const {
    defaultBorderConfig,
    defaultBackgroundConfig, 
    defaultForegroundConfig,
    // ... other fields
  } = templateData;
  
  // Validate config objects
  if (defaultBorderConfig) validateColorConfig(defaultBorderConfig);
  if (defaultBackgroundConfig) validateColorConfig(defaultBackgroundConfig);
  if (defaultForegroundConfig) validateColorConfig(defaultForegroundConfig);
  
  // Create template with config objects
  const template = await prisma.badgeTemplate.create({
    data: {
      // ... other fields ...
      defaultBorderConfig,
      defaultBackgroundConfig,
      defaultForegroundConfig,
    }
  });
  
  return template;
}
```

### Phase 4: Frontend Component Updates

#### 4.1 Badge Display Component
Update `client/src/components/guilds/BadgeDisplay.jsx`:

```javascript
const BadgeDisplay = ({ badge }) => {
  const {
    borderConfig,
    backgroundConfig, 
    foregroundConfig,
    // ... other props
  } = badge;
  
  // Apply border styling
  const borderStyle = renderBorderStyle(borderConfig);
  
  // Apply background styling  
  const backgroundStyle = renderBackgroundStyle(backgroundConfig);
  
  // Apply foreground color/transforms
  const foregroundStyle = renderForegroundStyle(foregroundConfig, foregroundType, foregroundValue);
  
  return (
    <div 
      className="badge-display-container"
      style={{ ...borderStyle, ...backgroundStyle }}
    >
      <div style={foregroundStyle}>
        {renderForegroundContent()}
      </div>
    </div>
  );
};

function renderBorderStyle(borderConfig) {
  if (!borderConfig) return { border: '6px solid #000000' };
  
  switch (borderConfig.type) {
    case 'simple-color':
      return { border: `6px solid ${borderConfig.color}` };
    // Future: gradient, multi-stroke, etc.
    default:
      return { border: '6px solid #000000' };
  }
}

function renderBackgroundStyle(backgroundConfig) {
  if (!backgroundConfig) return { backgroundColor: '#DDDDDD' };
  
  switch (backgroundConfig.type) {
    case 'simple-color':
      return { backgroundColor: backgroundConfig.color };
    case 'hosted-asset':
      return {
        backgroundImage: `url(${backgroundConfig.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    // Future: svg-pattern, gradient, etc.
    default:
      return { backgroundColor: '#DDDDDD' };
  }
}
```

#### 4.2 Template Creation Page
Update `client/src/pages/BadgeTemplateCreatePage.jsx`:

```javascript
const [template, setTemplate] = useState({
  // ... other fields ...
  
  // Replace simple color fields with config objects
  defaultBorderConfig: createSimpleColorConfig('#FFD700'),
  defaultBackgroundConfig: createSimpleColorConfig('#4A97FC'), 
  defaultForegroundConfig: createSimpleColorConfig('#FFFFFF'),
});

// Color picker handlers
const handleBorderColorChange = (color) => {
  setTemplate(prev => ({
    ...prev,
    defaultBorderConfig: createSimpleColorConfig(color)
  }));
};

const handleBackgroundColorChange = (color) => {
  setTemplate(prev => ({
    ...prev,
    defaultBackgroundConfig: createSimpleColorConfig(color)
  }));
};

// For complex foreground configs (SVG color mappings)
const handleForegroundConfigChange = (config) => {
  setTemplate(prev => ({
    ...prev,
    defaultForegroundConfig: config
  }));
};

// Color picker components
<input
  type="color"
  value={extractColor(template.defaultBorderConfig)}
  onChange={(e) => handleBorderColorChange(e.target.value)}
/>

<input
  type="color" 
  value={extractColor(template.defaultBackgroundConfig)}
  onChange={(e) => handleBackgroundColorChange(e.target.value)}
/>
```

#### 4.3 Badge Give Modal
Update `client/src/components/BadgeGiveModal.jsx`:

```javascript
const [customizations, setCustomizations] = useState({
  // Replace simple color overrides with config objects
  overrideBorderConfig: null,
  overrideBackgroundConfig: null,
  overrideForegroundConfig: null,
});

// Override handlers
const handleBorderOverride = (color) => {
  setCustomizations(prev => ({
    ...prev,
    overrideBorderConfig: createSimpleColorConfig(color)
  }));
};
```

### Phase 5: Testing & Validation

#### 5.1 Unit Tests
Create tests for:
- Color config creation/extraction utilities
- Badge display rendering with various config types
- Template creation with config objects
- Migration script validation

#### 5.2 Integration Tests
Test:
- End-to-end badge creation flow
- Color customization in template creation
- Badge giving with color overrides
- Badge display in various contexts

#### 5.3 Visual Regression Tests
Capture screenshots of:
- Badge templates with different color configs
- Badge instances with overrides
- Badge case displays
- Template creation preview

## Benefits After Migration

### 1. Consistency
- All visual properties work the same way
- Unified helper functions and components
- Single pattern for future extensions

### 2. Extensibility  
- Ready for gradient borders
- Ready for SVG pattern backgrounds
- Ready for complex animations
- Easy to add new visual effects

### 3. Maintainability
- Less code duplication
- Cleaner component props
- Easier to test visual features

### 4. Future Monetization
- Premium visual effects on any property
- Consistent upgrade paths
- Clear feature boundaries

## Risk Mitigation

### Data Safety
- Migration scripts are reversible
- Comprehensive testing before deployment
- Backup verification procedures

### Performance
- JSON parsing impact is negligible (~0.003ms per badge)
- Visual rendering time dominates performance
- Config caching eliminates repeated parsing

### Complexity Management
- Start with simple configs for existing use cases
- Add complexity gradually as features are built
- Maintain backward compatibility during transition

## Timeline Estimate

- **Phase 1** (Database Migration): 1-2 days
- **Phase 2** (Update Seeds): 1 day  
- **Phase 3** (Backend Services): 2-3 days
- **Phase 4** (Frontend Components): 3-4 days
- **Phase 5** (Testing): 2-3 days

**Total: 9-13 days**

## Files Requiring Changes

### Database
- `server/prisma/schema.prisma`
- `server/prisma/migrations/[new]_unified_visual_configs/migration.sql`

### Seeds
- `server/prisma/seeds/badgeTemplates.ts`
- `server/prisma/seeds/badgeInstances.ts`

### Backend
- `server/src/services/badge.service.js`
- `server/src/controllers/badge.controller.js`
- `server/src/utils/colorConfig.js` (new)

### Frontend
- `client/src/components/guilds/BadgeDisplay.jsx`
- `client/src/pages/BadgeTemplateCreatePage.jsx`
- `client/src/components/BadgeGiveModal.jsx`
- `client/src/components/BadgeCard.jsx`
- `client/src/utils/colorConfig.js` (new)

### Tests
- `server/src/tests/badge.test.js`
- `client/src/tests/BadgeDisplay.test.jsx`
- `client/src/tests/colorConfig.test.js` (new)

This migration establishes a clean, extensible foundation for all visual badge customization while maintaining simplicity for basic use cases.