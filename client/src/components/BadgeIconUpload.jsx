import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';
import { buildElementColorMap } from '../utils/svgColorAnalysis';
import { applyGradientChanges } from '../utils/svgColorTransform';
import SvgColorCustomization from './SvgColorCustomization';
import BadgeForegroundDisplay from './BadgeForegroundDisplay';

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
  systemIconSvg = null, // New prop for system icon SVG content
  systemIconName = null, // New prop for system icon name
  colorOnlyMode = false, // New prop to hide upload UI and only show color controls
  onIconChange,
  onSvgDataChange,
  onPreviewStateChange, // New prop for parent preview state sync
  isLoading = false,
  templateSlug = 'badge-icon'
}) {
  const [previewIcon, setPreviewIcon] = useState(null);
  const [error, setError] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [previousUploadId, setPreviousUploadId] = useState(null);
  const [isSvg, setIsSvg] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [svgColorData, setSvgColorData] = useState(null);
  const [fallbackColor, setFallbackColor] = useState('#000000');
  const [fallbackAlpha, setFallbackAlpha] = useState(1);
  
  // Preview state for color customization
  const [previewState, setPreviewState] = useState({
    active: false,
    mode: null,
    affectedPaths: [],
    opacity: 1,
    duration: 200
  });
  const [expandedGroups, setExpandedGroups] = useState({});
  const fileInputRef = useRef(null);
  const svgCustomizer = useRef(new SVGColorCustomizer());
  
  // Tab synchronization state
  const [isDiscovering, setIsDiscovering] = useState(false);
  
  /**
   * Discover existing temp upload from server
   */
  const discoverExistingUpload = async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      setIsDiscovering(true);
      const response = await fetch('http://localhost:3000/api/upload/badge-icon/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) return null;
      
      const result = await response.json();
      return result.data.tempAsset;
    } catch (error) {
      console.error('Error discovering existing upload:', error);
      return null;
    } finally {
      setIsDiscovering(false);
    }
  };

  /**
   * Load temp upload into component state
   */
  const loadTempUpload = async (tempAsset) => {
    if (!tempAsset) return;
    
    try {
      setUploadedUrl(tempAsset.hostedUrl);
      setUploadId(tempAsset.id);
      
      const isSvgAsset = tempAsset.metadata?.type === 'svg' || tempAsset.hostedUrl.includes('.svg');
      setIsSvg(isSvgAsset);
      
      let processedSvgContent = null;
      
      if (isSvgAsset && tempAsset.id) {
        // Fetch SVG content through secure proxy instead of direct R2 URL
        const token = localStorage.getItem('token');
        const svgResponse = await fetch(`http://localhost:3000/api/upload/asset/${tempAsset.id}/content`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const svgContent = await svgResponse.text();
        setSvgContent(svgContent);
        processedSvgContent = svgContent;
        
        // Build color map
        const colorMapResult = buildElementColorMap(svgContent);
        const elementColorMap = colorMapResult?.elementColorMap || {};
        const gradientDefinitions = colorMapResult?.gradientDefinitions || {};
        const elementPaths = Object.keys(elementColorMap);
        
        if (elementPaths.length > 0) {
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
                isGradient: elementColors.fill.isGradient || false,
                gradientId: elementColors.fill.gradientId || null,
                rgba: svgCustomizer.current.hexToRgba(
                  elementColors.fill.original === 'UNSPECIFIED' ? '#000000FF' : elementColors.fill.original
                ),
                hasTransparency: svgCustomizer.current.hasTransparency(
                  elementColors.fill.original === 'UNSPECIFIED' ? '#000000FF' : elementColors.fill.original
                )
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
                isGradient: elementColors.stroke.isGradient || false,
                gradientId: elementColors.stroke.gradientId || null,
                rgba: svgCustomizer.current.hexToRgba(
                  elementColors.stroke.original === 'UNSPECIFIED' ? '#000000FF' : elementColors.stroke.original
                ),
                hasTransparency: svgCustomizer.current.hasTransparency(
                  elementColors.stroke.original === 'UNSPECIFIED' ? '#000000FF' : elementColors.stroke.original
                )
              });
            }
          });
          
          const originalGradientDefinitions = JSON.parse(JSON.stringify(gradientDefinitions));
          setSvgColorData({
            colorSlots,
            elementColorMap,
            gradientDefinitions,
            originalGradientDefinitions
          });
          
        }
        
        // Apply initial color transformations for inherited colors
        const hasInheritedColors = Object.values(elementColorMap).some(colors => 
          colors.fill?.isInherited || colors.stroke?.isInherited
        );
        
        if (hasInheritedColors) {
          try {
            const { applySvgColorTransform } = await import('../utils/svgColorTransform');
            const transformedSvg = applySvgColorTransform(svgContent, {
              type: 'customizable-svg',
              version: 1,
              colorMappings: elementColorMap
            });
            
            // Store transformed SVG for preview
            setPreviewIcon(transformedSvg);
            return;
          } catch (error) {
            console.error('Failed to apply initial color transformations:', error);
          }
        }
        
        // Fallback: Store original SVG for preview
        setPreviewIcon(svgContent);
      } else {
        // Regular image - use proxy URL for secure access
        const proxyUrl = `http://localhost:3000/api/upload/asset/${tempAsset.id}/content`;
        setPreviewIcon(proxyUrl);
      }
      
      // Notify parent component about the loaded upload
      const uploadReference = `upload://${tempAsset.id}`;
      onIconChange(uploadReference, processedSvgContent, tempAsset.hostedUrl);
      
      // console.log('Loaded existing temp upload:', tempAsset.id);
    } catch (error) {
      console.error('Error loading temp upload:', error);
    }
  };

  /**
   * Check localStorage for recent sync data
   */
  const checkLocalStorageSync = () => {
    try {
      const syncData = localStorage.getItem('badgeIconPreview');
      if (syncData) {
        const parsed = JSON.parse(syncData);
        // Check if the sync data is recent (less than 1 hour old)
        const isRecent = Date.now() - parsed.timestamp < 60 * 60 * 1000;
        if (isRecent) {
          // console.log('Found recent sync data in localStorage for asset:', parsed.assetId);
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error checking localStorage sync:', error);
    }
    return null;
  };

  /**
   * Store sync data in localStorage for other tabs
   */
  const storeSyncData = (iconUrl, assetId, metadata) => {
    try {
      const syncData = {
        iconUrl,
        assetId,
        timestamp: Date.now(),
        metadata
      };
      localStorage.setItem('badgeIconPreview', JSON.stringify(syncData));
      // console.log('Stored icon sync data in localStorage for asset:', assetId);
    } catch (error) {
      console.error('Error storing sync data:', error);
    }
  };

  // Initialize component: check localStorage first, then server
  useEffect(() => {
    const initializeComponent = async () => {
      // Skip if already have an upload or icon
      if (uploadId || previewIcon || currentIcon) return;
      
      // console.log('Initializing badge icon component...');
      
      // First check localStorage for recent sync
      const localSync = checkLocalStorageSync();
      if (localSync) {
        // console.log('Using localStorage sync data');
        // Quick load from localStorage, but still verify with server
        setUploadedUrl(localSync.iconUrl);
        setUploadId(localSync.assetId);
        // Use proxy URL if we have asset ID, otherwise use direct URL
        const previewUrl = localSync.assetId ? 
          `http://localhost:3000/api/upload/asset/${localSync.assetId}/content` : 
          localSync.iconUrl;
        setPreviewIcon(previewUrl);
      }
      
      // Then check server for authoritative data
      const serverAsset = await discoverExistingUpload();
      if (serverAsset) {
        // console.log('Found existing upload on server, loading...');
        await loadTempUpload(serverAsset);
      }
    };
    
    initializeComponent();
  }, []);

  // Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'badgeIconPreview') {
        // console.log('Storage change detected from another tab');
        try {
          const newSyncData = JSON.parse(e.newValue);
          // console.log('New sync data received from another tab, asset:', newSyncData.assetId);
          
          // Update component state with new data from other tab
          if (newSyncData.assetId !== uploadId) {
            setUploadedUrl(newSyncData.iconUrl);
            setUploadId(newSyncData.assetId);
            // Use proxy URL for secure access
            const previewUrl = `http://localhost:3000/api/upload/asset/${newSyncData.assetId}/content`;
            setPreviewIcon(previewUrl);
            setIsSvg(newSyncData.metadata?.type === 'svg');
            
            // Update parent component with proper SVG content if available
            const uploadReference = `upload://${newSyncData.assetId}`;
            
            if (newSyncData.metadata?.type === 'svg') {
              // For SVG, try to fetch content to pass to parent
              fetch(newSyncData.iconUrl)
                .then(res => res.text())
                .then(svgContent => {
                  setSvgContent(svgContent);
                  onIconChange(uploadReference, svgContent, newSyncData.iconUrl);
                })
                .catch(err => {
                  console.error('Error fetching SVG content for sync:', err);
                  onIconChange(uploadReference, null, newSyncData.iconUrl);
                });
            } else {
              onIconChange(uploadReference, null, newSyncData.iconUrl);
            }
            
            // Reset SVG state initially (will be set properly above if needed)
            setSvgContent('');
            setSvgColorData(null);
            
            // console.log('Updated component state from other tab');
          }
        } catch (error) {
          console.error('Error handling storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [uploadId, onIconChange]);

  // Initialize preview from current icon (legacy support)
  useEffect(() => {
    if (currentIcon && currentIcon.includes('.svg')) {
      setIsSvg(true);
      // Fetch SVG content if it's an SVG URL
      fetch(currentIcon)
        .then(res => res.text())
        .then(svg => {
          setSvgContent(svg);
          // Use element-based color mapping
          const colorMapResult = buildElementColorMap(svg);
          const elementColorMap = colorMapResult?.elementColorMap || {};
          const gradientDefinitions = colorMapResult?.gradientDefinitions || {};
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
            
            const originalGradientDefinitions = JSON.parse(JSON.stringify(gradientDefinitions));
            setSvgColorData({
              colorSlots,
              elementColorMap,
              gradientDefinitions,
              originalGradientDefinitions
            });
          }
        })
        .catch(err => console.error('Error fetching SVG:', err));
    }
  }, [currentIcon]);

  // Handle system icon SVG input
  useEffect(() => {
    if (systemIconSvg && systemIconName) {
      setIsSvg(true);
      setSvgContent(systemIconSvg);
      
      // Use element-based color mapping
      const colorMapResult = buildElementColorMap(systemIconSvg);
      const elementColorMap = colorMapResult?.elementColorMap || {};
      const gradientDefinitions = colorMapResult?.gradientDefinitions || {};
      const elementPaths = Object.keys(elementColorMap);
      
      if (elementPaths.length > 0) {
        // Convert to display format for UI
        const colorSlots = [];
        elementPaths.forEach(path => {
          const elementColors = elementColorMap[path];
          
          if (elementColors.fill && !elementColors.fill.isGradient) {
            colorSlots.push({
              id: `${path}-fill`,
              label: `${path} (fill)`,
              originalColor: elementColors.fill.original,
              currentColor: elementColors.fill.current,
              elementPath: path,
              colorType: 'fill',
              rgba: svgCustomizer.current.hexToRgba(
                elementColors.fill.original === 'UNSPECIFIED' ? '#000000FF' : elementColors.fill.original
              ),
              hasTransparency: svgCustomizer.current.hasTransparency(
                elementColors.fill.original === 'UNSPECIFIED' ? '#000000FF' : elementColors.fill.original
              )
            });
          } else if (elementColors.fill && elementColors.fill.isGradient) {
            // Add gradient info but mark it as non-customizable
            colorSlots.push({
              id: `${path}-fill`,
              label: `${path} (gradient fill)`,
              originalColor: 'GRADIENT',
              currentColor: elementColors.fill.current,
              elementPath: path,
              colorType: 'fill',
              isGradient: true,
              cannotCustomize: true
            });
          }
          
          if (elementColors.stroke && !elementColors.stroke.isGradient) {
            colorSlots.push({
              id: `${path}-stroke`,
              label: `${path} (stroke)`,
              originalColor: elementColors.stroke.original,
              currentColor: elementColors.stroke.current,
              elementPath: path,
              colorType: 'stroke',
              rgba: svgCustomizer.current.hexToRgba(
                elementColors.stroke.original === 'UNSPECIFIED' ? '#000000FF' : elementColors.stroke.original
              ),
              hasTransparency: svgCustomizer.current.hasTransparency(
                elementColors.stroke.original === 'UNSPECIFIED' ? '#000000FF' : elementColors.stroke.original
              )
            });
          } else if (elementColors.stroke && elementColors.stroke.isGradient) {
            // Add gradient info but mark it as non-customizable
            colorSlots.push({
              id: `${path}-stroke`,
              label: `${path} (gradient stroke)`,
              originalColor: 'GRADIENT',
              currentColor: elementColors.stroke.current,
              elementPath: path,
              colorType: 'stroke',
              isGradient: true,
              cannotCustomize: true
            });
          }
        });
        
        const originalGradientDefinitions = JSON.parse(JSON.stringify(gradientDefinitions));
        setSvgColorData({
          colorSlots,
          elementColorMap,
          gradientDefinitions,
          originalGradientDefinitions
        });
      }
      
      // Store system icon SVG for preview
      setPreviewIcon(systemIconSvg);
      
      // Notify parent component about the system icon
      onIconChange(`system://${systemIconName}`, systemIconSvg, null);
    } else {
      // Clear system icon data when no system icon is provided
      if (!currentIcon && !uploadedUrl) {
        setIsSvg(false);
        setSvgContent('');
        setSvgColorData(null);
        setPreviewIcon(null);
      }
    }
  }, [systemIconSvg, systemIconName, onIconChange]);
  
  /**
   * Delete a temporary upload
   */
  const deleteTempUpload = async (assetId) => {
    if (!assetId) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/upload/badge-icon/${assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // console.log('Deleted previous temp upload:', assetId);
      } else if (response.status === 404) {
        console.log('Previous temp upload already deleted:', assetId);
      } else {
        console.warn('Failed to delete previous upload:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to delete previous upload:', error);
      // Don't block on cleanup errors
    }
  };

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
   * Convert any color format to normalized HEX8 format
   */
  const parseAndNormalizeColor = (colorString) => {
    if (!colorString || colorString === 'none' || colorString === 'transparent') {
      return null;
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
    
    // Check file size (2MB limit for badge icons)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 2MB for badge icons.');
      return;
    }
    
    try {
      setInternalLoading(true);
      setIsSvg(isSvgFile);
      
      // Delete previous temp upload if exists
      if (previousUploadId) {
        await deleteTempUpload(previousUploadId);
        setPreviousUploadId(null);
      }
      
      if (isSvgFile) {
        // Read SVG and analyze colors BEFORE processing
        const svgText = await readFileAsText(file);
        
        // Build element-based color map from original SVG
        const colorMapResult = buildElementColorMap(svgText);
        const elementColorMap = colorMapResult?.elementColorMap || {};
        console.log('Element color map:', elementColorMap);
        console.log('Original SVG:', svgText);
        
        // Debug: Check for unspecified colors
        Object.entries(elementColorMap).forEach(([path, colors]) => {
          if (colors.fill?.original === 'UNSPECIFIED') {
            console.log(`UNSPECIFIED fill found at ${path}, current:`, colors.fill.current);
          }
          if (colors.stroke?.original === 'UNSPECIFIED') {
            console.log(`UNSPECIFIED stroke found at ${path}, current:`, colors.stroke.current);
          }
        });
        
        // Now process the SVG (adds currentColor to unfilled elements)
        const processedSvg = processSvg(svgText);
        setSvgContent(processedSvg);
        const elementPaths = Object.keys(elementColorMap);
        console.log('Element paths found:', elementPaths);
        
        let finalColorData = null; // Store the final color data to pass to parent
        
        if (elementPaths.length > 0) {
          // Convert to display format for UI
          const colorSlots = [];
          elementPaths.forEach(path => {
            const elementColors = elementColorMap[path];
            console.log('File upload - Processing path:', path, 'colors:', elementColors);
            
            if (elementColors.fill) {
              colorSlots.push({
                id: `${path}-fill`,
                label: `${path} (fill)`,
                originalColor: elementColors.fill.original,
                currentColor: elementColors.fill.current,
                elementPath: path,
                colorType: 'fill',
                isGradient: elementColors.fill.isGradient || false,
                gradientId: elementColors.fill.gradientId || null,
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
                isGradient: elementColors.stroke.isGradient || false,
                gradientId: elementColors.stroke.gradientId || null,
                rgba: svgCustomizer.current.hexToRgba(elementColors.stroke.original),
                hasTransparency: svgCustomizer.current.hasTransparency(elementColors.stroke.original)
              });
            }
          });
          
          const gradientDefinitions = colorMapResult?.gradientDefinitions || {};
          const originalGradientDefinitions = JSON.parse(JSON.stringify(gradientDefinitions)); // Deep copy originals
          const colorData = {
            colorSlots,
            elementColorMap, // Store the structured map for API generation
            gradientDefinitions,
            originalGradientDefinitions
          };
          console.log('File upload setting svgColorData with gradientDefinitions:', gradientDefinitions);
          console.log('colorSlots being set:', colorSlots);
          console.log('First slot details:', colorSlots[0]);
          setSvgColorData(colorData);
          finalColorData = colorData; // Store for parent notification
        } else {
          setSvgColorData(null);
          finalColorData = null;
        }
        
        // Upload SVG to R2 as temporary asset - must succeed before updating parent
        const uploadResponse = await uploadToR2(file);
        const uploadedUrl = uploadResponse.data.iconUrl;
        const assetId = uploadResponse.data.assetId; // Get the upload ID
        console.log('Asset uploaded successfully. Reference:', `upload://${assetId}`);
        
        // Now that upload succeeded, notify parent component about SVG data
        // Use the fresh finalColorData that was just created above
        onSvgDataChange?.(processedSvg, finalColorData);
        
        // Store sync data for other tabs (metadata is defined below)
        const syncMetadata = {
          type: 'svg',
          extractedColors: [], // Will be populated by frontend
          hasCurrentColor: processedSvg.includes('currentColor'),
          dimensions: { width: 100, height: 100 }, // Parse from SVG
          fileSize: file.buffer?.length || file.size
        };
        storeSyncData(uploadedUrl, assetId, syncMetadata);
        
        // Apply initial color transformations for inherited colors
        const hasInheritedColors = Object.values(elementColorMap).some(colors => 
          colors.fill?.isInherited || colors.stroke?.isInherited
        );
        
        if (hasInheritedColors) {
          try {
            const { applySvgColorTransform } = await import('../utils/svgColorTransform');
            const transformedSvg = applySvgColorTransform(processedSvg, {
              type: 'customizable-svg',
              version: 1,
              colorMappings: elementColorMap
            });
            
            // Create preview from transformed SVG
            const blob = new Blob([transformedSvg], { type: 'image/svg+xml' });
            const previewUrl = URL.createObjectURL(blob);
            setPreviewIcon(previewUrl);
          } catch (error) {
            console.error('Failed to apply initial color transformations:', error);
            // Fallback to original
            const blob = new Blob([processedSvg], { type: 'image/svg+xml' });
            const previewUrl = URL.createObjectURL(blob);
            setPreviewIcon(previewUrl);
          }
        } else {
          // Create preview URL for display
          const blob = new Blob([processedSvg], { type: 'image/svg+xml' });
          const previewUrl = URL.createObjectURL(blob);
          setPreviewIcon(previewUrl);
        }
        setUploadedUrl(uploadedUrl);
        setUploadId(assetId);
        setPreviousUploadId(assetId); // Track for cleanup on next upload
        
        // Pass upload reference for API usage, but also store the actual URL for display
        const uploadReference = `upload://${assetId}`;
        onIconChange(uploadReference, processedSvg, uploadedUrl); // Pass upload reference for API, SVG content, and URL for display
      } else {
        // Regular image upload
        setSvgContent('');
        setSvgColorData(null);
        
        // Upload to R2 as temporary asset - must succeed before updating parent
        const uploadResponse = await uploadToR2(file);
        const uploadedUrl = uploadResponse.data.iconUrl;
        const assetId = uploadResponse.data.assetId;
        
        // Now that upload succeeded, notify parent component
        onSvgDataChange?.(null, null);
        
        // Store sync data for other tabs
        storeSyncData(uploadedUrl, assetId, { type: 'image' });
        
        setPreviewIcon(uploadedUrl);
        setUploadedUrl(uploadedUrl);
        setUploadId(assetId);
        setPreviousUploadId(assetId); // Track for cleanup on next upload
        
        // Pass upload reference for API usage, but also the actual URL for display
        const uploadReference = `upload://${assetId}`;
        onIconChange(uploadReference, null, uploadedUrl);
      }
    } catch (err) {
      console.error('Error handling file:', err);
      setError(err.message || 'Failed to process icon. Please try again.');
      // Reset state on upload failure to prevent showing misleading preview
      setPreviewIcon(null);
      setSvgContent('');
      setSvgColorData(null);
      setIsSvg(false);
      setUploadedUrl(null);
      setUploadId(null);
      // Reset parent component state too
      onIconChange(null, null, null);
      onSvgDataChange?.(null, null);
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
    
    // Store updated SVG for preview
    setPreviewIcon(updatedSvg);
    // Only use upload reference - no fallback to direct URLs
    if (uploadId) {
      const referenceValue = `upload://${uploadId}`;
      onIconChange(referenceValue, updatedSvg, uploadedUrl);
    } else {
      console.error('No upload ID available - cannot update icon');
      // Don't expose direct URLs
    }
    onSvgDataChange?.(updatedSvg, svgColorData);
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
    // Remove class attribute if it exists to prevent CSS class rules from overriding
    if (element.hasAttribute('class')) {
      element.removeAttribute('class');
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
    
    // Store updated SVG for preview
    setPreviewIcon(updatedSvg);
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
        // For unspecified colors, reset to black instead of the 'UNSPECIFIED' string
        const resetColor = slot.originalColor === 'UNSPECIFIED' ? '#000000FF' : slot.originalColor;
        return {
          ...slot,
          currentColor: resetColor,
          rgba: svgCustomizer.current.hexToRgba(resetColor),
          hasTransparency: svgCustomizer.current.hasTransparency(resetColor),
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
        // For unspecified colors, reset to black instead of the 'UNSPECIFIED' string
        const resetColor = resetSlot.originalColor === 'UNSPECIFIED' ? '#000000FF' : resetSlot.originalColor;
        updatedElementColorMap[elementPath][colorType].current = resetColor;
      }
    }
    
    // Apply mappings to SVG
    const updatedSvg = applyElementMappings(svgContent, updatedElementColorMap);
    const newColorData = { 
      colorSlots: updatedSlots, 
      elementColorMap: updatedElementColorMap 
    };
    
    setSvgColorData(newColorData);
    
    // Store updated SVG for preview
    setPreviewIcon(updatedSvg);
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

  // Cleanup temp upload on unmount
  useEffect(() => {
    return () => {
      // Cleanup on unmount if there's an unsaved upload
      if (uploadId) {
        const token = localStorage.getItem('token');
        if (token) {
          // Use sendBeacon for reliable unmount cleanup
          const payload = JSON.stringify({
            assetId: uploadId,
            authToken: token
          });
          navigator.sendBeacon(
            'http://localhost:3000/api/upload/badge-icon-beacon',
            new Blob([payload], { type: 'application/json' })
          );
        }
      }
    };
  }, [uploadId]);
  
  const isComponentLoading = isLoading || internalLoading || isDiscovering;
  
  return (
    <div className="badge-icon-upload">
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="icon-preview-container" style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <BadgeForegroundDisplay 
          content={previewIcon}
          isSvg={isSvg}
          colorData={svgColorData}
          size={80}
          alt="Icon preview"
          previewState={previewState}
          placeholder="No Icon"
        />
        {/* Only show remove button when not in color-only mode and we have an icon */}
        {!colorOnlyMode && previewIcon && (
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
        )}
        </div>
      </div>
      
      {/* Only show upload controls when not in color-only mode */}
      {!colorOnlyMode && (
        <>
          <div className="icon-controls" style={{ textAlign: 'center' }}>
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
          
          <div className="icon-help" style={{ textAlign: 'center' }}>
            <small>Upload an icon up to 2MB. SVG files recommended for color customization.</small>
          </div>
        </>
      )}
      
      {error && <div className="icon-error">{error}</div>}
      
      {/* SVG Color Customization */}
      {isSvg && svgColorData && svgColorData.elementColorMap && (
        <SvgColorCustomization
          title="SVG Color Customization"
          elementColorMap={svgColorData.elementColorMap}
          colorSlots={svgColorData.colorSlots}
          gradientDefinitions={svgColorData.gradientDefinitions || {}}
          originalGradientDefinitions={svgColorData.originalGradientDefinitions || {}}
          onPreviewStateChange={(previewState) => {
            // Update local state for left column preview
            setPreviewState(previewState);
            // Also notify parent for right column preview
            if (onPreviewStateChange) {
              onPreviewStateChange(previewState);
            }
          }}
          onColorChange={(updatedColorMap, updatedGradientDefinitions) => {
            if (!svgContent) return;
            
            // Apply mappings to SVG - need to handle gradient updates if provided
            let updatedSvg = svgContent;
            
            if (updatedGradientDefinitions) {
              // Apply gradient changes first
              updatedSvg = applyGradientChanges(svgContent, updatedGradientDefinitions);
            }
            
            // Then apply element color mappings
            updatedSvg = applyElementMappings(updatedSvg, updatedColorMap);
            
            // Regenerate colorSlots with updated current colors
            const updatedColorSlots = [];
            Object.keys(updatedColorMap).forEach(path => {
              const elementColors = updatedColorMap[path];
              
              if (elementColors.fill) {
                updatedColorSlots.push({
                  id: `${path}-fill`,
                  label: `${path} (fill)`,
                  originalColor: elementColors.fill.original,
                  currentColor: elementColors.fill.current, // This will be the updated color
                  elementPath: path,
                  colorType: 'fill',
                  isGradient: elementColors.fill.isGradient || false,
                  gradientId: elementColors.fill.gradientId || null,
                  rgba: svgCustomizer.current.hexToRgba(
                    elementColors.fill.original === 'UNSPECIFIED' ? '#000000FF' : elementColors.fill.original
                  ),
                  hasTransparency: svgCustomizer.current.hasTransparency(
                    elementColors.fill.original === 'UNSPECIFIED' ? '#000000FF' : elementColors.fill.original
                  )
                });
              }
              
              if (elementColors.stroke) {
                updatedColorSlots.push({
                  id: `${path}-stroke`,
                  label: `${path} (stroke)`,
                  originalColor: elementColors.stroke.original,
                  currentColor: elementColors.stroke.current, // This will be the updated color
                  elementPath: path,
                  colorType: 'stroke',
                  isGradient: elementColors.stroke.isGradient || false,
                  gradientId: elementColors.stroke.gradientId || null,
                  rgba: svgCustomizer.current.hexToRgba(
                    elementColors.stroke.original === 'UNSPECIFIED' ? '#000000FF' : elementColors.stroke.original
                  ),
                  hasTransparency: svgCustomizer.current.hasTransparency(
                    elementColors.stroke.original === 'UNSPECIFIED' ? '#000000FF' : elementColors.stroke.original
                  )
                });
              }
            });

            // Update color data
            setSvgColorData(prev => {
              // If we have new gradients (from cloning), add their originals too
              let updatedOriginalGradientDefs = prev.originalGradientDefinitions;
              if (updatedGradientDefinitions) {
                updatedOriginalGradientDefs = { ...prev.originalGradientDefinitions };
                Object.keys(updatedGradientDefinitions).forEach(gradId => {
                  // If this is a new gradient (not in originals), add it
                  if (!updatedOriginalGradientDefs[gradId]) {
                    updatedOriginalGradientDefs[gradId] = JSON.parse(JSON.stringify(updatedGradientDefinitions[gradId]));
                  }
                });
              }
              
              return {
                ...prev,
                elementColorMap: updatedColorMap,
                colorSlots: updatedColorSlots, // Update colorSlots with fresh current colors
                gradientDefinitions: updatedGradientDefinitions || prev.gradientDefinitions,
                originalGradientDefinitions: updatedOriginalGradientDefs
              };
            });
            
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
            onSvgDataChange?.(updatedSvg, { ...svgColorData, elementColorMap: updatedColorMap });
          }}
        />
      )}
    </div>
  );
}

BadgeIconUpload.propTypes = {
  currentIcon: PropTypes.string,
  onIconChange: PropTypes.func.isRequired,
  onSvgDataChange: PropTypes.func,
  onPreviewStateChange: PropTypes.func,
  isLoading: PropTypes.bool,
  templateSlug: PropTypes.string
};

export default BadgeIconUpload;