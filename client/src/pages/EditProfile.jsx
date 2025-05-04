import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProfileSettings from '../components/ProfileSettings';
import userService from '../services/userService';
import '../styles/profile.css';

/**
 * EditProfile page component
 * Dedicated page for editing user profile (Avatar and Bio only)
 */
function EditProfile() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  /**
   * Fetch user's profile data on component mount
   */
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError('');
      try {
        const userData = await userService.getUserProfile(currentUser.username);
        setProfileData(userData.user);
      } catch (error) {
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser.username]);

  /**
   * Handle profile data update (only Bio/Avatar changed)
   * @param {Object} updatedUser - FULL updated user profile data from API
   */
  const handleProfileUpdate = (updatedUser) => {
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
            user={profileData}
            onUpdate={handleProfileUpdate}
            showCancelButton={true}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}

export default EditProfile; 