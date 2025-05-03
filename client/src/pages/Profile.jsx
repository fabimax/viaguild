import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SocialAccountsList from '../components/SocialAccountsList';
import ProfileSettings from '../components/ProfileSettings';
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
 * Displays user information and manages social account connections
 */
function Profile() {
  const { currentUser, connectSocialAccount } = useAuth();
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showBlueskyForm, setShowBlueskyForm] = useState(false);
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' or 'settings'

  /**
   * Fetch user's social accounts and profile data on component mount
   */
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch social accounts
        const accounts = await socialAccountService.getSocialAccounts();
        setSocialAccounts(accounts);
        
        // Fetch user profile data
        const userData = await userService.getUserProfile(currentUser.username);
        setProfileData(userData.user);
        
        setLoading(false);
      } catch (error) {
        setError('Failed to load user data');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser.username]);

  /**
   * Handle connecting a Twitter account
   * Uses the OAuth authentication flow via AuthContext
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
   * Uses the OAuth authentication flow via AuthContext
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
   * Uses the OAuth authentication flow via AuthContext
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
   * @param {Object} credentials - Object containing identifier and appPassword
   */
  const handleConnectBluesky = async (credentials) => {
    try {
      setError('');
      setIsConnecting(true);
      
      const response = await socialAccountService.connectBlueskyAccount(credentials);
      
      // Add the new account to the list
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
   * @param {string} id - ID of the social account to remove
   */
  const handleRemoveAccount = async (id) => {
    try {
      setError('');
      await socialAccountService.removeSocialAccount(id);
      
      // Update the UI after successful removal
      setSocialAccounts(socialAccounts.filter(account => account.id !== id));
    } catch (error) {
      setError(`Failed to remove social account: ${error.response?.data?.message || error.message}`);
    }
  };
  
  /**
   * Handle profile data update
   * @param {Object} updatedUser - Updated user profile data
   */
  const handleProfileUpdate = (updatedUser) => {
    setProfileData(updatedUser);
  };

  // Parse URL query parameters to check for error/success messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorMsg = urlParams.get('error');
    const successMsg = urlParams.get('success');
    
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      // Clean URL without refreshing
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
      // Clean URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <h2>Your Profile</h2>
      
      {error && <div className="error">{error}</div>}
      
      <div className="profile-info">
        <div className="profile-info-flex">
          {/* Avatar display */}
          <div className="profile-avatar">
            {profileData && profileData.avatar ? (
              <img 
                src={profileData.avatar} 
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
      </div>
      
      {/* Profile tabs navigation */}
      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          Social Accounts
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Profile Settings
        </button>
      </div>
      
      {/* Social accounts tab */}
      {activeTab === 'accounts' && (
        <div className="social-section">
          <h3>Social Accounts</h3>
          <p>Connect your social media accounts to ViaGuild.</p>
          
          <div className="social-buttons">
            {/* Twitter connect button */}
            <button 
              className="social-btn twitter-btn"
              onClick={handleConnectTwitter}
              disabled={isConnecting}
            >
              <img src={twitterIcon} alt="Twitter logo" className="icon" />
              <span>Connect Twitter</span>
            </button>
            
            {/* Bluesky connect button (not form) */}
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
            
            {/* Twitch connect button */}
            <button 
              className="social-btn twitch-btn"
              onClick={handleConnectTwitch}
              disabled={isConnecting}
            >
              <img src={twitchIcon} alt="Twitch logo" className="icon" />
              <span>Connect Twitch</span>
            </button>
            
            {/* Discord connect button (New) */}
            <button 
              className="social-btn discord-btn"
              onClick={handleConnectDiscord}
              disabled={isConnecting}
            >
              <img src={discordIcon} alt="Discord logo" className="icon" />
              <span>Connect Discord</span>
            </button>
          </div>
          
          {/* Bluesky connection form */}
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
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    placeholder="e.g., username.bsky.social"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="appPassword">App Password</label>
                  <input
                    id="appPassword"
                    name="appPassword"
                    type="password"
                    required
                  />
                </div>
                
                <div className="form-help">
                  <p><small>
                    <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener noreferrer">
                      Create an app password
                    </a> in your Bluesky settings.
                  </small></p>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setShowBlueskyForm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn-primary"
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <SocialAccountsList 
            accounts={socialAccounts} 
            onRemove={handleRemoveAccount} 
          />
        </div>
      )}
      
      {/* Profile settings tab */}
      {activeTab === 'settings' && profileData && (
        <div className="settings-section">
          <ProfileSettings 
            user={{
              ...profileData,
              socialAccounts: socialAccounts
            }}
            onUpdate={handleProfileUpdate}
          />
          
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
      )}
    </div>
  );
}

export default Profile;