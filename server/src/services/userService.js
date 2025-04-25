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
    const api = this.getAxios();
    const response = await api.get('/users/search', {
      params: { q: query, platform },
    });
    return response.data;
  },

  /**
   * Get a user's public profile by username
   * @param {string} username - User's username
   * @returns {Promise<Object>} - User profile data
   */
  async getUserProfile(username) {
    const api = this.getAxios();
    const response = await api.get(`/users/${username}`);
    return response.data;
  },
  
  /**
   * Get a user's public social accounts by username
   * @param {string} username - User's username
   * @returns {Promise<Object>} - User's social accounts
   */
  async getUserSocialAccounts(username) {
    const api = this.getAxios();
    const response = await api.get(`/users/${username}/social-accounts`);
    return response.data;
  },
  
  /**
   * Update current user's profile settings
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} - Updated user profile data
   */
  async updateProfile(profileData) {
    const api = this.getAxios(true); // With authentication
    const response = await api.put('/users/profile', profileData);
    return response.data;
  }
};

export default userService;