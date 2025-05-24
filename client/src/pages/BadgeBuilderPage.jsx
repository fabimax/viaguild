import React, { useState, useEffect, useCallback } from 'react';
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

const BadgeBuilderPage = () => {
  const [badgeProps, setBadgeProps] = useState({
    name: 'My Hex Badge',
    subtitle: 'Alpha Channel Ready',
    shape: BadgeShape.CIRCLE,
    borderColor: '#00FF00FF', // HEX8 (green, fully opaque)
    backgroundType: BackgroundContentType.SOLID_COLOR,
    backgroundValue: '#DDDDDD80', // HEX8 (light gray, 50% transparent)
    foregroundType: ForegroundContentType.TEXT,
    foregroundValue: 'H',
    foregroundColor: '#333333', // HEX6 (dark gray, opaque)
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
    // Only run if type actually changes to avoid loops with foregroundValue updates
    // This effect should primarily react to user changing the type dropdown
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
          currentFgValue = 'Shield'; // Default system icon name
          changed = true;
        }
      } else if (newType === ForegroundContentType.UPLOADED_ICON) {
        if (typeof currentFgValue !== 'string' || !currentFgValue.includes('/') || currentFgValue.includes('<')) {
          currentFgValue = 'https://picsum.photos/seed/badgeicon/60/60';
          changed = true;
        }
      } else if (newType === ForegroundContentType.CUSTOM_SVG) {
        if (typeof currentFgValue !== 'string' || !currentFgValue.includes('<') || !currentFgValue.includes('svg')) {
          currentFgValue = '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4" fill="currentColor" /></svg>';
          changed = true;
        }
      }
      return changed ? { ...prev, foregroundValue: currentFgValue } : prev;
    });
  }, [badgeProps.foregroundType, badgeProps.name]); // Include name for TEXT default

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
    } else if (badgeProps.foregroundType === ForegroundContentType.CUSTOM_SVG) {
      setDisplayableForegroundSvg(badgeProps.foregroundValue); 
      setIsLoadingSvg(false);
    } else {
      setDisplayableForegroundSvg(null);
      setIsLoadingSvg(false);
    }
  }, [badgeProps.foregroundType, badgeProps.foregroundValue]);

  const finalBadgePropsForDisplay = {
    ...badgeProps,
    foregroundValue: (badgeProps.foregroundType === ForegroundContentType.SYSTEM_ICON || badgeProps.foregroundType === ForegroundContentType.CUSTOM_SVG) 
                       ? displayableForegroundSvg 
                       : badgeProps.foregroundValue,
    foregroundType: (badgeProps.foregroundType === ForegroundContentType.CUSTOM_SVG) 
                      ? ForegroundContentType.SYSTEM_ICON 
                      : badgeProps.foregroundType,
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

          <div className="control-group">
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
            {badgeProps.foregroundType !== ForegroundContentType.CUSTOM_SVG && <span>{badgeProps.foregroundValue}</span>}
          </div>

          <div className="control-group">
            <label htmlFor="foregroundColorHex">Foreground Color (for Text/SVG Icon):</label>
            <input type="color" id="foregroundColorHex" name="foregroundColorHex" value={foregroundColorHex} onChange={handleInputChange} />
            <input type="range" id="foregroundColorAlpha" name="foregroundColorAlpha" min="0" max="1" step="0.01" value={foregroundColorAlpha} onChange={handleInputChange} />
            <span>{badgeProps.foregroundColor}</span>
          </div>
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