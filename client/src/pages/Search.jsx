import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import userService from '../services/userService';

/**
 * Search page component with better error handling
 * Allows users to search for other users across platforms
 */
function Search() {
  // State for search results and loading status
  const [results, setResults] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    viaguild: 0,
    twitter: 0,
    bluesky: 0,
    twitch: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  // Get and set URL search parameters
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const platform = searchParams.get('platform') || 'all';
  
  // Debug info
  const [debugInfo, setDebugInfo] = useState([]);
  
  // Add debug info
  const addDebug = (message) => {
    console.log(`DEBUG: ${message}`);
    setDebugInfo(prev => [...prev, `${new Date().toISOString().substring(11, 19)}: ${message}`]);
  };
  
  /**
   * Handle search submission
   * @param {string} searchQuery - Search query
   * @param {string} platformFilter - Platform filter
   */
  const handleSearch = (searchQuery, platformFilter) => {
    addDebug(`Search submitted: "${searchQuery}", platform: ${platformFilter}`);
    // Update URL search parameters
    setSearchParams({ q: searchQuery, platform: platformFilter });
  };

  // Perform search when URL parameters change
  useEffect(() => {
    addDebug(`URL parameters changed: q=${query}, platform=${platform}`);
    
    // Only search if there is a query
    if (query.trim().length >= 2) {
      const fetchUsers = async () => {
        addDebug(`Starting search for "${query}" on platform ${platform}`);
        setIsLoading(true);
        setError('');
        
        try {
          const data = await userService.searchUsers(query, platform);
          addDebug(`Search returned ${data.results?.length || 0} results`);
          
          if (!data || !data.results) {
            addDebug('Invalid response format - missing results array');
            throw new Error('Invalid response format from server');
          }
          
          setResults(data.results);
          setCounts(data.counts || {
            total: data.results.length,
            viaguild: 0,
            twitter: 0,
            bluesky: 0,
            twitch: 0
          });
          setSearchPerformed(true);
        } catch (err) {
          addDebug(`Search error: ${err.message}`);
          setError(`Failed to search users: ${err.message}`);
          console.error('Search error:', err);
          // Reset results in case of error
          setResults([]);
          setCounts({
            total: 0,
            viaguild: 0,
            twitter: 0,
            bluesky: 0,
            twitch: 0
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchUsers();
    } else if (query.trim().length > 0) {
      addDebug(`Query too short: "${query}"`);
      setError('Search query must be at least 2 characters long');
      setResults([]);
      setIsLoading(false);
    }
  }, [query, platform]);

  // Show debug info if needed (in development)
  const showDebugInfo = process.env.NODE_ENV !== 'production';

  return (
    <div className="search-page">
      <h1>Find Users</h1>
      
      <SearchBar 
        onSearch={handleSearch} 
        initialQuery={query} 
        initialPlatform={platform}
      />
      
      {error && (
        <div className="error">
          {error}
          <button 
            className="retry-btn"
            onClick={() => handleSearch(query, platform)}
          >
            Retry
          </button>
        </div>
      )}
      
      <SearchResults 
        results={results}
        searchQuery={query}
        counts={counts}
        isLoading={isLoading}
      />
      
      {/* Show additional info if no search has been performed yet */}
      {!searchPerformed && !isLoading && !query && (
        <div className="search-help">
          <h2>Search Tips</h2>
          <ul>
            <li>Search for users by their ViaGuild username or connected social accounts</li>
            <li>Use the platform filter to narrow your search</li>
            <li>Search is case-insensitive and partial matches work</li>
          </ul>
        </div>
      )}
      
      {/* Debug info */}
      {showDebugInfo && debugInfo.length > 0 && (
        <div className="debug-info">
          <details>
            <summary>Debug Info</summary>
            <pre>{debugInfo.join('\n')}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default Search;