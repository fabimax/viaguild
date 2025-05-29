import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * AvatarUpload component
 * Allows users to upload and preview their profile avatar
 * Includes optimal image compression for smaller file sizes
 * 
 * @param {Object} props - Component props
 * @param {string} props.currentAvatar - Current avatar image (Base64 string or URL)
 * @param {Function} props.onAvatarChange - Callback function when avatar is changed
 * @param {boolean} props.isLoading - Whether avatar upload is in progress
 * @param {Function} props.setIsLoading - Function to update loading state
 */
function AvatarUpload({ 
  currentAvatar = null, 
  onAvatarChange, 
  isLoading = false 
}) {
  const [previewAvatar, setPreviewAvatar] = useState(currentAvatar);
  const [error, setError] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Maximum file size: 800KB (server limit 1MB gives us buffer)
  const MAX_FILE_SIZE = 800 * 1024;
  
  // Target dimensions and quality (adjust as needed)
  const MAX_WIDTH = 300;   // 300px is plenty for profile avatars
  const MAX_HEIGHT = 300;  // Keep it square
  const INITIAL_QUALITY = 0.9; // Start with high quality
  
  /**
   * Process image to ensure it's within size limits
   * @param {File} file - Original image file
   * @returns {Promise<string>} - Base64 encoded processed image
   */
  const processImage = (file) => {
    return new Promise((resolve, reject) => {
      // Create a FileReader to convert the file to data URL
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        // Create an image object to get dimensions
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          console.log(`Original image: ${img.width}x${img.height}, Size: ~${Math.round(file.size / 1024)}KB`);
          
          // Determine if resizing is needed
          let width = img.width;
          let height = img.height;
          let needsResize = false;
          
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            needsResize = true;
            
            // Calculate aspect ratio
            const aspectRatio = width / height;
            
            if (width > height) {
              // Landscape orientation
              width = Math.min(width, MAX_WIDTH);
              height = Math.round(width / aspectRatio);
            } else {
              // Portrait or square orientation
              height = Math.min(height, MAX_HEIGHT);
              width = Math.round(height * aspectRatio);
            }
          }
          
          // Create canvas for processing
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          // Draw image with smooth scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          // Function to check if we're under size limit
          const checkSize = (dataUrl) => {
            // Rough estimation of base64 size
            // Remove the data URL header (e.g., data:image/jpeg;base64,)
            const base64 = dataUrl.split(',')[1];
            const decodedSize = Math.floor((base64.length * 3) / 4);
            console.log(`Processed image size: ~${Math.round(decodedSize / 1024)}KB`);
            return decodedSize < MAX_FILE_SIZE;
          };
          
          // Start with high quality
          let quality = INITIAL_QUALITY;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // Reduce quality until we're under the size limit
          while (!checkSize(dataUrl) && quality > 0.5) {
            quality -= 0.05;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            console.log(`Reducing quality to ${quality.toFixed(2)}`);
          }
          
          // If we're still too big, reduce dimensions
          if (!checkSize(dataUrl) && (width > 150 || height > 150)) {
            width = Math.round(width * 0.8);
            height = Math.round(height * 0.8);
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            console.log(`Reduced dimensions to ${width}x${height}`);
          }
          
          // Final size check
          if (checkSize(dataUrl)) {
            resolve(dataUrl);
          } else {
            reject(new Error('Image is too large even after processing. Please choose a smaller image.'));
          }
        };
        
        img.onerror = (error) => {
          reject(new Error('Error loading image. Please try another file.'));
        };
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file. Please try again.'));
      };
    });
  };
  
  /**
   * Handle file selection from input
   * @param {Event} e - Input change event
   */
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setError('');
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image.*')) {
      setError('Please select an image file (JPEG, PNG, GIF)');
      return;
    }
    
    try {
      // Show loading state using internal state
      setInternalLoading(true);
      
      // Process the image to ensure it's within size limits
      const processedImage = await processImage(file);
      
      // Update state with the processed image
      setPreviewAvatar(processedImage);
      onAvatarChange(processedImage);
    } catch (err) {
      console.error('Error processing image:', err);
      setError(err.message || 'Failed to process image. Please try a different file.');
    } finally {
      setInternalLoading(false);
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
    onAvatarChange(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Determine if component is in loading state from either prop or internal state
  const isComponentLoading = isLoading || internalLoading;
  
  return (
    <div className="avatar-upload">
      <div className="avatar-preview-container">
        {previewAvatar ? (
          <div className="avatar-preview">
            <img 
              src={previewAvatar} 
              alt="Avatar preview" 
              className="avatar-image"
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
          {isComponentLoading ? 'Processing...' : (previewAvatar ? 'Change Avatar' : 'Upload Avatar')}
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg, image/png, image/gif"
          className="file-input"
          disabled={isComponentLoading}
        />
      </div>
      
      {error && <div className="avatar-error">{error}</div>}
      
      <div className="avatar-help">
        <small>Upload a square image for best results. Maximum size: 1MB.</small>
      </div>
    </div>
  );
}

AvatarUpload.propTypes = {
  currentAvatar: PropTypes.string,
  onAvatarChange: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

export default AvatarUpload;