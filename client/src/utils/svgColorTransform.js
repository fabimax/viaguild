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
 * @param {Object} cssProperties - CSS properties to preserve
 */
const setElementColor = (element, colorType, colorValue, cssProperties = {}) => {
  // Handle gradients - don't try to change them
  if (colorValue && colorValue.includes('url(')) {
    return; // Keep gradient as-is
  }
  
  // Remove class attribute if it exists to prevent CSS class rules from overriding
  if (element.hasAttribute('class')) {
    element.removeAttribute('class');
    
    // Apply non-color CSS properties as inline styles
    if (cssProperties && Object.keys(cssProperties).length > 0) {
      const existingStyle = element.getAttribute('style') || '';
      const newStyles = [];
      
      // Parse existing inline styles
      const existingProps = {};
      if (existingStyle) {
        existingStyle.split(';').forEach(prop => {
          const [key, value] = prop.split(':').map(s => s.trim());
          if (key && value) {
            existingProps[key] = value;
          }
        });
      }
      
      // Add CSS properties (excluding fill/stroke which we handle separately)
      Object.entries(cssProperties).forEach(([prop, value]) => {
        if (prop !== 'fill' && prop !== 'stroke') {
          existingProps[prop] = value;
        }
      });
      
      // Build new style string
      Object.entries(existingProps).forEach(([prop, value]) => {
        newStyles.push(`${prop}: ${value}`);
      });
      
      if (newStyles.length > 0) {
        element.setAttribute('style', newStyles.join('; '));
      }
    }
  }
  
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
 * Ensure SVG has proper viewBox for scaling
 * @param {Element} svgElement - SVG DOM element
 */
const ensureViewBox = (svgElement) => {
  // Skip if viewBox already exists
  if (svgElement.hasAttribute('viewBox')) {
    return;
  }
  
  // Get width and height attributes
  const width = svgElement.getAttribute('width');
  const height = svgElement.getAttribute('height');
  
  if (width && height) {
    // Parse width and height, removing units (px, pt, etc.)
    const numericWidth = parseFloat(width);
    const numericHeight = parseFloat(height);
    
    if (!isNaN(numericWidth) && !isNaN(numericHeight) && numericWidth > 0 && numericHeight > 0) {
      // Add viewBox starting at origin with width/height dimensions
      svgElement.setAttribute('viewBox', `0 0 ${numericWidth} ${numericHeight}`);
      console.log(`Auto-added viewBox: "0 0 ${numericWidth} ${numericHeight}" to SVG`);
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
  
  // Check if there are any actual mappings to apply
  const mappingEntries = Object.entries(elementColorMap);
  if (mappingEntries.length === 0) {
    // No mappings to apply, return original to avoid unnecessary DOM parsing/serialization
    return svgString;
  }
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.documentElement;
  
  // Check for parser errors
  const parserError = svgElement.querySelector('parsererror');
  if (parserError) {
    console.error('SVG parsing error:', parserError.textContent);
    return svgString; // Return original if parsing fails
  }
  
  // Ensure proper viewBox for scaling
  ensureViewBox(svgElement);
  
  Object.entries(elementColorMap).forEach(([path, colorConfig]) => {
    const element = findElementByPath(svgElement, path);
    if (element) {
      const cssProps = colorConfig.cssProperties || {};
      
      if (colorConfig.fill && !colorConfig.fill.isGradient) {
        setElementColor(element, 'fill', colorConfig.fill.current, cssProps);
      }
      if (colorConfig.stroke && !colorConfig.stroke.isGradient) {
        setElementColor(element, 'stroke', colorConfig.stroke.current, cssProps);
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
  
  // Check if mappings object has any actual mappings
  const mappingEntries = Object.entries(colorConfig.mappings);
  if (mappingEntries.length === 0) {
    // No actual mappings to apply, return original to avoid unnecessary DOM parsing/serialization
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
 * Apply gradient changes to SVG
 * @param {string} svgString - SVG content as string
 * @param {Object} gradientDefinitions - Updated gradient definitions
 * @returns {string} - Updated SVG string
 */
export const applyGradientChanges = (svgString, gradientDefinitions) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.documentElement;
  
  // Ensure proper viewBox for scaling
  ensureViewBox(svgElement);
  
  // Find or create defs element
  let defsElement = svgElement.querySelector('defs');
  if (!defsElement) {
    defsElement = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svgElement.insertBefore(defsElement, svgElement.firstChild);
  }
  
  // Update each gradient definition
  Object.entries(gradientDefinitions).forEach(([gradientId, gradientDef]) => {
    let gradientElement = svgElement.querySelector(`#${gradientId}`);
    
    // If gradient doesn't exist, create it (for cloned gradients)
    if (!gradientElement && gradientDef.type) {
      const gradientType = gradientDef.type === 'lineargradient' ? 'linearGradient' : 'radialGradient';
      gradientElement = doc.createElementNS('http://www.w3.org/2000/svg', gradientType);
      gradientElement.setAttribute('id', gradientId);
      
      // Copy attributes from original gradient if this is a clone
      if (gradientDef.x1) gradientElement.setAttribute('x1', gradientDef.x1);
      if (gradientDef.y1) gradientElement.setAttribute('y1', gradientDef.y1);
      if (gradientDef.x2) gradientElement.setAttribute('x2', gradientDef.x2);
      if (gradientDef.y2) gradientElement.setAttribute('y2', gradientDef.y2);
      if (gradientDef.cx) gradientElement.setAttribute('cx', gradientDef.cx);
      if (gradientDef.cy) gradientElement.setAttribute('cy', gradientDef.cy);
      if (gradientDef.r) gradientElement.setAttribute('r', gradientDef.r);
      if (gradientDef.gradientUnits) gradientElement.setAttribute('gradientUnits', gradientDef.gradientUnits);
      
      // Create stops
      gradientDef.stops.forEach(stopDef => {
        const stopElement = doc.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stopElement.setAttribute('offset', stopDef.offset);
        stopElement.setAttribute('stop-color', stopDef.color);
        if (stopDef.opacity && stopDef.opacity !== '1') {
          stopElement.setAttribute('stop-opacity', stopDef.opacity);
        }
        gradientElement.appendChild(stopElement);
      });
      
      defsElement.appendChild(gradientElement);
    } else if (gradientElement) {
      // Update existing gradient stops
      const stops = gradientElement.querySelectorAll('stop');
      gradientDef.stops.forEach((stopDef, index) => {
        if (stops[index]) {
          // Update stop color
          stops[index].setAttribute('stop-color', stopDef.color);
          // Also update style attribute if it has stop-color
          const style = stops[index].getAttribute('style');
          if (style && style.includes('stop-color')) {
            const updatedStyle = style.replace(/stop-color\s*:\s*[^;]+/, `stop-color:${stopDef.color}`);
            stops[index].setAttribute('style', updatedStyle);
          }
        }
      });
    }
  });
  
  // Clean up gradients that are no longer in gradientDefinitions
  const allGradients = defsElement.querySelectorAll('linearGradient, radialGradient');
  allGradients.forEach(gradientEl => {
    const gradId = gradientEl.getAttribute('id');
    if (gradId && !gradientDefinitions[gradId]) {
      // Check if any element still uses this gradient
      const isUsed = svgElement.querySelector(`[fill="url(#${gradId})"], [stroke="url(#${gradId})"]`);
      if (!isUsed) {
        gradientEl.remove();
      }
    }
  });
  
  // Serialize back to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgElement);
};

/**
 * Ensure SVG has proper viewBox for scaling (standalone function)
 * @param {string} svgString - SVG content as string
 * @returns {string} - SVG with viewBox ensured
 */
export const ensureSvgViewBox = (svgString) => {
  if (!svgString) return svgString;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.documentElement;
  
  // Check for parser errors
  const parserError = svgElement.querySelector('parsererror');
  if (parserError) {
    console.error('SVG parsing error:', parserError.textContent);
    return svgString; // Return original if parsing fails
  }
  
  // Check if viewBox fix is needed
  const hadViewBox = svgElement.hasAttribute('viewBox');
  ensureViewBox(svgElement);
  
  // Only serialize if we actually added a viewBox
  if (!hadViewBox && svgElement.hasAttribute('viewBox')) {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  }
  
  return svgString; // Return original if no changes needed
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