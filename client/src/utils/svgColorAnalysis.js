/**
 * Utility functions for analyzing SVG content and building color maps
 * for customization interfaces.
 */

import * as csstree from 'css-tree';

/**
 * Get element path for stable identification
 */
const getElementPath = (element, root) => {
  if (element === root) return 'svg';
  
  const tagName = element.tagName.toLowerCase();
  const parent = element.parentElement;
  
  if (!parent || parent === root) {
    // Top level element under SVG
    const siblings = Array.from(root.children).filter(el => el.tagName.toLowerCase() === tagName);
    const index = siblings.indexOf(element);
    return `${tagName}[${index}]`;
  } else {
    // Nested element
    const siblings = Array.from(parent.children).filter(el => el.tagName.toLowerCase() === tagName);
    const index = siblings.indexOf(element);
    const parentPath = getElementPath(parent, root);
    return `${parentPath}/${tagName}[${index}]`;
  }
};

/**
 * Convert any color format to normalized HEX8 format
 * Returns null for gradients, patterns, and other non-solid colors
 */
const parseAndNormalizeColor = (colorString) => {
  if (!colorString || colorString === 'none' || colorString === 'transparent' || colorString === 'currentColor') {
    return null;
  }
  
  // Check for gradients and patterns
  // Matches: url(#gradientId), url('#gradientId'), url("#gradientId")
  // Examples: url(#linearGrad1), url(#radialGrad2), url(#pattern1)
  if (colorString.includes('url(')) {
    // Extract the gradient/pattern ID using regex
    // Pattern explanation: url\( matches "url(", then ['"]? matches optional quote,
    // then # matches hash, then ([^)'"],*) captures the ID until quote/paren,
    // then ['"]? matches optional closing quote, then \) matches closing paren
    const match = colorString.match(/url\(['"]?#([^)'"]+)['"]?\)/);
    if (match) {
      return {
        type: 'GRADIENT_OR_PATTERN',
        id: match[1] // Store the gradient/pattern ID for future editing
      };
    }
    return 'GRADIENT_OR_PATTERN'; // Fallback for malformed url() values
  }

  // Trim whitespace
  const color = colorString.trim();

  // HEX colors: #RGB, #RRGGBB, #RRGGBBAA
  if (color.startsWith('#')) {
    if (color.length === 4) {
      // #RGB -> #RRGGBBFF
      const r = color[1] + color[1];
      const g = color[2] + color[2];
      const b = color[3] + color[3];
      return `#${r}${g}${b}FF`.toUpperCase();
    } else if (color.length === 7) {
      // #RRGGBB -> #RRGGBBFF
      return `${color}FF`.toUpperCase();
    } else if (color.length === 9) {
      // #RRGGBBAA -> #RRGGBBAA
      return color.toUpperCase();
    }
  }

  // RGB/RGBA colors: rgb(r,g,b) or rgba(r,g,b,a)
  const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)$/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    const alpha = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}${a}`.toUpperCase();
  }

  // HSL/HSLA colors: hsl(h,s%,l%) or hsla(h,s%,l%,a)
  const hslMatch = color.match(/^hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([0-9.]+))?\)$/i);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]) / 360;
    const s = parseInt(hslMatch[2]) / 100;
    const l = parseInt(hslMatch[3]) / 100;
    const alpha = hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : 1;

    // Convert HSL to RGB
    const hslToRgb = (h, s, l) => {
      let r, g, b;
      if (s === 0) {
        r = g = b = l; // achromatic
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const [r, g, b] = hslToRgb(h, s, l);
    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');
    const aHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `#${rHex}${gHex}${bHex}${aHex}`.toUpperCase();
  }

  // Named colors
  const namedColors = {
    'red': '#FF0000FF', 'green': '#008000FF', 'blue': '#0000FFFF',
    'white': '#FFFFFFFF', 'black': '#000000FF', 'gray': '#808080FF', 'grey': '#808080FF',
    'yellow': '#FFFF00FF', 'orange': '#FFA500FF', 'purple': '#800080FF', 'pink': '#FFC0CBFF',
    'brown': '#A52A2AFF', 'cyan': '#00FFFFFF', 'magenta': '#FF00FFFF', 'lime': '#00FF00FF',
    'navy': '#000080FF', 'maroon': '#800000FF', 'olive': '#808000FF', 'teal': '#008080FF',
    'silver': '#C0C0C0FF', 'gold': '#FFD700FF', 'indigo': '#4B0082FF', 'violet': '#EE82EEFF'
  };

  const normalizedName = color.toLowerCase();
  if (namedColors[normalizedName]) {
    return namedColors[normalizedName];
  }

  // If we can't parse it, return null
  return null;
};

/**
 * Build element-based color map from SVG content
 * 
 * @param {string} svgString - The SVG content to analyze
 * @returns {Object|null} - Color map object with elementColorMap property, or null if no colors found
 */
export const buildElementColorMap = (svgString) => {
  if (!svgString) return null;

  try {
    
    // Parse DOM to map colors to elements directly
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.documentElement;
    
    // Check for parser errors and log them
    const parserError = svgElement.querySelector('parsererror');
    if (parserError) {
      console.error('SVG parsing error:', parserError.textContent);
      console.error('SVG that failed to parse:', svgString);
      throw new Error(`Invalid SVG content: ${parserError.textContent}`);
    }
    
    // Parse CSS styles if present
    const styleElements = svgElement.querySelectorAll('style');
    const cssRules = {};
    
    styleElements.forEach(styleEl => {
      const cssText = styleEl.textContent;
      
      try {
        // Parse CSS with css-tree
        const ast = csstree.parse(cssText);
        
        // Walk through all rules
        csstree.walk(ast, function(node) {
          if (node.type === 'Rule') {
            // Process each selector in the rule
            const selectors = [];
            
            csstree.walk(node.prelude, function(selectorNode) {
              // Handle class selectors
              if (selectorNode.type === 'ClassSelector') {
                selectors.push({
                  type: 'class',
                  name: selectorNode.name
                });
              }
              // Handle ID selectors
              else if (selectorNode.type === 'IdSelector') {
                selectors.push({
                  type: 'id',
                  name: selectorNode.name
                });
              }
              // Handle type selectors (element names)
              else if (selectorNode.type === 'TypeSelector') {
                selectors.push({
                  type: 'element',
                  name: selectorNode.name
                });
              }
            });
            
            // Extract declarations
            const declarations = {};
            if (node.block && node.block.children) {
              node.block.children.forEach(decl => {
                if (decl.type === 'Declaration') {
                  declarations[decl.property] = csstree.generate(decl.value);
                }
              });
            }
            
            // Store rules by selector
            selectors.forEach(selector => {
              if (selector.type === 'class') {
                cssRules[selector.name] = declarations;
              }
              // TODO: Handle other selector types as needed
            });
          }
        });
      } catch (e) {
        console.error('CSS parsing error:', e);
        // Fallback to regex parsing if css-tree fails
        const ruleMatches = cssText.matchAll(/\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g);
        for (const match of ruleMatches) {
          const className = match[1];
          const ruleContent = match[2];
          
          cssRules[className] = {};
          
          const propertyMatches = ruleContent.matchAll(/([a-zA-Z-]+)\s*:\s*([^;]+);?/g);
          for (const propMatch of propertyMatches) {
            const property = propMatch[1].trim();
            const value = propMatch[2].trim();
            cssRules[className][property] = value;
          }
        }
      }
    });
    
    
    const colorMap = {};
    const detectedColors = new Set(); // Track all detected colors
    const colorableElements = svgElement.querySelectorAll('path, circle, rect, ellipse, polygon, line, polyline');
    
    // Scan for gradient definitions for future gradient stop editing
    const gradientDefinitions = {};
    const gradients = svgElement.querySelectorAll('linearGradient, radialGradient');
    gradients.forEach(grad => {
      const id = grad.getAttribute('id');
      if (id) {
        const stops = [];
        grad.querySelectorAll('stop').forEach(stop => {
          stops.push({
            offset: stop.getAttribute('offset') || '0%',
            color: stop.getAttribute('stop-color') || '#000000',
            opacity: stop.getAttribute('stop-opacity') || '1'
          });
        });
        
        gradientDefinitions[id] = {
          type: grad.tagName.toLowerCase(), // 'lineargradient' or 'radialgradient'
          stops: stops,
          // Store additional gradient attributes for future editing
          x1: grad.getAttribute('x1'),
          y1: grad.getAttribute('y1'),
          x2: grad.getAttribute('x2'),
          y2: grad.getAttribute('y2'),
          cx: grad.getAttribute('cx'), // for radial gradients
          cy: grad.getAttribute('cy'), // for radial gradients
          r: grad.getAttribute('r'),   // for radial gradients
          gradientUnits: grad.getAttribute('gradientUnits')
        };
      }
    });
    
    // Helper to get color from element (checks both attributes and style)
    const getElementColor = (element, colorType) => {
      // First check direct attribute
      let color = element.getAttribute(colorType);
      
      // If not found, check style attribute
      if (!color) {
        const style = element.getAttribute('style');
        if (style) {
          const match = style.match(new RegExp(`${colorType}\\s*:\\s*([^;]+)`, 'i'));
          if (match) {
            color = match[1].trim();
          }
        }
      }
      
      // If still not found, check CSS class rules (handle multiple classes)
      if (!color) {
        const classAttr = element.getAttribute('class');
        if (classAttr) {
          const classes = classAttr.split(/\s+/);
          for (const className of classes) {
            if (cssRules[className] && cssRules[className][colorType]) {
              color = cssRules[className][colorType];
              break; // Use first matching class
            }
          }
        }
      }
      
      return color;
    };

    // Helper to process colors for any element
    const processElementColors = (element, elementPath) => {
      // Store CSS properties for this element
      const cssProperties = {};
      const classAttr = element.getAttribute('class');
      if (classAttr) {
        const classes = classAttr.split(/\s+/);
        classes.forEach(className => {
          if (cssRules[className]) {
            // Merge properties from each class
            Object.assign(cssProperties, cssRules[className]);
          }
        });
      }
      // Check fill color
      const fillRaw = getElementColor(element, 'fill');
      if (fillRaw) {
        const normalizedFill = parseAndNormalizeColor(fillRaw);
        if (normalizedFill && typeof normalizedFill === 'object' && normalizedFill.type === 'GRADIENT_OR_PATTERN') {
          // Handle gradients/patterns - store ID for future gradient stop editing
          if (!colorMap[elementPath]) colorMap[elementPath] = {};
          colorMap[elementPath].fill = {
            original: 'GRADIENT',
            current: fillRaw, // Preserve the original gradient reference
            gradientId: normalizedFill.id, // Store ID for future gradient editing
            isGradient: true,
            cannotCustomize: false // Will be editable in the future
          };
        } else if (normalizedFill === 'GRADIENT_OR_PATTERN') {
          // Fallback for malformed gradient references
          if (!colorMap[elementPath]) colorMap[elementPath] = {};
          colorMap[elementPath].fill = {
            original: 'GRADIENT',
            current: fillRaw,
            isGradient: true,
            cannotCustomize: true // Malformed, so not editable
          };
        } else if (normalizedFill) {
          detectedColors.add(normalizedFill);
          if (!colorMap[elementPath]) colorMap[elementPath] = {};
          colorMap[elementPath].fill = {
            original: normalizedFill,
            current: normalizedFill
          };
        } else if (fillRaw === 'none' || fillRaw === 'transparent' || fillRaw === 'currentColor') {
          // Treat "none", "transparent", and "currentColor" as unspecified colors that can be customized
          if (!colorMap[elementPath]) colorMap[elementPath] = {};
          colorMap[elementPath].fill = {
            original: 'UNSPECIFIED',
            current: '#000000FF', // Default to black
            isUnspecified: true
          };
        }
      } else if (element.tagName.toLowerCase() === 'path' || element.tagName.toLowerCase() === 'circle' || 
                 element.tagName.toLowerCase() === 'rect' || element.tagName.toLowerCase() === 'ellipse' ||
                 element.tagName.toLowerCase() === 'polygon') {
        // Only add unspecified fill for actual drawing elements that typically need fill
        if (!colorMap[elementPath]) colorMap[elementPath] = {};
        colorMap[elementPath].fill = {
          original: 'UNSPECIFIED', // Special marker for unspecified colors
          current: '#000000FF', // Default to black
          isUnspecified: true
        };
      }
      
      // Check stroke color
      const strokeRaw = getElementColor(element, 'stroke');
      if (strokeRaw) {
        const normalizedStroke = parseAndNormalizeColor(strokeRaw);
        if (normalizedStroke && typeof normalizedStroke === 'object' && normalizedStroke.type === 'GRADIENT_OR_PATTERN') {
          // Handle gradients/patterns for stroke - store ID for future gradient stop editing
          if (!colorMap[elementPath]) colorMap[elementPath] = {};
          colorMap[elementPath].stroke = {
            original: 'GRADIENT',
            current: strokeRaw, // Preserve the original gradient reference
            gradientId: normalizedStroke.id, // Store ID for future gradient editing
            isGradient: true,
            cannotCustomize: false // Will be editable in the future
          };
        } else if (normalizedStroke === 'GRADIENT_OR_PATTERN') {
          // Fallback for malformed gradient references
          if (!colorMap[elementPath]) colorMap[elementPath] = {};
          colorMap[elementPath].stroke = {
            original: 'GRADIENT',
            current: strokeRaw,
            isGradient: true,
            cannotCustomize: true // Malformed, so not editable
          };
        } else if (normalizedStroke) {
          detectedColors.add(normalizedStroke);
          if (!colorMap[elementPath]) colorMap[elementPath] = {};
          colorMap[elementPath].stroke = {
            original: normalizedStroke,
            current: normalizedStroke
          };
        } else if (strokeRaw === 'none' || strokeRaw === 'transparent' || strokeRaw === 'currentColor') {
          // Treat "none", "transparent", and "currentColor" as unspecified colors that can be customized
          if (!colorMap[elementPath]) colorMap[elementPath] = {};
          colorMap[elementPath].stroke = {
            original: 'UNSPECIFIED',
            current: '#000000FF', // Default to black
            isUnspecified: true
          };
        }
      } else if (element.tagName.toLowerCase() === 'line' || element.tagName.toLowerCase() === 'polyline') {
        // Only add unspecified stroke for elements that commonly use strokes (excluding path)
        if (!colorMap[elementPath]) colorMap[elementPath] = {};
        colorMap[elementPath].stroke = {
          original: 'UNSPECIFIED', // Special marker for unspecified colors
          current: '#000000FF', // Default to black
          isUnspecified: true
        };
      }
      
      // Store CSS properties for preservation during transformation
      if (Object.keys(cssProperties).length > 0 && colorMap[elementPath]) {
        colorMap[elementPath].cssProperties = cssProperties;
      }
    };

    // First check the root SVG element
    processElementColors(svgElement, 'svg');
    
    // Then check all child elements
    colorableElements.forEach(el => {
      const elementPath = getElementPath(el, svgElement);
      console.log('Processing element:', el.tagName, 'with path:', elementPath, 'fill:', el.getAttribute('fill'));
      processElementColors(el, elementPath);
    });
    
    
    if (Object.keys(colorMap).length > 0) {
      return { 
        elementColorMap: colorMap,
        gradientDefinitions: gradientDefinitions // Include gradient info for future editing
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error building element color map:', error);
    return null;
  }
};