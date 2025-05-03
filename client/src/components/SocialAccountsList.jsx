import React from 'react';
import PropTypes from 'prop-types';
import twitterIcon from '../assets/twitter.svg';
import blueskyIcon from '../assets/bluesky.svg';
import twitchIcon from '../assets/twitch.svg';
import discordIcon from '../assets/discord.svg';

/**
 * Component to display a list of connected social accounts
 * @param {Object} props - Component props
 * @param {Array} props.accounts - Array of social account objects
 * @param {Function} props.onRemove - Function to call when removing an account
 * @param {boolean} props.isPublicView - Whether this is for public profile view
 */
function SocialAccountsList({ accounts = [], onRemove, isPublicView = false }) {
  if (!accounts || accounts.length === 0) {
    return (
      <div className="no-accounts">
        <p>No social accounts connected{isPublicView ? '' : ' yet'}.</p>
      </div>
    );
  }

  // Helper function to get the appropriate icon
  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'twitter':
        return twitterIcon;
      case 'twitch':
        return twitchIcon;
      case 'discord':
        return discordIcon;
      default:
        return blueskyIcon;
    }
  };

  // Helper function to get formatted provider name
  const getProviderName = (provider) => {
    switch (provider) {
      case 'twitter':
        return 'Twitter';
      case 'twitch':
        return 'Twitch';
      case 'discord':
        return 'Discord';
      case 'bluesky':
        return 'Bluesky';
      default:
        return provider;
    }
  };

  return (
    <div className="accounts-list">
      <h3>{isPublicView ? 'Connected Accounts' : 'Connected Accounts'}</h3>
      
      <ul className="account-items">
        {accounts.map((account) => (
          <li key={account.id} className="account-item">
            <div className="account-info">
              <div className="account-icon">
                <img 
                  src={getProviderIcon(account.provider)} 
                  alt={`${account.provider} icon`} 
                />
              </div>
              <div>
                <span className={`provider ${account.provider}`}>
                  {getProviderName(account.provider)}
                </span>
                <span className="username">@{account.username}</span>
              </div>
            </div>
            
            {/* Only show remove button if not in public view and onRemove is provided */}
            {!isPublicView && onRemove && (
              <button 
                className="remove-btn"
                onClick={() => onRemove(account.id)}
                aria-label={`Remove ${account.provider} account`}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

SocialAccountsList.propTypes = {
  accounts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      provider: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
    })
  ),
  onRemove: PropTypes.func,
  isPublicView: PropTypes.bool
};

export default SocialAccountsList;