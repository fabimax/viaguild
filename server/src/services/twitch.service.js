/**
 * Service to interact with the Twitch API
 * Handles OAuth 2.0 authentication flow
 */
const axios = require('axios');

/**
 * Twitch API service for OAuth 2.0 interactions
 */
class TwitchService {
  constructor() {
    // Get Twitch credentials from environment variables
    this.clientId = process.env.TWITCH_CLIENT_ID;
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET;
    this.redirectUri = process.env.TWITCH_REDIRECT_URI || 'http://localhost:3000/api/auth/connect/twitch/callback';
    
    // Twitch API endpoints
    this.authURL = 'https://id.twitch.tv/oauth2/authorize';
    this.tokenURL = 'https://id.twitch.tv/oauth2/token';
    this.apiBaseURL = 'https://api.twitch.tv/helix';
  }
  
  /**
   * Generate authorization URL for Twitch OAuth flow
   * @param {string} state - State parameter for security (usually contains user ID and JWT token)
   * @returns {string} - Authorization URL to redirect the user
   */
  getAuthorizationURL(state) {
    if (!this.clientId) {
      throw new Error('Twitch API credentials not configured');
    }
    
    // Create the authorization URL with required parameters
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'user:read:email', // Add more scopes as needed
      state: state
    });
    
    return `${this.authURL}?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from Twitch callback
   * @returns {Promise<Object>} - Token data including access_token and refresh_token
   */
  async getAccessToken(code) {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Twitch API credentials not configured');
      }
      
      // Exchange code for token
      const response = await axios.post(this.tokenURL, null, {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri
        }
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Twitch access token error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  
  /**
   * Get user information from Twitch API
   * @param {string} accessToken - User's access token
   * @returns {Promise<Object>} - User profile data
   */
  async getUserInfo(accessToken) {
    try {
      // Create API client with user's token
      const response = await axios.get(`${this.apiBaseURL}/users`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': this.clientId
        }
      });
      
      // Twitch returns an array of users, we need the first one
      const userData = response.data.data[0];
      
      if (!userData) {
        throw new Error('No user data returned from Twitch');
      }
      
      return {
        success: true,
        data: userData
      };
    } catch (error) {
      console.error('Twitch user info error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  
  /**
   * Refresh an access token using a refresh token
   * @param {string} refreshToken - User's refresh token
   * @returns {Promise<Object>} - New token data
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(this.tokenURL, null, {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Twitch token refresh error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

module.exports = new TwitchService();