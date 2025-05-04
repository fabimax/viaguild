import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProfileSettings from '../components/ProfileSettings';
import userService from '../services/userService';
import socialAccountService from '../services/socialAccountService';
import '../styles/profile.css';

/**
 * EditProfile page component
 * Dedicated page for editing user profile
 */
function EditProfile() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  /**
   * Fetch user's profile data and social accounts on component mount
   */
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user profile data
        const userData = await userService.getUserProfile(currentUser.username);
        setProfileData(userData.user);
        
        // Fetch social accounts
        const accounts = await socialAccountService.getSocialAccounts();
        setSocialAccounts(accounts);
        
        setLoading(false);
      } catch (error) {
        setError('Failed to load user data');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser.username]);

  /**
   * Handle profile data update
   * @param {Object} updatedUser - Updated user profile data
   */
  const handleProfileUpdate = (updatedUser) => {
    setProfileData(updatedUser);
    // Navigate back to profile page after successful update
    navigate('/profile');
  };

  /**
   * Handle cancel and return to profile
   */
  const handleCancel = () => {
    navigate('/profile');
  };

  if (loading) {
    return <div className="loading">Loading profile data...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Edit Your Profile</h2>
        <button 
          className="btn-secondary back-button"
          onClick={handleCancel}
        >
          ← Back to Profile
        </button>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      {profileData && (
        <div className="edit-profile-section">
          <ProfileSettings 
            user={{
              ...profileData,
              socialAccounts: socialAccounts
            }}
            onUpdate={handleProfileUpdate}
            initialEditMode={true}
            showCancelButton={true}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}

export default EditProfile; 