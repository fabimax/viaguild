/**
 * Service to interact with the Discord API
 * Handles OAuth 2.0 authentication flow
 */
const axios = require('axios');

/**
 * Discord API service for OAuth 2.0 interactions
 */
class DiscordService {
  constructor() {
    // Get Discord credentials from environment variables
    this.clientId = process.env.DISCORD_CLIENT_ID;
    this.clientSecret = process.env.DISCORD_CLIENT_SECRET;
    this.redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/connect/discord/callback';

    // Discord API endpoints
    this.authURL = 'https://discord.com/api/oauth2/authorize';
    this.tokenURL = 'https://discord.com/api/oauth2/token';
    this.apiBaseURL = 'https://discord.com/api/v10'; // Use v10 as per docs examples
  }

  /**
   * Generate authorization URL for Discord OAuth flow
   * @param {string} state - State parameter for security
   * @returns {string} - Authorization URL to redirect the user
   */
  getAuthorizationURL(state) {
    if (!this.clientId) {
      throw new Error('Discord API credentials not configured');
    }

    // Create the authorization URL with required parameters
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'identify', // Basic scope for user ID and username
      state: state
    });

    return `${this.authURL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from Discord callback
   * @returns {Promise<Object>} - Result object with success status and token data or error
   */
  async getAccessToken(code) {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Discord API credentials not configured');
      }

      // Exchange code for token
      const response = await axios.post(this.tokenURL, new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        scope: 'identify' // Ensure scope matches if required by Discord during token exchange
      }).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        success: true,
        data: response.data // Contains access_token, refresh_token, expires_in, etc.
      };
    } catch (error) {
      console.error('Discord access token error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get user information from Discord API
   * @param {string} accessToken - User's access token
   * @returns {Promise<Object>} - Result object with success status and user data or error
   */
  async getUserInfo(accessToken) {
    try {
      // Fetch user info from /users/@me endpoint
      const response = await axios.get(`${this.apiBaseURL}/users/@me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const userData = response.data; // Discord user object

      if (!userData) {
        throw new Error('No user data returned from Discord');
      }

      // Combine username and discriminator if present, otherwise just use username
      const fullUsername = userData.discriminator && userData.discriminator !== '0'
        ? `${userData.username}#${userData.discriminator}`
        : userData.username;

      return {
        success: true,
        // Return a consistent structure similar to Twitch
        data: {
          id: userData.id,
          login: fullUsername, // Use combined username#discriminator or just username
          // Add other fields if needed, e.g., avatar: userData.avatar
        }
      };
    } catch (error) {
      console.error('Discord user info error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

module.exports = new DiscordService(); 