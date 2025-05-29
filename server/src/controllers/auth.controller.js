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
    const { email, username, password } = req.body;

    // Check if user email already exists
    const existingUserByEmail = await req.prisma.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Check if username already exists
    const existingUserByUsername = await req.prisma.user.findUnique({
      where: { username },
    });

    if (existingUserByUsername) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = await req.prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
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
 * Redirects to Twitter's OAuth authorization page
 */
exports.connectTwitter = require('../controllers/twitter.controller').initiateTwitterAuth;

/**
 * Handle Twitter OAuth callback
 * Called by Twitter after the user authorizes the app
 */
exports.twitterCallback = require('../controllers/twitter.controller').twitterCallback;

/**
 * Initiate Twitch OAuth authentication
 * Redirects to Twitch's OAuth authorization page
 */
exports.connectTwitch = require('../controllers/twitch.controller').initiateTwitchAuth;

/**
 * Handle Twitch OAuth callback
 * Called by Twitch after the user authorizes the app
 */
exports.twitchCallback = require('../controllers/twitch.controller').twitchCallback;