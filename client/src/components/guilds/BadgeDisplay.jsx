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

  let badgeShapeStyles = {
    border: `3px solid ${borderColor || '#000000'}`,
    width: '100px',
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    position: 'relative',
  };
  
  let isCircleClass = '';

  if (backgroundType === 'SOLID_COLOR') {
    badgeShapeStyles.backgroundColor = backgroundValue || '#dddddd';
  } else if (backgroundType === 'HOSTED_IMAGE') {
    badgeShapeStyles.backgroundColor = '#cccccc';
    badgeShapeStyles.backgroundImage = `url(${backgroundValue})`;
    badgeShapeStyles.backgroundSize = 'cover';
    badgeShapeStyles.backgroundPosition = 'center';
  }

  switch (shape) {
    case 'CIRCLE':
      badgeShapeStyles = { ...badgeShapeStyles, borderRadius: '50%', backgroundColor: badgeShapeStyles.backgroundColor || '#ffeb3b' };
      isCircleClass = 'is-circle';
      break;
    case 'SQUARE':
      badgeShapeStyles.borderRadius = '10%';
      break;
    case 'STAR':
      badgeShapeStyles.clipPath = shapePaths.STAR;
      break;
    case 'HEXAGON':
      badgeShapeStyles.clipPath = shapePaths.HEXAGON;
      break;
    case 'HEART':
      badgeShapeStyles.WebkitMaskImage = `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='${shapePaths.HEART_SVG_PATH}' fill='black'/%3E%3C/svg%3E")`;
      badgeShapeStyles.maskImage = `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='${shapePaths.HEART_SVG_PATH}' fill='black'/%3E%3C/svg%3E")`;
      badgeShapeStyles.WebkitMaskSize = 'contain';
      badgeShapeStyles.maskSize = 'contain';
      badgeShapeStyles.WebkitMaskRepeat = 'no-repeat';
      badgeShapeStyles.maskRepeat = 'no-repeat';
      badgeShapeStyles.WebkitMaskPosition = 'center';
      badgeShapeStyles.maskPosition = 'center';
      break;
    default:
      badgeShapeStyles.borderRadius = '50%';
      badgeShapeStyles.backgroundColor = badgeShapeStyles.backgroundColor || '#ffeb3b';
      isCircleClass = 'is-circle'; // Also for default case if it results in a circle
  }

  const fgTextColor = foregroundColor || (backgroundType === 'SOLID_COLOR' ? getContrastingTextColor(backgroundValue) : '#FFFFFF');

  return (
    <div className="badge-item-wrapper" title={`${name}${subtitle ? ' - ' + subtitle : ''}`}>
      {name && <div className="badge-name-outside">{name}</div>}
      <div className={`badge-display-container ${isCircleClass}`} style={badgeShapeStyles}>
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
      </div>
      {subtitle && <div className="badge-subtitle-outside">{subtitle}</div>}
    </div>
  );
};

export default BadgeDisplay; 