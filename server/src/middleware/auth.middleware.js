const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Authentication middleware to protect routes
 * Validates JWT token from Authorization header or query parameter
 * Adds user object to request if authenticated
 */
const authenticate = async (req, res, next) => {
  try {
    console.log(`AUTH: ${req.method} ${req.path} - Checking authentication`);
    // Get token from header or query parameter
    let token;
    
    // Check for token in authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // If not in header, check query parameter (for OAuth redirects)
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      console.log(`AUTH: ${req.method} ${req.path} - No token found, returning 401`);
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    console.log(`AUTH: ${req.method} ${req.path} - Token found, verifying...`);

    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      console.log(`AUTH: ${req.method} ${req.path} - User not found in database, returning 401`);
      return res.status(401).json({ message: 'User not found' });
    }

    console.log(`AUTH: ${req.method} ${req.path} - Authentication successful for user ${user.id}`);
    // Add user to request object
    req.user = user;

    next();
  } catch (error) {
    console.log(`AUTH: ${req.method} ${req.path} - Authentication error: ${error.name} - ${error.message}`);
    if (error.name === 'JsonWebTokenError') {
      console.log(`AUTH: ${req.method} ${req.path} - Invalid token, returning 401`);
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      console.log(`AUTH: ${req.method} ${req.path} - Token expired, returning 401`);
      return res.status(401).json({ message: 'Token expired' });
    }
    next(error);
  }
};

/**
 * Get current user information for authenticated routes
 * This middleware should be used after the authenticate middleware
 */
const getCurrentUser = async (req, res) => {
  try {
    // User is already added to req by authenticate middleware
    const { passwordHash, ...userWithoutPassword } = req.user;
    
    // Return user data without password
    res.status(200).json({
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user data' });
  }
};

module.exports = {
  authenticate,
  getCurrentUser
};