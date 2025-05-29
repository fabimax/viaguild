import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SearchResults from '../components/SearchResults';

// Mock the SearchResultItem component
jest.mock('../components/SearchResultItem', () => {
  return function MockSearchResultItem({ result, searchQuery }) {
    return (
      <div data-testid="search-result-item">
        <span>Username: {result.username}</span>
        <span>Query: {searchQuery}</span>
      </div>
    );
  };
});

describe('SearchResults Component', () => {
  const mockResults = [
    {
      id: '1',
      username: 'user1',
      matchedAccounts: [
        { type: 'viaguild', username: 'user1', accountId: '1' },
        { type: 'twitter', username: 'twitteruser1', accountId: '2' }
      ]
    },
    {
      id: '2',
      username: 'user2',
      matchedAccounts: [
        { type: 'bluesky', username: 'blueskyuser2', accountId: '3' }
      ]
    }
  ];
  
  const mockCounts = {
    total: 2,
    viaguild: 1,
    twitter: 1,
    bluesky: 1,
    twitch: 0
  };

  it('renders loading state correctly', () => {
    render(
      <BrowserRouter>
        <SearchResults 
          results={[]}
          searchQuery="test"
          counts={mockCounts}
          isLoading={true}
        />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('renders empty state when no search has been performed', () => {
    render(
      <BrowserRouter>
        <SearchResults 
          results={[]}
          searchQuery=""
          counts={{total: 0, viaguild: 0, twitter: 0, bluesky: 0, twitch: 0}}
          isLoading={false}
        />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Enter a search term to find users')).toBeInTheDocument();
  });

  it('renders no results message when search performed but no results found', () => {
    render(
      <BrowserRouter>
        <SearchResults 
          results={[]}
          searchQuery="nonexistent"
          counts={{total: 0, viaguild: 0, twitter: 0, bluesky: 0, twitch: 0}}
          isLoading={false}
        />
      </BrowserRouter>
    );
    
    expect(screen.getByText('No users found matching "nonexistent"')).toBeInTheDocument();
  });

  it('renders search results correctly', () => {
    render(
      <BrowserRouter>
        <SearchResults 
          results={mockResults}
          searchQuery="test"
          counts={mockCounts}
          isLoading={false}
        />
      </BrowserRouter>
    );
    
    // Check for results count
    expect(screen.getByText('2')).toBeInTheDocument(); // Total count
    expect(screen.getByText('users found')).toBeInTheDocument();
    
    // Check for platform counts
    expect(screen.getByText('ViaGuild: 1')).toBeInTheDocument();
    expect(screen.getByText('Twitter: 1')).toBeInTheDocument();
    expect(screen.getByText('Bluesky: 1')).toBeInTheDocument();
    expect(screen.queryByText('Twitch:')).not.toBeInTheDocument(); // Twitch count is 0, shouldn't be shown
    
    // Check for search result items
    const resultItems = screen.getAllByTestId('search-result-item');
    expect(resultItems).toHaveLength(2);
  });

  it('renders correctly with zero results', () => {
    render(
      <BrowserRouter>
        <SearchResults 
          results={[]}
          searchQuery="test"
          counts={{total: 0, viaguild: 0, twitter: 0, bluesky: 0, twitch: 0}}
          isLoading={false}
        />
      </BrowserRouter>
    );
    
    expect(screen.getByText('No users found matching "test"')).toBeInTheDocument();
  });
});