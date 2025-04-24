import React from 'react';
import PropTypes from 'prop-types';
import twitterIcon from '../assets/twitter.svg';
import blueskyIcon from '../assets/bluesky.svg';

/**
 * Component to display a list of connected social accounts
 * @param {Object} props - Component props
 * @param {Array} props.accounts - Array of social account objects
 * @param {Function} props.onRemove - Function to call when removing an account
 */
function SocialAccountsList({ accounts, onRemove }) {
  if (!accounts || accounts.length === 0) {
    return (
      <div className="no-accounts">
        <p>No social accounts connected yet.</p>
      </div>
    );
  }

  // Helper function to get the appropriate icon
  const getProviderIcon = (provider) => {
    return provider === 'twitter' ? twitterIcon : blueskyIcon;
  };

  return (
    <div className="accounts-list">
      <h3>Connected Accounts</h3>
      
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
                  {account.provider === 'twitter' ? 'Twitter' : 'Bluesky'}
                </span>
                <span className="username">@{account.username}</span>
              </div>
            </div>
            
            <button 
              className="remove-btn"
              onClick={() => onRemove(account.id)}
              aria-label={`Remove ${account.provider} account`}
            >
              Remove
            </button>
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
  onRemove: PropTypes.func.isRequired,
};

SocialAccountsList.defaultProps = {
  accounts: [],
};

export default SocialAccountsList;