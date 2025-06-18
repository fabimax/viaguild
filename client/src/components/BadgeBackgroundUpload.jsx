import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * BadgeBackgroundUpload component
 * Allows users to upload images for badge background
 * Follows the same single global preview pattern as BadgeIconUpload but without SVG features
 */
function BadgeBackgroundUpload({ 
  currentBackground = null,
  onBackgroundChange,
  isLoading = false,
  templateSlug = 'badge-background'
}) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [previousUploadId, setPreviousUploadId] = useState(null);
  const fileInputRef = useRef(null);
  
  // Tab synchronization state
  const [isDiscovering, setIsDiscovering] = useState(false);
  
  /**
   * Discover existing temp upload from server
   */
  const discoverExistingUpload = async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      setIsDiscovering(true);
      const response = await fetch('http://localhost:3000/api/upload/badge-background/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) return null;
      
      const result = await response.json();
      return result.data.tempAsset;
    } catch (error) {
      console.error('Error discovering existing background upload:', error);
      return null;
    } finally {
      setIsDiscovering(false);
    }
  };

  /**
   * Load temp upload into component state
   */
  const loadTempUpload = async (tempAsset) => {
    if (!tempAsset) return;
    
    try {
      setUploadedUrl(tempAsset.hostedUrl);
      setUploadId(tempAsset.id);
      setPreviewUrl(tempAsset.hostedUrl);
      
      // Notify parent component about the loaded upload
      const uploadReference = `upload://${tempAsset.id}`;
      onBackgroundChange(uploadReference, tempAsset.hostedUrl);
      
      console.log('Loaded existing temp background upload:', tempAsset.id);
    } catch (error) {
      console.error('Error loading temp background upload:', error);
    }
  };

  /**
   * Check localStorage for recent sync data
   */
  const checkLocalStorageSync = () => {
    try {
      const syncData = localStorage.getItem('badgeBackgroundPreview');
      if (syncData) {
        const parsed = JSON.parse(syncData);
        // Check if the sync data is recent (less than 1 hour old)
        const isRecent = Date.now() - parsed.timestamp < 60 * 60 * 1000;
        if (isRecent) {
          console.log('Found recent background sync data in localStorage for asset:', parsed.assetId);
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error checking localStorage background sync:', error);
    }
    return null;
  };

  /**
   * Store sync data in localStorage for other tabs
   */
  const storeSyncData = (backgroundUrl, assetId, metadata) => {
    try {
      const syncData = {
        backgroundUrl,
        assetId,
        timestamp: Date.now(),
        metadata
      };
      localStorage.setItem('badgeBackgroundPreview', JSON.stringify(syncData));
      console.log('Stored background sync data in localStorage for asset:', assetId);
    } catch (error) {
      console.error('Error storing background sync data:', error);
    }
  };

  // Initialize component: check localStorage first, then server
  useEffect(() => {
    const initializeComponent = async () => {
      // Skip if already have an upload or background
      if (uploadId || previewUrl || currentBackground) return;
      
      console.log('Initializing badge background component...');
      
      // First check localStorage for recent sync
      const localSync = checkLocalStorageSync();
      if (localSync) {
        console.log('Using localStorage background sync data');
        // Quick load from localStorage, but still verify with server
        setUploadedUrl(localSync.backgroundUrl);
        setUploadId(localSync.assetId);
        setPreviewUrl(localSync.backgroundUrl);
      }
      
      // Then check server for authoritative data
      const serverAsset = await discoverExistingUpload();
      if (serverAsset) {
        console.log('Found existing background upload on server, loading...');
        await loadTempUpload(serverAsset);
      }
    };
    
    initializeComponent();
  }, []);

  // Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'badgeBackgroundPreview') {
        console.log('Background storage change detected from another tab');
        try {
          const newSyncData = JSON.parse(e.newValue);
          console.log('New background sync data received from another tab, asset:', newSyncData.assetId);
          
          // Update component state with new data from other tab
          if (newSyncData.assetId !== uploadId) {
            setUploadedUrl(newSyncData.backgroundUrl);
            setUploadId(newSyncData.assetId);
            setPreviewUrl(newSyncData.backgroundUrl);
            
            // Update parent component
            const uploadReference = `upload://${newSyncData.assetId}`;
            onBackgroundChange(uploadReference, newSyncData.backgroundUrl);
            
            console.log('Updated background component state from other tab');
          }
        } catch (error) {
          console.error('Error handling background storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [uploadId, onBackgroundChange]);

  /**
   * Delete a temporary upload
   */
  const deleteTempUpload = async (assetId) => {
    if (!assetId) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      await fetch(`http://localhost:3000/api/upload/badge-background/${assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Deleted previous temp background upload:', assetId);
    } catch (error) {
      console.error('Failed to delete previous background upload:', error);
      // Don't block on cleanup errors
    }
  };

  /**
   * Upload file to R2 via backend API
   */
  const uploadToR2 = async (file) => {
    const formData = new FormData();
    formData.append('background', file);
    formData.append('templateSlug', templateSlug);
    
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('You must be logged in to upload a background');
    }
    
    const response = await fetch('http://localhost:3000/api/upload/badge-background', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload background');
    }
    
    return response.json();
  };
  
  /**
   * Handle file selection
   */
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setError('');
    
    if (!file) return;
    
    // Check file type
    const isImage = file.type.match(/^image\/(jpeg|png|gif|webp|svg\+xml)$/);
    
    if (!isImage) {
      setError('Please select an image file (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }
    
    // Check file size (5MB limit for backgrounds)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 5MB for badge backgrounds.');
      return;
    }
    
    try {
      setInternalLoading(true);
      
      // Delete previous temp upload if exists
      if (previousUploadId) {
        await deleteTempUpload(previousUploadId);
        setPreviousUploadId(null);
      }
      
      // Upload to R2 as temporary asset
      const uploadResponse = await uploadToR2(file);
      const uploadedUrl = uploadResponse.data.backgroundUrl;
      const assetId = uploadResponse.data.assetId;
      console.log('Background uploaded successfully. Reference:', `upload://${assetId}`);
      
      // Store sync data for other tabs
      const syncMetadata = {
        type: 'image',
        dimensions: uploadResponse.data.metadata?.dimensions || { width: 100, height: 100 },
        fileSize: file.size
      };
      storeSyncData(uploadedUrl, assetId, syncMetadata);
      
      setPreviewUrl(uploadedUrl);
      setUploadedUrl(uploadedUrl);
      setUploadId(assetId);
      setPreviousUploadId(assetId); // Track for cleanup on next upload
      
      // Pass upload reference for API usage
      const uploadReference = `upload://${assetId}`;
      onBackgroundChange(uploadReference, uploadedUrl);
    } catch (err) {
      console.error('Error handling background file:', err);
      setError(err.message || 'Failed to process background. Please try again.');
      setPreviewUrl(currentBackground);
    } finally {
      setInternalLoading(false);
    }
  };
  
  /**
   * Trigger file input
   */
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
  
  /**
   * Remove background
   */
  const handleRemoveBackground = () => {
    setPreviewUrl(null);
    setUploadedUrl(null);
    setUploadId(null);
    onBackgroundChange(null, null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Cleanup temp upload on unmount
  useEffect(() => {
    return () => {
      // Cleanup on unmount if there's an unsaved upload
      if (uploadId) {
        const token = localStorage.getItem('token');
        if (token) {
          // Use sendBeacon for reliable unmount cleanup
          const payload = JSON.stringify({
            assetId: uploadId,
            authToken: token
          });
          navigator.sendBeacon(
            'http://localhost:3000/api/upload/badge-background-beacon',
            new Blob([payload], { type: 'application/json' })
          );
        }
      }
    };
  }, [uploadId]);
  
  const isComponentLoading = isLoading || internalLoading || isDiscovering;
  
  return (
    <div className="badge-background-upload">
      <div className="background-preview-container" style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        {previewUrl ? (
          <>
            <img 
              src={previewUrl} 
              alt="Background preview" 
              className="background-image"
              style={{ 
                width: '120px', 
                height: '120px', 
                objectFit: 'cover',
                border: '1px solid #ccc',
                borderRadius: '4px',
                background: '#f5f5f5',
                display: 'block'
              }}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"%3E%3Crect width="120" height="120" fill="%23f0f0f0"/%3E%3Ctext x="60" y="60" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
              }}
            />
            <button
              type="button"
              className="remove-background-btn"
              onClick={handleRemoveBackground}
              aria-label="Remove background"
              disabled={isComponentLoading}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '1px solid #ccc',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: '1',
                padding: '0',
                color: '#666',
                marginTop: '0'
              }}
            >
              ✕
            </button>
          </>
        ) : (
          <div className="background-placeholder" style={{
            width: '120px',
            height: '120px',
            border: '2px dashed #ccc',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9f9f9',
            fontSize: '12px',
            color: '#999'
          }}>
            <span>No Background</span>
          </div>
        )}
      </div>
      
      <div className="background-controls">
        <button
          type="button"
          className="upload-background-btn"
          onClick={handleUploadClick}
          disabled={isComponentLoading}
        >
          {isComponentLoading ? 'Processing...' : (previewUrl ? 'Change Background' : 'Upload Background')}
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg, image/png, image/gif, image/webp, image/svg+xml"
          className="file-input"
          disabled={isComponentLoading}
          style={{ display: 'none' }}
        />
      </div>
      
      {error && <div className="background-error" style={{ color: '#e74c3c', fontSize: '14px', marginTop: '8px' }}>{error}</div>}
      
      <div className="background-help">
        <small>Upload a background image up to 5MB. Square images work best for most badge shapes.</small>
      </div>
    </div>
  );
}

BadgeBackgroundUpload.propTypes = {
  currentBackground: PropTypes.string,
  onBackgroundChange: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  templateSlug: PropTypes.string
};

export default BadgeBackgroundUpload;