import React from 'react';
import PropTypes from 'prop-types';

/**
 * Guild Card Component
 * Displays a single guild with banner, avatar, name, and metadata
 * 
 * @param {Object} props - Component props
 * @param {Object} props.guild - Guild data object
 */
const GuildCard = ({ guild }) => {
  // Get the appropriate banner color class based on the color
  const getBannerClass = () => {
    if (guild.bannerColor === '#818cf8') return 'primary-light';
    if (guild.bannerColor === '#8b5cf6') return 'purple';
    if (guild.bannerColor === '#ec4899') return 'pink';
    if (guild.bannerColor === '#0ea5e9') return 'blue';
    return '';
  };

  return (
    <div className="guild-card">
      <div 
        className={`guild-banner ${getBannerClass()}`}
        style={{ backgroundColor: guild.bannerColor }}
      >
        {guild.isPrimary && <div className="primary-badge">Primary</div>}
        <div className="guild-avatar">{guild.avatarInitial}</div>
      </div>
      <div className="guild-content">
        <h3 className="guild-name">{guild.name}</h3>
        <div className="guild-meta">
          <div>{guild.memberCount} members</div>
          <div>{guild.userRole.charAt(0) + guild.userRole.slice(1).toLowerCase()}</div>
        </div>
      </div>
    </div>
  );
};

GuildCard.propTypes = {
  guild: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    avatarInitial: PropTypes.string,
    bannerColor: PropTypes.string,
    memberCount: PropTypes.number,
    userRole: PropTypes.string,
    isPrimary: PropTypes.bool
  }).isRequired
};

export default GuildCard; 