import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SocialAccountsList from '../components/SocialAccountsList';
import BlueskyConnectForm from '../components/BlueskyConnectForm';
import socialAccountService from '../services/socialAccountService';

/**
 * Profile page component
 * Displays user information and manages social account connections
 */
function Profile() {
  const { currentUser } = useAuth();
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

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
   * Handle connecting a Twitter account (still using mock for now)
   */
  const handleConnectTwitter = async () => {
    try {
      setError('');
      setIsConnecting(true);
      
      // For development, use mock endpoint
      const response = await socialAccountService.connectTwitterMock();
      
      // Add the new account to the list
      setSocialAccounts([...socialAccounts, response.socialAccount]);
    } catch (error) {
      setError(`Failed to connect Twitter account: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsConnecting(false);
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

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <h2>Your Profile</h2>
      
      {error && <div className="error">{error}</div>}
      
      <div className="profile-info">
        <div className="info-group">
          <label>Email:</label>
          <p>{currentUser.email}</p>
        </div>
        
        {currentUser.firstName && (
          <div className="info-group">
            <label>First Name:</label>
            <p>{currentUser.firstName}</p>
          </div>
        )}
        
        {currentUser.lastName && (
          <div className="info-group">
            <label>Last Name:</label>
            <p>{currentUser.lastName}</p>
          </div>
        )}
      </div>
      
      <div className="social-section">
        <h3>Social Accounts</h3>
        <p>Connect your social media accounts to ViaGuild.</p>
        
        <div className="social-buttons">
          <button 
            className="twitter-btn"
            onClick={handleConnectTwitter}
            disabled={isConnecting}
          >
            Connect Twitter
          </button>
          
          {/* Replace the button with our new component */}
          <BlueskyConnectForm 
            onConnect={handleConnectBluesky}
            isLoading={isConnecting}
          />
        </div>
        
        <SocialAccountsList 
          accounts={socialAccounts} 
          onRemove={handleRemoveAccount} 
        />
      </div>
    </div>
  );
}

export default Profile;