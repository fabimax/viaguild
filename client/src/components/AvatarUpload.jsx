import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * AvatarUpload component
 * Allows users to upload and preview their profile avatar
 * Uploads images to R2 storage via the backend API
 * 
 * @param {Object} props - Component props
 * @param {string} props.currentAvatar - Current avatar URL
 * @param {Function} props.onAvatarChange - Callback function when avatar is changed (receives URL)
 * @param {boolean} props.isLoading - Whether avatar upload is in progress
 * @param {Function} props.onUploadComplete - Optional callback after successful upload
 */
function AvatarUpload({ 
  currentAvatar = null, 
  onAvatarChange, 
  isLoading = false,
  onUploadComplete
}) {
  const [previewAvatar, setPreviewAvatar] = useState(currentAvatar);
  const [error, setError] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState(null); // Track uploaded preview URL
  const fileInputRef = useRef(null);
  
  /**
   * Upload image file to R2 via backend API
   * @param {File} file - Image file to upload
   * @returns {Promise<Object>} - Upload response with URLs
   */
  const uploadToR2 = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    // Get auth token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('You must be logged in to upload an avatar');
    }
    
    // Build headers
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    // Include previous preview URL as header if it exists
    if (uploadedPreviewUrl) {
      headers['X-Previous-Preview-URL'] = uploadedPreviewUrl;
      console.log('Sending previous preview URL:', uploadedPreviewUrl);
    } else {
      console.log('No previous preview URL to send');
    }
    
    const response = await fetch('http://localhost:3000/api/upload/avatar', {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload avatar');
    }
    
    return response.json();
  };
  
  /**
   * Create local preview URL for immediate feedback
   * @param {File} file - Image file
   * @returns {string} - Object URL for preview
   */
  const createPreviewUrl = (file) => {
    return URL.createObjectURL(file);
  };
  
  /**
   * Handle file selection from input
   * @param {Event} e - Input change event
   */
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setError('');
    setUploadProgress(0);
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image.*')) {
      setError('Please select an image file (JPEG, PNG, GIF)');
      return;
    }
    
    // Check file size (10MB limit on backend)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }
    
    try {
      // Show loading state
      setInternalLoading(true);
      
      // Create preview immediately for better UX
      const previewUrl = createPreviewUrl(file);
      setPreviewAvatar(previewUrl);
      
      // Upload to R2
      const uploadResponse = await uploadToR2(file);
      
      // Update with actual uploaded URL
      const uploadedUrl = uploadResponse.data.avatarUrl;
      setPreviewAvatar(uploadedUrl);
      setUploadedPreviewUrl(uploadedUrl); // Track this as the latest preview
      onAvatarChange(uploadedUrl);
      
      // Call optional completion callback with full response
      if (onUploadComplete) {
        onUploadComplete(uploadResponse.data);
      }
      
      // Clean up preview URL
      URL.revokeObjectURL(previewUrl);
      
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError(err.message || 'Failed to upload avatar. Please try again.');
      // Reset preview on error
      setPreviewAvatar(currentAvatar);
    } finally {
      setInternalLoading(false);
      setUploadProgress(0);
    }
  };
  
  /**
   * Trigger file input click
   */
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
  
  /**
   * Remove current avatar
   */
  const handleRemoveAvatar = () => {
    setPreviewAvatar(null);
    setUploadedPreviewUrl(null); // Clear tracked preview URL
    onAvatarChange(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Determine if component is in loading state from either prop or internal state
  const isComponentLoading = isLoading || internalLoading;
  
  // Cleanup on unmount and tab close
  useEffect(() => {
    console.log('AvatarUpload mounted, preview URL:', uploadedPreviewUrl);
    
    // Function to handle cleanup
    const cleanupPreview = () => {
      if (uploadedPreviewUrl && uploadedPreviewUrl !== currentAvatar) {
        console.log('Cleaning up preview:', uploadedPreviewUrl);
        
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('No auth token found, cannot cleanup preview');
          return;
        }
        
        // Use sendBeacon for reliable cleanup on tab close
        const blob = new Blob([JSON.stringify({ previewUrl: uploadedPreviewUrl })], {
          type: 'application/json'
        });
        
        navigator.sendBeacon(
          'http://localhost:3000/api/upload/delete-preview',
          blob
        );
      }
    };
    
    // Handle tab/window close
    const handleBeforeUnload = (e) => {
      cleanupPreview();
    };
    
    // Add beforeunload listener
    if (uploadedPreviewUrl && uploadedPreviewUrl !== currentAvatar) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    return () => {
      // Remove beforeunload listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Cleanup function runs when component unmounts
      console.log('AvatarUpload unmounting, checking cleanup...', {
        uploadedPreviewUrl,
        currentAvatar,
        shouldCleanup: uploadedPreviewUrl && uploadedPreviewUrl !== currentAvatar
      });
      
      if (uploadedPreviewUrl && uploadedPreviewUrl !== currentAvatar) {
        console.log('Component unmounting, cleaning up preview:', uploadedPreviewUrl);
        
        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('No auth token found, cannot cleanup preview');
          return;
        }
        
        // Send delete request for the preview
        // Using fetch in cleanup is allowed, but we can't use async/await
        fetch('http://localhost:3000/api/upload/delete-preview', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            previewUrl: uploadedPreviewUrl
          })
        })
        .then(response => {
          if (response.ok) {
            console.log('Preview cleaned up successfully');
          } else {
            console.error('Failed to cleanup preview:', response.status);
          }
        })
        .catch(error => {
          console.error('Error cleaning up preview:', error);
        });
      }
    };
  }, [uploadedPreviewUrl, currentAvatar]);
  
  return (
    <div className="avatar-upload">
      <div className="avatar-preview-container">
        {previewAvatar ? (
          <div className="avatar-preview">
            <img 
              src={previewAvatar} 
              alt="Avatar preview" 
              className="avatar-image"
              onError={(e) => {
                // Fallback if image fails to load
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-size="40"%3E👤%3C/text%3E%3C/svg%3E';
              }}
            />
            <button
              type="button"
              className="remove-avatar-btn"
              onClick={handleRemoveAvatar}
              aria-label="Remove avatar"
              disabled={isComponentLoading}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="avatar-placeholder">
            <span>{currentAvatar ? 'Avatar' : 'No Avatar'}</span>
          </div>
        )}
      </div>
      
      <div className="avatar-controls">
        <button
          type="button"
          className="upload-avatar-btn"
          onClick={handleUploadClick}
          disabled={isComponentLoading}
        >
          {isComponentLoading ? 'Uploading...' : (previewAvatar ? 'Change Avatar' : 'Upload Avatar')}
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg, image/png, image/gif, image/webp"
          className="file-input"
          disabled={isComponentLoading}
        />
      </div>
      
      {/* Progress indicator */}
      {isComponentLoading && uploadProgress > 0 && (
        <div className="upload-progress">
          <div 
            className="upload-progress-bar" 
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
      
      {error && <div className="avatar-error">{error}</div>}
      
      <div className="avatar-help">
        <small>Upload an image up to 10MB. Square images work best.</small>
      </div>
    </div>
  );
}

AvatarUpload.propTypes = {
  currentAvatar: PropTypes.string,
  onAvatarChange: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  onUploadComplete: PropTypes.func
};

export default AvatarUpload;