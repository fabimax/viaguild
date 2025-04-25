/**
 * User Controller
 * Handles user search and profile viewing functionality
 * Also manages user profile settings
 */

/**
 * Search for users by username or connected social accounts
 * Supports filtering by platform and partial string matching
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
    
    // Initialize base query to find users
    const baseQuery = {
      select: {
        id: true,
        username: true,
        email: true, // Will be removed before sending to client
        socialAccounts: {
          select: {
            id: true,
            provider: true,
            username: true,
          },
        },
      },
    };

    // Add OR conditions based on platform filter
    let whereConditions = [];
    
    // Handle platform-specific searches
    if (platform === 'viaguild' || platform === 'all' || !platform) {
      // Search in ViaGuild usernames
      whereConditions.push({
        username: {
          contains: normalizedQuery,
          mode: 'insensitive', // Case-insensitive search
        },
      });
    }

    // If searching social accounts, add those conditions
    if (platform !== 'viaguild') {
      // Initialize social account filter
      const socialAccountFilter = {
        socialAccounts: {
          some: {
            username: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
        },
      };

      // Add provider filter if a specific platform is selected
      if (platform && platform !== 'all') {
        socialAccountFilter.socialAccounts.some.provider = platform;
      }

      whereConditions.push(socialAccountFilter);
    }

    // Combine all conditions with OR
    baseQuery.where = { OR: whereConditions };

    // Execute the search
    const users = await req.prisma.user.findMany(baseQuery);

    // Process results to format them appropriately and remove sensitive info
    const processedResults = users.map(user => {
      // Remove email address for privacy
      const { email, ...userWithoutEmail } = user;
      
      // Find which account matched the search query
      const matchedAccounts = [];
      
      // Check if the ViaGuild username matched
      if (user.username.toLowerCase().includes(normalizedQuery)) {
        matchedAccounts.push({
          type: 'viaguild',
          username: user.username,
          accountId: user.id,
        });
      }
      
      // Check which social accounts matched
      user.socialAccounts.forEach(account => {
        if (account.username.toLowerCase().includes(normalizedQuery)) {
          matchedAccounts.push({
            type: account.provider,
            username: account.username,
            accountId: account.id,
          });
        }
      });
      
      return {
        ...userWithoutEmail,
        matchedAccounts,
      };
    });

    // Only return users with at least one match
    const filteredResults = processedResults.filter(
      user => user.matchedAccounts.length > 0
    );

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
 * Allows updating bio, profile visibility, and hidden accounts
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { bio, isPublic, hiddenAccounts } = req.body;
    
    // Prepare update data
    const updateData = {};
    
    // Only include fields that are provided
    if (bio !== undefined) updateData.bio = bio;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (hiddenAccounts !== undefined) updateData.hiddenAccounts = hiddenAccounts;
    
    // Update user profile
    const updatedUser = await req.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        bio: true,
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