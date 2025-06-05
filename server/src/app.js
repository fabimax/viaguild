const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const passport = require('passport');

// Import routes
const authRoutes = require('./routes/auth.routes');
const socialAccountRoutes = require('./routes/socialAccount.routes');
const userRoutes = require('./routes/user.routes');
const guildRoutes = require('./routes/guild.routes');
const systemIconRoutes = require('./routes/systemIcon.routes');
const uploadRoutes = require('./routes/upload.routes');
const badgeRoutes = require('./routes/badge.routes');

// Initialize Express app
const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Previous-Preview-URL']
}));
app.use(helmet());
app.use(morgan('dev'));

// Set reasonable size limits for requests
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(passport.initialize());

// Make Prisma available in the request object and app.locals
app.use((req, res, next) => {
  req.prisma = prisma;
  app.locals.prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/social-accounts', socialAccountRoutes);
app.use('/api/users', userRoutes);
app.use('/api/guilds', guildRoutes);
app.use('/api/system-icons', systemIconRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', badgeRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('ViaGuild API is running');
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
    status: 404
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log the error details
  console.error('=============== SERVER ERROR ===============');
  console.error(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  
  // Log the error stack
  console.error(err.stack);
  
  // Prisma specific error handling
  if (err.name === 'PrismaClientKnownRequestError') {
    // Check for common prisma errors
    if (err.code === 'P2025') {
      return res.status(404).json({
        message: 'The requested resource was not found',
        error: process.env.NODE_ENV === 'production' ? {} : err,
      });
    }
    
    if (err.code === 'P2002') {
      return res.status(409).json({
        message: 'A resource with this identifier already exists',
        error: process.env.NODE_ENV === 'production' ? {} : err,
      });
    }
  }
  
  // Send appropriate response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Something went wrong!',
    status: statusCode,
    error: process.env.NODE_ENV === 'production' ? {} : {
      name: err.name,
      stack: err.stack,
      details: err
    },
  });
});

module.exports = app;