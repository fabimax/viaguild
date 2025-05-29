import React from 'react';
import PropTypes from 'prop-types';
import { Badge } from './BadgeShapes';

/**
 * BadgeSection Component
 * Displays "Recent Badges" and "Available Badges to Give" sections
 * 
 * @param {Object} props - Component props
 * @param {Array} props.receivedBadges - Array of recently received badge instances
 * @param {Array} props.availableBadges - Array of badge counts by tier
 */
const BadgeSection = ({ receivedBadges, availableBadges }) => {
  // Format placeholder image URLs
  const getPlaceholderImage = (size = 50) => `/api/placeholder/${size}/${size}`;

  return (
    <div className="badge-section">
      <div className="badge-received">
        <div className="section-title">Recent Badges</div>
        <div className="badges-list">
          {receivedBadges.map(badge => (
            <div key={badge.id} className="badge-container">
              <Badge 
                shape={badge.template.shape}
                borderColor={badge.template.borderColor}
                imageUrl={badge.template.imageUrl || getPlaceholderImage()}
                giverInitial={badge.giverInitial}
                size={50}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="badge-available">
        <div className="section-title">Available Badges to Give</div>
        <div className="badge-counts">
          {availableBadges.map(badgeCount => (
            <div key={badgeCount.tier} className="badge-count">
              <div className={`count-indicator ${badgeCount.tier.toLowerCase()}-count`}>
                {badgeCount.remaining}
              </div>
              <div>{badgeCount.tier.charAt(0) + badgeCount.tier.slice(1).toLowerCase()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

BadgeSection.propTypes = {
  receivedBadges: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      template: PropTypes.shape({
        shape: PropTypes.string.isRequired,
        borderColor: PropTypes.string.isRequired,
        imageUrl: PropTypes.string
      }).isRequired,
      giverInitial: PropTypes.string
    })
  ).isRequired,
  availableBadges: PropTypes.arrayOf(
    PropTypes.shape({
      tier: PropTypes.string.isRequired,
      remaining: PropTypes.number.isRequired
    })
  ).isRequired
};

export default BadgeSection; 