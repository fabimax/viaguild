/**
 * User Controller
 * Handles user search and profile viewing functionality
 * Also manages user profile settings
 */

/**
 * Search for users by username or connected social accounts
 * Supports filtering by platform and partial string matching
 * Respects user privacy settings for hidden accounts
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { q: query, platform } = req.query;
    
    // Validate the search query
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    // Normalize the search query (lowercase for case-insensitive search)
    const normalizedQuery = query.toLowerCase().trim();
    
    // First, get all users with their hidden accounts info
    // We'll use this to filter out hidden accounts from search results
    const users = await req.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        isPublic: true,
        hiddenAccounts: true,
        socialAccounts: {
          select: {
            id: true,
            provider: true,
            username: true,
          },
        },
      },
    });
    
    // Process results to filter out hidden accounts and format appropriately
    const processedResults = users.map(user => {
      // Skip private profiles entirely
      if (user.isPublic === false) {
        return null;
      }
      
      // Ensure hiddenAccounts is an array
      const hiddenAccountIds = Array.isArray(user.hiddenAccounts) ? user.hiddenAccounts : [];
      
      // Filter out hidden social accounts
      const visibleSocialAccounts = user.socialAccounts.filter(
        account => !hiddenAccountIds.includes(account.id)
      );
      
      // Find which accounts matched the search query
      const matchedAccounts = [];
      
      // Check if the ViaGuild username matched
      if (user.username.toLowerCase().includes(normalizedQuery)) {
        matchedAccounts.push({
          type: 'viaguild',
          username: user.username,
          accountId: user.id,
        });
      }
      
      // Check which visible social accounts matched
      visibleSocialAccounts.forEach(account => {
        // Apply platform filter if specified
        if (platform && platform !== 'all' && platform !== 'viaguild' && platform !== account.provider) {
          return;
        }
        
        if (account.username.toLowerCase().includes(normalizedQuery)) {
          matchedAccounts.push({
            type: account.provider,
            username: account.username,
            accountId: account.id,
          });
        }
      });
      
      // Skip users with no matches
      if (matchedAccounts.length === 0) {
        return null;
      }
      
      return {
        id: user.id,
        username: user.username,
        socialAccounts: visibleSocialAccounts,
        matchedAccounts,
      };
    });

    // Filter out null results (users with no matches or private profiles)
    const filteredResults = processedResults.filter(result => result !== null);

    // Sort results by relevance (matches at the beginning are ranked higher)
    filteredResults.sort((a, b) => {
      // Get the position of the match in the first matched account for each user
      const aPosition = a.matchedAccounts[0].username.toLowerCase().indexOf(normalizedQuery);
      const bPosition = b.matchedAccounts[0].username.toLowerCase().indexOf(normalizedQuery);
      
      // Sort by position of match (beginning matches first)
      return aPosition - bPosition;
    });

    // Count by platform type for summary
    const counts = {
      total: filteredResults.length,
      viaguild: 0,
      twitter: 0,
      bluesky: 0,
      twitch: 0,
    };

    // Calculate counts for each platform
    filteredResults.forEach(user => {
      user.matchedAccounts.forEach(account => {
        if (counts[account.type] !== undefined) {
          counts[account.type]++;
        }
      });
    });

    res.status(200).json({
      results: filteredResults,
      counts,
      query: normalizedQuery,
      platform: platform || 'all',
    });
  } catch (error) {
    console.error('Search users error:', error);
    next(error);
  }
};

/**
 * Get public social accounts for a user by username
 */
exports.getUserSocialAccounts = async (req, res, next) => {
  try {
    const { username } = req.params;

    // Get user with their social accounts
    const user = await req.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        isPublic: true,
        hiddenAccounts: true,
        socialAccounts: {
          select: {
            id: true,
            provider: true,
            username: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if profile is public
    if (!user.isPublic) {
      return res.status(403).json({ message: 'This profile is private' });
    }

    // Check if hiddenAccounts exists and is an array
    const hiddenAccountIds = Array.isArray(user.hiddenAccounts) ? user.hiddenAccounts : [];

    // Filter out hidden social accounts
    const visibleSocialAccounts = user.socialAccounts.filter(
      account => !hiddenAccountIds.includes(account.id)
    );

    // Return just the social accounts
    res.status(200).json({ socialAccounts: visibleSocialAccounts });
  } catch (error) {
    console.error('Get user social accounts error:', error);
    next(error);
  }
};

/**
 * Update a user's profile settings
 * Allows updating bio, avatar, profile visibility, and hidden accounts
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { bio, avatar, isPublic, hiddenAccounts } = req.body;
    
    // Prepare update data
    const updateData = {};
    
    // Only include fields that are provided
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (hiddenAccounts !== undefined) updateData.hiddenAccounts = hiddenAccounts;
    
    // Validate avatar size if provided
    if (avatar) {
      try {
        // Calculate approximate size of Base64 string 
        // (removing metadata part like "data:image/jpeg;base64,")
        const base64Data = avatar.split(',')[1] || avatar;
        const approximateSize = Math.ceil((base64Data.length * 3) / 4);
        
        // Log size for debugging
        console.log(`Avatar size: ${Math.round(approximateSize / 1024)}KB`);
        
        // Limit to ~800KB (strict limit to prevent payload issues)
        const MAX_AVATAR_SIZE = 800 * 1024; 
        if (approximateSize > MAX_AVATAR_SIZE) {
          return res.status(400).json({ 
            message: 'Avatar image is too large. Please upload a smaller image (max 800KB).' 
          });
        }
      } catch (error) {
        console.error('Error validating avatar:', error);
        return res.status(400).json({
          message: 'Invalid avatar format. Please try uploading again.'
        });
      }
    }
    
    // Update user profile
    const updatedUser = await req.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        bio: true,
        avatar: true,
        isPublic: true,
        hiddenAccounts: true,
      },
    });
    
    res.status(200).json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    next(error);
  }
};

/**
 * Get public profile information for a user by username
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    console.log(`Fetching profile for username: ${req.params.username}`);
    const { username } = req.params;

    // Get user with their social accounts
    const user = await req.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        bio: true,
        avatar: true,
        isPublic: true,
        hiddenAccounts: true,
        socialAccounts: {
          select: {
            id: true,
            provider: true,
            username: true,
          },
        },
      },
    });

    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if profile is public
    console.log('User isPublic:', user.isPublic);
    if (user.isPublic === false) {
      // Only check isPublic if it's explicitly false
      return res.status(403).json({ message: 'This profile is private' });
    }

    // Ensure hiddenAccounts is an array
    const hiddenAccountIds = Array.isArray(user.hiddenAccounts) ? user.hiddenAccounts : [];
    console.log('Hidden accounts:', hiddenAccountIds);
    
    // Filter out hidden social accounts
    const visibleSocialAccounts = user.socialAccounts.filter(
      account => !hiddenAccountIds.includes(account.id)
    );

    // Create user object without hiddenAccounts field
    const { hiddenAccounts, ...userWithoutHiddenAccounts } = user;
    
    // Replace social accounts with visible ones
    const publicUserProfile = {
      ...userWithoutHiddenAccounts,
      socialAccounts: visibleSocialAccounts
    };

    // Return user data
    res.status(200).json({ user: publicUserProfile });
  } catch (error) {
    console.error('Get user profile error:', error);
    next(error);
  }
};