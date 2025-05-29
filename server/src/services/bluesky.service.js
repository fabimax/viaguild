/**
 * Service to interact with the Bluesky API
 * Using app passwords for authentication
 */
const axios = require('axios');

/**
 * Bluesky API service for AT Protocol interactions
 */
class BlueskyService {
  constructor() {
    this.baseURL = 'https://bsky.social/xrpc/';
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  /**
   * Authenticate with Bluesky using app password
   * @param {string} identifier - Username or email
   * @param {string} password - App password
   * @returns {Object} - Session data including DID and access JWT
   */
  async login(identifier, password) {
    try {
      const response = await this.api.post('com.atproto.server.createSession', {
        identifier,
        password,
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  
  /**
   * Get user profile information
   * @param {Object} session - Session data from login
   * @returns {Object} - User profile information
   */
  async getProfile(session) {
    try {
      // Set authorization header with the session token
      const api = axios.create({
        baseURL: this.baseURL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessJwt}`
        },
      });
      
      // Fetch the user's profile using their DID
      const response = await api.get('app.bsky.actor.getProfile', {
        params: { actor: session.did }
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

module.exports = new BlueskyService();