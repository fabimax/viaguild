/**
 * Controller for managing social accounts
 * Handles fetching, creating, and removing social accounts
 */

/**
 * Get all social accounts for the current user
 */
exports.getSocialAccounts = async (req, res, next) => {
    try {
      const userId = req.user.id;
  
      // Find all social accounts for the user
      const socialAccounts = await req.prisma.socialAccount.findMany({
        where: { userId },
      });
  
      res.status(200).json({ socialAccounts });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Remove a social account for the current user
   */
  exports.removeSocialAccount = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
  
      // Check if the social account exists and belongs to the user
      const socialAccount = await req.prisma.socialAccount.findFirst({
        where: {
          id,
          userId,
        },
      });
  
      if (!socialAccount) {
        return res.status(404).json({ message: 'Social account not found' });
      }
  
      // Delete the social account
      await req.prisma.socialAccount.delete({
        where: { id },
      });
  
      res.status(200).json({ message: 'Social account removed successfully' });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Create a social account connection
   * This is a helper function used by the OAuth callbacks
   */
  exports.createSocialAccount = async (prisma, userId, socialData) => {
    const { provider, providerId, username } = socialData;
  
    // Check if this social account is already connected to any user
    const existingAccount = await prisma.socialAccount.findFirst({
      where: {
        provider,
        providerId,
      },
    });
  
    // If the account exists but belongs to another user, throw an error
    if (existingAccount && existingAccount.userId !== userId) {
      throw new Error('This social account is already connected to another user');
    }
  
    // If the account already exists for this user, return it
    if (existingAccount && existingAccount.userId === userId) {
      return existingAccount;
    }
  
    // Create a new social account connection
    return await prisma.socialAccount.create({
      data: {
        provider,
        providerId,
        username,
        userId,
      },
    });
  };
  
  /**
   * Mock function for Twitter OAuth (for development purposes)
   * In production, this would handle the OAuth flow with Twitter
   */
  exports.mockTwitterConnect = async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // Mock social data (in a real app, this would come from Twitter OAuth)
      const socialData = {
        provider: 'twitter',
        providerId: `twitter_${Date.now()}`, // Simulating a unique Twitter ID
        username: `twitter_user_${Date.now().toString().slice(-4)}`, // Simulating a Twitter username
      };
  
      // Create the social account
      const socialAccount = await exports.createSocialAccount(
        req.prisma,
        userId,
        socialData
      );
  
      res.status(200).json({ 
        message: 'Twitter account connected successfully',
        socialAccount 
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Mock function for Bluesky OAuth (for development purposes)
   * In production, this would handle the authentication with Bluesky
   */
  exports.mockBlueskyConnect = async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // Mock social data (in a real app, this would come from Bluesky auth)
      const socialData = {
        provider: 'bluesky',
        providerId: `bluesky_${Date.now()}`, // Simulating a unique Bluesky ID
        username: `bluesky_user_${Date.now().toString().slice(-4)}`, // Simulating a Bluesky username
      };
  
      // Create the social account
      const socialAccount = await exports.createSocialAccount(
        req.prisma,
        userId,
        socialData
      );
  
      res.status(200).json({ 
        message: 'Bluesky account connected successfully',
        socialAccount 
      });
    } catch (error) {
      next(error);
    }
  };