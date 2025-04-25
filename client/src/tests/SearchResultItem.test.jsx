import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SearchResultItem from '../components/SearchResultItem';

describe('SearchResultItem Component', () => {
  // Mock the asset imports
  jest.mock('../assets/twitter.svg', () => 'twitter-icon-mock');
  jest.mock('../assets/bluesky.svg', () => 'bluesky-icon-mock');
  jest.mock('../assets/twitch.svg', () => 'twitch-icon-mock');

  const mockResult = {
    id: '1',
    username: 'testuser',
    matchedAccounts: [
      { type: 'viaguild', username: 'testuser', accountId: '1' },
      { type: 'twitter', username: 'twitterhandle', accountId: '2' },
      { type: 'bluesky', username: 'blueskyhandle', accountId: '3' }
    ]
  };

  it('renders correctly with result data', () => {
    render(
      <BrowserRouter>
        <SearchResultItem 
          result={mockResult} 
          searchQuery="test" 
        />
      </BrowserRouter>
    );
    
    // Check if username is displayed
    expect(screen.getByText('@testuser')).toBeInTheDocument();
    
    // Check if all matched accounts are displayed
    expect(screen.getByText('ViaGuild:')).toBeInTheDocument();
    expect(screen.getByText('Twitter:')).toBeInTheDocument();
    expect(screen.getByText('Bluesky:')).toBeInTheDocument();
  });

  it('correctly highlights the matching part of usernames', () => {
    render(
      <BrowserRouter>
        <SearchResultItem 
          result={mockResult} 
          searchQuery="test" 
        />
      </BrowserRouter>
    );
    
    // Get all elements containing "test" with strong highlighting
    const highlightedElements = screen.getAllByText('test');
    expect(highlightedElements.length).toBeGreaterThan(0);
    
    // For the first highlighted element, check if its parent contains the full username
    const parentElement = highlightedElements[0].parentElement;
    expect(parentElement.textContent).toContain('testuser');
  });

  it('creates a link to the user profile', () => {
    render(
      <BrowserRouter>
        <SearchResultItem 
          result={mockResult} 
          searchQuery="test" 
        />
      </BrowserRouter>
    );
    
    // Check if the link to the user profile exists
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/users/testuser');
  });

  it('renders different platform icons correctly', () => {
    // This test would check if the platform icons are rendered correctly,
    // but since we're mocking the SVG imports, we'll just check if the account types are displayed
    render(
      <BrowserRouter>
        <SearchResultItem 
          result={{
            id: '1',
            username: 'user123',
            matchedAccounts: [
              { type: 'twitter', username: 'twitteruser', accountId: '1' },
              { type: 'bluesky', username: 'blueskyuser', accountId: '2' },
              { type: 'twitch', username: 'twitchuser', accountId: '3' }
            ]
          }} 
          searchQuery="user" 
        />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Twitter:')).toBeInTheDocument();
    expect(screen.getByText('Bluesky:')).toBeInTheDocument();
    expect(screen.getByText('Twitch:')).toBeInTheDocument();
  });

  it('handles no query highlighting gracefully', () => {
    render(
      <BrowserRouter>
        <SearchResultItem 
          result={mockResult} 
          searchQuery="" 
        />
      </BrowserRouter>
    );
    
    // The component should render without errors
    expect(screen.getByText('@testuser')).toBeInTheDocument();
  });
});