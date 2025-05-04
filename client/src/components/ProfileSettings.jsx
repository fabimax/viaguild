import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import userService from '../services/userService';
import AvatarUpload from './AvatarUpload';

/**
 * ProfileSettings component - Now ONLY for Bio and Avatar
 * Used within the dedicated EditProfile page.
 * Assumes it is always rendered in an "edit" context.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user data (needed for initial state)
 * @param {Function} props.onUpdate - Function to call when profile is updated
 * @param {boolean} props.showCancelButton - Whether to show the cancel button
 * @param {Function} props.onCancel - Function to call when cancel button is clicked
 */
function ProfileSettings({ user, onUpdate, showCancelButton = false, onCancel }) {
  // State only for fields managed here: bio, avatar
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Kept for potential success message on save
  const [validation, setValidation] = useState({ bio: '' });
  
  const BIO_MAX_LENGTH = 250;
  
  // Initialize state when user prop is available
  useEffect(() => {
    if (user) {
      setBio(user.bio || '');
      setAvatar(user.avatar || null);
    }
  }, [user]);
  
  // Validation function remains the same
  const validateForm = () => {
    const newValidation = { bio: '' };
    let isValid = true;
    if (bio.length > BIO_MAX_LENGTH) {
      newValidation.bio = `Bio must be ${BIO_MAX_LENGTH} characters or less`;
      isValid = false;
    }
    setValidation(newValidation);
    return isValid;
  };
  
  // Handle cancel calls the onCancel prop if provided
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };
  
  // Bio change handler remains the same
  const handleBioChange = (e) => {
    const newBio = e.target.value;
    setBio(newBio);
    if (newBio.length > BIO_MAX_LENGTH) {
      setValidation(prev => ({ ...prev, bio: `Bio must be ${BIO_MAX_LENGTH} characters or less` }));
    } else {
      setValidation(prev => ({ ...prev, bio: '' }));
    }
  };

  // Avatar change handler remains the same
  const handleAvatarChange = (newAvatar) => {
    setIsAvatarUploading(true);
    setAvatar(newAvatar);
    setIsAvatarUploading(false);
  };
  
  // Submit handler now only sends bio and avatar
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const updatedData = { bio, avatar }; // Only bio and avatar
      const response = await userService.updateProfile(updatedData);
      setSuccess('Profile updated successfully'); // Optional success message
      
      if (onUpdate) {
        // Pass the *entire* updated user object back from the API response
        onUpdate(response.user); 
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
      console.error('Profile update error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the edit form directly
  return (
    <div className="profile-settings edit-mode-only"> 
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {/* Optional: Display success message if needed */}
      {/* {success && <div className="success">{success}</div>} */}
      
      <form onSubmit={handleSubmit} noValidate>
        {/* Avatar upload section */}
        <div className="form-group">
          <label>Profile Avatar</label>
          <AvatarUpload 
            currentAvatar={avatar} 
            onAvatarChange={handleAvatarChange}
            isLoading={isAvatarUploading}
          />
        </div>
        
        {/* Bio section */}
        <div className={`form-group ${validation.bio ? 'has-error' : ''}`}>
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            value={bio}
            onChange={handleBioChange}
            placeholder="Tell others about yourself"
            maxLength={BIO_MAX_LENGTH + 10} 
            rows={4}
            aria-invalid={!!validation.bio}
            aria-describedby="bio-validation bio-counter"
          />
          <div 
            id="bio-counter" 
            className={`char-count ${bio.length > BIO_MAX_LENGTH ? 'char-count-limit' : ''}`}
          >
            {bio.length}/{BIO_MAX_LENGTH} characters
          </div>
          {validation.bio && (
            <div id="bio-validation" className="validation-message" role="alert">
              {validation.bio}
            </div>
          )}
        </div>
        
        {/* Removed Visibility Settings */}
        
        {/* Form actions */}
        <div className="form-actions">
          {showCancelButton && onCancel && (
             <button 
               type="button" 
               className="btn-secondary"
               onClick={handleCancel}
             >
               Cancel
             </button>
          )}
          <button 
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || !!validation.bio} 
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

ProfileSettings.propTypes = {
  user: PropTypes.shape({
    // Only require fields needed for initialization
    bio: PropTypes.string,
    avatar: PropTypes.string,
    // Removed isPublic, hiddenAccounts, socialAccounts, etc.
  }), // Make user potentially optional if loading handled by parent
  onUpdate: PropTypes.func.isRequired, // Should probably be required
  showCancelButton: PropTypes.bool,
  onCancel: PropTypes.func
};

export default ProfileSettings;