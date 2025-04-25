/**
 * Controller for handling Twitch account connections
 * Manages OAuth 2.0 flow and account linking
 */
const twitchService = require('../services/twitch.service');
const encryptionUtils = require('../utils/encryption.utils');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Initiate Twitch OAuth flow
 * Redirects user to Twitch authorization page
 */
exports.initiateTwitchAuth = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get the auth token from query parameter or headers
    const token = req.query.token || req.headers.authorization?.split(' ')[1] || '';
    
    // Create a state parameter containing user info and token for security
    // This helps verify the callback is for the correct user
    const state = Buffer.from(JSON.stringify({
      userId,
      token
    })).toString('base64');
    
    console.log(`Initiating Twitch auth for user: ${userId}`);
    
    // Get authorization URL from Twitch service
    const authUrl = twitchService.getAuthorizationURL(state);
    
    // Redirect user to Twitch authorization page
    console.log(`Redirecting to Twitch authorization: ${authUrl}`);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Twitch OAuth initiation error:', error);
    
    // Redirect to frontend with error
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/profile?error=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Handle Twitch OAuth callback
 * Called by Twitch after user authorizes the app
 */
exports.twitchCallback = async (req, res, next) => {
  try {
    const { code, state, error: twitchError } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Handle authorization errors from Twitch
    if (twitchError) {
      console.error('Twitch authorization error:', twitchError);
      return res.redirect(`${frontendUrl}/profile?error=Authorization%20denied%20or%20failed`);
    }
    
    if (!code || !state) {
      console.error('Twitch callback missing required parameters');
      return res.redirect(`${frontendUrl}/profile?error=Missing%20required%20parameters`);
    }
    
    // Decode the state parameter to get user info
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      console.error('Invalid state parameter:', e);
      return res.redirect(`${frontendUrl}/profile?error=Invalid%20state%20parameter`);
    }
    
    const { userId, token } = stateData;
    
    if (!userId || !token) {
      console.error('Missing user information in state');
      return res.redirect(`${frontendUrl}/profile?error=Authentication%20failed`);
    }
    
    // Verify the JWT token
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      
      // Ensure the token belongs to the same user
      if (decoded.userId !== userId) {
        throw new Error('Token does not match user');
      }
    } catch (e) {
      console.error('JWT verification failed:', e);
      return res.redirect(`${frontendUrl}/profile?error=Authentication%20session%20expired`);
    }
    
    console.log(`Processing Twitch callback for user: ${userId}`);
    
    // Exchange code for access token
    const tokenResult = await twitchService.getAccessToken(code);
    
    if (!tokenResult.success) {
      console.error('Failed to get access token:', tokenResult.error);
      return res.redirect(`${frontendUrl}/profile?error=Failed%20to%20get%20access%20token`);
    }
    
    console.log('Successfully got access token from Twitch');
    
    const { access_token, refresh_token } = tokenResult.data;
    
    // Get user information from Twitch
    const userResult = await twitchService.getUserInfo(access_token);
    
    if (!userResult.success) {
      console.error('Failed to get user info:', userResult.error);
      return res.redirect(`${frontendUrl}/profile?error=Failed%20to%20get%20user%20info`);
    }
    
    const twitchUser = userResult.data;
    
    // Store credentials securely
    const credentials = JSON.stringify({
      access_token,
      refresh_token
    });
    
    const encryptedCredentials = encryptionUtils.encrypt(credentials);
    
    // Create or update social account in the database
    try {
      // Get Prisma client
      const prisma = req.app.locals.prisma;
      if (!prisma) {
        throw new Error('Prisma instance not available');
      }
      
      console.log(`Checking if Twitch account (${twitchUser.id}) is already connected`);
      
      // Check if this account is already connected to another user
      const existingAccount = await prisma.socialAccount.findFirst({
        where: {
          provider: 'twitch',
          providerId: twitchUser.id,
        },
      });
      
      // If the account exists but belongs to another user, show an error
      if (existingAccount && existingAccount.userId !== userId) {
        console.error(`Twitch account already connected to user ${existingAccount.userId}, but current user is ${userId}`);
        return res.redirect(`${frontendUrl}/profile?error=This%20Twitch%20account%20is%20already%20connected%20to%20another%20user`);
      }
      
      // If the account already exists for this user, update it
      if (existingAccount && existingAccount.userId === userId) {
        console.log(`Updating existing Twitch account for user: ${userId}`);
        await prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            username: twitchUser.login, // or display_name
            encryptedCredentials,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create a new social account connection
        console.log(`Creating new Twitch account for user: ${userId}`);
        await prisma.socialAccount.create({
          data: {
            provider: 'twitch',
            providerId: twitchUser.id,
            username: twitchUser.login, // or display_name
            encryptedCredentials,
            userId,
          },
        });
      }
      
      console.log('Twitch account connected successfully');
      
      // Redirect to profile page with success message
      res.redirect(`${frontendUrl}/profile?success=Twitch%20account%20connected%20successfully`);
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.redirect(`${frontendUrl}/profile?error=Failed%20to%20save%20Twitch%20account`);
    }
  } catch (error) {
    console.error('Twitch callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/profile?error=Twitch%20authentication%20failed`);
  }
};