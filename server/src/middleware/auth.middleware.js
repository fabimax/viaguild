const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Authentication middleware to protect routes
 * Validates JWT token from Authorization header or query parameter
 * Adds user object to request if authenticated
 */
const authenticate = async (req, res, next) => {
  try {
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
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Add user to request object
    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
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