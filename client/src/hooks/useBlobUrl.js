import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook that manages blob URLs with automatic cleanup
 * Guarantees no memory leaks by tracking and cleaning up all created URLs
 */
export const useBlobUrl = () => {
  const [blobUrl, setBlobUrl] = useState(null);
  const currentUrlRef = useRef(null);

  // Create a new blob URL or set regular URL, automatically cleaning up previous blobs
  const setUrl = (data, options = { type: 'image/svg+xml' }) => {
    // Clean up previous blob URL if it exists
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }

    if (!data) {
      setBlobUrl(null);
      return null;
    }

    // If data looks like a URL, use it directly (for non-SVG images)
    if (typeof data === 'string' && (data.startsWith('http') || data.startsWith('blob:'))) {
      setBlobUrl(data);
      return data;
    }

    // Otherwise, create blob URL (for SVG content)
    const blob = new Blob([data], options);
    const newUrl = URL.createObjectURL(blob);
    
    // Track the new URL for cleanup
    currentUrlRef.current = newUrl;
    setBlobUrl(newUrl);
    
    return newUrl;
  };

  // Clear the current blob URL
  const clearBlobUrl = () => {
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
    setBlobUrl(null);
  };

  // Cleanup on unmount - guaranteed to run
  useEffect(() => {
    return () => {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
      }
    };
  }, []);

  return {
    blobUrl,
    setUrl,
    clearBlobUrl
  };
};