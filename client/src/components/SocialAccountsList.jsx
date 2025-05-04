import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import twitterIcon from '../assets/twitter.svg';
import blueskyIcon from '../assets/bluesky.svg';
import twitchIcon from '../assets/twitch.svg';
import discordIcon from '../assets/discord.svg';

/**
 * SocialAccountsList Component
 * Displays a list of connected social accounts with actions.
 * 
 * @param {Object} props - Component props
 * @param {Array} props.accounts - Array of social account objects
 * @param {Array} props.hiddenAccounts - Array of IDs for accounts hidden on public profile
 * @param {Function} props.onRemove - Function to call when removing an account
 * @param {Function} props.onToggleVisibility - Function to toggle account visibility
 * @param {boolean} props.isLoadingVisibility - Flag to disable toggle button during update
 * @param {boolean} props.isPublicView - Flag to indicate if used on public profile (hides actions)
 */
function SocialAccountsList({ 
  accounts, 
  hiddenAccounts = [], 
  onRemove, 
  onToggleVisibility,
  isLoadingVisibility = false,
  isPublicView = false
}) {
  // Log whenever hiddenAccounts changes to help debug
  useEffect(() => {
    console.log('SocialAccountsList received hiddenAccounts:', hiddenAccounts);
    
    // Log account visibility status for easier debugging
    accounts.forEach(account => {
      const isHidden = hiddenAccounts.includes(account.id);
      console.log(`Account ${account.provider}:${account.username} (${account.id}) - Hidden: ${isHidden}`);
    });
  }, [accounts, hiddenAccounts]);

  if (accounts.length === 0) {
    return <p className="no-accounts-message">No social accounts connected yet.</p>;
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
      <h3>Connected Accounts</h3>
      
      <ul className="account-items">
        {accounts.map((account) => {
          const isHidden = hiddenAccounts.includes(account.id);
          return (
            <li key={account.id} className={`account-item ${isHidden ? 'hidden-account' : 'visible-account'}`}>
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
                  {isHidden && <span className="hidden-badge">(Hidden)</span>}
                </div>
              </div>
              
              {/* Conditionally render actions */} 
              {!isPublicView && (
                <div className="account-actions">
                  <button 
                    className={`btn-secondary btn-sm visibility-toggle ${isHidden ? 'show-btn' : 'hide-btn'}`}
                    onClick={() => {
                      console.log(`Toggling visibility for account ${account.id}. Currently hidden: ${isHidden}`);
                      onToggleVisibility(account.id);
                    }}
                    disabled={isLoadingVisibility}
                    title={isHidden ? 'Show on public profile' : 'Hide from public profile'}
                    data-account-id={account.id}
                    data-visibility={isHidden ? 'hidden' : 'visible'}
                  >
                    {isLoadingVisibility ? '...' : (isHidden ? 'Show' : 'Hide')}
                  </button>
                  <button 
                    className="btn-danger btn-sm remove-btn"
                    onClick={() => onRemove(account.id)}
                    disabled={isLoadingVisibility}
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          );
        })}
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
  ).isRequired,
  hiddenAccounts: PropTypes.arrayOf(PropTypes.string),
  onRemove: PropTypes.func.isRequired,
  onToggleVisibility: PropTypes.func.isRequired,
  isLoadingVisibility: PropTypes.bool,
  isPublicView: PropTypes.bool,
};

export default SocialAccountsList;