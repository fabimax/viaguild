import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import userService from '../services/userService';
import SocialAccountsList from '../components/SocialAccountsList';
import { useAuth } from '../contexts/AuthContext';

/**
 * PublicUserProfile component
 * Displays a user's public profile information as it appears to others
 */
function PublicUserProfile() {
  // Get username from URL params
  const { username } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State for user data and loading status
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState(''); // 'not-found', 'private', 'generic'
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  // Check if viewing own profile - but don't redirect
  useEffect(() => {
    const isOwn = currentUser && currentUser.username === username;
    setIsOwnProfile(isOwn);
    console.log('Viewing profile for:', username, isOwn ? '(own profile)' : '');
  }, [currentUser, username]);
  
  // Fetch the user profile data
  useEffect(() => {
    let isActive = true; // Flag to prevent setting state after component unmounts
    
    const fetchUserProfile = async () => {
      // Validate username
      if (!username) {
        setError('Invalid username');
        setErrorType('generic');
        setIsLoading(false);
        return;
      }
      
      // Username validation regex - allows letters, numbers, and underscores
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        setError('Invalid username format');
        setErrorType('generic');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError('');
      setErrorType('');
      
      try {
        console.log(`Fetching public profile for username: ${username}`);
        const response = await userService.getUserProfile(username);
        
        // Check if component is still mounted
        if (!isActive) return;
        
        if (!response || !response.user) {
          throw new Error('Invalid response format');
        }
        
        console.log('Profile data received successfully');
        setUserData(response.user);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        
        // Only update state if component is still mounted
        if (!isActive) return;
        
        if (err.response?.status === 404) {
          setError(`User "${username}" not found`);
          setErrorType('not-found');
        } else if (err.response?.status === 403) {
          setError('This profile is private');
          setErrorType('private');
        } else {
          setError(`Failed to load user profile: ${err.message || 'Unknown error'}`);
          setErrorType('generic');
        }
        setIsLoading(false);
      }
    };
    
    // Start the fetch
    fetchUserProfile();
    
    // Cleanup function to prevent setting state after unmount
    return () => {
      isActive = false;
    };
  }, [username]); // Only re-run if username changes
  
  /**
   * Navigate to search page
   */
  const goToSearch = () => {
    navigate('/search');
  };
  
  /**
   * Handle retry button click
   */
  const handleRetry = () => {
    setIsLoading(true);
    setError('');
    
    // Force refetch by adding a cache-busting parameter
    userService.getUserProfile(username, true)
      .then(response => {
        setUserData(response.user);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Retry error:', err);
        if (err.response?.status === 404) {
          setError(`User "${username}" not found`);
          setErrorType('not-found');
        } else if (err.response?.status === 403) {
          setError('This profile is private');
          setErrorType('private');
        } else {
          setError(`Failed to load user profile: ${err.message || 'Unknown error'}`);
          setErrorType('generic');
        }
        setIsLoading(false);
      });
  };
  
  /**
   * Generate initials from username for avatar placeholder
   * @param {string} username - User's username
   * @returns {string} - First character of username, capitalized
   */
  const getInitials = (username) => {
    return username ? username.charAt(0).toUpperCase() : '?';
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="loading" aria-live="polite" role="status">
          <div className="loading-spinner"></div>
          <p>Loading profile for {username}...</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="profile-container">
        <div className={`error error-${errorType}`} role="alert">
          <h2>Error</h2>
          <p>{error}</p>
          
          {errorType === 'generic' && (
            <button 
              className="btn-secondary retry-btn"
              onClick={handleRetry}
            >
              Retry
            </button>
          )}
          
          <Link to="/search" className="back-link">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }
  
  // Check if userData exists
  if (!userData) {
    return (
      <div className="profile-container">
        <div className="error error-generic" role="alert">
          <h2>Error</h2>
          <p>Failed to load user profile data</p>
          <button 
            className="btn-secondary retry-btn"
            onClick={handleRetry}
          >
            Retry
          </button>
          <Link to="/search" className="back-link">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }
  
  // Show user profile
  return (
    <div className="profile-container public-profile">
      {isOwnProfile && (
        <div className="info-banner">
          <p>This is how your profile appears to other users</p>
          <Link to="/profile" className="btn-primary btn-sm">
            Go to Private Profile
          </Link>
        </div>
      )}
      
      <div className="profile-header">
        {/* User avatar */}
        <div className="profile-avatar">
          {userData.avatar ? (
            <img 
              src={userData.avatar} 
              alt={`${userData.username}'s avatar`} 
              className="avatar-display"
            />
          ) : (
            <div className="avatar-placeholder">
              <span>{getInitials(userData.username)}</span>
            </div>
          )}
        </div>
        
        <h2>{userData.username}</h2>
        
        {/* Bio section (if available) */}
        {userData.bio && (
          <div className="profile-bio">
            <p>{userData.bio}</p>
          </div>
        )}
      </div>
      
      {/* Social accounts section */}
      <div className="profile-social">
        <SocialAccountsList 
          accounts={userData.socialAccounts || []} 
          onRemove={null} // No remove button for public profile viewing
          isPublicView={true}
        />
      </div>
      
      {/* Navigation */}
      <div className="profile-actions">
        <button 
          onClick={goToSearch}
          className="btn-secondary"
        >
          Back to Search
        </button>
      </div>
    </div>
  );
}

export default PublicUserProfile;