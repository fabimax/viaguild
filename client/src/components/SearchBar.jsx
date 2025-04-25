import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * SearchBar component with platform filter and enhanced validation
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onSearch - Function to call when search is submitted
 * @param {string} props.initialQuery - Initial search query (optional)
 * @param {string} props.initialPlatform - Initial platform filter (optional)
 */
function SearchBar({ onSearch, initialQuery = '', initialPlatform = 'all' }) {
  // State for search query and selected platform
  const [query, setQuery] = useState(initialQuery);
  const [platform, setPlatform] = useState(initialPlatform);
  const [validationMessage, setValidationMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Minimum query length for validation
  const MIN_QUERY_LENGTH = 2;
  
  // Validate query when it changes
  useEffect(() => {
    if (isTyping) {
      if (query.trim().length === 0) {
        setValidationMessage('');
      } else if (query.trim().length < MIN_QUERY_LENGTH) {
        setValidationMessage(`Search query must be at least ${MIN_QUERY_LENGTH} characters`);
      } else {
        setValidationMessage('');
      }
    }
  }, [query, isTyping]);
  
  /**
   * Handle input change with debounced validation
   * @param {Event} e - Input change event
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsTyping(true);
    
    // Reset typing state after a short delay
    clearTimeout(window.searchTypingTimeout);
    window.searchTypingTimeout = setTimeout(() => {
      setIsTyping(false);
    }, 500);
  };
  
  /**
   * Check if form is valid for submission
   * @returns {boolean} - Whether form is valid
   */
  const isValid = () => {
    return query.trim().length >= MIN_QUERY_LENGTH;
  };
  
  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isValid()) {
      onSearch(query.trim(), platform);
    }
  };

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} noValidate>
        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              className={`search-input ${validationMessage ? 'has-error' : ''}`}
              placeholder="Search users..."
              value={query}
              onChange={handleInputChange}
              aria-label="Search users"
              aria-describedby="search-validation"
              aria-invalid={!!validationMessage}
              minLength={MIN_QUERY_LENGTH}
              required
            />
            <div className="platform-selector">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                aria-label="Filter by platform"
                className="platform-select"
              >
                <option value="all">All Platforms</option>
                <option value="viaguild">ViaGuild</option>
                <option value="twitter">Twitter</option>
                <option value="bluesky">Bluesky</option>
                <option value="twitch">Twitch</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="search-button"
            disabled={!isValid()}
          >
            Search
          </button>
        </div>
        
        {/* Validation message */}
        {validationMessage && (
          <div 
            id="search-validation" 
            className="validation-message"
            role="alert"
          >
            {validationMessage}
          </div>
        )}
      </form>
    </div>
  );
}

SearchBar.propTypes = {
  onSearch: PropTypes.func.isRequired,
  initialQuery: PropTypes.string,
  initialPlatform: PropTypes.string,
};

export default SearchBar;