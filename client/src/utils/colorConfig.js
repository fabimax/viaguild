/**
 * Color Configuration Utilities (Frontend)
 * 
 * Helper functions for working with unified visual configuration objects
 * that support simple colors, hosted assets, and complex element mappings.
 * 
 * This mirrors the backend color config utilities for consistent handling.
 */

/**
 * Extract a simple color value from a config object
 * @param {Object|null} config - The color configuration object
 * @param {string} fallback - Fallback color if extraction fails
 * @returns {string} Hex color string
 */
export function extractColor(config, fallback = '#000000') {
  if (!config) return fallback;
  
  switch (config.type) {
    case 'simple-color':
      return config.color || fallback;
      
    case 'system-icon':
    case 'text':
      // Extract color from text or system icon configs
      return config.color || fallback;
      
    case 'customizable-svg':
      // For customizable SVGs, try to extract a representative color from mappings
      if (config.colorMappings && typeof config.colorMappings === 'object') {
        const mappings = Object.values(config.colorMappings);
        for (const mapping of mappings) {
          if (mapping.fill?.current) return mapping.fill.current;
          if (mapping.stroke?.current) return mapping.stroke.current;
        }
      }
      return fallback;
      
    case 'customizable-svg':
      // Extract representative color from element mappings
      if (config.colorMappings && typeof config.colorMappings === 'object') {
        const mappings = Object.values(config.colorMappings);
        for (const mapping of mappings) {
          if (mapping.fill?.current) return mapping.fill.current;
          if (mapping.stroke?.current) return mapping.stroke.current;
        }
      }
      return fallback;
      
    default:
      return fallback;
  }
}

/**
 * Resolve upload:// URLs to actual hosted URLs
 * @param {string} url - The URL to resolve
 * @returns {Promise<string>} Resolved URL
 */
export async function resolveUploadUrl(url) {
  if (!url || !url.startsWith('upload://')) {
    return url;
  }
  
  try {
    const assetId = url.replace('upload://', '');
    const response = await fetch(`/api/uploads/resolve/${assetId}`);
    if (response.ok) {
      const data = await response.json();
      return data.hostedUrl || url; // Fallback to original if no hosted URL
    }
  } catch (error) {
    console.error('Failed to resolve upload URL:', error);
  }
  
  return url; // Fallback to original URL
}

/**
 * Extract background style properties from a config object
 * @param {Object|null} config - The background configuration object
 * @returns {Object} Style properties for CSS application
 */
export function extractBackgroundStyle(config) {
  if (!config) return {};
  
  switch (config.type) {
    case 'simple-color':
      return { 
        backgroundColor: config.color || '#DDDDDD' 
      };
      
    case 'static-image-asset':
      // For upload:// URLs, we need async resolution
      // For now, return a placeholder and handle async resolution in components
      if (config.url && config.url.startsWith('upload://')) {
        return {
          // Will be resolved asynchronously in component
          '--upload-url': config.url,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        };
      }
      return {
        backgroundImage: `url(${config.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
      
    default:
      return {};
  }
}

/**
 * Extract border style properties from a config object
 * @param {Object|null} config - The border configuration object
 * @param {number} width - Border width in pixels (default: 6)
 * @returns {Object} Style properties for CSS application
 */
export function extractBorderStyle(config, width = 6) {
  if (!config) return { border: `${width}px solid #000000` };
  
  switch (config.type) {
    case 'simple-color':
      return { 
        border: `${width}px solid ${config.color || '#000000'}` 
      };
      
    // Future: gradient, multi-stroke, etc.
    default:
      return { border: `${width}px solid #000000` };
  }
}

/**
 * Create a simple color configuration object
 * @param {string} color - Hex color string
 * @returns {Object} Color configuration object
 */
export function createSimpleColorConfig(color) {
  return {
    type: 'simple-color',
    version: 1,
    color: color
  };
}

/**
 * Create a hosted asset configuration object
 * @param {string} url - Asset URL
 * @returns {Object} Asset configuration object
 */
export function createHostedAssetConfig(url) {
  return {
    type: 'static-image-asset',
    version: 1,
    url: url
  };
}

/**
 * Create a customizable-svg configuration object for SVG color mappings
 * @param {Object} colorMappings - Element path to color mappings
 * @param {string} url - Asset URL for the SVG
 * @param {number} scale - Optional scale factor
 * @returns {Object} Customizable-svg configuration object
 */
export function createCustomizableSvgConfig(colorMappings, url, scale) {
  return {
    type: 'customizable-svg',
    version: 1,
    url: url,
    scale: scale,
    colorMappings: colorMappings
  };
}


/**
 * Validate a color configuration object
 * @param {Object} config - Configuration object to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateColorConfig(config) {
  if (!config || typeof config !== 'object') return false;
  if (!config.type || !config.version) return false;
  
  switch (config.type) {
    case 'simple-color':
      return typeof config.color === 'string' && config.color.startsWith('#');
      
    case 'static-image-asset':
      return typeof config.url === 'string' && config.url.length > 0;
      
    case 'customizable-svg':
      return config.colorMappings && typeof config.colorMappings === 'object';
      
    default:
      return false;
  }
}

/**
 * Merge a legacy color field into a config object for backward compatibility
 * @param {string|null} legacyColor - Legacy hex color string
 * @param {Object|null} existingConfig - Existing config object
 * @returns {Object|null} Merged configuration object
 */
export function mergeLegacyColor(legacyColor, existingConfig) {
  // If we have a config object, prefer it
  if (existingConfig && validateColorConfig(existingConfig)) {
    return existingConfig;
  }
  
  // Fall back to legacy color if available
  if (legacyColor && typeof legacyColor === 'string') {
    return createSimpleColorConfig(legacyColor);
  }
  
  return null;
}

/**
 * Convert legacy background type/value to config object
 * @param {string} backgroundType - 'SOLID_COLOR' or 'HOSTED_IMAGE'
 * @param {string} backgroundValue - Color hex or image URL
 * @returns {Object|null} Background configuration object
 */
export function convertLegacyBackground(backgroundType, backgroundValue) {
  if (!backgroundType || !backgroundValue) return null;
  
  switch (backgroundType) {
    case 'SOLID_COLOR':
      return createSimpleColorConfig(backgroundValue);
      
    case 'HOSTED_IMAGE':
      return createHostedAssetConfig(backgroundValue);
      
    default:
      return null;
  }
}

/**
 * Apply SVG color transformations based on element-path config
 * @param {string} svgContent - Original SVG content
 * @param {Object} config - Element-path configuration object
 * @returns {string} Transformed SVG content
 */
export function applySvgColorTransform(svgContent, config) {
  if (!config || !config.colorMappings) {
    return svgContent;
  }
  
  // All config types now use colorMappings as the standard field
  const mappings = config.colorMappings;
  
  if (!mappings || Object.keys(mappings).length === 0) {
    return svgContent;
  }
  
  let transformedSvg = svgContent;
  
  console.log(`[ColorTransform] Applying mappings for ${config.type}:`, mappings);
  
  // Apply color mappings to SVG elements
  Object.entries(mappings).forEach(([elementPath, colorMapping]) => {
    console.log(`[ColorTransform] Processing ${elementPath}:`, colorMapping);
    // Parse element path (e.g., "g[0]/path[1]", "circle[0]")
    const pathParts = elementPath.split('/');
    
    // This is a simplified implementation - in practice, you'd need
    // more sophisticated SVG parsing and element selection
    if (colorMapping.fill?.current) {
      // Replace fill colors in the SVG
      transformedSvg = transformedSvg.replace(
        /fill="[^"]*"/g, 
        `fill="${colorMapping.fill.current}"`
      );
    }
    
    if (colorMapping.stroke?.current) {
      // Replace stroke colors in the SVG
      transformedSvg = transformedSvg.replace(
        /stroke="[^"]*"/g, 
        `stroke="${colorMapping.stroke.current}"`
      );
    }
  });
  
  return transformedSvg;
}

/**
 * Get CSS styles object for applying config-based styling to React components
 * @param {Object} borderConfig - Border configuration
 * @param {Object} backgroundConfig - Background configuration  
 * @param {Object} foregroundConfig - Foreground configuration
 * @param {Object} options - Additional styling options
 * @returns {Object} CSS styles object
 */
export function getConfigStyles(borderConfig, backgroundConfig, foregroundConfig, options = {}) {
  const { borderWidth = 6, ...otherOptions } = options;
  
  return {
    ...extractBorderStyle(borderConfig, borderWidth),
    ...extractBackgroundStyle(backgroundConfig),
    // Foreground styles would depend on the specific component
    // For now, just extract color for text elements
    color: foregroundConfig ? extractColor(foregroundConfig, '#000000') : undefined,
    ...otherOptions
  };
}