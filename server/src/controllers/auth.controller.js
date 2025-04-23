const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Helper function to generate JWT token
 * @param {string} userId - The user's ID
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

/**
 * User registration controller
 * Creates a new user with hashed password
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await req.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = await req.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
      },
    });

    // Generate token
    const token = generateToken(newUser.id);

    // Return user info and token (excluding password)
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * User login controller
 * Authenticates a user and returns a JWT token
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await req.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id);

    // Return user info and token (excluding password)
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user controller
 * Returns the authenticated user's information
 */
exports.getMe = async (req, res, next) => {
  try {
    // User is already added to req by authenticate middleware
    const { passwordHash, ...userWithoutPassword } = req.user;
    
    // Return user data
    res.status(200).json({
      user: userWithoutPassword
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Initiate Twitter OAuth authentication
 * In a real implementation, this would redirect to Twitter's OAuth page
 */
exports.connectTwitter = (req, res) => {
  // For now, redirect to our mock endpoint
  res.redirect(`/api/social-accounts/mock/twitter`);
};

/**
 * Handle Twitter OAuth callback
 * This would be called by Twitter after the user authorizes the app
 */
exports.twitterCallback = (req, res) => {
  // In a real implementation, this would:
  // 1. Validate the OAuth callback from Twitter
  // 2. Get the user's Twitter profile information
  // 3. Create/update the social account in our database
  // 4. Redirect back to the frontend profile page
  
  // For now, just redirect back to the profile page
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile`);
};

/**
 * Initiate Bluesky authentication
 * Bluesky might use a different auth method than OAuth
 */
exports.connectBluesky = (req, res) => {
  // For now, redirect to our mock endpoint
  res.redirect(`/api/social-accounts/mock/bluesky`);
};

/**
 * Handle Bluesky authentication callback
 */
exports.blueskyCallback = (req, res) => {
  // Similar to Twitter callback, but for Bluesky
  // For now, just redirect back to the profile page
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile`);
};