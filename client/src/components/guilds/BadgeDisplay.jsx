import React from 'react';

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
    name, subtitle, shape, borderColor,
    backgroundType, backgroundValue,
    foregroundType, foregroundValue, foregroundColor,
  } = badge;

  const BORDER_WIDTH = 3; // px

  // Base styles for the main container that will show the shape
  let badgeContainerStyles = {
    width: '100px',
    height: '100px',
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
  };
  
  let isComplexShape = false;

  // Apply background (image or color) to the correct element based on shape complexity
  const applyBackgroundStyles = (targetStyles) => {
    if (backgroundType === 'SOLID_COLOR') {
      targetStyles.backgroundColor = backgroundValue || '#dddddd';
    } else if (backgroundType === 'HOSTED_IMAGE') {
      targetStyles.backgroundColor = '#cccccc'; // Fallback for image
      targetStyles.backgroundImage = `url(${backgroundValue})`;
      targetStyles.backgroundSize = 'cover';
      targetStyles.backgroundPosition = 'center';
    }
  };

  switch (shape) {
    case 'CIRCLE':
      badgeContainerStyles.borderRadius = '50%';
      badgeContainerStyles.border = `${BORDER_WIDTH}px solid ${borderColor || '#000000'}`;
      badgeContainerStyles.overflow = 'hidden'; // Circles clip content directly
      applyBackgroundStyles(badgeContainerStyles); // Background on outer for simple shapes
      // Inner content for circle doesn't need separate shaping, it inherits from parent clip
      break;
    case 'SQUARE':
      badgeContainerStyles.borderRadius = '10%';
      badgeContainerStyles.border = `${BORDER_WIDTH}px solid ${borderColor || '#000000'}`;
      badgeContainerStyles.overflow = 'hidden';
      applyBackgroundStyles(badgeContainerStyles); // Background on outer for simple shapes
      break;
    case 'STAR':
      isComplexShape = true;
      badgeContainerStyles.backgroundColor = borderColor || '#000000'; // Outer acts as border color
      badgeContainerStyles.clipPath = shapePaths.STAR;
      badgeInnerContentStyles.clipPath = shapePaths.STAR; // Inner also needs clipping
      badgeInnerContentStyles.width = `calc(100% - ${BORDER_WIDTH * 2}px)`;
      badgeInnerContentStyles.height = `calc(100% - ${BORDER_WIDTH * 2}px)`;
      applyBackgroundStyles(badgeInnerContentStyles); // Background on inner for complex shapes
      break;
    case 'HEXAGON':
      isComplexShape = true;
      badgeContainerStyles.backgroundColor = borderColor || '#000000';
      badgeContainerStyles.clipPath = shapePaths.HEXAGON;
      badgeInnerContentStyles.clipPath = shapePaths.HEXAGON;
      badgeInnerContentStyles.width = `calc(100% - ${BORDER_WIDTH * 2}px)`;
      badgeInnerContentStyles.height = `calc(100% - ${BORDER_WIDTH * 2}px)`;
      applyBackgroundStyles(badgeInnerContentStyles);
      break;
    case 'HEART':
      isComplexShape = true;
      badgeContainerStyles.backgroundColor = borderColor || '#000000';
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
      badgeContainerStyles.border = `${BORDER_WIDTH}px solid ${borderColor || '#000000'}`;
      badgeContainerStyles.overflow = 'hidden';
      applyBackgroundStyles(badgeContainerStyles); // Background on outer for simple shapes
  }

  const fgTextColor = foregroundColor || (backgroundType === 'SOLID_COLOR' ? getContrastingTextColor(backgroundValue) : '#FFFFFF');

  const renderForeground = () => (
    <div className="badge-foreground-content" style={{ color: fgTextColor }}>
      {foregroundType === 'TEXT' && (
        <span className="badge-text">{foregroundValue || (name ? name.charAt(0) : '?')}</span>
      )}
      {foregroundType === 'SYSTEM_ICON' && foregroundValue && (
        <div 
          className="badge-svg-icon"
          dangerouslySetInnerHTML={{ __html: foregroundValue }}
        />
      )}
      {foregroundType === 'UPLOADED_ICON' && (
        foregroundValue ? 
          <img src={foregroundValue} alt={name || 'badge icon'} className="badge-uploaded-icon" /> :
          <span className="badge-icon-placeholder">IMG</span> 
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