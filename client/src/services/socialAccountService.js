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
   * Connect a Bluesky account using app password
   * @param {Object} credentials - Object containing identifier and appPassword
   * @returns {Promise<Object>} Response data with the connected account
   */
  async connectBlueskyAccount(credentials) {
    const api = this.getAuthAxios();
    const response = await api.post('/social-accounts/bluesky', credentials);
    return response.data;
  },

  /**
   * DEPRECATED: Use AuthContext.connectSocialAccount instead
   * Connect a Twitter account (using mock API for development)
   * @returns {Promise<Object>} Response data with the connected account
   */
  async connectTwitterMock() {
    console.warn('DEPRECATED: Use connectSocialAccount from AuthContext instead');
    const api = this.getAuthAxios();
    const response = await api.post('/social-accounts/mock/twitter');
    return response.data;
  },

  /**
   * DEPRECATED: Use AuthContext.connectSocialAccount instead
   * Connect a Bluesky account (using mock API for development)
   * @returns {Promise<Object>} Response data with the connected account
   */
  async connectBlueskyMock() {
    console.warn('DEPRECATED: Use connectSocialAccount from AuthContext instead');
    const api = this.getAuthAxios();
    const response = await api.post('/social-accounts/mock/bluesky');
    return response.data;
  },

  /**
   * DEPRECATED: Use AuthContext.connectSocialAccount instead
   * Connect a social account through the real OAuth flow
   * This will redirect the user to the social platform's authorization page
   * @param {string} provider - Social provider ('twitter' or 'bluesky')
   */
  connectSocialAccount(provider) {
    console.warn('DEPRECATED: Use connectSocialAccount from AuthContext instead');
    const token = localStorage.getItem('token');
    window.location.href = `/api/auth/connect/${provider}?token=${token}`;
  }
};

export default socialAccountService;