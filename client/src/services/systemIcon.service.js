import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class SystemIconService {
  /**
   * Get SVG content for a system icon by its name.
   * @param {string} iconName - The unique name of the system icon.
   * @returns {Promise<string>} SVG content string.
   * @throws {Error} If the icon is not found or request fails.
   */
  async getSystemIconSvg(iconName) {
    if (!iconName) {
      throw new Error('Icon name is required to fetch SVG.');
    }
    try {
      // This endpoint directly returns the SVG string with Content-Type image/svg+xml
      const response = await axios.get(`${API_URL}/system-icons/${encodeURIComponent(iconName)}`, {
        responseType: 'text', // Ensure we get the raw SVG string
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.warn(`System icon "${iconName}" not found on server.`);
        // Return a default/fallback SVG or throw a specific error
        // For now, let's return a placeholder SVG string that BadgeDisplay can render
        return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>';
      }
      console.error(`Error fetching system icon "${iconName}":`, error);
      throw new Error(error.response?.data?.error || 'Failed to fetch system icon SVG.');
    }
  }
}

export default new SystemIconService(); 