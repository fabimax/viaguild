import React from 'react';
import PropTypes from 'prop-types';
import SvgDisplay from './SvgDisplay';
import ImageDisplay from './ImageDisplay';

/**
 * Smart wrapper component that displays badge foreground content
 * Automatically chooses the appropriate display component based on content type
 * Handles SVG (with transformations), static images, and future text display
 */
const BadgeForegroundDisplay = ({ 
  content,
  contentType, // 'svg', 'image', 'text' (future)
  isSvg = null, // Legacy prop for backwards compatibility
  colorData = null,
  size = 80,
  className = '',
  alt = 'Badge foreground',
  style = {},
  placeholder = 'No icon',
  previewState = null
}) => {
  // Determine the actual content type
  // Priority: explicit contentType > isSvg prop > auto-detect
  let actualContentType = contentType;
  
  if (!actualContentType && isSvg !== null) {
    actualContentType = isSvg ? 'svg' : 'image';
  }
  
  if (!actualContentType && content) {
    // Auto-detect based on content
    if (typeof content === 'string') {
      if (content.includes('<svg') || content.includes('<?xml')) {
        actualContentType = 'svg';
      } else if (content.startsWith('http') || content.startsWith('blob:') || content.startsWith('data:')) {
        actualContentType = 'image';
      }
    }
  }

  // Render appropriate component based on content type
  switch (actualContentType) {
    case 'svg':
      return (
        <SvgDisplay
          svgContent={content}
          colorData={colorData}
          size={size}
          className={className}
          alt={alt}
          style={style}
          placeholder={placeholder}
          previewState={previewState}
        />
      );
      
    case 'image':
      return (
        <ImageDisplay
          imageUrl={content}
          size={size}
          className={className}
          alt={alt}
          style={style}
          placeholder={placeholder}
        />
      );
      
    case 'text':
      // Future implementation
      return (
        <div 
          className={`text-display-placeholder ${className}`}
          style={{ 
            width: size, 
            height: size,
            backgroundColor: '#f8f9fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #e9ecef',
            borderRadius: '6px',
            fontSize: Math.max(12, size * 0.3),
            fontWeight: '600',
            ...style
          }}
        >
          {content || placeholder}
        </div>
      );
      
    default:
      // No content or unrecognized type
      return (
        <div 
          className={`foreground-display-placeholder ${className}`}
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
};

BadgeForegroundDisplay.propTypes = {
  content: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node
  ]),
  contentType: PropTypes.oneOf(['svg', 'image', 'text']),
  isSvg: PropTypes.bool, // Legacy support
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

export default BadgeForegroundDisplay;