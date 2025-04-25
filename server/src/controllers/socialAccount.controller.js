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