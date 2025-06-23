import React from 'react';
import PropTypes from 'prop-types';
import { useBlobUrl } from '../hooks/useBlobUrl';
import { applySvgColorTransform } from '../utils/svgColorTransform';

/**
 * SVG display component that renders SVG content with live color transformations
 * Provides memory-safe blob URL management and consistent display behavior
 * Used across the app for all SVG rendering needs
 */
const SvgDisplay = ({ 
  svgContent, 
  colorData, 
  size = 80,
  className = '',
  alt = 'SVG Display',
  style = {},
  placeholder = 'No icon',
  previewState = null
}) => {
  const { blobUrl: previewUrl, setUrl } = useBlobUrl();

  // Apply color transformations and create preview URL
  React.useEffect(() => {
    if (!svgContent) {
      setUrl(null);
      return;
    }

    const processAndSetUrl = async () => {
      try {
        // Get the actual SVG content (handle blob URLs)
        let actualSvgContent = svgContent;
        if (typeof svgContent === 'string' && svgContent.startsWith('blob:')) {
          // console.log('[SVG-PREVIEW] Fetching content from blob URL:', svgContent);
          const response = await fetch(svgContent);
          actualSvgContent = await response.text();
          // console.log('[SVG-PREVIEW] Fetched SVG content length:', actualSvgContent.length);
        }

        // Apply color transformations if colorData is provided
        let transformedSvg = actualSvgContent;
        if (colorData && colorData.elementColorMap) {
          transformedSvg = applySvgColorTransform(actualSvgContent, {
            type: 'customizable-svg',
            version: 1,
            colorMappings: colorData.elementColorMap
          });
        }

        // Apply gradient stop isolation if previewing a specific stop
        if (previewState && previewState.active && previewState.gradientStopPreview && transformedSvg) {
          // console.log('[SVG-PREVIEW] Isolating gradient stop:', previewState.gradientStopPreview);
          transformedSvg = isolateGradientStop(transformedSvg, previewState.gradientStopPreview);
        }

        // Apply preview effects if preview state is active
        if (previewState && previewState.active && transformedSvg) {
          // console.log('[SVG-PREVIEW] Applying preview effects to actual SVG content');
          transformedSvg = applyPreviewEffects(transformedSvg, previewState, colorData?.elementColorMap);
        }

        // Create blob URL for the transformed SVG
        setUrl(transformedSvg);
      } catch (error) {
        console.error('[SVG-PREVIEW] Error processing SVG content:', error);
        // Fallback to original content
        setUrl(svgContent);
      }
    };

    processAndSetUrl();
  }, [svgContent, colorData, previewState, setUrl]);

  // Helper function to find an element by its path (same logic as svgColorAnalysis.js)
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

  // Function to isolate a specific gradient stop by making all other stops transparent
  const isolateGradientStop = (svgString, gradientStopInfo) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgElement = doc.documentElement;

      // Check for parser errors
      const parserError = svgElement.querySelector('parsererror');
      if (parserError) {
        console.error('SVG parsing error in isolateGradientStop:', parserError.textContent);
        return svgString;
      }

      // Find the specific gradient
      const targetGradientId = gradientStopInfo.gradientId;
      const targetStopIndex = gradientStopInfo.stopIndex;
      
      // console.log('[SVG-PREVIEW] Looking for gradient:', targetGradientId, 'stop:', targetStopIndex);

      // Find gradient definitions (in <defs> or anywhere in the SVG)
      const gradients = svgElement.querySelectorAll(`linearGradient[id="${targetGradientId}"], radialGradient[id="${targetGradientId}"]`);
      
      gradients.forEach(gradient => {
        const stops = gradient.querySelectorAll('stop');
        // console.log('[SVG-PREVIEW] Found gradient with', stops.length, 'stops');
        
        stops.forEach((stop, index) => {
          if (index !== targetStopIndex) {
            // Make other stops mostly transparent but not completely
            stop.setAttribute('stop-opacity', '0.1');
            // console.log('[SVG-PREVIEW] Made stop', index, 'mostly transparent');
          } else {
            // Ensure target stop is fully opaque
            stop.setAttribute('stop-opacity', '1');
            // console.log('[SVG-PREVIEW] Ensured stop', index, 'is opaque');
          }
        });
      });

      return new XMLSerializer().serializeToString(svgElement);
    } catch (error) {
      console.error('Error isolating gradient stop:', error);
      return svgString;
    }
  };

  // Function to apply preview opacity effects to SVG
  const applyPreviewEffects = (svgString, preview, elementColorMap) => {
    // console.log('[SVG-PREVIEW] Applying preview effects:', preview);
    
    if (!preview.active || !preview.affectedPaths || preview.affectedPaths.length === 0) {
      // console.log('[SVG-PREVIEW] No preview to apply - inactive or no affected paths');
      return svgString;
    }

    // If we don't have elementColorMap, fall back to old logic
    if (!elementColorMap) {
      // console.log('[SVG-PREVIEW] No elementColorMap provided, using fallback logic');
      return applyPreviewEffectsFallback(svgString, preview);
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgElement = doc.documentElement;

      // Check for parser errors
      const parserError = svgElement.querySelector('parsererror');
      if (parserError) {
        console.error('SVG parsing error in applyPreviewEffects:', parserError.textContent);
        return svgString;
      }

      // Use the proven elementColorMap to determine which elements to dim
      const affectedPathsSet = new Set(preview.affectedPaths);
      // console.log('[SVG-PREVIEW] Affected paths:', Array.from(affectedPathsSet));
      // console.log('[SVG-PREVIEW] ElementColorMap keys:', Object.keys(elementColorMap));

      let modifiedCount = 0;

      // Go through each element in the elementColorMap (these are the elements we know have colors)
      Object.keys(elementColorMap).forEach(elementPath => {
        const isAffected = affectedPathsSet.has(elementPath);
        
        // console.log('[SVG-PREVIEW] Checking', elementPath, 'isAffected:', isAffected);
        
        // Determine which elements to modify based on preview mode
        const shouldModify = preview.mode === 'affected-pulse' ? isAffected : !isAffected;
        
        if (shouldModify) {
          // Find this element in the SVG and modify its opacity
          const element = findElementByPath(svgElement, elementPath);
          if (element) {
            const currentOpacity = element.getAttribute('opacity') || '1';
            const newOpacity = parseFloat(currentOpacity) * preview.opacity;
            
            const actionDesc = preview.mode === 'affected-pulse' ? 'Pulsing affected element' : 'Dimming non-affected element';
            // console.log(`[SVG-PREVIEW] ${actionDesc}`, elementPath, 'to opacity', newOpacity);
            element.setAttribute('opacity', newOpacity.toString());
            modifiedCount++;
            
            // Add transition for smooth animation
            if (preview.duration) {
              element.style.transition = `opacity ${preview.duration}ms ease-in-out`;
            }
          }
        }
      });

      // console.log('[SVG-PREVIEW] Modified', modifiedCount, 'elements');
      return new XMLSerializer().serializeToString(svgElement);
    } catch (error) {
      console.error('Error applying preview effects:', error);
      return svgString;
    }
  };

  // Show placeholder when no preview is available
  if (!previewUrl) {
    return (
      <div 
        className={`svg-display-placeholder ${className}`}
        style={{ 
          width: size, 
          height: size,
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #e9ecef',
          borderRadius: '6px',
          color: '#6c757d',
          fontSize: '12px',
          fontWeight: '500',
          ...style
        }}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <img 
      src={previewUrl}
      alt={alt}
      className={`svg-display ${className}`}
      style={{ 
        width: size, 
        height: size,
        objectFit: 'contain',
        border: '1px solid #e9ecef',
        borderRadius: '6px',
        backgroundColor: '#ffffff',
        padding: '8px',
        boxSizing: 'border-box',
        ...style
      }}
    />
  );
};

SvgDisplay.propTypes = {
  svgContent: PropTypes.string,
  colorData: PropTypes.shape({
    elementColorMap: PropTypes.object,
    colorSlots: PropTypes.array,
    gradientDefinitions: PropTypes.object
  }),
  size: PropTypes.number,
  className: PropTypes.string,
  alt: PropTypes.string,
  style: PropTypes.object,
  placeholder: PropTypes.string,
  previewState: PropTypes.shape({
    active: PropTypes.bool,
    mode: PropTypes.string,
    affectedPaths: PropTypes.array,
    opacity: PropTypes.number,
    duration: PropTypes.number
  })
};

export default SvgDisplay;