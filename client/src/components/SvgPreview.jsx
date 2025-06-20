import React from 'react';
import PropTypes from 'prop-types';
import { useBlobUrl } from '../hooks/useBlobUrl';
import { applySvgColorTransform } from '../utils/svgColorTransform';

/**
 * Common SVG preview component that displays SVG content with live color transformations
 * Provides memory-safe blob URL management and consistent preview behavior
 * Used across the app for all SVG preview needs
 */
const SvgPreview = ({ 
  svgContent, 
  colorData, 
  size = 80,
  className = '',
  alt = 'SVG Preview',
  style = {},
  placeholder = 'No icon'
}) => {
  const { blobUrl: previewUrl, setUrl } = useBlobUrl();

  // Apply color transformations and create preview URL
  React.useEffect(() => {
    if (!svgContent) {
      setUrl(null);
      return;
    }

    // Apply color transformations if colorData is provided
    let transformedSvg = svgContent;
    if (colorData && colorData.elementColorMap) {
      transformedSvg = applySvgColorTransform(svgContent, {
        type: 'element-path',
        version: 1,
        colorMappings: colorData.elementColorMap
      });
    }

    // Create blob URL for the transformed SVG
    setUrl(transformedSvg);
  }, [svgContent, colorData, setUrl]);

  // Show placeholder when no preview is available
  if (!previewUrl) {
    return (
      <div 
        className={`svg-preview-placeholder ${className}`}
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
      className={`svg-preview ${className}`}
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

SvgPreview.propTypes = {
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
  placeholder: PropTypes.string
};

export default SvgPreview;