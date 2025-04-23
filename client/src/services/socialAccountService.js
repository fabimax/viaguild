import axios from 'axios';

/**
 * Service for managing social accounts
 * Provides methods to interact with the social account API
 */
const socialAccountService = {
  /**
   * Create API instance with authentication
   * @returns {Object} Axios instance with authentication headers
   */
  getAuthAxios() {
    const token = localStorage.getItem('token');
    return axios.create({
      baseURL: '/api',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Get all social accounts for the current user
   * @returns {Promise<Array>} Social accounts
   */
  async getSocialAccounts() {
    const api = this.getAuthAxios();
    const response = await api.get('/social-accounts');
    return response.data.socialAccounts;
  },

  /**
   * Remove a social account
   * @param {string} id - ID of the social account to remove
   * @returns {Promise<Object>} Response data
   */
  async removeSocialAccount(id) {
    const api = this.getAuthAxios();
    const response = await api.delete(`/social-accounts/${id}`);
    return response.data;
  },

  /**
   * Connect a Twitter account (using mock API for development)
   * @returns {Promise<Object>} Response data with the connected account
   */
  async connectTwitterMock() {
    const api = this.getAuthAxios();
    const response = await api.post('/social-accounts/mock/twitter');
    return response.data;
  },

  /**
   * Connect a Bluesky account (using mock API for development)
   * @returns {Promise<Object>} Response data with the connected account
   */
  async connectBlueskyMock() {
    const api = this.getAuthAxios();
    const response = await api.post('/social-accounts/mock/bluesky');
    return response.data;
  },

  /**
   * Connect a social account through the real OAuth flow
   * This will redirect the user to the social platform's authorization page
   * @param {string} provider - Social provider ('twitter' or 'bluesky')
   */
  connectSocialAccount(provider) {
    window.location.href = `/api/auth/connect/${provider}`;
  }
};

export default socialAccountService;