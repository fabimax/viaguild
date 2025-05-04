import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SocialAccountsList from '../components/SocialAccountsList';
import socialAccountService from '../services/socialAccountService';
import userService from '../services/userService';
import '../styles/social.css';
import '../styles/profile.css';
import twitterIcon from '../assets/twitter.svg';
import blueskyIcon from '../assets/bluesky.svg';
import twitchIcon from '../assets/twitch.svg';
import discordIcon from '../assets/discord.svg';

/**
 * Profile page component
 * Displays user information, manages social accounts, guilds, and badges.
 */
function Profile() {
  const { currentUser, connectSocialAccount, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [userBio, setUserBio] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showBlueskyForm, setShowBlueskyForm] = useState(false);
  const [activeTab, setActiveTab] = useState('accounts');
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  /**
   * Fetch user's social accounts and basic profile data (bio, avatar)
   */
  const fetchUserData = async (forceCacheBust = true) => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    
    try {
      // Fetch user profile data (bio, avatar - separate from currentUser)
      const userData = await userService.getUserProfile(currentUser.username, forceCacheBust);
      console.log('Fetched profile data (for bio/avatar):', userData.user);
      setUserBio(userData.user.bio || '');
      setUserAvatar(userData.user.avatar || '');
      // Note: We are NOT setting hiddenAccounts here, relying on currentUser from context
      
      // Then fetch social accounts
      const accounts = await socialAccountService.getSocialAccounts();
      setSocialAccounts(accounts);
    } catch (error) {
      console.error("Failed to load user data:", error);
      setError('Failed to load user data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Effect for initial data loading and when user changes
   */
  useEffect(() => {
    fetchUserData(true);
  }, [currentUser?.username]); // Refetch if username changes

  /**
   * Effect to refresh data when returning via navigation (e.g., back button)
   */
  useEffect(() => {
    // location.key changes on push/replace navigation
    console.log('Location key changed, refreshing user data:', location.key);
    fetchUserData(true);
    refreshUserData(); // Also refresh context data
  }, [location.key]);

  /**
   * Effect to refresh data specifically when returning from public profile view
   */
  useEffect(() => {
    const isFromPublicProfile = location.state && location.state.fromPublicProfile;
    if (isFromPublicProfile) {
      console.log('Returning from public profile view, refreshing data');
      fetchUserData(true);
      refreshUserData(); // Ensure context is also up-to-date
      // Clear the state to prevent re-fetching on subsequent renders
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  /**
   * Navigate to edit profile page (for bio/avatar)
   */
  const handleEditProfile = () => {
    navigate('/profile/edit');
  };

  /**
   * Handle connecting a Twitter account
   */
  const handleConnectTwitter = () => {
    try {
      setError('');
      connectSocialAccount('twitter');
    } catch (error) {
      setError(`Failed to initiate Twitter connection: ${error.message}`);
    }
  };
  
  /**
   * Handle connecting a Twitch account
   */
  const handleConnectTwitch = () => {
    try {
      setError('');
      connectSocialAccount('twitch');
    } catch (error) {
      setError(`Failed to initiate Twitch connection: ${error.message}`);
    }
  };

  /**
   * Handle connecting a Discord account
   */
  const handleConnectDiscord = () => {
    try {
      setError('');
      connectSocialAccount('discord');
    } catch (error) {
      setError(`Failed to initiate Discord connection: ${error.message}`);
    }
  };

  /**
   * Handle connecting a Bluesky account with app password
   */
  const handleConnectBluesky = async (credentials) => {
    try {
      setError('');
      setIsConnecting(true);
      const response = await socialAccountService.connectBlueskyAccount(credentials);
      setSocialAccounts([...socialAccounts, response.socialAccount]);
      setShowBlueskyForm(false);
    } catch (error) {
      setError(`Failed to connect Bluesky account: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Handle removing a social account
   */
  const handleRemoveAccount = async (id) => {
    try {
      setError('');
      await socialAccountService.removeSocialAccount(id);
      setSocialAccounts(socialAccounts.filter(account => account.id !== id));
    } catch (error) {
      setError(`Failed to remove social account: ${error.response?.data?.message || error.message}`);
    }
  };

  /**
   * Handle toggling the visibility of a social account
   */
  const handleToggleAccountVisibility = async (accountId) => {
    // Use currentUser from context as the source of truth
    const currentHidden = currentUser?.hiddenAccounts || [];
    let newHidden;
    const isCurrentlyHidden = currentHidden.includes(accountId);
    
    if (isCurrentlyHidden) {
      newHidden = currentHidden.filter(id => id !== accountId);
    } else {
      newHidden = [...currentHidden, accountId];
    }

    setIsUpdatingVisibility(true);
    setError(''); // Clear previous errors

    try {
      const updatedData = { hiddenAccounts: newHidden };
      // Call API to update profile
      await userService.updateProfile(updatedData);
      
      // Refresh the currentUser data in context - this will trigger re-render
      const updatedUser = await refreshUserData(); 
      
      console.log(
        `Account ${accountId} visibility toggled:`,
        isCurrentlyHidden ? 'now visible' : 'now hidden',
        'Refreshed currentUser hiddenAccounts:',
        updatedUser?.hiddenAccounts
      );

      // No longer need to update local profileData state for hiddenAccounts
      // setProfileData(prevData => ({ 
      //   ...prevData, 
      //   hiddenAccounts: response.user.hiddenAccounts 
      // }));
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update account visibility');
      console.error('Account visibility update error:', err);
      // Attempt to refresh data even on error to possibly resync
      refreshUserData();
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  // Parse URL query parameters to check for error/success messages from OAuth redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorMsg = urlParams.get('error');
    const successMsg = urlParams.get('success');
    
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (successMsg) {
      // If success message, refresh social accounts
      const fetchAccounts = async () => {
        try {
          const accounts = await socialAccountService.getSocialAccounts();
          setSocialAccounts(accounts);
        } catch (err) {
          console.error('Failed to refresh accounts after successful connection', err);
        }
      };
      fetchAccounts();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (loading && !currentUser) {
    // Show a more specific loading state if user data isn't available yet
    return <div className="loading">Loading user session...</div>;
  }
  
  if (loading) {
    return <div className="loading">Loading profile details...</div>;
  }

  return (
    <div className="profile-container">
      {/* Profile Header */} 
      <div className="profile-page-header"> 
        <button 
          className="btn-secondary edit-profile-button"
          onClick={handleEditProfile}
          title="Edit Bio and Avatar" // Add title for clarity
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Edit Profile
        </button>
        <h2>Your Profile</h2>
        <div className="header-spacer"></div> 
      </div>
      
      {error && <div className="error">{error}</div>}
      
      {/* Profile Info */} 
      <div className="profile-info">
        <div className="profile-info-flex">
          <div className="profile-avatar">
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt={`${currentUser.username}'s avatar`} 
                className="avatar-display"
              />
            ) : (
              <div className="avatar-placeholder">
                <span>{currentUser.username?.charAt(0).toUpperCase() || '?'}</span>
              </div>
            )}
          </div>
          
          <div className="profile-details">
            <div className="info-group">
              <label>Username:</label>
              <p>{currentUser.username}</p>
            </div>
            
            <div className="info-group">
              <label>Email:</label>
              <p>{currentUser.email}</p>
            </div>
          </div>
        </div>
        
        <div className="bio-section">
          <h3>Bio</h3>
          <p>{userBio || 'No bio provided yet. Edit your profile to add one.'}</p>
        </div>
      </div>
      
      {/* Profile tabs navigation - UPDATED */}
      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          Social Accounts
        </button>
        <button 
          className={`tab-button ${activeTab === 'guilds' ? 'active' : ''}`}
          onClick={() => setActiveTab('guilds')}
        >
          Guilds
        </button>
        <button 
          className={`tab-button ${activeTab === 'badges' ? 'active' : ''}`}
          onClick={() => setActiveTab('badges')}
        >
          Badges
        </button>
      </div>
      
      {/* Social accounts tab */} 
      {activeTab === 'accounts' && (
        <div className="social-section tab-content">
          <h3>Social Accounts</h3>
          <p>Connect accounts and manage their visibility on your public profile.</p>
          
          <div className="social-buttons">
            <button 
              className="social-btn twitter-btn"
              onClick={handleConnectTwitter}
              disabled={isConnecting}
            >
              <img src={twitterIcon} alt="Twitter logo" className="icon" />
              <span>Connect Twitter</span>
            </button>
            {!showBlueskyForm && (
              <button 
                className="social-btn bluesky-btn"
                onClick={() => setShowBlueskyForm(true)}
                disabled={isConnecting}
              >
                <img src={blueskyIcon} alt="Bluesky logo" className="icon" />
                <span>Connect Bluesky</span>
              </button>
            )}
            <button 
              className="social-btn twitch-btn"
              onClick={handleConnectTwitch}
              disabled={isConnecting}
            >
              <img src={twitchIcon} alt="Twitch logo" className="icon" />
              <span>Connect Twitch</span>
            </button>
            <button 
              className="social-btn discord-btn"
              onClick={handleConnectDiscord}
              disabled={isConnecting}
            >
              <img src={discordIcon} alt="Discord logo" className="icon" />
              <span>Connect Discord</span>
            </button>
          </div>
          {showBlueskyForm && (
            <div className="bluesky-form">
              <h4>Connect your Bluesky Account</h4>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleConnectBluesky({
                  identifier: formData.get('identifier'),
                  appPassword: formData.get('appPassword'),
                });
              }}>
                <div className="form-group">
                  <label htmlFor="identifier">Username or Email</label>
                  <input id="identifier" name="identifier" type="text" placeholder="e.g., username.bsky.social" required />
                </div>
                <div className="form-group">
                  <label htmlFor="appPassword">App Password</label>
                  <input id="appPassword" name="appPassword" type="password" required />
                </div>
                <div className="form-help">
                  <p><small>
                    <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener noreferrer">Create an app password</a> in your Bluesky settings.
                  </small></p>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowBlueskyForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={isConnecting}>{isConnecting ? 'Connecting...' : 'Connect'}</button>
                </div>
              </form>
            </div>
          )}
          
          {isUpdatingVisibility && <div className="loading-inline">Updating visibility...</div>}
          <SocialAccountsList 
            accounts={socialAccounts} 
            hiddenAccounts={currentUser?.hiddenAccounts || []}
            onRemove={handleRemoveAccount} 
            onToggleVisibility={handleToggleAccountVisibility}
            isLoadingVisibility={isUpdatingVisibility}
          />
        </div>
      )}
      
      {/* Guilds tab - Placeholder */} 
      {activeTab === 'guilds' && (
        <div className="guilds-section tab-content">
          <h3>Your Guilds</h3>
          <p>Guild management coming soon!</p>
          {/* Placeholder for Guild list/management components */} 
        </div>
      )}
      
      {/* Badges tab - Placeholder */} 
      {activeTab === 'badges' && (
        <div className="badges-section tab-content">
          <h3>Your Badges</h3>
          <p>Badge display and management coming soon!</p>
          {/* Placeholder for Badge display components */} 
        </div>
      )}

      {/* Public Profile Link */} 
      <div className="public-profile-link">
        <p>
          <span className="view-public-label">View your profile as others see it:</span>
          <Link to={`/users/${currentUser.username}`} className="public-view-link">
            <span className="public-view-icon">👁️</span>
            Public View
          </Link>
          <small className="public-view-hint">
            See how your profile appears to other users
          </small>
        </p>
      </div>
    </div>
  );
}

export default Profile;