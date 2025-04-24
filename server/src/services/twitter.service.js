/**
 * Service to interact with the Twitter API using the twitter-api-v2 library
 * Handles OAuth 1.0a authentication flow for Twitter
 */
const { TwitterApi } = require('twitter-api-v2');
const encryptionUtils = require('../utils/encryption.utils');

/**
 * Twitter API service for OAuth interactions using twitter-api-v2
 */
class TwitterService {
  constructor() {
    // Get consumer key and secret from environment variables
    this.consumerKey = process.env.TWITTER_CONSUMER_KEY;
    this.consumerSecret = process.env.TWITTER_CONSUMER_SECRET;
    
    // Create base Twitter client
    this.client = new TwitterApi({
      appKey: this.consumerKey,
      appSecret: this.consumerSecret
    });
  }
  
  /**
   * Get request token from Twitter and generate authorization URL
   * This is the first step in the OAuth flow
   * @param {string} callbackURL - URL to redirect after authentication
   * @returns {Promise<Object>} - Request token data and authorization URL
   */
  async getRequestToken(callbackURL) {
    try {
      if (!this.consumerKey || !this.consumerSecret) {
        throw new Error('Twitter API credentials not configured');
      }
      
      console.log(`Getting request token with callback URL: ${callbackURL}`);
      
      // Generate authentication link with callback URL
      const authLink = await this.client.generateAuthLink(callbackURL);
      
      return {
        success: true,
        data: {
          oauth_token: authLink.oauth_token,
          oauth_token_secret: authLink.oauth_token_secret,
          authorizationURL: authLink.url
        }
      };
    } catch (error) {
      console.error('Twitter request token error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get authorization URL from oauth_token
   * @param {string} oauthToken - Request token from getRequestToken
   * @returns {string} - Authorization URL
   */
  getAuthorizationURL(oauthToken) {
    return `https://api.twitter.com/oauth/authenticate?oauth_token=${oauthToken}`;
  }
  
  /**
   * Exchange request token for access token
   * @param {string} oauthToken - OAuth token from callback
   * @param {string} oauthVerifier - OAuth verifier from callback
   * @param {string} oauthTokenSecret - OAuth token secret from the saved request token
   * @returns {Promise<Object>} - Access token data and user info
   */
  async getAccessToken(oauthToken, oauthVerifier, oauthTokenSecret) {
    try {
      console.log(`Getting access token for oauth_token: ${oauthToken}`);
      
      // Create temporary client with request token
      const tempClient = new TwitterApi({
        appKey: this.consumerKey,
        appSecret: this.consumerSecret,
        accessToken: oauthToken,
        accessSecret: oauthTokenSecret
      });
      
      // Exchange request token for access token
      const { client, accessToken, accessSecret } = await tempClient.login(oauthVerifier);
      
      // Get user data
      const currentUser = await client.currentUser();
      
      return {
        success: true,
        data: {
          oauth_token: accessToken,
          oauth_token_secret: accessSecret,
          user_id: currentUser.id_str,
          screen_name: currentUser.screen_name,
          user: currentUser
        }
      };
    } catch (error) {
      console.error('Twitter access token error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get user profile information from Twitter
   * @param {string} oauthToken - User's access token
   * @param {string} oauthTokenSecret - User's access token secret
   * @returns {Promise<Object>} - User profile data
   */
  async getUserInfo(oauthToken, oauthTokenSecret) {
    try {
      // Create client with user's tokens
      const userClient = new TwitterApi({
        appKey: this.consumerKey,
        appSecret: this.consumerSecret,
        accessToken: oauthToken,
        accessSecret: oauthTokenSecret
      });
      
      // Get user data
      const currentUser = await userClient.currentUser();
      
      return {
        success: true,
        data: currentUser
      };
    } catch (error) {
      console.error('Twitter user info error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new TwitterService();