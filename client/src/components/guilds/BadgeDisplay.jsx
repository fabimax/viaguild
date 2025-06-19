import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { applySvgColorTransform, isSvgContent, ensureSvgViewBox } from '../../utils/svgColorTransform';
import { 
  extractColor, 
  extractBackgroundStyle, 
  extractBorderStyle
} from '../../utils/colorConfig';
import SystemIconService from '../../services/systemIcon.service';

// Helper to try and determine a good contrasting text color (very basic)
const getContrastingTextColor = (hexBgColor) => {
  if (!hexBgColor || hexBgColor.length < 7 || !hexBgColor.startsWith('#')) return '#FFFFFF';
  const r = parseInt(hexBgColor.slice(1, 3), 16);
  const g = parseInt(hexBgColor.slice(3, 5), 16);
  const b = parseInt(hexBgColor.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 160 ? '#000000' : '#FFFFFF';
};

// Shape definitions (inspired by BadgeShapes.jsx)
const shapePaths = {
  STAR: "polygon(79.39% 90.45%, 50% 80%, 20.61% 90.45%, 21.47% 59.27%, 2.45% 34.55%, 32.37% 25.73%, 50% 0%, 67.63% 25.73%, 97.55% 34.55%, 78.53% 59.27%)",
  HEART_SVG_PATH: "M50,90 C45,85 20,65 10,45 C0,25 10,5 30,5 C40,5 45,10 50,15 C55,10 60,5 70,5 C90,5 100,25 90,45 C80,65 55,85 50,90 Z",
  HEXAGON: "polygon(93.56% 74.55%, 50.52% 100%, 6.96% 75.45%, 6.44% 25.45%, 49.48% 0%, 93.04% 24.55%)",
};

const BadgeDisplay = ({ badge }) => {
  
  if (!badge) return null;

  const {
    name, subtitle, shape, 
    // Config objects
    borderConfig, backgroundConfig, foregroundConfig,
    foregroundScale,
    // Keep these for preview override
    foregroundType: foregroundTypeOverride, 
    foregroundValue: foregroundValueOverride
  } = badge;

  const [currentFg, setCurrentFg] = useState({ 
    type: foregroundTypeOverride, 
    value: foregroundValueOverride 
  });

  useEffect(() => {
    let isMounted = true;
    let type = foregroundTypeOverride;
    let value = foregroundValueOverride;

    // If override isn't provided, derive from config
    if (!type && foregroundConfig) {
      switch (foregroundConfig.type) {
        case 'text':
          type = 'TEXT';
          value = foregroundConfig.value;
          break;
        case 'system-icon':
          type = 'SYSTEM_ICON';
          value = foregroundConfig.value; // This is a name, e.g., "Shield"
          break;
        case 'static-image-asset':
        case 'customizable-svg':
          type = 'UPLOADED_ICON';
          value = foregroundConfig.url; // This is a URL
          break;
      }
    }
    
    // If we have a system icon name, fetch its SVG content
    if (type === 'SYSTEM_ICON' && value && !isSvgContent(value)) {
      console.log(`[BadgeDisplay] Fetching system icon: ${value}`);
      SystemIconService.getSystemIconSvg(value)
        .then(svgContent => {
          console.log(`[BadgeDisplay] ✓ Fetched '${value}' (${svgContent?.length} chars)`);
          if (isMounted) setCurrentFg({ type, value: svgContent });
        })
        .catch(err => {
          console.error(`[BadgeDisplay] ✗ Failed '${value}':`, err.message);
          if (isMounted) setCurrentFg({ type, value: '' });
        });
    } else if (type === 'UPLOADED_ICON' && value && !isSvgContent(value) && foregroundConfig?.type === 'customizable-svg') {
      // For customizable SVGs, fetch the SVG content through our server proxy to avoid CORS
      import('../../services/api.js').then(({ default: api }) => {
        return api.get('/fetch-svg', { params: { url: value } });
      })
        .then(response => {
          if (isMounted) setCurrentFg({ type, value: response.data });
        })
        .catch(err => {
          console.error(`Failed to fetch customizable SVG from '${value}':`, err);
          if (isMounted) setCurrentFg({ type, value: '' });
        });
    } else {
      setCurrentFg({ type, value });
    }

    return () => { isMounted = false; };
  }, [
    foregroundConfig, 
    foregroundTypeOverride, 
    foregroundValueOverride
  ]);

  const { type: foregroundType, value: foregroundValue } = currentFg;



  const BORDER_WIDTH = 6; // Explicitly defined, should be 6px
  const BADGE_SIZE_PX = 100;
  const SIMPLE_SHAPE_PADDING_PX = 5;
  const COMPLEX_SHAPE_INNER_PADDING_PX = 2;

  // Use config objects directly (config-only approach)
  const resolvedBorderConfig = borderConfig;
  const resolvedBackgroundConfig = backgroundConfig;
  const resolvedForegroundConfig = foregroundConfig;

  // Extract resolved colors and styles
  const resolvedBorderColor = extractColor(resolvedBorderConfig, '#000000');
  const resolvedBackgroundStyles = extractBackgroundStyle(resolvedBackgroundConfig);
  const resolvedForegroundColor = extractColor(resolvedForegroundConfig, '#FFFFFF');


  // Base styles for the main container that will show the shape
  let badgeContainerStyles = {
    width: `${BADGE_SIZE_PX}px`,
    height: `${BADGE_SIZE_PX}px`,
    position: 'relative', // For absolute positioning of inner content if needed
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  };

  // Styles for the inner content area (background, foreground)
  let badgeInnerContentStyles = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: `${COMPLEX_SHAPE_INNER_PADDING_PX}px`,
  };
  
  let isComplexShape = false;

  // Apply background styles using resolved config
  const applyBackgroundStyles = (targetStyles) => {
    // Apply the resolved background styles from config
    Object.assign(targetStyles, resolvedBackgroundStyles);
  };

  // Determine padding for the content area based on shape type
  const currentContentPadding = isComplexShape ? COMPLEX_SHAPE_INNER_PADDING_PX : SIMPLE_SHAPE_PADDING_PX;


  switch (shape) {
    case 'CIRCLE':
      badgeContainerStyles.borderRadius = '50%';
      badgeContainerStyles.border = `${BORDER_WIDTH}px solid ${resolvedBorderColor}`;
      badgeContainerStyles.overflow = 'hidden'; // Circles clip content directly
      applyBackgroundStyles(badgeContainerStyles); // Background on outer for simple shapes
      // Inner content for circle doesn't need separate shaping, it inherits from parent clip
      break;
    case 'SQUARE':
      badgeContainerStyles.borderRadius = '10%';
      badgeContainerStyles.border = `${BORDER_WIDTH}px solid ${resolvedBorderColor}`;
      badgeContainerStyles.overflow = 'hidden';
      applyBackgroundStyles(badgeContainerStyles); // Background on outer for simple shapes
      break;
    case 'STAR':
      isComplexShape = true;
      badgeContainerStyles.backgroundColor = resolvedBorderColor; // Outer acts as border color
      badgeContainerStyles.clipPath = shapePaths.STAR;
      badgeInnerContentStyles.clipPath = shapePaths.STAR; // Inner also needs clipping
      badgeInnerContentStyles.width = `calc(100% - ${BORDER_WIDTH * 2}px)`;
      badgeInnerContentStyles.height = `calc(100% - ${BORDER_WIDTH * 2}px)`;
      applyBackgroundStyles(badgeInnerContentStyles); // Background on inner for complex shapes
      break;
    case 'HEXAGON':
      isComplexShape = true;
      badgeContainerStyles.backgroundColor = resolvedBorderColor;
      badgeContainerStyles.clipPath = shapePaths.HEXAGON;
      badgeInnerContentStyles.clipPath = shapePaths.HEXAGON;
      badgeInnerContentStyles.width = `calc(100% - ${BORDER_WIDTH * 2}px)`;
      badgeInnerContentStyles.height = `calc(100% - ${BORDER_WIDTH * 2}px)`;
      applyBackgroundStyles(badgeInnerContentStyles);
      break;
    case 'HEART':
      isComplexShape = true;
      badgeContainerStyles.backgroundColor = resolvedBorderColor;
      const heartMaskUrl = `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='${shapePaths.HEART_SVG_PATH}' fill='black'/%3E%3C/svg%3E")`;
      badgeContainerStyles.WebkitMaskImage = heartMaskUrl;
      badgeContainerStyles.maskImage = heartMaskUrl;
      badgeContainerStyles.WebkitMaskSize = '100% 100%'; // Mask applied to container for border shape
      badgeContainerStyles.maskSize = '100% 100%';
      badgeContainerStyles.WebkitMaskRepeat = 'no-repeat';
      badgeContainerStyles.maskRepeat = 'no-repeat';
      badgeContainerStyles.WebkitMaskPosition = 'center';
      badgeContainerStyles.maskPosition = 'center';

      // Inner content also needs masking and to be slightly smaller
      badgeInnerContentStyles.WebkitMaskImage = heartMaskUrl;
      badgeInnerContentStyles.maskImage = heartMaskUrl;
      badgeInnerContentStyles.WebkitMaskSize = '100% 100%';
      badgeInnerContentStyles.maskSize = '100% 100%';
      badgeInnerContentStyles.WebkitMaskRepeat = 'no-repeat';
      badgeInnerContentStyles.maskRepeat = 'no-repeat';
      badgeInnerContentStyles.WebkitMaskPosition = 'center';
      badgeInnerContentStyles.maskPosition = 'center';
      badgeInnerContentStyles.width = `calc(100% - ${BORDER_WIDTH * 2}px)`;
      badgeInnerContentStyles.height = `calc(100% - ${BORDER_WIDTH * 2}px)`;
      applyBackgroundStyles(badgeInnerContentStyles);
      break;
    default: // Default to CIRCLE
      badgeContainerStyles.borderRadius = '50%';
      badgeContainerStyles.border = `${BORDER_WIDTH}px solid ${resolvedBorderColor}`;
      badgeContainerStyles.overflow = 'hidden';
      applyBackgroundStyles(badgeContainerStyles); // Background on outer for simple shapes
  }

  // Determine foreground text color using resolved config
  const fgTextColor = resolvedForegroundColor || 
    (resolvedBackgroundStyles.backgroundColor ? getContrastingTextColor(resolvedBackgroundStyles.backgroundColor) : '#FFFFFF');

  let textContainerWidthPercentage = 0.85; // Default for Circle/Square
  if (shape === 'STAR' || shape === 'HEXAGON' || shape === 'HEART') {
    textContainerWidthPercentage = 0.65; // More conservative for complex shapes
  }
  
  // Define a base font size for SVG text. This acts as a maximum.
  // The actual rendered size will be scaled down by textLength if text is long.
  const svgTextProps = {
    initialFontSize: 22, // A reasonable starting/max font size for a 100px badge area
    viewBoxSize: 50,     // Arbitrary viewBox units for internal scaling
  };
  svgTextProps.targetTextLength = svgTextProps.viewBoxSize * textContainerWidthPercentage;

  const textRef = useRef(null); // Ref for the SVG text element
  const [textTransform, setTextTransform] = useState('scale(1)'); // State for the transform

  useLayoutEffect(() => {
    if (foregroundType === 'TEXT' && foregroundValue && textRef.current) {
      const textElement = textRef.current;
      
      let textWidthPercentageTarget = 0.82; // Slightly increased from 0.80
      if (shape === 'STAR' || shape === 'HEXAGON' || shape === 'HEART') {
        textWidthPercentageTarget = 0.60;
      }

      // Calculate available width in pixels
      const baseContentWidth = BADGE_SIZE_PX - (BORDER_WIDTH * 2);
      const paddingToSubtract = currentContentPadding * 2;
      const availableWidthForTextContainer = baseContentWidth - paddingToSubtract;
      const targetPixelWidthForText = availableWidthForTextContainer * textWidthPercentageTarget;

      const actualTextWidth = textElement.getComputedTextLength();

      if (actualTextWidth > targetPixelWidthForText && actualTextWidth > 0) {
        const scaleFactor = targetPixelWidthForText / actualTextWidth;
        setTextTransform(`scale(${scaleFactor.toFixed(3)})`);
      } else {
        setTextTransform('scale(1)');
      }
    } else {
      setTextTransform('scale(1)');
    }
  }, [foregroundValue, foregroundType, shape, currentContentPadding]); // Added currentContentPadding to dependencies

  const currentForegroundScale = (foregroundScale && !isNaN(parseFloat(foregroundScale))) ? parseFloat(foregroundScale) / 100 : 1;

  // Apply color transformations to SVG content if needed
  const getTransformedForegroundValue = () => {
    // For system icons with color config, apply transformations
    if (foregroundType === 'SYSTEM_ICON' && isSvgContent(foregroundValue)) {
      if (resolvedForegroundConfig) {
        return applySvgColorTransform(foregroundValue, resolvedForegroundConfig);
      }
    }
    // For uploaded icons with color config, apply transformations
    if (foregroundType === 'UPLOADED_ICON' && isSvgContent(foregroundValue)) {
      if (resolvedForegroundConfig) {
        // Check if this is already a transformed SVG from BadgeIconUpload (contains blob: URL references)
        // or if it's a complex SVG that should not be double-transformed
        if (foregroundValue.includes('blob:') || foregroundValue.length > 50000) {
          // Even for large/blob SVGs, ensure viewBox for proper scaling
          return ensureSvgViewBox(foregroundValue);
        }
        // Only transform if we have SVG content that needs transformation
        const transformed = applySvgColorTransform(foregroundValue, resolvedForegroundConfig);
        if (transformed.length < foregroundValue.length * 0.5) {
          console.warn('SVG significantly reduced in size - possible corruption!');
          // Return original with viewBox fix if corruption detected
          return ensureSvgViewBox(foregroundValue);
        }
        return transformed;
      } else {
        // No color config but still ensure viewBox for proper scaling
        return ensureSvgViewBox(foregroundValue);
      }
    }
    return foregroundValue;
  };

  const transformedForegroundValue = getTransformedForegroundValue();

  const renderForeground = () => (
    <div 
      className="badge-foreground-content"
      style={{
        color: fgTextColor,
        transform: `scale(${currentForegroundScale})`,
      }}
    >
      {foregroundType === 'TEXT' && foregroundValue && (
        <svg 
            width="100%" height="100%" 
            viewBox="0 0 100 50" 
            preserveAspectRatio="xMidYMid meet"
        >
          <text ref={textRef} x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
            fontSize="24" fill={fgTextColor} transform={textTransform} transform-origin="center center" 
            className="badge-svg-rendered-text">
            {foregroundValue}
          </text>
        </svg>
      )}
      {(() => {
        if (foregroundType === 'SYSTEM_ICON') {
          const hasValue = !!foregroundValue;
          const hasTransformed = !!transformedForegroundValue;
          console.log(`[BadgeDisplay] Render: value=${hasValue}, transformed=${hasTransformed}`);
          
          if (foregroundValue) {
            return (
              <div 
                className="badge-svg-icon"
                dangerouslySetInnerHTML={{ __html: transformedForegroundValue }}
              />
            );
          } else {
            return (
              <div className="badge-svg-icon" style={{ border: '1px dashed red', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'red' }}>
                Missing Icon
              </div>
            );
          }
        }
        return null;
      })()}
      {foregroundType === 'UPLOADED_ICON' && (
        transformedForegroundValue && transformedForegroundValue.trim() && 
        (isSvgContent(transformedForegroundValue) || transformedForegroundValue.startsWith('http') || transformedForegroundValue.startsWith('upload://')) ? (
          // Check if it's SVG content using our robust SVG detection
          isSvgContent(transformedForegroundValue) ? (
            <div 
              className="badge-svg-icon"
              dangerouslySetInnerHTML={{ __html: transformedForegroundValue }}
            />
          ) : (
            <img src={transformedForegroundValue} alt={name || 'badge icon'} className="badge-uploaded-icon" />
          )
        ) : (
          <span className="badge-icon-placeholder">IMG</span> 
        )
      )}
    </div>
  );

  return (
    <div className="badge-item-wrapper" title={`${name}${subtitle ? ' - ' + subtitle : ''}`}>
      {name && <div className="badge-name-outside">{name}</div>}
      <div className={`badge-display-container ${isComplexShape ? 'is-complex-shape' : ''}`} style={badgeContainerStyles}>
        {isComplexShape ? (
          <div className="badge-content-inner" style={badgeInnerContentStyles}>
            {renderForeground()}
          </div>
        ) : (
          renderForeground() // For CIRCLE/SQUARE, foreground is direct child of container
        )}
      </div>
      {subtitle && <div className="badge-subtitle-outside">{subtitle}</div>}
    </div>
  );
};

export default BadgeDisplay;