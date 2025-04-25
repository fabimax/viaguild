import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import userService from '../services/userService';

/**
 * ProfileSettings component with enhanced validation
 * For updating user profile information
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user data
 * @param {Function} props.onUpdate - Function to call when profile is updated
 */
function ProfileSettings({ user, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user.bio || '');
  const [isPublic, setIsPublic] = useState(user.isPublic !== false); // Default to true if undefined
  const [hiddenAccounts, setHiddenAccounts] = useState(user.hiddenAccounts || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validation, setValidation] = useState({ bio: '' });
  
  // Bio character limit
  const BIO_MAX_LENGTH = 250;
  
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
    setIsPublic(user.isPublic !== false);
    setHiddenAccounts(user.hiddenAccounts || []);
    setIsEditing(false);
    setError('');
    setSuccess('');
    setValidation({ bio: '' });
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
      <div className="profile-settings">
        <div className="settings-header">
          <h3>Profile Settings</h3>
          <button 
            className="btn-secondary edit-btn"
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </button>
        </div>
        
        {success && (
          <div className="success" role="alert">
            {success}
          </div>
        )}
        
        <div className="settings-info">
          <div className="settings-group">
            <h4>Bio</h4>
            <p className="bio-text">{user.bio || 'No bio provided'}</p>
          </div>
          
          <div className="settings-group">
            <h4>Profile Visibility</h4>
            <p>{user.isPublic !== false ? 'Public' : 'Private'}</p>
          </div>
          
          <div className="settings-group">
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
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              aria-describedby="visibility-help"
            />
            Make my profile public
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
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={!hiddenAccounts.includes(account.id)}
                        onChange={() => toggleAccountVisibility(account.id)}
                        aria-label={`Show ${account.provider} account @${account.username} on public profile`}
                      />
                      <span className="provider-name">
                        {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                      </span>
                      <span className="account-name">@{account.username}</span>
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
};

export default ProfileSettings;