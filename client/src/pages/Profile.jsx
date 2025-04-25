import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SocialAccountsList from '../components/SocialAccountsList';
import socialAccountService from '../services/socialAccountService';
import '../styles/social.css';
import twitterIcon from '../assets/twitter.svg';
import blueskyIcon from '../assets/bluesky.svg';

/**
 * Profile page component
 * Displays user information and manages social account connections
 */
function Profile() {
  const { currentUser, connectSocialAccount } = useAuth();
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showBlueskyForm, setShowBlueskyForm] = useState(false);

  /**
   * Fetch user's social accounts on component mount
   */
  useEffect(() => {
    const fetchSocialAccounts = async () => {
      try {
        const accounts = await socialAccountService.getSocialAccounts();
        setSocialAccounts(accounts);
        setLoading(false);
      } catch (error) {
        setError('Failed to load social accounts');
        setLoading(false);
      }
    };

    fetchSocialAccounts();
  }, []);

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
        <div className="info-group">
          <label>Username:</label>
          <p>{currentUser.username}</p>
        </div>
        
        <div className="info-group">
          <label>Email:</label>
          <p>{currentUser.email}</p>
        </div>
      </div>
      
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
    </div>
  );
}

export default Profile;