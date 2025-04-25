import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PublicUserProfile from '../pages/PublicUserProfile';
import userService from '../services/userService';

// Mock the userService
jest.mock('../services/userService');

// Mock the react-router-dom's useParams hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ username: 'testuser' }),
  Link: ({ children, to }) => <a href={to}>{children}</a>
}));

// Mock the SocialAccountsList component
jest.mock('../components/SocialAccountsList', () => {
  return function MockSocialAccountsList({ accounts, isPublicView }) {
    return (
      <div data-testid="social-accounts-list">
        <span>Accounts: {accounts.length}</span>
        <span>Public View: {isPublicView.toString()}</span>
      </div>
    );
  };
});

describe('PublicUserProfile Component', () => {
  const mockUserData = {
    id: '1',
    username: 'testuser',
    bio: 'This is a test user bio',
    isPublic: true,
    socialAccounts: [
      { id: '1', provider: 'twitter', username: 'twitteruser' },
      { id: '2', provider: 'bluesky', username: 'blueskyuser' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    // Mock the getUserProfile function to return a promise that never resolves
    userService.getUserProfile.mockImplementation(() => new Promise(() => {}));
    
    render(
      <BrowserRouter>
        <PublicUserProfile />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('renders user profile data correctly', async () => {
    // Mock successful API response
    userService.getUserProfile.mockResolvedValue({ user: mockUserData });
    
    render(
      <BrowserRouter>
        <PublicUserProfile />
      </BrowserRouter>
    );
    
    // Wait for the profile data to load
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });
    
    // Check for bio
    expect(screen.getByText('This is a test user bio')).toBeInTheDocument();
    
    // Check for social accounts list
    const socialAccounts = screen.getByTestId('social-accounts-list');
    expect(socialAccounts).toBeInTheDocument();
    expect(socialAccounts).toHaveTextContent('Accounts: 2');
    expect(socialAccounts).toHaveTextContent('Public View: true');
    
    // Check for back button
    expect(screen.getByText('Back to Search')).toBeInTheDocument();
  });

  it('renders 404 error correctly', async () => {
    // Mock API response for user not found
    userService.getUserProfile.mockRejectedValue({
      response: { status: 404 }
    });
    
    render(
      <BrowserRouter>
        <PublicUserProfile />
      </BrowserRouter>
    );
    
    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText('User "testuser" not found')).toBeInTheDocument();
    });
    
    // Check for back link
    expect(screen.getByText('Back to Search')).toBeInTheDocument();
  });

  it('renders private profile error correctly', async () => {
    // Mock API response for private profile
    userService.getUserProfile.mockRejectedValue({
      response: { status: 403 }
    });
    
    render(
      <BrowserRouter>
        <PublicUserProfile />
      </BrowserRouter>
    );
    
    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText('This profile is private')).toBeInTheDocument();
    });
  });

  it('renders generic error correctly', async () => {
    // Mock API response for server error
    userService.getUserProfile.mockRejectedValue({
      response: { status: 500 }
    });
    
    render(
      <BrowserRouter>
        <PublicUserProfile />
      </BrowserRouter>
    );
    
    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to load user profile')).toBeInTheDocument();
    });
  });
});