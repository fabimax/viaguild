import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';

// Helper to convert a 6-digit hex and an alpha (0-1) to an 8-digit hex (or 6 if alpha is 1)
const formatHexWithAlpha = (hex, alpha = 1) => {
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return hex; // Invalid hex input
  
  // Normalize 3-digit hex to 6-digit
  let r = '', g = '', b = '';
  if (hex.length === 4) {
    r = hex[1] + hex[1];
    g = hex[2] + hex[2];
    b = hex[3] + hex[3];
  } else {
    r = hex.slice(1, 3);
    g = hex.slice(3, 5);
    b = hex.slice(5, 7);
  }

  if (alpha === null || typeof alpha === 'undefined' || Number(alpha) === 1) {
    return `#${r}${g}${b}`;
  }
  const alphaHex = Math.round(Number(alpha) * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}${alphaHex}`;
};

// Helper to parse a color string (HEX6, HEX8, RGBA) into { hex: #RRGGBB, alpha: number (0-1) }
const parseColorString = (colorString) => {
  if (typeof colorString !== 'string') return { hex: '#000000', alpha: 1 };

  // Try HEX8: #RRGGBBAA
  if (colorString.startsWith('#') && colorString.length === 9) {
    const hex = colorString.substring(0, 7);
    const alphaHex = colorString.substring(7, 9);
    const alpha = parseInt(alphaHex, 16) / 255;
    return { hex, alpha: parseFloat(alpha.toFixed(2)) };
  }
  // Try HEX6: #RRGGBB or HEX3: #RGB
  if (colorString.startsWith('#') && (colorString.length === 7 || colorString.length === 4)) {
    let hex = colorString;
    if (colorString.length === 4) {
        hex = `#${colorString[1]}${colorString[1]}${colorString[2]}${colorString[2]}${colorString[3]}${colorString[3]}`;
    }
    return { hex, alpha: 1 };
  }
  // Try RGBA: rgba(r,g,b,a)
  const rgbaMatch = colorString.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9\.]+))?\)$/i);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
    const hex = `#${r}${g}${b}`;
    const alpha = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    return { hex, alpha: parseFloat(alpha.toFixed(2)) };
  }
  // Fallback or for named colors (not fully supported for parsing here)
  return { hex: '#000000', alpha: 1 }; // Default if parsing fails
};

// SVG color customization class
class SVGColorCustomizer {
  constructor() {
    this.colorPattern = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})\b/g;
  }
  
  extractColors(svgString) {
    const colors = new Set();
    const matches = svgString.matchAll(this.colorPattern);
    for (const match of matches) {
      let color = match[0];
      if (color.length === 4) {
        color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3] + 'FF';
      } else if (color.length === 7) {
        color = color + 'FF';
      }
      colors.add(color.toUpperCase());
    }
    return Array.from(colors);
  }
  
  hexToRgba(hex8) {
    if (hex8.length !== 9 || !hex8.startsWith('#')) {
      return { r: 0, g: 0, b: 0, a: 1 };
    }
    return {
      r: parseInt(hex8.slice(1, 3), 16),
      g: parseInt(hex8.slice(3, 5), 16),
      b: parseInt(hex8.slice(5, 7), 16),
      a: parseFloat((parseInt(hex8.slice(7, 9), 16) / 255).toFixed(2))
    };
  }
  
  hasTransparency(hex8) {
    if (hex8.length !== 9) return false;
    const alpha = parseInt(hex8.slice(7, 9), 16) / 255;
    return alpha < 1.0;
  }
  
  replaceColor(svgString, oldHex8, newHex8) {
    let tempSvg = svgString;
    const patterns = [oldHex8];
    
    if (oldHex8.endsWith('FF')) {
      patterns.push(oldHex8.substring(0, 7));
      const r = oldHex8[1], g = oldHex8[3], b = oldHex8[5];
      if (r === oldHex8[2] && g === oldHex8[4] && b === oldHex8[6]) {
        patterns.push(`#${r}${g}${b}`);
      }
    }
    
    for (const pattern of patterns) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped + '(?![0-9a-fA-F])', 'gi');
      tempSvg = tempSvg.replace(regex, newHex8.toUpperCase());
    }
    
    return tempSvg;
  }
  
  replaceMultipleColors(svgString, colorMap) {
    let updatedSvg = svgString;
    Object.entries(colorMap).forEach(([oldColor, newColor]) => {
      updatedSvg = this.replaceColor(updatedSvg, oldColor, newColor);
    });
    return updatedSvg;
  }
}

/**
 * BadgeIconUpload component
 * Allows users to upload SVG or image files for badge icons
 * Supports SVG color customization
 */
function BadgeIconUpload({ 
  currentIcon = null,
  onIconChange,
  onSvgDataChange,
  isLoading = false,
  templateSlug = 'badge-icon'
}) {
  const [previewIcon, setPreviewIcon] = useState(currentIcon);
  const [error, setError] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [isSvg, setIsSvg] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [svgColorData, setSvgColorData] = useState(null);
  const [fallbackColor, setFallbackColor] = useState('#000000');
  const [fallbackAlpha, setFallbackAlpha] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState({});
  const fileInputRef = useRef(null);
  const svgCustomizer = useRef(new SVGColorCustomizer());
  
  // Initialize preview from current icon
  useEffect(() => {
    if (currentIcon && currentIcon.includes('.svg')) {
      setIsSvg(true);
      // Fetch SVG content if it's an SVG URL
      fetch(currentIcon)
        .then(res => res.text())
        .then(svg => {
          setSvgContent(svg);
          // Use element-based color mapping
          const elementColorMap = buildElementColorMap(svg);
          const elementPaths = Object.keys(elementColorMap);
          
          if (elementPaths.length > 0) {
            // Convert to display format for UI
            const colorSlots = [];
            elementPaths.forEach(path => {
              const elementColors = elementColorMap[path];
              
              if (elementColors.fill) {
                colorSlots.push({
                  id: `${path}-fill`,
                  label: `${path} (fill)`,
                  originalColor: elementColors.fill.original,
                  currentColor: elementColors.fill.current,
                  elementPath: path,
                  colorType: 'fill',
                  rgba: svgCustomizer.current.hexToRgba(elementColors.fill.original),
                  hasTransparency: svgCustomizer.current.hasTransparency(elementColors.fill.original)
                });
              }
              
              if (elementColors.stroke) {
                colorSlots.push({
                  id: `${path}-stroke`,
                  label: `${path} (stroke)`,
                  originalColor: elementColors.stroke.original,
                  currentColor: elementColors.stroke.current,
                  elementPath: path,
                  colorType: 'stroke',
                  rgba: svgCustomizer.current.hexToRgba(elementColors.stroke.original),
                  hasTransparency: svgCustomizer.current.hasTransparency(elementColors.stroke.original)
                });
              }
            });
            
            setSvgColorData({
              colorSlots,
              elementColorMap
            });
          }
        })
        .catch(err => console.error('Error fetching SVG:', err));
    }
  }, [currentIcon]);
  
  /**
   * Upload file to R2 via backend API
   */
  const uploadToR2 = async (file) => {
    const formData = new FormData();
    formData.append('icon', file);
    formData.append('templateSlug', templateSlug);
    
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('You must be logged in to upload an icon');
    }
    
    const response = await fetch('http://localhost:3000/api/upload/badge-icon', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload icon');
    }
    
    return response.json();
  };
  
  /**
   * Read file as text (for SVG)
   */
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };
  
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
   * Build element-based color map (hybrid approach: regex detection + element mapping)
   */
  const buildElementColorMap = (svgString) => {
    // Step 1: Use the working regex approach to find ALL colors
    const allColors = svgCustomizer.current.extractColors(svgString);
    console.log('All colors found by regex:', allColors);
    
    if (allColors.length === 0) {
      return {};
    }
    
    // Step 2: Parse DOM to map colors to elements
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.documentElement;
    
    if (svgElement.querySelector('parsererror')) {
      throw new Error('Invalid SVG content');
    }
    
    const colorMap = {};
    const colorableElements = svgElement.querySelectorAll('path, circle, rect, ellipse, polygon, line, polyline');
    
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
      
      return color;
    };
    
    // Helper to normalize hex colors (same as SVGColorCustomizer)
    const normalizeHexColor = (hex) => {
      if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      if (hex.length === 7) {
        hex = hex + 'FF';
      }
      return hex.toUpperCase();
    };
    
    colorableElements.forEach(el => {
      const elementPath = getElementPath(el, svgElement);
      
      // Check fill color
      const fill = getElementColor(el, 'fill');
      if (fill && fill.startsWith('#')) {
        const normalizedFill = normalizeHexColor(fill);
        if (allColors.includes(normalizedFill)) {
          if (!colorMap[elementPath]) colorMap[elementPath] = {};
          colorMap[elementPath].fill = {
            original: normalizedFill,
            current: normalizedFill
          };
        }
      }
      
      // Check stroke color
      const stroke = getElementColor(el, 'stroke');
      if (stroke && stroke.startsWith('#')) {
        const normalizedStroke = normalizeHexColor(stroke);
        if (allColors.includes(normalizedStroke)) {
          if (!colorMap[elementPath]) colorMap[elementPath] = {};
          colorMap[elementPath].stroke = {
            original: normalizedStroke,
            current: normalizedStroke
          };
        }
      }
    });
    
    console.log('Final color map:', colorMap);
    return colorMap;
  };

  /**
   * Sanitize and process SVG
   */
  const processSvg = (svgString) => {
    // Sanitize with DOMPurify
    const clean = DOMPurify.sanitize(svgString, {
      USE_PROFILES: { svg: true, svgFilters: true }
    });
    
    // Parse and ensure proper SVG structure
    const parser = new DOMParser();
    const doc = parser.parseFromString(clean, 'image/svg+xml');
    const svgElement = doc.documentElement;
    
    if (svgElement.querySelector('parsererror')) {
      throw new Error('Invalid SVG content');
    }
    
    // Add fill="currentColor" to paths without fill
    const shapes = svgElement.querySelectorAll('path, circle, rect, ellipse, polygon');
    shapes.forEach(el => {
      if (!el.hasAttribute('fill') && !el.hasAttribute('stroke')) {
        el.setAttribute('fill', 'currentColor');
      }
    });
    
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  };
  
  /**
   * Handle file selection
   */
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setError('');
    
    if (!file) return;
    
    // Check file type
    const isSvgFile = file.type === 'image/svg+xml' || file.name.endsWith('.svg');
    const isImage = file.type.match(/^image\/(jpeg|png|gif|webp|svg\+xml)$/);
    
    if (!isImage) {
      setError('Please select an image file (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }
    
    // Check file size (5MB limit for icons)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }
    
    try {
      setInternalLoading(true);
      setIsSvg(isSvgFile);
      
      if (isSvgFile) {
        // Read SVG and analyze colors BEFORE processing
        const svgText = await readFileAsText(file);
        
        // Build element-based color map from original SVG
        const elementColorMap = buildElementColorMap(svgText);
        console.log('Element color map:', elementColorMap);
        console.log('Original SVG:', svgText);
        
        // Now process the SVG (adds currentColor to unfilled elements)
        const processedSvg = processSvg(svgText);
        setSvgContent(processedSvg);
        const elementPaths = Object.keys(elementColorMap);
        console.log('Element paths found:', elementPaths);
        
        if (elementPaths.length > 0) {
          // Convert to display format for UI
          const colorSlots = [];
          elementPaths.forEach(path => {
            const elementColors = elementColorMap[path];
            
            if (elementColors.fill) {
              colorSlots.push({
                id: `${path}-fill`,
                label: `${path} (fill)`,
                originalColor: elementColors.fill.original,
                currentColor: elementColors.fill.current,
                elementPath: path,
                colorType: 'fill',
                rgba: svgCustomizer.current.hexToRgba(elementColors.fill.original),
                hasTransparency: svgCustomizer.current.hasTransparency(elementColors.fill.original)
              });
            }
            
            if (elementColors.stroke) {
              colorSlots.push({
                id: `${path}-stroke`,
                label: `${path} (stroke)`,
                originalColor: elementColors.stroke.original,
                currentColor: elementColors.stroke.current,
                elementPath: path,
                colorType: 'stroke',
                rgba: svgCustomizer.current.hexToRgba(elementColors.stroke.original),
                hasTransparency: svgCustomizer.current.hasTransparency(elementColors.stroke.original)
              });
            }
          });
          
          const colorData = {
            colorSlots,
            elementColorMap // Store the structured map for API generation
          };
          setSvgColorData(colorData);
          onSvgDataChange?.(processedSvg, colorData);
        } else {
          setSvgColorData(null);
          onSvgDataChange?.(processedSvg, null);
        }
        
        // Upload SVG to R2 as temporary asset
        const uploadResponse = await uploadToR2(file);
        console.log('Upload response:', uploadResponse);
        const uploadedUrl = uploadResponse.data.iconUrl;
        const assetId = uploadResponse.data.assetId; // Get the upload ID
        console.log('Asset ID:', assetId, 'Uploaded URL:', uploadedUrl);
        
        // Create preview URL for display
        const blob = new Blob([processedSvg], { type: 'image/svg+xml' });
        const previewUrl = URL.createObjectURL(blob);
        setPreviewIcon(previewUrl);
        setUploadedUrl(uploadedUrl);
        setUploadId(assetId);
        
        // Pass upload reference for API usage, but also store the actual URL for display
        const uploadReference = `upload://${assetId}`;
        onIconChange(uploadReference, processedSvg, uploadedUrl); // Pass upload reference for API, SVG content, and URL for display
      } else {
        // Regular image upload
        setSvgContent('');
        setSvgColorData(null);
        onSvgDataChange?.(null, null);
        
        // Upload to R2 as temporary asset
        const uploadResponse = await uploadToR2(file);
        const uploadedUrl = uploadResponse.data.iconUrl;
        const assetId = uploadResponse.data.assetId;
        
        setPreviewIcon(uploadedUrl);
        setUploadedUrl(uploadedUrl);
        setUploadId(assetId);
        
        // Pass upload reference for API usage, but also the actual URL for display
        const uploadReference = `upload://${assetId}`;
        onIconChange(uploadReference, null, uploadedUrl);
      }
    } catch (err) {
      console.error('Error handling file:', err);
      setError(err.message || 'Failed to process icon. Please try again.');
      setPreviewIcon(currentIcon);
    } finally {
      setInternalLoading(false);
    }
  };
  
  /**
   * Handle fallback SVG color change (for SVGs without hex colors)
   */
  const handleFallbackColorChange = (newColorHex, newAlpha) => {
    if (!svgContent) return;
    
    setFallbackColor(newColorHex);
    setFallbackAlpha(newAlpha);
    
    const formattedColor = formatHexWithAlpha(newColorHex, newAlpha);
    
    // Apply the color by replacing currentColor with actual color
    let updatedSvg = svgContent;
    // Replace fill="currentColor" with the selected color
    updatedSvg = updatedSvg.replace(/fill="currentColor"/gi, `fill="${formattedColor}"`);
    // Also handle stroke="currentColor" if present
    updatedSvg = updatedSvg.replace(/stroke="currentColor"/gi, `stroke="${formattedColor}"`);
    
    // Update preview
    const blob = new Blob([updatedSvg], { type: 'image/svg+xml' });
    const newUrl = URL.createObjectURL(blob);
    if (previewIcon && previewIcon.startsWith('blob:')) {
      URL.revokeObjectURL(previewIcon);
    }
    setPreviewIcon(newUrl);
    // Only use upload reference - no fallback to direct URLs
    if (uploadId) {
      const referenceValue = `upload://${uploadId}`;
      onIconChange(referenceValue, updatedSvg, uploadedUrl);
    } else {
      console.error('No upload ID available - cannot update icon');
      // Don't expose direct URLs
    }
    onSvgDataChange?.(updatedSvg, null);
  };

  /**
   * Apply element-based color mappings to SVG
   */
  const applyElementMappings = (svgString, elementColorMap) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.documentElement;
    
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
   * Set color on element (handles both attributes and style)
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
    } else {
      // Set as direct attribute
      element.setAttribute(colorType, colorValue);
    }
  };
  
  /**
   * Find element by path
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
   * Handle SVG color change
   */
  const handleColorChange = (slotId, newColorHex, newAlpha) => {
    if (!svgColorData || !svgContent) return;
    const parsedAlpha = parseFloat(newAlpha);
    if (isNaN(parsedAlpha)) {
      return;
    }
    const newFormattedColor = formatHexWithAlpha(newColorHex, parsedAlpha);
    const newRgbaFromHexAlpha = svgCustomizer.current.hexToRgba(newFormattedColor);

    // Update color slots for UI
    const updatedSlots = svgColorData.colorSlots.map(slot =>
      slot.id === slotId ? { 
          ...slot, 
          currentColor: newFormattedColor, 
          rgba: newRgbaFromHexAlpha,
          hasTransparency: parsedAlpha < 1 
        } : slot
    );
    
    // Update element color map for SVG processing
    const updatedElementColorMap = { ...svgColorData.elementColorMap };
    const changedSlot = updatedSlots.find(slot => slot.id === slotId);
    if (changedSlot) {
      const { elementPath, colorType } = changedSlot;
      if (!updatedElementColorMap[elementPath]) {
        updatedElementColorMap[elementPath] = {};
      }
      updatedElementColorMap[elementPath][colorType] = {
        original: changedSlot.originalColor,
        current: newFormattedColor
      };
    }
    
    // Apply mappings to SVG
    const updatedSvg = applyElementMappings(svgContent, updatedElementColorMap);
    const newColorData = { 
      colorSlots: updatedSlots, 
      elementColorMap: updatedElementColorMap 
    };
    
    setSvgColorData(newColorData);
    
    // Update preview
    const blob = new Blob([updatedSvg], { type: 'image/svg+xml' });
    const newUrl = URL.createObjectURL(blob);
    if (previewIcon && previewIcon.startsWith('blob:')) {
      URL.revokeObjectURL(previewIcon);
    }
    setPreviewIcon(newUrl);
    // Keep using the upload reference if we have one
    const referenceValue = uploadId ? `upload://${uploadId}` : (uploadedUrl || newUrl);
    onIconChange(referenceValue, updatedSvg, uploadedUrl);
    onSvgDataChange?.(updatedSvg, newColorData);
  };
  
  /**
   * Reset color to original
   */
  const handleResetColor = (slotIdToReset) => {
    if (!svgColorData) return;

    // Reset color slot for UI
    const updatedSlots = svgColorData.colorSlots.map(slot => {
      if (slot.id === slotIdToReset) {
        return {
          ...slot,
          currentColor: slot.originalColor,
          rgba: svgCustomizer.current.hexToRgba(slot.originalColor),
          hasTransparency: svgCustomizer.current.hasTransparency(slot.originalColor),
        };
      }
      return slot;
    });
    
    // Reset element color map
    const updatedElementColorMap = { ...svgColorData.elementColorMap };
    const resetSlot = updatedSlots.find(slot => slot.id === slotIdToReset);
    if (resetSlot) {
      const { elementPath, colorType } = resetSlot;
      if (updatedElementColorMap[elementPath] && updatedElementColorMap[elementPath][colorType]) {
        updatedElementColorMap[elementPath][colorType].current = resetSlot.originalColor;
      }
    }
    
    // Apply mappings to SVG
    const updatedSvg = applyElementMappings(svgContent, updatedElementColorMap);
    const newColorData = { 
      colorSlots: updatedSlots, 
      elementColorMap: updatedElementColorMap 
    };
    
    setSvgColorData(newColorData);
    
    // Update preview
    const blob = new Blob([updatedSvg], { type: 'image/svg+xml' });
    const newUrl = URL.createObjectURL(blob);
    if (previewIcon && previewIcon.startsWith('blob:')) {
      URL.revokeObjectURL(previewIcon);
    }
    setPreviewIcon(newUrl);
    // Only use upload reference - no fallback to direct URLs
    if (uploadId) {
      const referenceValue = `upload://${uploadId}`;
      onIconChange(referenceValue, updatedSvg, uploadedUrl);
    } else {
      console.error('No upload ID available - cannot reset color');
    }
    onSvgDataChange?.(updatedSvg, newColorData);
  };
  
  /**
   * Trigger file input
   */
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
  
  /**
   * Remove icon
   */
  const handleRemoveIcon = () => {
    if (previewIcon && previewIcon.startsWith('blob:')) {
      URL.revokeObjectURL(previewIcon);
    }
    setPreviewIcon(null);
    setUploadedUrl(null);
    setUploadId(null);
    setSvgContent('');
    setSvgColorData(null);
    setIsSvg(false);
    setFallbackColor('#000000');
    setFallbackAlpha(1);
    onIconChange(null, null, null);
    onSvgDataChange?.(null, null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (previewIcon && previewIcon.startsWith('blob:')) {
        URL.revokeObjectURL(previewIcon);
      }
    };
  }, [previewIcon]);
  
  const isComponentLoading = isLoading || internalLoading;
  
  return (
    <div className="badge-icon-upload">
      <div className="icon-preview-container" style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        {previewIcon ? (
          <>
            <img 
              src={previewIcon} 
              alt="Icon preview" 
              className="icon-image"
              style={{ 
                width: '80px', 
                height: '80px', 
                objectFit: 'contain',
                border: '1px solid #ccc',
                borderRadius: '4px',
                background: '#f5f5f5',
                display: 'block'
              }}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-size="40"%3E?%3C/text%3E%3C/svg%3E';
              }}
            />
            <button
              type="button"
              className="remove-icon-btn"
              onClick={handleRemoveIcon}
              aria-label="Remove icon"
              disabled={isComponentLoading}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '1px solid #ccc',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: '1',
                padding: '0',
                color: '#666',
                marginTop: '0'
              }}
            >
              ✕
            </button>
          </>
        ) : (
          <div className="icon-placeholder" style={{
            width: '80px',
            height: '80px',
            border: '2px dashed #ccc',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9f9f9',
            fontSize: '12px',
            color: '#999'
          }}>
            <span>No Icon</span>
          </div>
        )}
      </div>
      
      <div className="icon-controls">
        <button
          type="button"
          className="upload-icon-btn"
          onClick={handleUploadClick}
          disabled={isComponentLoading}
        >
          {isComponentLoading ? 'Processing...' : (previewIcon ? 'Change Icon' : 'Upload Icon')}
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg, image/png, image/gif, image/webp, image/svg+xml"
          className="file-input"
          disabled={isComponentLoading}
        />
      </div>
      
      {error && <div className="icon-error">{error}</div>}
      
      {/* SVG Color Customization */}
      {isSvg && (
        <div className="svg-color-controls">
          <h4>SVG Color (for currentColor elements):</h4>
          <div className="control-group svg-fallback-color">
            <label>Foreground Color:</label>
            <input 
              type="color" 
              value={fallbackColor}
              onChange={(e) => handleFallbackColorChange(e.target.value, fallbackAlpha)}
              disabled={isComponentLoading}
            />
            <input 
              type="range" 
              min="0" max="1" step="0.01" 
              value={fallbackAlpha}
              onChange={(e) => handleFallbackColorChange(fallbackColor, parseFloat(e.target.value))}
              disabled={isComponentLoading}
            />
            <span>{formatHexWithAlpha(fallbackColor, fallbackAlpha)}</span>
            <small>This color will be applied to currentColor elements</small>
          </div>
          
          {svgColorData && svgColorData.colorSlots.length > 0 && (
            <>
              <h4>Detected SVG Colors:</h4>
              {(() => {
                // Group slots by original color
                const colorGroups = {};
                svgColorData.colorSlots.forEach(slot => {
                  if (!colorGroups[slot.originalColor]) {
                    colorGroups[slot.originalColor] = [];
                  }
                  colorGroups[slot.originalColor].push(slot);
                });
                
                const toggleGroup = (color) => {
                  setExpandedGroups(prev => ({
                    ...prev,
                    [color]: !prev[color]
                  }));
                };
                
                const handleGroupColorChange = (originalColor, newHex, newAlpha) => {
                  // Update all slots with this original color
                  const slotsToUpdate = colorGroups[originalColor];
                  slotsToUpdate.forEach(slot => {
                    handleColorChange(slot.id, newHex, newAlpha);
                  });
                };
                
                const handleResetGroup = (originalColor) => {
                  // Reset all slots with this original color
                  const slotsToReset = colorGroups[originalColor];
                  slotsToReset.forEach(slot => {
                    handleResetColor(slot.id);
                  });
                };
                
                return Object.entries(colorGroups).map(([originalColor, slots], groupIndex) => {
                  // Get current color from first slot in group (they should all be the same)
                  const parsedCurrent = parseColorString(slots[0].currentColor);
                  const currentHex = parsedCurrent.hex;
                  const currentAlpha = parsedCurrent.alpha;
                  const isExpanded = expandedGroups[originalColor];
                  
                  return (
                    <div key={originalColor} className="color-group" style={{ marginBottom: '15px' }}>
                      <div className="color-group-header" style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button 
                            type="button"
                            onClick={() => toggleGroup(originalColor)}
                            style={{
                              background: '#f0f0f0',
                              border: '1px solid #ccc',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '16px',
                              padding: '2px 8px',
                              minWidth: '30px',
                              lineHeight: '1',
                              color: '#4f46e5'
                            }}
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                          <span style={{
                            display: 'inline-block',
                            width: '1.5em',
                            height: '1.5em',
                            backgroundColor: originalColor,
                            border: '2px solid #ccc',
                            borderRadius: '3px'
                          }}></span>
                          <label style={{ fontWeight: 'bold' }}>
                            {originalColor} - {slots.length} element{slots.length > 1 ? 's' : ''}
                          </label>
                        </div>
                        
                        <div className="control-group svg-color-control" style={{ marginTop: '8px', paddingLeft: '30px' }}>
                          <input 
                            type="color" 
                            value={currentHex}
                            onChange={(e) => handleGroupColorChange(originalColor, e.target.value, currentAlpha)}
                            disabled={isComponentLoading}
                          />
                          <input 
                            type="range" 
                            min="0" max="1" step="0.01" 
                            value={currentAlpha}
                            onChange={(e) => handleGroupColorChange(originalColor, currentHex, parseFloat(e.target.value))}
                            disabled={isComponentLoading}
                          />
                          <span className="color-display-hex8">{slots[0].currentColor}</span>
                          <button 
                            type="button" 
                            onClick={() => handleResetGroup(originalColor)} 
                            className="reset-color-btn" 
                            disabled={isComponentLoading}
                          >
                            Reset All
                          </button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="color-group-items" style={{ paddingLeft: '30px', marginTop: '10px' }}>
                          {slots.map((slot, index) => {
                            const slotParsed = parseColorString(slot.currentColor);
                            const slotHex = slotParsed.hex;
                            const slotAlpha = slotParsed.alpha;
                            
                            return (
                              <div key={slot.id} className="control-group svg-color-control" style={{ marginBottom: '8px' }}>
                                <label style={{ fontSize: '14px', color: '#666' }}>
                                  {slot.label}
                                </label>
                                <input 
                                  type="color" 
                                  value={slotHex}
                                  onChange={(e) => handleColorChange(slot.id, e.target.value, slotAlpha)}
                                  disabled={isComponentLoading}
                                  style={{ width: '50px', height: '25px' }}
                                />
                                <input 
                                  type="range" 
                                  min="0" max="1" step="0.01" 
                                  value={slotAlpha}
                                  onChange={(e) => handleColorChange(slot.id, slotHex, parseFloat(e.target.value))}
                                  disabled={isComponentLoading}
                                  style={{ width: '80px' }}
                                />
                                <span style={{ fontSize: '12px' }}>{slot.currentColor}</span>
                                <button 
                                  type="button" 
                                  onClick={() => handleResetColor(slot.id)} 
                                  className="reset-color-btn" 
                                  disabled={isComponentLoading}
                                  style={{ fontSize: '12px', padding: '2px 8px' }}
                                >
                                  Reset
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </>
          )}
        </div>
      )}
      
      <div className="icon-help">
        <small>Upload an icon up to 5MB. SVG files recommended for color customization.</small>
      </div>
    </div>
  );
}

BadgeIconUpload.propTypes = {
  currentIcon: PropTypes.string,
  onIconChange: PropTypes.func.isRequired,
  onSvgDataChange: PropTypes.func,
  isLoading: PropTypes.bool,
  templateSlug: PropTypes.string
};

export default BadgeIconUpload;