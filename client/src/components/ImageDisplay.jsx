import React from 'react';
import PropTypes from 'prop-types';

/**
 * Static image display component that renders raster images (PNG, JPG, etc.)
 * Simple and focused - no transformations, just clean display
 * Used across the app for all static image rendering needs
 */
const ImageDisplay = ({ 
  imageUrl, 
  size = 80,
  className = '',
  alt = 'Image',
  style = {},
  placeholder = 'No image',
  placeholderStyle = {}
}) => {
  // Show placeholder when no image URL is provided
  if (!imageUrl) {
    return (
      <div 
        className={`image-display-placeholder ${className}`}
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
          ...placeholderStyle,
          ...style
        }}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <img 
      src={imageUrl}
      alt={alt}
      className={`image-display ${className}`}
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

ImageDisplay.propTypes = {
  imageUrl: PropTypes.string,
  size: PropTypes.number,
  className: PropTypes.string,
  alt: PropTypes.string,
  style: PropTypes.object,
  placeholder: PropTypes.string,
  placeholderStyle: PropTypes.object
};

export default ImageDisplay;