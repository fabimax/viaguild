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
      
    case 'system-icon':
      return config.color || fallback;
      
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
 * Create a customizable-svg configuration object for SVG color mappings
 * @param {Object} colorMappings - Element path to color mappings
 * @param {string} url - Asset URL for the SVG
 * @param {number} scale - Optional scale factor
 * @returns {Object} Customizable-svg configuration object
 */
function createCustomizableSvgConfig(colorMappings, url, scale) {
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
function validateColorConfig(config) {
  if (!config || typeof config !== 'object') return false;
  if (!config.type || !config.version) return false;
  
  switch (config.type) {
    case 'simple-color':
      return typeof config.color === 'string' && config.color.startsWith('#');
      
    case 'system-icon':
      return typeof config.value === 'string' && config.value.length > 0 && 
             (!config.color || (typeof config.color === 'string' && config.color.startsWith('#')));
      
    case 'hosted-asset':
      return typeof config.url === 'string' && config.url.length > 0;
      
    case 'customizable-svg':
      return config.colorMappings && typeof config.colorMappings === 'object';
      
    default:
      return false;
  }
}


module.exports = {
  extractColor,
  extractBackgroundStyle,
  extractBorderStyle,
  createSimpleColorConfig,
  createHostedAssetConfig,
  createCustomizableSvgConfig,
  validateColorConfig
};