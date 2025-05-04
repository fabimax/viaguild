import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import userService from '../services/userService';
import AvatarUpload from './AvatarUpload';

/**
 * ProfileSettings component with enhanced validation
 * For updating user profile information
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user data
 * @param {Function} props.onUpdate - Function to call when profile is updated
 * @param {boolean} props.initialEditMode - Whether to start in edit mode
 * @param {boolean} props.showCancelButton - Whether to show cancel button in view mode
 * @param {Function} props.onCancel - Function to call when cancel button is clicked
 */
function ProfileSettings({ user, onUpdate, initialEditMode = false, showCancelButton = false, onCancel }) {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || null);
  const [isPublic, setIsPublic] = useState(user.isPublic !== false); // Default to true if undefined
  const [hiddenAccounts, setHiddenAccounts] = useState(user.hiddenAccounts || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validation, setValidation] = useState({ bio: '' });
  
  // Bio character limit
  const BIO_MAX_LENGTH = 250;
  
  // Update state when user prop changes
  useEffect(() => {
    setBio(user.bio || '');
    setAvatar(user.avatar || null);
    setIsPublic(user.isPublic !== false);
    setHiddenAccounts(user.hiddenAccounts || []);
  }, [user]);
  
  // Update isEditing when initialEditMode changes
  useEffect(() => {
    setIsEditing(initialEditMode);
  }, [initialEditMode]);
  
  /**
   * Validate the form fields
   * @returns {boolean} - Whether form is valid
   */
  const validateForm = () => {
    const newValidation = { bio: '' };
    let isValid = true;
    
    // Validate bio length
    if (bio.length > BIO_MAX_LENGTH) {
      newValidation.bio = `Bio must be ${BIO_MAX_LENGTH} characters or less`;
      isValid = false;
    }
    
    setValidation(newValidation);
    return isValid;
  };
  
  /**
   * Toggle visibility of a social account
   * @param {string} accountId - ID of the social account
   */
  const toggleAccountVisibility = (accountId) => {
    setHiddenAccounts(prevHidden => {
      if (prevHidden.includes(accountId)) {
        return prevHidden.filter(id => id !== accountId);
      } else {
        return [...prevHidden, accountId];
      }
    });
  };
  
  /**
   * Reset form to original values
   */
  const handleCancel = () => {
    setBio(user.bio || '');
    setAvatar(user.avatar || null);
    setIsPublic(user.isPublic !== false);
    setHiddenAccounts(user.hiddenAccounts || []);
    setIsEditing(false);
    setError('');
    setSuccess('');
    setValidation({ bio: '' });
    
    // Call external cancel handler if provided
    if (onCancel) {
      onCancel();
    }
  };
  
  /**
   * Handle bio input change
   * @param {Event} e - Input change event
   */
  const handleBioChange = (e) => {
    const newBio = e.target.value;
    setBio(newBio);
    
    // Real-time validation
    if (newBio.length > BIO_MAX_LENGTH) {
      setValidation(prev => ({
        ...prev,
        bio: `Bio must be ${BIO_MAX_LENGTH} characters or less`
      }));
    } else {
      setValidation(prev => ({
        ...prev,
        bio: ''
      }));
    }
  };

  /**
   * Handle avatar change from the AvatarUpload component
   * @param {string} newAvatar - New avatar data (Base64 string)
   */
  const handleAvatarChange = (newAvatar) => {
    setIsAvatarUploading(true);
    setAvatar(newAvatar);
    setIsAvatarUploading(false);
  };
  
  /**
   * Submit profile updates
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const updatedData = {
        bio,
        avatar,
        isPublic,
        hiddenAccounts
      };
      
      const response = await userService.updateProfile(updatedData);
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      
      // Call the parent's update function
      if (onUpdate) {
        onUpdate(response.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
      console.error('Profile update error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not in edit mode, show profile info with edit button
  if (!isEditing) {
    return (
      <div className="profile-settings-view">
        <div className="settings-header">
          <h3>Profile Settings</h3>
          <div className="settings-actions">
            {showCancelButton && onCancel && (
              <button 
                className="btn-secondary cancel-btn"
                onClick={onCancel}
              >
                Back
              </button>
            )}
            <button 
              className="btn-secondary edit-btn"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          </div>
        </div>
        
        {success && (
          <div className="success" role="alert">
            {success}
          </div>
        )}
        
        <div className="settings-view-content">
          {/* Avatar display - REMOVED */}
          {/* Bio display - REMOVED */}
          
          <div className="setting-item">
            <h4>Profile Visibility</h4>
            <p>{user.isPublic !== false ? 'Public' : 'Private'}</p>
          </div>
          
          <div className="setting-item">
            <h4>Hidden Accounts</h4>
            <p>
              {(user.hiddenAccounts || []).length === 0 
                ? 'No hidden accounts' 
                : `${user.hiddenAccounts.length} account(s) hidden`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="profile-settings">
      <h3>Edit Profile</h3>
      
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      
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
        
        <div className={`form-group ${validation.bio ? 'has-error' : ''}`}>
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            value={bio}
            onChange={handleBioChange}
            placeholder="Tell others about yourself"
            maxLength={BIO_MAX_LENGTH + 10} // Allow a little over for better UX
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
        
        <div className="form-group">
          <label className="checkbox-label public-toggle">
            <span>Make my profile public</span>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              aria-describedby="visibility-help"
            />
          </label>
          <p id="visibility-help" className="form-help">
            When disabled, your profile will not be visible to other users
          </p>
        </div>
        
        <div className="form-group">
          <label>Account Visibility</label>
          <p className="form-help">
            Choose which social accounts are visible on your public profile
          </p>
          
          <div className="account-visibility-list">
            {user.socialAccounts.length === 0 ? (
              <p>No social accounts connected yet</p>
            ) : (
              <ul className="visibility-items">
                {user.socialAccounts.map(account => (
                  <li key={account.id} className="visibility-item">
                    <label className="checkbox-label account-toggle">
                      <div>
                        <span className="provider-name">
                          {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                        </span>
                        <span className="account-name">@{account.username}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={!hiddenAccounts.includes(account.id)}
                        onChange={() => toggleAccountVisibility(account.id)}
                        aria-label={`Show ${account.provider} account @${account.username} on public profile`}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={handleCancel}
          >
            Cancel
          </button>
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
    id: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    bio: PropTypes.string,
    avatar: PropTypes.string,
    isPublic: PropTypes.bool,
    hiddenAccounts: PropTypes.arrayOf(PropTypes.string),
    socialAccounts: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        provider: PropTypes.string.isRequired,
        username: PropTypes.string.isRequired,
      })
    ),
  }).isRequired,
  onUpdate: PropTypes.func,
  initialEditMode: PropTypes.bool,
  showCancelButton: PropTypes.bool,
  onCancel: PropTypes.func
};

export default ProfileSettings;