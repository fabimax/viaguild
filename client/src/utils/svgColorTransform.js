/**
 * Utility functions for SVG color transformations
 */

/**
 * Find element by path in SVG DOM
 * @param {Element} root - SVG root element
 * @param {string} path - Element path (e.g., "path[0]", "svg", "g[0]/circle[1]")
 * @returns {Element|null} - Found element or null
 */
const findElementByPath = (root, path) => {
  if (path === 'svg') return root;
  
  const parts = path.split('/');
  let current = root;
  
  for (const part of parts) {
    if (part === 'svg') continue;
    
    const match = part.match(/^([a-z]+)\[(\d+)\]$/);
    if (!match) return null;
    
    const [, tagName, indexStr] = match;
    const index = parseInt(indexStr);
    
    const children = Array.from(current.children).filter(el => 
      el.tagName.toLowerCase() === tagName
    );
    
    if (index >= children.length) return null;
    current = children[index];
  }
  
  return current;
};

/**
 * Set color on element (handles both attributes and style)
 * @param {Element} element - DOM element
 * @param {string} colorType - 'fill' or 'stroke'
 * @param {string} colorValue - Color value (e.g., "#FF0000FF")
 */
const setElementColor = (element, colorType, colorValue) => {
  // Check if color is currently in style attribute
  const style = element.getAttribute('style');
  if (style && style.includes(`${colorType}:`)) {
    // Update style attribute
    const updatedStyle = style.replace(
      new RegExp(`${colorType}\\s*:\\s*[^;]+`, 'i'),
      `${colorType}:${colorValue}`
    );
    element.setAttribute('style', updatedStyle);
    // Remove conflicting direct attribute to prevent CSS specificity issues
    element.removeAttribute(colorType);
  } else {
    // Set as direct attribute and remove any conflicting style
    element.setAttribute(colorType, colorValue);
    // Remove from style attribute if it exists
    if (style && style.includes(`${colorType}:`)) {
      const cleanedStyle = style.replace(
        new RegExp(`${colorType}\\s*:\\s*[^;]+;?`, 'i'),
        ''
      ).replace(/;+/g, ';').replace(/^;|;$/g, '');
      if (cleanedStyle) {
        element.setAttribute('style', cleanedStyle);
      } else {
        element.removeAttribute('style');
      }
    }
  }
};

/**
 * Apply element-based color mappings to SVG string
 * @param {string} svgString - Original SVG content
 * @param {Object} elementColorMap - Color mapping configuration
 * @returns {string} - Transformed SVG content
 */
export const applyElementMappings = (svgString, elementColorMap) => {
  if (!svgString || !elementColorMap) return svgString;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.documentElement;
  
  // Check for parser errors
  const parserError = svgElement.querySelector('parsererror');
  if (parserError) {
    console.error('SVG parsing error:', parserError.textContent);
    return svgString; // Return original if parsing fails
  }
  
  Object.entries(elementColorMap).forEach(([path, colorConfig]) => {
    const element = findElementByPath(svgElement, path);
    if (element) {
      if (colorConfig.fill) {
        setElementColor(element, 'fill', colorConfig.fill.current);
      }
      if (colorConfig.stroke) {
        setElementColor(element, 'stroke', colorConfig.stroke.current);
      }
    }
  });
  
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgElement);
};

/**
 * Apply color transformations from foregroundColorConfig to SVG
 * @param {string} svgString - Original SVG content
 * @param {Object} colorConfig - Color configuration with mappings
 * @returns {string} - Transformed SVG content
 */
export const applySvgColorTransform = (svgString, colorConfig) => {
  if (!svgString || !colorConfig || !colorConfig.mappings) {
    return svgString;
  }
  
  // Check if mappings are already in the correct element color map format
  // (path -> { fill: { original, current }, stroke: { original, current } })
  const firstMapping = Object.values(colorConfig.mappings)[0];
  if (firstMapping && typeof firstMapping === 'object' && (firstMapping.fill || firstMapping.stroke)) {
    // Already in element color map format, use directly
    return applyElementMappings(svgString, colorConfig.mappings);
  }
  
  // Legacy format: Convert simple path->color mappings to element color map format
  const elementColorMap = {};
  
  Object.entries(colorConfig.mappings).forEach(([path, color]) => {
    // Determine if this is a fill or stroke based on the path
    // Default to fill for now (could be enhanced to detect from path suffix)
    const colorType = path.includes('-stroke') ? 'stroke' : 'fill';
    const cleanPath = path.replace(/-fill$|-stroke$/, '');
    
    if (!elementColorMap[cleanPath]) {
      elementColorMap[cleanPath] = {};
    }
    
    elementColorMap[cleanPath][colorType] = {
      current: color
    };
  });
  
  return applyElementMappings(svgString, elementColorMap);
};

/**
 * Check if a string is SVG content
 * @param {string} str - String to check
 * @returns {boolean} - True if string appears to be SVG content
 */
export const isSvgContent = (str) => {
  return typeof str === 'string' && 
         (str.trim().startsWith('<svg') || 
          (str.includes('<?xml') && str.includes('<svg')));
};

/**
 * Fetch and transform SVG from URL with color config
 * @param {string} url - SVG URL
 * @param {Object} colorConfig - Color configuration
 * @returns {Promise<string>} - Transformed SVG content
 */
export const fetchAndTransformSvg = async (url, colorConfig) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch SVG');
    
    const svgContent = await response.text();
    if (!isSvgContent(svgContent)) {
      throw new Error('Fetched content is not valid SVG');
    }
    
    return applySvgColorTransform(svgContent, colorConfig);
  } catch (error) {
    console.error('Error fetching/transforming SVG:', error);
    throw error;
  }
};