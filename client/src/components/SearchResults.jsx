import React from 'react';
import PropTypes from 'prop-types';
import SearchResultItem from './SearchResultItem';

/**
 * SearchResults component to display search results
 * 
 * @param {Object} props - Component props
 * @param {Array} props.results - Search results array
 * @param {string} props.searchQuery - The query string used for highlighting
 * @param {Object} props.counts - Counts of results by platform
 * @param {boolean} props.isLoading - Whether results are loading
 */
function SearchResults({ 
  results, 
  searchQuery = '', 
  counts = {
    total: 0,
    viaguild: 0,
    twitter: 0,
    bluesky: 0,
    twitch: 0
  }, 
  isLoading = false 
}) {
  // If loading, show a loading indicator
  if (isLoading) {
    return (
      <div className="search-results loading">
        <p>Searching...</p>
      </div>
    );
  }

  // If no search has been performed yet
  if (!searchQuery) {
    return (
      <div className="search-results empty">
        <p>Enter a search term to find users</p>
      </div>
    );
  }

  // If search performed but no results
  if (results.length === 0) {
    return (
      <div className="search-results empty">
        <p>No users found matching "{searchQuery}"</p>
      </div>
    );
  }

  // Display results with counts
  return (
    <div className="search-results">
      <div className="results-header">
        <div className="results-count">
          <span className="count-number">{counts.total}</span> users found
        </div>
        
        <div className="platform-counts">
          {counts.viaguild > 0 && (
            <span className="platform-count viaguild">
              ViaGuild: {counts.viaguild}
            </span>
          )}
          {counts.twitter > 0 && (
            <span className="platform-count twitter">
              Twitter: {counts.twitter}
            </span>
          )}
          {counts.bluesky > 0 && (
            <span className="platform-count bluesky">
              Bluesky: {counts.bluesky}
            </span>
          )}
          {counts.twitch > 0 && (
            <span className="platform-count twitch">
              Twitch: {counts.twitch}
            </span>
          )}
        </div>
      </div>
      
      <div className="results-list">
        {results.map(result => (
          <SearchResultItem 
            key={result.id} 
            result={result} 
            searchQuery={searchQuery} 
          />
        ))}
      </div>
    </div>
  );
}

SearchResults.propTypes = {
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
      matchedAccounts: PropTypes.array.isRequired
    })
  ).isRequired,
  searchQuery: PropTypes.string,
  counts: PropTypes.shape({
    total: PropTypes.number.isRequired,
    viaguild: PropTypes.number.isRequired,
    twitter: PropTypes.number.isRequired,
    bluesky: PropTypes.number.isRequired,
    twitch: PropTypes.number.isRequired
  }),
  isLoading: PropTypes.bool
};

export default SearchResults;