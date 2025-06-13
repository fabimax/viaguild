/**
 * Color Configuration Utilities
 * 
 * Helper functions for working with unified visual configuration objects
 * that support simple colors, hosted assets, and complex element mappings.
 */

/**
 * Extract a simple color value from a config object
 * @param {Object|null} config - The color configuration object
 * @param {string} fallback - Fallback color if extraction fails
 * @returns {string} Hex color string
 */
function extractColor(config, fallback = '#000000') {
  if (!config) return fallback;
  
  switch (config.type) {
    case 'simple-color':
      return config.color || fallback;
      
    case 'element-path':
      // Extract representative color from element mappings
      if (config.mappings && typeof config.mappings === 'object') {
        const mappings = Object.values(config.mappings);
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
 * Extract background style properties from a config object
 * @param {Object|null} config - The background configuration object
 * @returns {Object} Style properties for CSS application
 */
function extractBackgroundStyle(config) {
  if (!config) return {};
  
  switch (config.type) {
    case 'simple-color':
      return { 
        backgroundColor: config.color || '#DDDDDD' 
      };
      
    case 'hosted-asset':
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
function extractBorderStyle(config, width = 6) {
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
function createSimpleColorConfig(color) {
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
function createHostedAssetConfig(url) {
  return {
    type: 'hosted-asset',
    version: 1,
    url: url
  };
}

/**
 * Create an element-path configuration object for SVG color mappings
 * @param {Object} mappings - Element path to color mappings
 * @returns {Object} Element-path configuration object
 */
function createElementPathConfig(mappings) {
  return {
    type: 'element-path',
    version: 1,
    mappings: mappings
  };
}

/**
 * Validate a color configuration object
 * @param {Object} config - Configuration object to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateColorConfig(config) {
  if (!config || typeof config !== 'object') return false;
  if (!config.type || !config.version) return false;
  
  switch (config.type) {
    case 'simple-color':
      return typeof config.color === 'string' && config.color.startsWith('#');
      
    case 'hosted-asset':
      return typeof config.url === 'string' && config.url.length > 0;
      
    case 'element-path':
      return config.mappings && typeof config.mappings === 'object';
      
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
function mergeLegacyColor(legacyColor, existingConfig) {
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
function convertLegacyBackground(backgroundType, backgroundValue) {
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

module.exports = {
  extractColor,
  extractBackgroundStyle,
  extractBorderStyle,
  createSimpleColorConfig,
  createHostedAssetConfig,
  createElementPathConfig,
  validateColorConfig,
  mergeLegacyColor,
  convertLegacyBackground
};