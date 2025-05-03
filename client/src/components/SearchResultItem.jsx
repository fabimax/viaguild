import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import twitterIcon from '../assets/twitter.svg';
import blueskyIcon from '../assets/bluesky.svg';
import twitchIcon from '../assets/twitch.svg';
import discordIcon from '../assets/discord.svg';

/**
 * SearchResultItem component to display a single search result
 * 
 * @param {Object} props - Component props
 * @param {Object} props.result - Search result data
 * @param {string} props.searchQuery - The query string used for highlighting
 */
function SearchResultItem({ result, searchQuery }) {
  
  /**
   * Get the appropriate icon for a platform
   * @param {string} platform - The platform name
   * @returns {Object} - Image source
   */
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'twitter':
        return twitterIcon;
      case 'bluesky':
        return blueskyIcon;
      case 'twitch':
        return twitchIcon;
      case 'discord':
        return discordIcon;
      default:
        return null; // No icon for ViaGuild usernames
    }
  };
  
  /**
   * Highlight the matching part of a username
   * @param {string} username - The username to highlight
   * @param {string} query - The search query
   * @returns {JSX.Element} - Highlighted username
   */
  const highlightMatch = (username, query) => {
    if (!query || !username) return username;
    
    // Find the index of the query in the username (case insensitive)
    const index = username.toLowerCase().indexOf(query.toLowerCase());
    
    if (index === -1) return username;
    
    // Split the username into parts for highlighting
    const before = username.substring(0, index);
    const match = username.substring(index, index + query.length);
    const after = username.substring(index + query.length);
    
    return (
      <>
        {before}
        <strong className="highlight">{match}</strong>
        {after}
      </>
    );
  };

  return (
    <div className="search-result-item">
      <Link to={`/users/${result.username}`} className="result-link">
        <div className="result-user">
          {/* User basic info */}
          <div className="result-username">
            @{result.username}
          </div>
          
          {/* Matched accounts section */}
          <div className="matched-accounts">
            {result.matchedAccounts.map((account, index) => (
              <div key={index} className="matched-account">
                {account.type !== 'viaguild' && (
                  <img 
                    src={getPlatformIcon(account.type)} 
                    alt={`${account.type} icon`} 
                    className="platform-icon" 
                  />
                )}
                <span className="account-platform">
                  {account.type === 'viaguild' ? 'ViaGuild' : 
                   account.type.charAt(0).toUpperCase() + account.type.slice(1)}:
                </span>
                <span className="account-username">
                  {highlightMatch(account.username, searchQuery)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}

SearchResultItem.propTypes = {
  result: PropTypes.shape({
    id: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    matchedAccounts: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string.isRequired,
        username: PropTypes.string.isRequired,
        accountId: PropTypes.string.isRequired
      })
    ).isRequired
  }).isRequired,
  searchQuery: PropTypes.string.isRequired
};

export default SearchResultItem;