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

const BadgeDisplay = ({ badge, previewState }) => {
  
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
      // console.log(`[BadgeDisplay] Fetching system icon: ${value}`);
      SystemIconService.getSystemIconSvg(value)
        .then(svgContent => {
          // console.log(`[BadgeDisplay] ✓ Fetched '${value}' (${svgContent?.length} chars)`);
          if (isMounted) setCurrentFg({ type, value: svgContent });
        })
        .catch(err => {
          console.error(`[BadgeDisplay] ✗ Failed '${value}':`, err.message);
          if (isMounted) setCurrentFg({ type, value: '' });
        });
    } else if (type === 'UPLOADED_ICON' && value && value.startsWith('upload://')) {
      // Resolve upload:// URLs to actual hosted URLs using the proper authenticated endpoint
      import('../../services/badgeService.js').then(({ default: badgeService }) => {
        const assetId = value.replace('upload://', '');
        return badgeService.getAssetUrl(assetId);
      })
        .then(realUrl => {
          if (isMounted && realUrl) {
            setCurrentFg({ type, value: realUrl });
          } else if (isMounted) {
            console.error(`Failed to resolve upload URL: ${value}`);
            setCurrentFg({ type, value: '' });
          }
        })
        .catch(err => {
          console.error(`Error resolving upload URL '${value}':`, err);
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
  const getTransformedForegroundValue = async () => {
    // console.log(`[TRANSFORM] Starting - type: ${foregroundType}, isSvg: ${isSvgContent(foregroundValue)}, hasConfig: ${!!resolvedForegroundConfig}`);
    
    let transformedValue = foregroundValue;
    
    // Get actual SVG content if we have a blob URL
    let actualSvgContent = foregroundValue;
    if (typeof foregroundValue === 'string' && foregroundValue.startsWith('blob:') && isSvgContent(foregroundValue)) {
      try {
        // console.log('[TRANSFORM] Fetching content from blob URL:', foregroundValue);
        const response = await fetch(foregroundValue);
        actualSvgContent = await response.text();
        // console.log('[TRANSFORM] Fetched SVG content length:', actualSvgContent.length);
      } catch (error) {
        console.error('[TRANSFORM] Failed to fetch blob content:', error);
        actualSvgContent = foregroundValue; // Fallback to original
      }
    }
    
    // For system icons with color config, apply transformations
    if (foregroundType === 'SYSTEM_ICON' && isSvgContent(actualSvgContent)) {
      if (resolvedForegroundConfig) {
        transformedValue = applySvgColorTransform(actualSvgContent, resolvedForegroundConfig);
      } else {
        transformedValue = actualSvgContent;
      }
    }
    // For uploaded icons with color config, apply transformations
    else if (foregroundType === 'UPLOADED_ICON' && isSvgContent(actualSvgContent)) {
      // console.log(`[TRANSFORM] Uploaded icon detected`);
      if (resolvedForegroundConfig) {
        // console.log(`[TRANSFORM] Config found:`, {
        //   type: resolvedForegroundConfig.type,
        //   hasColorMappings: !!resolvedForegroundConfig.colorMappings,
        //   actualContentLength: actualSvgContent.length
        // });
        
        // Apply color transform to actual SVG content
        // console.log(`[TRANSFORM] Applying color transform...`);
        const transformed = applySvgColorTransform(actualSvgContent, resolvedForegroundConfig);
        if (transformed.length < actualSvgContent.length * 0.5) {
          console.warn('[TRANSFORM] SVG significantly reduced in size - possible corruption!');
          // Return original with viewBox fix if corruption detected
          transformedValue = ensureSvgViewBox(actualSvgContent);
        } else {
          // console.log(`[TRANSFORM] Complete, length: ${transformed.length}`);
          transformedValue = transformed;
        }
      } else {
        // No color config but still ensure viewBox for proper scaling
        transformedValue = ensureSvgViewBox(actualSvgContent);
      }
    } else {
      transformedValue = actualSvgContent;
    }
    
    // Apply gradient stop isolation if previewing a specific stop
    if (previewState && previewState.active && previewState.gradientStopPreview && isSvgContent(transformedValue)) {
      // console.log('[TRANSFORM] Isolating gradient stop:', previewState.gradientStopPreview);
      transformedValue = isolateGradientStopInSvg(transformedValue, previewState.gradientStopPreview);
    }

    // Apply preview effects if active and we have SVG content
    if (previewState && previewState.active && isSvgContent(transformedValue)) {
      // console.log('[TRANSFORM] Applying preview effects to actual SVG content');
      transformedValue = applyPreviewEffectsToSvg(transformedValue, previewState);
    }
    
    return transformedValue || '';
  };

  // Function to isolate a specific gradient stop by making all other stops transparent
  const isolateGradientStopInSvg = (svgString, gradientStopInfo) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgElement = doc.documentElement;

      // Check for parser errors
      const parserError = svgElement.querySelector('parsererror');
      if (parserError) {
        console.error('SVG parsing error in isolateGradientStopInSvg:', parserError.textContent);
        return svgString;
      }

      // Find the specific gradient
      const targetGradientId = gradientStopInfo.gradientId;
      const targetStopIndex = gradientStopInfo.stopIndex;
      
      // console.log('[TRANSFORM] Looking for gradient:', targetGradientId, 'stop:', targetStopIndex);

      // Find gradient definitions (in <defs> or anywhere in the SVG)
      const gradients = svgElement.querySelectorAll(`linearGradient[id="${targetGradientId}"], radialGradient[id="${targetGradientId}"]`);
      
      gradients.forEach(gradient => {
        const stops = gradient.querySelectorAll('stop');
        // console.log('[TRANSFORM] Found gradient with', stops.length, 'stops');
        
        stops.forEach((stop, index) => {
          if (index !== targetStopIndex) {
            // Make other stops mostly transparent but not completely
            stop.setAttribute('stop-opacity', '0.1');
            // console.log('[TRANSFORM] Made stop', index, 'mostly transparent');
          } else {
            // Ensure target stop is fully opaque
            stop.setAttribute('stop-opacity', '1');
            // console.log('[TRANSFORM] Ensured stop', index, 'is opaque');
          }
        });
      });

      return new XMLSerializer().serializeToString(svgElement);
    } catch (error) {
      console.error('Error isolating gradient stop:', error);
      return svgString;
    }
  };

  // Helper function to find an element by its path (same logic as SvgDisplay)
  const findElementByPath = (svgElement, elementPath) => {
    if (elementPath === 'svg') return svgElement;
    
    const pathParts = elementPath.split('/');
    let currentElement = svgElement;
    
    for (const part of pathParts) {
      const match = part.match(/^(\w+)\[(\d+)\]$/);
      if (!match) continue;
      
      const [, tagName, indexStr] = match;
      const index = parseInt(indexStr);
      
      const children = Array.from(currentElement.children).filter(el => 
        el.tagName.toLowerCase() === tagName.toLowerCase()
      );
      
      if (index >= children.length) return null;
      currentElement = children[index];
    }
    
    return currentElement;
  };

  // Fallback function for when elementColorMap is not available
  const applyPreviewEffectsFallback = (svgString, preview) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgElement = doc.documentElement;

      const parserError = svgElement.querySelector('parsererror');
      if (parserError) {
        console.error('SVG parsing error in fallback:', parserError.textContent);
        return svgString;
      }

      const allElements = svgElement.querySelectorAll('*');
      const affectedPathsSet = new Set(preview.affectedPaths);
      
      const getElementPath = (element, root) => {
        if (element === root) return 'svg';
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (!parent || parent === root) {
          const siblings = Array.from(root.children).filter(el => el.tagName.toLowerCase() === tagName);
          const index = siblings.indexOf(element);
          return `${tagName}[${index}]`;
        } else {
          const siblings = Array.from(parent.children).filter(el => el.tagName.toLowerCase() === tagName);
          const index = siblings.indexOf(element);
          const parentPath = getElementPath(parent, root);
          return `${parentPath}/${tagName}[${index}]`;
        }
      };

      allElements.forEach((element) => {
        const elementPath = getElementPath(element, svgElement);
        const isAffected = affectedPathsSet.has(elementPath);

        // Determine which elements to modify based on preview mode
        const shouldModify = preview.mode === 'affected-pulse' ? isAffected : !isAffected;

        if (shouldModify && (element.hasAttribute('fill') || element.hasAttribute('stroke') || element.tagName === 'g')) {
          const currentOpacity = element.getAttribute('opacity') || '1';
          const newOpacity = parseFloat(currentOpacity) * preview.opacity;
          element.setAttribute('opacity', newOpacity.toString());
          
          if (preview.duration) {
            element.style.transition = `opacity ${preview.duration}ms ease-in-out`;
          }
        }
      });

      return new XMLSerializer().serializeToString(svgElement);
    } catch (error) {
      console.error('Error in fallback preview effects:', error);
      return svgString;
    }
  };

  // Function to apply preview opacity effects to SVG
  const applyPreviewEffectsToSvg = (svgString, preview) => {
    // console.log('[BADGE-PREVIEW] Applying preview effects:', preview);
    
    if (!preview.active || !preview.affectedPaths || preview.affectedPaths.length === 0) {
      // console.log('[BADGE-PREVIEW] No preview to apply - inactive or no affected paths');
      return svgString;
    }

    // Get elementColorMap from resolved foreground config
    const elementColorMap = resolvedForegroundConfig?.colorMappings;

    // If we don't have elementColorMap, fall back to old logic
    if (!elementColorMap) {
      // console.log('[BADGE-PREVIEW] No elementColorMap provided, using fallback logic');
      return applyPreviewEffectsFallback(svgString, preview);
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgElement = doc.documentElement;

      // Check for parser errors
      const parserError = svgElement.querySelector('parsererror');
      if (parserError) {
        console.error('SVG parsing error in applyPreviewEffectsToSvg:', parserError.textContent);
        return svgString;
      }

      // Use the proven elementColorMap to determine which elements to dim
      const affectedPathsSet = new Set(preview.affectedPaths);
      // console.log('[BADGE-PREVIEW] Affected paths:', Array.from(affectedPathsSet));
      // console.log('[BADGE-PREVIEW] ElementColorMap keys:', Object.keys(elementColorMap));

      let modifiedCount = 0;

      // Go through each element in the elementColorMap (these are the elements we know have colors)
      Object.keys(elementColorMap).forEach(elementPath => {
        const isAffected = affectedPathsSet.has(elementPath);
        
        // console.log('[BADGE-PREVIEW] Checking', elementPath, 'isAffected:', isAffected);
        
        // Determine which elements to modify based on preview mode
        const shouldModify = preview.mode === 'affected-pulse' ? isAffected : !isAffected;
        
        if (shouldModify) {
          // Find this element in the SVG and modify its opacity
          const element = findElementByPath(svgElement, elementPath);
          if (element) {
            const currentOpacity = element.getAttribute('opacity') || '1';
            const newOpacity = parseFloat(currentOpacity) * preview.opacity;
            
            const actionDesc = preview.mode === 'affected-pulse' ? 'Pulsing affected element' : 'Dimming non-affected element';
            // console.log(`[BADGE-PREVIEW] ${actionDesc}`, elementPath, 'to opacity', newOpacity);
            element.setAttribute('opacity', newOpacity.toString());
            modifiedCount++;
            
            // Add transition for smooth animation
            if (preview.duration) {
              element.style.transition = `opacity ${preview.duration}ms ease-in-out`;
            }
          }
        }
      });

      // console.log('[BADGE-PREVIEW] Modified', modifiedCount, 'elements');
      return new XMLSerializer().serializeToString(svgElement);
    } catch (error) {
      console.error('Error applying preview effects to SVG:', error);
      return svgString;
    }
  };

  const [transformedForegroundValue, setTransformedForegroundValue] = useState(foregroundValue || '');

  // Update transformed value when dependencies change
  useEffect(() => {
    const updateTransformedValue = async () => {
      const transformed = await getTransformedForegroundValue();
      setTransformedForegroundValue(transformed);
    };
    
    updateTransformedValue();
  }, [foregroundValue, foregroundType, resolvedForegroundConfig, previewState]);

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
          // console.log(`[BadgeDisplay] Render: value=${hasValue}, transformed=${hasTransformed}`);
          
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
        transformedForegroundValue && typeof transformedForegroundValue === 'string' && transformedForegroundValue.trim() && 
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