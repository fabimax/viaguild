/**
 * Controller for handling Twitter account connections
 * Manages OAuth flow and account linking using twitter-api-v2
 */
const twitterService = require('../services/twitter.service');
const encryptionUtils = require('../utils/encryption.utils');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Store OAuth tokens temporarily
// In a production environment, this should be in a more persistent store like Redis
const oauthTokens = new Map();

// Export for testing
exports.oauthTokens = oauthTokens;

/**
 * Initiate Twitter OAuth flow
 * Redirects user to Twitter authorization page
 */
exports.initiateTwitterAuth = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get the auth token to store with the request
    const token = req.query.token || '';
    
    // Construct callback URL
    const baseURL = `${req.protocol}://${req.get('host')}`;
    const callbackURL = `${baseURL}/api/auth/connect/twitter/callback`;
    
    console.log(`Initiating Twitter auth for user: ${userId}`);
    console.log(`Callback URL: ${callbackURL}`);
    
    // Get request token and auth URL from Twitter
    const result = await twitterService.getRequestToken(callbackURL);
    
    if (!result.success) {
      console.error('Twitter request token error:', result.error);
      return res.status(500).json({
        message: `Failed to get request token from Twitter: ${result.error}`
      });
    }
    
    console.log('Got request token from Twitter');
    const { oauth_token, oauth_token_secret, authorizationURL } = result.data;
    
    // Store the token and user info temporarily
    oauthTokens.set(oauth_token, {
      user_id: userId,
      oauth_token_secret,
      token // Store the JWT token for use in the callback
    });
    
    // Redirect user to Twitter authorization page
    console.log(`Redirecting to Twitter authorization: ${authorizationURL}`);
    res.redirect(authorizationURL);
  } catch (error) {
    console.error('Twitter OAuth initiation error:', error);
    next(error);
  }
};

/**
 * Handle Twitter OAuth callback
 * Called by Twitter after user authorizes the app
 */
exports.twitterCallback = async (req, res, next) => {
  try {
    const { oauth_token, oauth_verifier } = req.query;
    
    if (!oauth_token || !oauth_verifier) {
      console.error('Twitter callback missing required parameters');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?error=Twitter%20authentication%20failed`);
    }
    
    console.log(`Twitter callback received: oauth_token=${oauth_token}`);
    
    // Get the stored token data
    const tokenData = oauthTokens.get(oauth_token);
    
    if (!tokenData) {
      console.error('No token data found for oauth_token:', oauth_token);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?error=Authentication%20session%20expired`);
    }
    
    const { user_id, oauth_token_secret, token } = tokenData;
    
    console.log(`Exchanging request token for access token for user: ${user_id}`);
    
    // Exchange request token for access token
    const accessTokenResult = await twitterService.getAccessToken(
      oauth_token, 
      oauth_verifier,
      oauth_token_secret
    );
    
    if (!accessTokenResult.success) {
      console.error('Failed to get access token:', accessTokenResult.error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?error=Failed%20to%20get%20access%20token`);
    }
    
    console.log('Successfully got access token from Twitter');
    
    const { 
      oauth_token: accessToken, 
      oauth_token_secret: accessTokenSecret,
      user_id: twitterUserId,
      screen_name: twitterUsername
    } = accessTokenResult.data;
    
    // Store credentials securely
    const credentials = JSON.stringify({
      accessToken,
      accessTokenSecret
    });
    
    const encryptedCredentials = encryptionUtils.encrypt(credentials);
    
    // Create or update social account in the database
    try {
      // Get Prisma client
      const prisma = req.app.locals.prisma;
      if (!prisma) {
        throw new Error('Prisma instance not available');
      }
      
      console.log(`Checking if Twitter account (${twitterUserId}) is already connected`);
      
      // Check if this account is already connected to another user
      const existingAccount = await prisma.socialAccount.findFirst({
        where: {
          provider: 'twitter',
          providerId: twitterUserId,
        },
      });
      
      // If the account exists but belongs to another user, show an error
      if (existingAccount && existingAccount.userId !== user_id) {
        console.error(`Twitter account already connected to user ${existingAccount.userId}, but current user is ${user_id}`);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?error=This%20Twitter%20account%20is%20already%20connected%20to%20another%20user`);
      }
      
      // If the account already exists for this user, update it
      if (existingAccount && existingAccount.userId === user_id) {
        console.log(`Updating existing Twitter account for user: ${user_id}`);
        await prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            username: twitterUsername,
            encryptedCredentials,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create a new social account connection
        console.log(`Creating new Twitter account for user: ${user_id}`);
        await prisma.socialAccount.create({
          data: {
            provider: 'twitter',
            providerId: twitterUserId,
            username: twitterUsername,
            encryptedCredentials,
            userId: user_id,
          },
        });
      }
      
      // Clean up the temporary token
      oauthTokens.delete(oauth_token);
      
      console.log('Twitter account connected successfully');
      
      // Redirect to profile page with success message
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?success=Twitter%20account%20connected%20successfully`);
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?error=Failed%20to%20save%20Twitter%20account`);
    }
  } catch (error) {
    console.error('Twitter callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?error=Twitter%20authentication%20failed`);
  }
};