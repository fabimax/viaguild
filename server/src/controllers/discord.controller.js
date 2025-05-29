/**
 * Controller for handling Discord account connections
 * Manages OAuth 2.0 flow and account linking
 */
const discordService = require('../services/discord.service');
const encryptionUtils = require('../utils/encryption.utils');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Initiate Discord OAuth flow
 * Redirects user to Discord authorization page
 */
exports.initiateDiscordAuth = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const token = req.query.token || req.headers.authorization?.split(' ')[1] || '';

    // Create state parameter containing user info and token
    const state = Buffer.from(JSON.stringify({
      userId,
      token
    })).toString('base64');

    console.log(`Initiating Discord auth for user: ${userId}`);

    // Get authorization URL from Discord service
    const authUrl = discordService.getAuthorizationURL(state);

    // Redirect user to Discord authorization page
    console.log(`Redirecting to Discord authorization: ${authUrl}`);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Discord OAuth initiation error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/profile?error=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Handle Discord OAuth callback
 * Called by Discord after user authorizes the app
 */
exports.discordCallback = async (req, res, next) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  try {
    const { code, state, error: discordError } = req.query;

    // Handle authorization errors from Discord
    if (discordError) {
      console.error('Discord authorization error:', discordError);
      return res.redirect(`${frontendUrl}/profile?error=Authorization%20denied%20or%20failed`);
    }

    if (!code || !state) {
      console.error('Discord callback missing required parameters');
      return res.redirect(`${frontendUrl}/profile?error=Missing%20required%20parameters`);
    }

    // Decode the state parameter
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
      if (decoded.userId !== userId) {
        throw new Error('Token does not match user');
      }
    } catch (e) {
      console.error('JWT verification failed:', e);
      return res.redirect(`${frontendUrl}/profile?error=Authentication%20session%20expired`);
    }

    console.log(`Processing Discord callback for user: ${userId}`);

    // Exchange code for access token
    const tokenResult = await discordService.getAccessToken(code);

    if (!tokenResult.success) {
      console.error('Failed to get access token from Discord:', tokenResult.error);
      return res.redirect(`${frontendUrl}/profile?error=Failed%20to%20get%20access%20token`);
    }

    console.log('Successfully got access token from Discord');
    const { access_token, refresh_token } = tokenResult.data;

    // Get user information from Discord
    const userResult = await discordService.getUserInfo(access_token);

    if (!userResult.success) {
      console.error('Failed to get user info from Discord:', userResult.error);
      return res.redirect(`${frontendUrl}/profile?error=Failed%20to%20get%20user%20info`);
    }

    const discordUser = userResult.data;

    // Store credentials securely
    const credentials = JSON.stringify({
      access_token,
      refresh_token // Store refresh token if you plan to use it later
    });
    const encryptedCredentials = encryptionUtils.encrypt(credentials);

    // Create or update social account in the database
    try {
      const prisma = req.app.locals.prisma;
      if (!prisma) {
        throw new Error('Prisma instance not available');
      }

      console.log(`Checking if Discord account (${discordUser.id}) is already connected`);

      // Check if this Discord account is already connected to another user
      const existingAccount = await prisma.socialAccount.findFirst({
        where: {
          provider: 'discord',
          providerId: discordUser.id,
        },
      });

      // If the account exists but belongs to another user, show an error
      if (existingAccount && existingAccount.userId !== userId) {
        console.error(`Discord account already connected to user ${existingAccount.userId}, but current user is ${userId}`);
        return res.redirect(`${frontendUrl}/profile?error=This%20Discord%20account%20is%20already%20connected%20to%20another%20user`);
      }

      // If the account already exists for this user, update it
      if (existingAccount && existingAccount.userId === userId) {
        console.log(`Updating existing Discord account for user: ${userId}`);
        await prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            username: discordUser.login, // Store username#discriminator or username
            encryptedCredentials,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create a new social account connection
        console.log(`Creating new Discord account for user: ${userId}`);
        await prisma.socialAccount.create({
          data: {
            provider: 'discord',
            providerId: discordUser.id,
            username: discordUser.login, // Store username#discriminator or username
            encryptedCredentials,
            userId,
          },
        });
      }

      console.log('Discord account connected successfully');
      res.redirect(`${frontendUrl}/profile?success=Discord%20account%20connected%20successfully`);
    } catch (dbError) {
      console.error('Database error connecting Discord:', dbError);
      res.redirect(`${frontendUrl}/profile?error=Failed%20to%20save%20Discord%20account`);
    }
  } catch (error) {
    console.error('Discord callback error:', error);
    res.redirect(`${frontendUrl}/profile?error=Discord%20authentication%20failed`);
  }
}; 