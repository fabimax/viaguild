import axios from 'axios';

/**
 * Service for user-related operations
 * Handles searching and fetching user profiles
 */
const userService = {
  /**
   * Create API instance with optional authentication
   * @param {boolean} withAuth - Whether to include auth token
   * @returns {Object} - Axios instance
   */
  getAxios(withAuth = false) {
    const config = {
      baseURL: '/api',
    };
    
    if (withAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = {
          Authorization: `Bearer ${token}`,
        };
      }
    }
    
    return axios.create(config);
  },

  /**
   * Search for users by query string
   * @param {string} query - Search query
   * @param {string} platform - Platform filter (all, viaguild, twitter, etc.)
   * @returns {Promise<Object>} - Search results
   */
  async searchUsers(query, platform = 'all') {
    console.log(`[userService] Searching users with query: ${query}, platform: ${platform}`);
    try {
      const api = this.getAxios();
      const response = await api.get('/users/search', {
        params: { q: query, platform },
      });
      console.log('[userService] Search users response:', response.status, response.data ? 'Data received' : 'No data');
      return response.data;
    } catch (error) {
      console.error('[userService] Search users error:', error.message);
      throw error;
    }
  },

  /**
   * Get a user's public profile by username
   * @param {string} username - User's username
   * @param {boolean} noCache - Whether to bypass browser cache
   * @returns {Promise<Object>} - User profile data
   */
  async getUserProfile(username, noCache = false) {
    console.log(`[userService] Getting profile for: ${username}${noCache ? ' (bypassing cache)' : ''}`);
    try {
      const api = this.getAxios();
      
      // If noCache is true, add a timestamp parameter to bypass browser cache
      const url = noCache 
        ? `users/${username}?_=${Date.now()}` 
        : `users/${username}`;
      
      const response = await api.get(url);
      console.log('[userService] Get profile response:', response.status, response.data ? 'Data received' : 'No data');
      
      // Validate the response has the expected structure
      if (!response.data || !response.data.user) {
        console.error('[userService] Invalid response format:', response.data);
        throw new Error('Invalid response format from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('[userService] Get profile error:', error.message);
      throw error;
    }
  },
  
  /**
   * Get current authenticated user's profile
   * Uses the auth endpoint rather than the public profile endpoint
   * @returns {Promise<Object>} - Current user profile data
   */
  async getCurrentUserProfile() {
    console.log('[userService] Getting current user profile');
    try {
      const api = this.getAxios(true); // With authentication
      const response = await api.get('/auth/me');
      console.log('[userService] Get current user response:', response.status, response.data ? 'Data received' : 'No data');
      return response.data; // The /auth/me endpoint returns { user: {...} }
    } catch (error) {
      console.error('[userService] Get current user error:', error.message);
      throw error;
    }
  },
  
  /**
   * Get a user's public social accounts by username
   * @param {string} username - User's username
   * @returns {Promise<Object>} - User's social accounts
   */
  async getUserSocialAccounts(username) {
    console.log(`[userService] Getting social accounts for: ${username}`);
    try {
      const api = this.getAxios();
      const response = await api.get(`/users/${username}/social-accounts`);
      console.log('[userService] Get social accounts response:', response.status, response.data ? 'Data received' : 'No data');
      return response.data;
    } catch (error) {
      console.error('[userService] Get social accounts error:', error.message);
      throw error;
    }
  },
  
  /**
   * Update current user's profile settings
   * @param {Object} profileData - Profile data to update (bio, avatar, isPublic, hiddenAccounts)
   * @returns {Promise<Object>} - Updated user profile data
   */
  async updateProfile(profileData) {
    console.log('[userService] Updating profile with data:', Object.keys(profileData));
    
    try {
      // Check if avatar data is too large (limit to 800KB to stay under server limit)
      if (profileData.avatar && typeof profileData.avatar === 'string') {
        const MAX_AVATAR_SIZE = 800 * 1024; // 800KB in bytes
        const base64Data = profileData.avatar.split(',')[1] || profileData.avatar;
        const approximateSize = Math.ceil((base64Data.length * 3) / 4);
        
        console.log('[userService] Avatar size:', Math.round(approximateSize / 1024), 'KB');
        
        if (approximateSize > MAX_AVATAR_SIZE) {
          console.error('[userService] Avatar is too large:', Math.round(approximateSize / 1024), 'KB');
          throw new Error('Avatar image is too large. Please use an image smaller than 800KB.');
        }
      }
      
      const api = this.getAxios(true); // With authentication
      const response = await api.put('/users/profile', profileData);
      console.log('[userService] Update profile response:', response.status, response.data ? 'Data received' : 'No data');
      return response.data;
    } catch (error) {
      console.error('[userService] Update profile error:', error.message);
      throw error;
    }
  }
};

export default userService;