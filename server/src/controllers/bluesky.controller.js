/**
 * Controller for handling Bluesky account connections
 */
const blueskyService = require('../services/bluesky.service');
const encryptionUtils = require('../utils/encryption.utils');

/**
 * Connect a Bluesky account using app password
 */
exports.connectBlueskyAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { identifier, appPassword } = req.body;
    
    if (!identifier || !appPassword) {
      return res.status(400).json({ 
        message: 'Bluesky identifier and app password are required' 
      });
    }
    
    // Attempt to authenticate with Bluesky
    const loginResult = await blueskyService.login(identifier, appPassword);
    
    if (!loginResult.success) {
      return res.status(400).json({ 
        message: `Failed to authenticate with Bluesky: ${loginResult.error}` 
      });
    }
    
    // Get profile information to confirm the account and get the username
    const profileResult = await blueskyService.getProfile(loginResult.data);
    
    if (!profileResult.success) {
      return res.status(400).json({ 
        message: `Failed to fetch Bluesky profile: ${profileResult.error}` 
      });
    }
    
    const profile = profileResult.data;
    
    // Encrypt the app password before storing
    const encryptedCredentials = encryptionUtils.encrypt(appPassword);
    
    // Check if this social account is already connected to any user
    const existingAccount = await req.prisma.socialAccount.findFirst({
      where: {
        provider: 'bluesky',
        providerId: loginResult.data.did,
      },
    });
    
    // If the account exists but belongs to another user, throw an error
    if (existingAccount && existingAccount.userId !== userId) {
      return res.status(400).json({
        message: 'This Bluesky account is already connected to another user'
      });
    }
    
    // If the account already exists for this user, update it
    if (existingAccount && existingAccount.userId === userId) {
      const updatedAccount = await req.prisma.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          username: profile.handle,
          encryptedCredentials,
          updatedAt: new Date(),
        },
      });
      
      return res.status(200).json({
        message: 'Bluesky account updated successfully',
        socialAccount: {
          id: updatedAccount.id,
          provider: updatedAccount.provider,
          username: updatedAccount.username,
        },
      });
    }
    
    // Create a new social account connection
    const newAccount = await req.prisma.socialAccount.create({
      data: {
        provider: 'bluesky',
        providerId: loginResult.data.did,
        username: profile.handle,
        encryptedCredentials,
        userId,
      },
    });
    
    // Return the new account (excluding sensitive data)
    res.status(201).json({
      message: 'Bluesky account connected successfully',
      socialAccount: {
        id: newAccount.id,
        provider: newAccount.provider,
        username: newAccount.username,
      },
    });
  } catch (error) {
    next(error);
  }
};