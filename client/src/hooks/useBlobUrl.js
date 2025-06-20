import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook that manages blob URLs with automatic cleanup
 * Guarantees no memory leaks by tracking and cleaning up all created URLs
 */
export const useBlobUrl = () => {
  const [blobUrl, setBlobUrl] = useState(null);
  const currentUrlRef = useRef(null);

  // Create a new blob URL or set regular URL, automatically cleaning up previous blobs
  const setUrl = useCallback((data, options = { type: 'image/svg+xml' }) => {
    const previousUrl = currentUrlRef.current;

    if (!data) {
      setBlobUrl(null);
      // Clean up after state update
      if (previousUrl) {
        requestAnimationFrame(() => {
          URL.revokeObjectURL(previousUrl);
        });
        currentUrlRef.current = null;
      }
      return null;
    }

    // If data looks like a URL, use it directly (for non-SVG images)
    if (typeof data === 'string' && (data.startsWith('http') || data.startsWith('blob:'))) {
      setBlobUrl(data);
      // Clean up previous blob URL after state update (but not if it's the same URL)
      if (previousUrl && previousUrl !== data && previousUrl.startsWith('blob:')) {
        requestAnimationFrame(() => {
          URL.revokeObjectURL(previousUrl);
        });
      }
      currentUrlRef.current = data.startsWith('blob:') ? data : null;
      return data;
    }

    // Otherwise, create blob URL (for SVG content)
    const blob = new Blob([data], options);
    const newUrl = URL.createObjectURL(blob);
    
    // Track the new URL for cleanup and update state
    currentUrlRef.current = newUrl;
    setBlobUrl(newUrl);
    
    // Clean up previous blob URL after DOM has time to update
    if (previousUrl && previousUrl.startsWith('blob:')) {
      requestAnimationFrame(() => {
        URL.revokeObjectURL(previousUrl);
      });
    }
    
    return newUrl;
  }, []); // Empty dependency array - this function doesn't depend on any external values

  // Clear the current blob URL
  const clearBlobUrl = useCallback(() => {
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
    setBlobUrl(null);
  }, []);

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