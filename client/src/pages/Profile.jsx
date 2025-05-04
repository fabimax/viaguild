import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SocialAccountsList from '../components/SocialAccountsList';
import VisibilitySettingsForm from '../components/VisibilitySettingsForm';
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
  const navigate = useNavigate();
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showBlueskyForm, setShowBlueskyForm] = useState(false);
  const [activeTab, setActiveTab] = useState('accounts');
  const [isEditingVisibility, setIsEditingVisibility] = useState(false);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState('');

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
        setError('Failed to load profile data');
        setLoading(false);
        try {
           const accounts = await socialAccountService.getSocialAccounts();
           setSocialAccounts(accounts);
        } catch (socialError) {
            setError('Failed to load profile and social account data');
        }
      }
    };

    fetchUserData();
  }, [currentUser.username]);

  /**
   * Navigate to edit profile page
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

  // Parse URL query parameters to check for error/success messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorMsg = urlParams.get('error');
    const successMsg = urlParams.get('success');
    
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (successMsg) {
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

  /** 
   * Handlers for the inline visibility settings form
   */
  const handleVisibilitySave = async (settings) => {
    setIsSavingVisibility(true);
    setVisibilityError('');
    try {
      const updatedData = { 
        isPublic: settings.isPublic, 
        hiddenAccounts: settings.hiddenAccounts 
      };
      const response = await userService.updateProfile(updatedData);
      setProfileData(prevData => ({ ...prevData, ...response.user })); 
      setIsEditingVisibility(false);
    } catch (err) {
      setVisibilityError(err.response?.data?.message || 'Failed to update visibility settings');
      console.error('Visibility update error:', err);
    } finally {
      setIsSavingVisibility(false);
    }
  };

  const handleVisibilityCancel = () => {
    setIsEditingVisibility(false);
    setVisibilityError('');
  };

  const handleIsPublicChange = (newIsPublic) => {
    setProfileData(prevData => ({
      ...prevData,
      isPublic: newIsPublic
    }));
  };

  const handleToggleAccountVisibility = (accountId) => {
    setProfileData(prevData => {
      const currentHidden = prevData.hiddenAccounts || [];
      let newHidden;
      if (currentHidden.includes(accountId)) {
        newHidden = currentHidden.filter(id => id !== accountId);
      } else {
        newHidden = [...currentHidden, accountId];
      }
      return { ...prevData, hiddenAccounts: newHidden };
    });
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  const VisibilitySettingsView = () => (
    <div className="profile-settings-view"> 
      <div className="settings-header">
        <h3>Profile Settings</h3>
        <div className="settings-actions">
          <button 
            className="btn-secondary edit-btn"
            onClick={() => setIsEditingVisibility(true)}
          >
            Edit Profile Settings
          </button>
        </div>
      </div>
      <div className="settings-view-content">
        <div className="setting-item">
          <h4>Profile Visibility</h4>
          <p>{profileData?.isPublic !== false ? 'Public' : 'Private'}</p>
        </div>
        <div className="setting-item">
          <h4>Hidden Accounts</h4>
          <p>
            {(profileData?.hiddenAccounts || []).length === 0 
              ? 'No hidden accounts' 
              : `${profileData.hiddenAccounts.length} account(s) hidden`}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="profile-container">
      <div className="profile-page-header"> 
        <button 
          className="btn-secondary edit-profile-button"
          onClick={handleEditProfile}
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
        
        <div className="bio-section">
          <h3>Bio</h3>
          <p>{profileData?.bio || 'No bio provided yet. Edit your profile to add one.'}</p>
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
            
            {/* Discord connect button */}
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
          {visibilityError && <div className="error">{visibilityError}</div>}
          
          {!isEditingVisibility ? (
            <VisibilitySettingsView />
          ) : (
            <VisibilitySettingsForm 
              isPublic={profileData.isPublic !== false}
              hiddenAccounts={profileData.hiddenAccounts || []}
              socialAccounts={socialAccounts}
              onIsPublicChange={handleIsPublicChange}
              onToggleAccountVisibility={handleToggleAccountVisibility}
              isSubmitting={isSavingVisibility}
              onSave={handleVisibilitySave}
              onCancel={handleVisibilityCancel}
            />
          )}
        </div>
      )}

      {/* Public Profile Link - Moved here */}
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