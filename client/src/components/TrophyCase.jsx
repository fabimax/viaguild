import React from 'react';
import PropTypes from 'prop-types';
import { Badge } from './BadgeShapes';

/**
 * TrophyCase Component
 * Displays a grid of badge achievements selected by the user
 * 
 * @param {Object} props - Component props
 * @param {Array} props.badges - Array of badge objects to display
 * @param {Function} props.onEdit - Function called when edit button is clicked
 */
const TrophyCase = ({ badges, onEdit }) => {
  // Format placeholder image URLs
  const getPlaceholderImage = (size = 80) => `/api/placeholder/${size}/${size}`;

  return (
    <div className="trophy-case">
      <div className="trophy-case-header">
        <div className="section-title">Trophy Case</div>
        <button className="edit-button" onClick={onEdit}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Edit Display
        </button>
      </div>
      
      <div className="trophy-case-grid">
        {badges.map(badge => (
          <div key={badge.id} className="trophy-badge-container">
            <Badge 
              shape={badge.template.shape}
              borderColor={badge.template.borderColor}
              imageUrl={badge.template.imageUrl || getPlaceholderImage(80)}
              giverInitial={badge.giverInitial}
              size={80}
            />
            <div className="trophy-badge-name">{badge.template.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

TrophyCase.propTypes = {
  badges: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      template: PropTypes.shape({
        shape: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        borderColor: PropTypes.string.isRequired,
        imageUrl: PropTypes.string
      }).isRequired,
      giverInitial: PropTypes.string
    })
  ).isRequired,
  onEdit: PropTypes.func
};

TrophyCase.defaultProps = {
  onEdit: () => console.log('Edit trophy case clicked')
};

export default TrophyCase; 