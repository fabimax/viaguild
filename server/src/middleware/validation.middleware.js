const { body, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 * Uses express-validator to check for validation errors
 * Returns 400 status with error messages if validation fails
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Validation rules for user registration
 * Validates email, password, and password confirmation
 * Optional validation for first name and last name
 */
const validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
    
  body('firstName').optional().trim().escape(),
  body('lastName').optional().trim().escape(),
  
  handleValidationErrors,
];

/**
 * Validation rules for user login
 * Validates email and password
 */
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('password')
    .not()
    .isEmpty()
    .withMessage('Password is required'),
    
  handleValidationErrors,
];

module.exports = {
  validateRegistration,
  validateLogin,
};