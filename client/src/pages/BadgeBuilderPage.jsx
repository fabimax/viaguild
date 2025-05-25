import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import BadgeDisplay from '../components/guilds/BadgeDisplay'; // Corrected path
import SystemIconService from '../services/systemIcon.service'; // Import new service
import './BadgeBuilderPage.css';

// Mimic enums for dropdowns - in a real app, these might come from a shared source or constants file
const BadgeShape = { CIRCLE: 'CIRCLE', SQUARE: 'SQUARE', STAR: 'STAR', HEXAGON: 'HEXAGON', HEART: 'HEART' };
const BackgroundContentType = { SOLID_COLOR: 'SOLID_COLOR', HOSTED_IMAGE: 'HOSTED_IMAGE' };
const ForegroundContentType = { TEXT: 'TEXT', SYSTEM_ICON: 'SYSTEM_ICON', UPLOADED_ICON: 'UPLOADED_ICON', CUSTOM_SVG: 'CUSTOM_SVG' };

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

// Client-side SVG formatting function (mimics server-side)
const formatSvgString = (svgString) => {
  if (typeof svgString !== 'string') return '';
  return svgString
    .replace(/\n/g, "")        // Remove all newline characters
    .replace(/\r/g, "")        // Remove all carriage return characters
    .replace(/\s+/g, " ")       // Replace one or more whitespace characters with a single space
    .replace(/>\s+</g, "><")    // Remove all whitespace between a closing tag (>) and an opening tag (<)
    .trim();                    // Remove whitespace from both ends
};

// SVGColorCustomizer Class (from user prompt)
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
      console.warn('Invalid hex8 for hexToRgba:', hex8); return { r:0,g:0,b:0,a:1 };
    }
    return {
      r: parseInt(hex8.slice(1, 3), 16),
      g: parseInt(hex8.slice(3, 5), 16),
      b: parseInt(hex8.slice(5, 7), 16),
      a: parseFloat((parseInt(hex8.slice(7, 9), 16) / 255).toFixed(2))
    };
  }
  rgbaToHex(rgba) {
    const { r, g, b, a } = rgba;
    const hex = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
    const alphaHex = Math.round(Math.max(0, Math.min(1, parseFloat(a))) * 255).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}${alphaHex}`.toUpperCase();
  }
  hasTransparency(hex8) {
    if (hex8.length !== 9) return false;
    const alpha = parseInt(hex8.slice(7, 9), 16) / 255;
    return alpha < 1.0;
  }
  replaceColor(svgString, oldNormalizedHex8, newHex8) {
    let tempSvgString = svgString;
    const newColorToApply = newHex8.toUpperCase();
    const patternsToTry = [];

    patternsToTry.push(oldNormalizedHex8);
    if (oldNormalizedHex8.endsWith('FF')) {
      const hex6 = oldNormalizedHex8.substring(0, 7);
      patternsToTry.push(hex6); 
      const r = hex6[1]; const g = hex6[3]; const b = hex6[5];
      if (r === hex6[2] && g === hex6[4] && b === hex6[6]) {
        patternsToTry.push(`#${r}${g}${b}`);
      }
    }

    for (const pattern of patternsToTry) {
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const colorRegex = new RegExp(escapedPattern + '(?![0-9a-fA-F])', 'gi'); 
      
      const originalTempSvgString = tempSvgString; 
      tempSvgString = tempSvgString.replace(colorRegex, newColorToApply);
    }
    return tempSvgString;
  }
  replaceMultipleColors(svgString, colorMap) {
    let updatedSvg = svgString;
    Object.entries(colorMap).forEach(([oldColor, newColor]) => {
      updatedSvg = this.replaceColor(updatedSvg, oldColor, newColor);
    });
    return updatedSvg;
  }
  generateColorCustomizationData(svgString) {
    if (typeof svgString !== 'string' || !svgString.trim()) {
        return { originalSvg: svgString || '', detectedColors: [], colorSlots: [] };
    }
    const colors = this.extractColors(svgString);
    return {
      originalSvg: svgString,
      detectedColors: colors,
      colorSlots: colors.map((color, index) => {
        const rgba = this.hexToRgba(color);
        const hasAlpha = this.hasTransparency(color);
        return {
          id: `custom-color-${index}`,
          label: `SVG Color ${index + 1}`,
          originalColor: color,
          currentColor: color, 
          previewColor: color, 
          rgba: rgba, 
          hasTransparency: hasAlpha
        };
      })
    };
  }
  previewWithNewColors(originalSvg, colorSlots) {
    if (!originalSvg || !colorSlots) return originalSvg || '';
    const colorMap = {};
    colorSlots.forEach(slot => {
      if (slot.originalColor !== slot.currentColor) {
        colorMap[slot.originalColor] = slot.currentColor;
      }
    });
    return this.replaceMultipleColors(originalSvg, colorMap);
  }
}

// New SVG Preprocessor function
const preprocessAndBeautifySvg = (svgString) => {
  if (typeof svgString !== 'string' || !svgString.trim()) return '';

  let processedString = formatSvgString(svgString); // First, normalize whitespace

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(processedString, "image/svg+xml");
    const svgElement = doc.documentElement;

    const parserError = svgElement.querySelector('parsererror');
    if (parserError) {
      console.error("SVG parsing error:", parserError.textContent);
      return processedString; 
    }

    const shapeElements = svgElement.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon');
    
    shapeElements.forEach(el => {
      // Only add fill="currentColor" if the element has NO fill attribute at all.
      // If it has fill="none" or an explicit color, leave it for SVGColorCustomizer or to be as intended.
      if (!el.hasAttribute('fill')) { 
        el.setAttribute('fill', 'currentColor');
      }
      
      // DO NOT add default strokes if they don't exist, to preserve original appearance.
      // SVGColorCustomizer will pick up existing stroke colors if they are hex.
    });

    const serializer = new XMLSerializer();
    processedString = serializer.serializeToString(svgElement);
    
  } catch (e) {
    console.error("Error during SVG preprocessing:", e);
    return formatSvgString(svgString); 
  }
  return processedString;
};

const BadgeBuilderPage = () => {
  const [badgeProps, setBadgeProps] = useState({
    name: 'SVG Custom Badge',
    subtitle: 'Color Editable',
    shape: BadgeShape.SQUARE, // Default to square for custom SVG visibility
    borderColor: '#4A5568FF', // Opaque slate
    backgroundType: BackgroundContentType.SOLID_COLOR,
    backgroundValue: '#EDF2F7FF', // Opaque light gray
    foregroundType: ForegroundContentType.CUSTOM_SVG,
    // Default to a simple SVG for CUSTOM_SVG mode initially
    foregroundValue: '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="16" height="16" rx="2" fill="#FF0000FF" stroke="#0000FF80" stroke-width="1"/></svg>',
    foregroundColor: '#000000FF', // Default for TEXT, may not apply to CUSTOM_SVG if colors are embedded
  });

  // Initialize local states from badgeProps
  const initialBorder = parseColorString(badgeProps.borderColor);
  const [borderColorHex, setBorderColorHex] = useState(initialBorder.hex);
  const [borderColorAlpha, setBorderColorAlpha] = useState(initialBorder.alpha);

  const initialBackground = parseColorString(badgeProps.backgroundValue); // Assuming solid color initially
  const [backgroundSolidColorHex, setBackgroundSolidColorHex] = useState(initialBackground.hex);
  const [backgroundSolidColorAlpha, setBackgroundSolidColorAlpha] = useState(initialBackground.alpha);

  const initialForeground = parseColorString(badgeProps.foregroundColor);
  const [foregroundColorHex, setForegroundColorHex] = useState(initialForeground.hex);
  const [foregroundColorAlpha, setForegroundColorAlpha] = useState(initialForeground.alpha);

  // NEW state for SVG color customization
  const [svgCustomizerInstance] = useState(() => new SVGColorCustomizer());
  const [originalCustomSvg, setOriginalCustomSvg] = useState(() => 
    badgeProps.foregroundType === ForegroundContentType.CUSTOM_SVG ? preprocessAndBeautifySvg(badgeProps.foregroundValue) : ''
  );
  const [svgColorData, setSvgColorData] = useState(null);
  
  const [displayableForegroundSvg, setDisplayableForegroundSvg] = useState(null);
  const [isLoadingSvg, setIsLoadingSvg] = useState(false);

  // Update badgeProps.borderColor when local hex/alpha change
  useEffect(() => {
    setBadgeProps(prev => ({ ...prev, borderColor: formatHexWithAlpha(borderColorHex, borderColorAlpha) }));
  }, [borderColorHex, borderColorAlpha]);

  // Update badgeProps.backgroundValue when local hex/alpha for solid color change
  useEffect(() => {
    if (badgeProps.backgroundType === BackgroundContentType.SOLID_COLOR) {
      setBadgeProps(prev => ({ ...prev, backgroundValue: formatHexWithAlpha(backgroundSolidColorHex, backgroundSolidColorAlpha) }));
    }
  }, [backgroundSolidColorHex, backgroundSolidColorAlpha, badgeProps.backgroundType]);

  // Update badgeProps.foregroundColor when local hex/alpha change
  useEffect(() => {
    setBadgeProps(prev => ({ ...prev, foregroundColor: formatHexWithAlpha(foregroundColorHex, foregroundColorAlpha) }));
  }, [foregroundColorHex, foregroundColorAlpha]);

  // Effect to parse Custom SVG when foregroundValue or type changes
  useEffect(() => {
    if (badgeProps.foregroundType === ForegroundContentType.CUSTOM_SVG) {
      const processedInputSvg = preprocessAndBeautifySvg(badgeProps.foregroundValue);
      
      // Only re-parse if the truly processed input string has changed
      if (processedInputSvg !== originalCustomSvg) {
        setOriginalCustomSvg(processedInputSvg);
        const data = svgCustomizerInstance.generateColorCustomizationData(processedInputSvg);
        setSvgColorData(data); // This will trigger the preview update effect
      } else if (svgColorData) {
        // If input string is same, but colors might have changed via pickers, force preview update
        // This is now primarily handled by the effect that depends on svgColorData directly
      }
    } else {
      setSvgColorData(null); 
      setOriginalCustomSvg('');
    }
  }, [badgeProps.foregroundType, badgeProps.foregroundValue, svgCustomizerInstance, originalCustomSvg]);

  // Effect to update preview when custom SVG colors are changed by the user OR when originalCustomSvg (processed) is set
  useEffect(() => {
    if (badgeProps.foregroundType === ForegroundContentType.CUSTOM_SVG && originalCustomSvg) {
      // If svgColorData is freshly generated, use its initial slots
      // If svgColorData exists (meaning colors might have been picked), use its current slots
      const colorSlotsToUse = svgColorData ? svgColorData.colorSlots : svgCustomizerInstance.generateColorCustomizationData(originalCustomSvg).colorSlots;
      const previewSvg = svgCustomizerInstance.previewWithNewColors(originalCustomSvg, colorSlotsToUse);
      setDisplayableForegroundSvg(previewSvg);
    } 
    // No else here, SYSTEM_ICON and TEXT handled in different effect
  }, [badgeProps.foregroundType, originalCustomSvg, svgColorData, svgCustomizerInstance]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'borderColorHex') setBorderColorHex(value);
    else if (name === 'borderColorAlpha') setBorderColorAlpha(parseFloat(value));
    else if (name === 'backgroundSolidColorHex') setBackgroundSolidColorHex(value);
    else if (name === 'backgroundSolidColorAlpha') setBackgroundSolidColorAlpha(parseFloat(value));
    else if (name === 'foregroundColorHex') setForegroundColorHex(value);
    else if (name === 'foregroundColorAlpha') setForegroundColorAlpha(parseFloat(value));
    else if (name === 'backgroundType' && value === BackgroundContentType.HOSTED_IMAGE) {
        // When switching to image, if current backgroundValue is a color, provide a placeholder URL
        if (badgeProps.backgroundValue.startsWith('#')) {
            setBadgeProps(prev => ({ ...prev, backgroundType: value, backgroundValue: 'https://picsum.photos/seed/badgebg/100/100' }));
        } else {
            setBadgeProps(prev => ({ ...prev, backgroundType: value }));
        }
    } else if (name === 'backgroundType' && value === BackgroundContentType.SOLID_COLOR) {
        // When switching to solid color, re-initialize from current hex/alpha for solid background
        const currentSolidRgba = formatHexWithAlpha(backgroundSolidColorHex, backgroundSolidColorAlpha);
        setBadgeProps(prev => ({ ...prev, backgroundType: value, backgroundValue: currentSolidRgba }));
    } else {
      setBadgeProps(prev => ({ ...prev, [name]: value }));
    }
  };

  // Effect to reset foregroundValue or suggest defaults when foregroundType changes
  useEffect(() => {
    const newType = badgeProps.foregroundType;
    setBadgeProps(prev => {
      let currentFgValue = prev.foregroundValue;
      let changed = false;
      if (newType === ForegroundContentType.TEXT) {
        if (typeof currentFgValue !== 'string' || currentFgValue.includes('<') || currentFgValue.length > 10) {
          currentFgValue = (prev.name || 'T').charAt(0);
          changed = true;
        }
      } else if (newType === ForegroundContentType.SYSTEM_ICON) {
        if (typeof currentFgValue !== 'string' || currentFgValue.includes('<') || currentFgValue.length < 2) {
          currentFgValue = 'Shield';
          changed = true;
        }
      } else if (newType === ForegroundContentType.UPLOADED_ICON) {
        if (typeof currentFgValue !== 'string' || !currentFgValue.includes('/') || currentFgValue.includes('<')) {
          currentFgValue = 'https://picsum.photos/seed/badgeicon/60/60';
          changed = true;
        }
      } else if (newType === ForegroundContentType.CUSTOM_SVG) {
        if (typeof currentFgValue !== 'string' || !currentFgValue.includes('<') || !currentFgValue.includes('svg')) {
          currentFgValue = '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="16" height="16" rx="2" fill="#FF0000FF" stroke="#0000FF80" stroke-width="1"/></svg>';
          changed = true;
        }
      }
      if (changed) return { ...prev, foregroundValue: currentFgValue }; return prev;
    });
  }, [badgeProps.foregroundType, badgeProps.name]);

  // Effect to fetch System Icon SVG or set Custom SVG for display
  useEffect(() => {
    if (badgeProps.foregroundType === ForegroundContentType.SYSTEM_ICON && badgeProps.foregroundValue) {
      setIsLoadingSvg(true);
      SystemIconService.getSystemIconSvg(badgeProps.foregroundValue)
        .then(svgString => {
          setDisplayableForegroundSvg(svgString);
        })
        .catch(err => {
          console.error('Failed to fetch system icon for builder:', err);
          setDisplayableForegroundSvg('<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>');
        })
        .finally(() => setIsLoadingSvg(false));
    } else if (badgeProps.foregroundType === ForegroundContentType.CUSTOM_SVG ) {
      if (originalCustomSvg && (!svgColorData || badgeProps.foregroundValue === originalCustomSvg)) { 
         const data = svgCustomizerInstance.generateColorCustomizationData(originalCustomSvg);
         setSvgColorData(data);
         // Use previewWithNewColors to apply current color slot choices to the original/formatted SVG
         const previewSvg = svgCustomizerInstance.previewWithNewColors(originalCustomSvg, data.colorSlots);
         setDisplayableForegroundSvg(previewSvg);
      } else if (svgColorData && originalCustomSvg) { 
         const previewSvg = svgCustomizerInstance.previewWithNewColors(originalCustomSvg, svgColorData.colorSlots);
         setDisplayableForegroundSvg(previewSvg);
      }
      setIsLoadingSvg(false);
    } else {
      setDisplayableForegroundSvg(null);
      setIsLoadingSvg(false);
    }
  }, [badgeProps.foregroundType, badgeProps.foregroundValue, svgCustomizerInstance, originalCustomSvg, svgColorData]);

  const handleCustomSvgColorChange = (slotId, newColorHex, newAlpha) => {
    if (!svgColorData) return;
    const parsedAlpha = parseFloat(newAlpha);
    if (isNaN(parsedAlpha)) {
      return;
    }
    const newFormattedColor = formatHexWithAlpha(newColorHex, parsedAlpha);
    const newRgbaFromHexAlpha = svgCustomizerInstance.hexToRgba(newFormattedColor);

    const updatedSlots = svgColorData.colorSlots.map(slot =>
      slot.id === slotId ? { 
          ...slot, 
          currentColor: newFormattedColor, 
          rgba: newRgbaFromHexAlpha,
          hasTransparency: parsedAlpha < 1 
        } : slot
    );
    setSvgColorData(prevData => ({ ...prevData, colorSlots: updatedSlots }));
  };

  // New function to reset a specific SVG color slot to its original
  const handleResetCustomSvgColor = (slotIdToReset) => {
    if (!svgColorData) return;

    const updatedSlots = svgColorData.colorSlots.map(slot => {
      if (slot.id === slotIdToReset) {
        return {
          ...slot,
          currentColor: slot.originalColor,
          rgba: svgCustomizerInstance.hexToRgba(slot.originalColor),
          hasTransparency: svgCustomizerInstance.hasTransparency(slot.originalColor),
        };
      }
      return slot;
    });
    setSvgColorData(prevData => ({ ...prevData, colorSlots: updatedSlots }));
  };

  const finalBadgePropsForDisplay = {
    ...badgeProps,
    foregroundValue: (badgeProps.foregroundType === ForegroundContentType.SYSTEM_ICON || badgeProps.foregroundType === ForegroundContentType.CUSTOM_SVG) 
                       ? displayableForegroundSvg 
                       : badgeProps.foregroundValue,
    foregroundType: (badgeProps.foregroundType === ForegroundContentType.CUSTOM_SVG) 
                      ? ForegroundContentType.SYSTEM_ICON 
                      : badgeProps.foregroundType,
  };

  // Render color pickers for SVG customization
  const renderSvgColorPickers = () => {
    if (badgeProps.foregroundType !== ForegroundContentType.CUSTOM_SVG || !svgColorData || svgColorData.colorSlots.length === 0) {
      return <p className="no-colors-detected">Paste valid SVG with hex colors to customize.</p>;
    }
    return (
      <div className="custom-svg-colors">
        <h4>Detected SVG Colors:</h4>
        {svgColorData.colorSlots.map((slot, index) => {
          // For inputs, we need the hex part and alpha part of the slot's currentColor
          // slot.currentColor is already HEX8. Use parseColorString to get components for inputs.
          const parsedCurrent = parseColorString(slot.currentColor);
          const currentSlotHex = parsedCurrent.hex;
          const currentSlotAlpha = parsedCurrent.alpha;

          return (
            <div key={slot.id} className="control-group svg-color-control">
              <label htmlFor={`custom-color-hex-${index}`}>{slot.label}: 
                <span style={{display: 'inline-block', width: '1em', height: '1em', backgroundColor: slot.originalColor, border: '1px solid #ccc', marginLeft: '5px', verticalAlign: 'middle'}}></span>
                <small> (Original: {slot.originalColor})</small>
              </label>
              <input 
                type="color" 
                id={`custom-color-hex-${index}`} 
                value={currentSlotHex}
                onChange={(e) => handleCustomSvgColorChange(slot.id, e.target.value, currentSlotAlpha)}
              />
              <input 
                type="range" 
                id={`custom-color-alpha-${index}`} 
                min="0" max="1" step="0.01" 
                value={currentSlotAlpha}
                onChange={(e) => handleCustomSvgColorChange(slot.id, currentSlotHex, parseFloat(e.target.value))}
              />
              <span className="color-display-hex8">{slot.currentColor}</span>
              <button type="button" onClick={() => handleResetCustomSvgColor(slot.id)} className="reset-color-btn">
                Reset
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="badge-builder-page">
      <h1 className="page-title">Badge Builder & Preview</h1>
      <div className="builder-content-area">
        <div className="controls-panel">
          <h2>Customize Badge</h2>
          
          <div className="control-group">
            <label htmlFor="name">Name:</label>
            <input type="text" id="name" name="name" value={badgeProps.name} onChange={handleInputChange} />
          </div>

          <div className="control-group">
            <label htmlFor="subtitle">Subtitle:</label>
            <input type="text" id="subtitle" name="subtitle" value={badgeProps.subtitle} onChange={handleInputChange} />
          </div>

          <div className="control-group">
            <label htmlFor="shape">Shape:</label>
            <select id="shape" name="shape" value={badgeProps.shape} onChange={handleInputChange}>
              {Object.values(BadgeShape).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="borderColorHex">Border Color:</label>
            <input type="color" id="borderColorHex" name="borderColorHex" value={borderColorHex} onChange={handleInputChange} />
            <input type="range" id="borderColorAlpha" name="borderColorAlpha" min="0" max="1" step="0.01" value={borderColorAlpha} onChange={handleInputChange} />
            <span>{badgeProps.borderColor}</span>
          </div>
          
          <hr className="control-divider"/>

          <div className="control-group">
            <label htmlFor="backgroundType">Background Type:</label>
            <select id="backgroundType" name="backgroundType" value={badgeProps.backgroundType} onChange={handleInputChange}>
              {Object.values(BackgroundContentType).map(bt => <option key={bt} value={bt}>{bt.replace('_',' ')}</option>)}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="backgroundValue">Background Value:</label>
            {badgeProps.backgroundType === BackgroundContentType.SOLID_COLOR ? (
              <>
                <input type="color" id="backgroundSolidColorHex" name="backgroundSolidColorHex" value={backgroundSolidColorHex} onChange={handleInputChange} />
                <input type="range" id="backgroundSolidColorAlpha" name="backgroundSolidColorAlpha" min="0" max="1" step="0.01" value={backgroundSolidColorAlpha} onChange={handleInputChange} />
                <span>{badgeProps.backgroundValue}</span>
              </>
            ) : (
              <input type="text" id="backgroundValue" name="backgroundValue" value={badgeProps.backgroundValue} onChange={handleInputChange} placeholder="Image URL" />
            )}
            {badgeProps.backgroundType === BackgroundContentType.HOSTED_IMAGE && <span>{badgeProps.backgroundValue}</span>}
          </div>
          
          <hr className="control-divider"/>

          <div className="control-group">
            <label htmlFor="foregroundType">Foreground Type:</label>
            <select id="foregroundType" name="foregroundType" value={badgeProps.foregroundType} onChange={handleInputChange}>
              {Object.values(ForegroundContentType).map(ft => <option key={ft} value={ft}>{ft.replace('_',' ')}</option>)}
            </select>
          </div>

          <div className="control-group foreground-value-group">
            <label htmlFor="foregroundValue">Foreground Value:</label>
            {badgeProps.foregroundType === ForegroundContentType.TEXT ? (
              <input type="text" id="foregroundValue" name="foregroundValue" value={badgeProps.foregroundValue} onChange={handleInputChange} />
            ) : badgeProps.foregroundType === ForegroundContentType.SYSTEM_ICON ? (
              <input type="text" id="foregroundValue" name="foregroundValue" value={badgeProps.foregroundValue} onChange={handleInputChange} placeholder="Icon Name (e.g., Shield)" />
            ) : badgeProps.foregroundType === ForegroundContentType.UPLOADED_ICON ? (
              <input type="text" id="foregroundValue" name="foregroundValue" value={badgeProps.foregroundValue} onChange={handleInputChange} placeholder="Image URL" />
            ) : badgeProps.foregroundType === ForegroundContentType.CUSTOM_SVG ? (
              <textarea id="foregroundValue" name="foregroundValue" value={badgeProps.foregroundValue} onChange={handleInputChange} placeholder="Paste SVG string here..." rows={5}></textarea>
            ) : null}
            {badgeProps.foregroundType !== ForegroundContentType.CUSTOM_SVG && badgeProps.foregroundType !== ForegroundContentType.TEXT && <span>{badgeProps.foregroundValue}</span>}
          </div>

          {/* Only show general foreground color picker if not CUSTOM_SVG with detected colors */}
          {!(badgeProps.foregroundType === ForegroundContentType.CUSTOM_SVG && svgColorData && svgColorData.colorSlots.length > 0) && (
            <div className="control-group">
              <label htmlFor="foregroundColorHex">Foreground Color (for Text/SVG Icon):</label>
              <input type="color" id="foregroundColorHex" name="foregroundColorHex" value={foregroundColorHex} onChange={handleInputChange} />
              <input type="range" id="foregroundColorAlpha" name="foregroundColorAlpha" min="0" max="1" step="0.01" value={foregroundColorAlpha} onChange={handleInputChange} />
              <span>{badgeProps.foregroundColor}</span>
            </div>
          )}

          {/* Render dynamic color pickers for custom SVG */} 
          {badgeProps.foregroundType === ForegroundContentType.CUSTOM_SVG && renderSvgColorPickers()}

        </div>

        <div className="preview-panel">
          <h2>Live Preview {isLoadingSvg && "(Loading Icon...)"}</h2>
          <div className="badge-preview-area">
            <BadgeDisplay badge={finalBadgePropsForDisplay} />
          </div>
          <div className="props-display">
            <h3>Current Form State (badgeProps):</h3>
            <pre>{JSON.stringify(badgeProps, null, 2)}</pre>
            <h3>Props Sent to BadgeDisplay:</h3>
            <pre>{JSON.stringify(finalBadgePropsForDisplay, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgeBuilderPage; 