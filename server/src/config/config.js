/**
 * Configuration values for the ViaGuild application.
 * These are loaded from environment variables or fallback to defaults.
 */
module.exports = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3000,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key', // Should be changed in production
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  };