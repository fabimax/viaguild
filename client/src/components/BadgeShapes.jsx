import React from 'react';

/**
 * Circle shaped badge component
 * @param {Object} props - Component props
 * @param {string} props.borderColor - Hex color for the border
 * @param {string} props.imageUrl - URL for the badge image
 * @param {string} props.giverInitial - Initial letter of the badge giver
 * @param {boolean} props.showGiver - Whether to show the giver indicator
 * @param {string} props.className - Additional class names
 * @param {number} props.size - Size of the badge in pixels
 */
export const CircleBadge = ({ 
  borderColor, 
  imageUrl, 
  giverInitial, 
  showGiver = true,
  className = '',
  size = 50
}) => {
  return (
    <div className={`trophy-badge ${className}`} style={{ width: size, height: size }}>
      <div 
        className="badge-circle-border" 
        style={{ backgroundColor: borderColor }}
      ></div>
      <div className="badge-circle-inner">
        {imageUrl && <img src={imageUrl} alt="Badge" />}
      </div>
      {showGiver && giverInitial && (
        <div className="badge-giver">{giverInitial}</div>
      )}
    </div>
  );
};

/**
 * Star shaped badge component
 * @param {Object} props - Component props
 * @param {string} props.borderColor - Hex color for the border
 * @param {string} props.imageUrl - URL for the badge image
 * @param {string} props.giverInitial - Initial letter of the badge giver
 * @param {boolean} props.showGiver - Whether to show the giver indicator
 * @param {string} props.className - Additional class names
 * @param {number} props.size - Size of the badge in pixels
 */
export const StarBadge = ({ 
  borderColor, 
  imageUrl, 
  giverInitial, 
  showGiver = true,
  className = '',
  size = 50 
}) => {
  // New starburst clip path
  const starburstClipPath = "polygon(79.39% 90.45%, 50% 80%, 20.61% 90.45%, 21.47% 59.27%, 2.45% 34.55%, 32.37% 25.73%, 50% 0%, 67.63% 25.73%, 97.55% 34.55%, 78.53% 59.27%)";
  
  return (
    <div className={`trophy-badge ${className}`} style={{ width: size, height: size }}>
      <div 
        className="badge-star-border" 
        style={{ 
          backgroundColor: borderColor,
          clipPath: starburstClipPath
        }}
      ></div>
      <div 
        className="badge-star-inner"
        style={{ 
          clipPath: starburstClipPath
        }}
      >
        {imageUrl && <img src={imageUrl} alt="Badge" />}
      </div>
      {showGiver && giverInitial && (
        <div className="badge-giver">{giverInitial}</div>
      )}
    </div>
  );
};

/**
 * Heart shaped badge component
 * @param {Object} props - Component props
 * @param {string} props.borderColor - Hex color for the border
 * @param {string} props.imageUrl - URL for the badge image
 * @param {string} props.giverInitial - Initial letter of the badge giver
 * @param {boolean} props.showGiver - Whether to show the giver indicator
 * @param {string} props.className - Additional class names
 * @param {number} props.size - Size of the badge in pixels
 */
export const HeartBadge = ({ 
  borderColor, 
  imageUrl, 
  giverInitial, 
  showGiver = true,
  className = '',
  size = 50
}) => {
  // SVG path for heart shape
  const heartPath = "M50,90 C45,85 20,65 10,45 C0,25 10,5 30,5 C40,5 45,10 50,15 C55,10 60,5 70,5 C90,5 100,25 90,45 C80,65 55,85 50,90 Z";
  
  return (
    <div className={`trophy-badge ${className}`} style={{ width: size, height: size }}>
      <div 
        className="badge-heart-border" 
        style={{ 
          backgroundColor: borderColor,
          WebkitMaskImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='${heartPath}' /%3E%3C/svg%3E")`,
          maskImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='${heartPath}' /%3E%3C/svg%3E")`,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%'
        }}
      ></div>
      <div 
        className="badge-heart-inner"
        style={{ 
          WebkitMaskImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='${heartPath}' /%3E%3C/svg%3E")`,
          maskImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='${heartPath}' /%3E%3C/svg%3E")`,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%'
        }}
      >
        {imageUrl && <img src={imageUrl} alt="Badge" />}
      </div>
      {showGiver && giverInitial && (
        <div className="badge-giver">{giverInitial}</div>
      )}
    </div>
  );
};

/**
 * Hexagon shaped badge component
 * @param {Object} props - Component props
 * @param {string} props.borderColor - Hex color for the border
 * @param {string} props.imageUrl - URL for the badge image
 * @param {string} props.giverInitial - Initial letter of the badge giver
 * @param {boolean} props.showGiver - Whether to show the giver indicator
 * @param {string} props.className - Additional class names
 * @param {number} props.size - Size of the badge in pixels
 */
export const HexagonBadge = ({ 
  borderColor, 
  imageUrl, 
  giverInitial, 
  showGiver = true,
  className = '',
  size = 50
}) => {
  // New hexagon clip path
  const hexagonClipPath = "polygon(93.56% 74.55%, 50.52% 100%, 6.96% 75.45%, 6.44% 25.45%, 49.48% 0%, 93.04% 24.55%)";
  
  return (
    <div className={`trophy-badge ${className}`} style={{ width: size, height: size }}>
      <div 
        className="badge-hexagon-border" 
        style={{ 
          backgroundColor: borderColor,
          clipPath: hexagonClipPath
        }}
      ></div>
      <div 
        className="badge-hexagon-inner"
        style={{ 
          clipPath: hexagonClipPath
        }}
      >
        {imageUrl && <img src={imageUrl} alt="Badge" />}
      </div>
      {showGiver && giverInitial && (
        <div className="badge-giver">{giverInitial}</div>
      )}
    </div>
  );
};

/**
 * Renders the appropriate badge shape based on the shape name
 * @param {Object} props - Component props
 * @param {string} props.shape - Shape name (circle, star, heart, hexagon)
 * @param {string} props.borderColor - Hex color for the border
 * @param {string} props.imageUrl - URL for the badge image
 * @param {string} props.giverInitial - Initial letter of the badge giver
 * @param {boolean} props.showGiver - Whether to show the giver indicator
 * @param {string} props.className - Additional class names
 * @param {number} props.size - Size of the badge in pixels
 */
export const Badge = ({ shape, ...props }) => {
  switch (shape) {
    case 'circle':
      return <CircleBadge {...props} />;
    case 'star':
      return <StarBadge {...props} />;
    case 'heart':
      return <HeartBadge {...props} />;
    case 'hexagon':
      return <HexagonBadge {...props} />;
    default:
      return <CircleBadge {...props} />;
  }
};

export default Badge; 