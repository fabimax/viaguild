const request = require('supertest');
const app = require('../app');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Authentication API Tests
 * Tests the registration, login, and user info endpoints
 */
describe('Authentication API', () => {
  // Test user data
  const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'Password123',
    confirmPassword: 'Password123',
  };
  
  let authToken;

  // Clean up database after tests
  afterAll(async () => {
    // Delete test user if it exists
    await prisma.socialAccount.deleteMany({
      where: { user: { email: testUser.email } }
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.token).toBeDefined();
      
      // Save token for later tests
      authToken = response.body.token;
    });

    it('should not register a user with an existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.message).toBe('Email already in use');
    });

    it('should not register a user with an existing username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'another@example.com', // different email
        })
        .expect(400);

      expect(response.body.message).toBe('Username already taken');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
          username: 'uniqueuser1', // unique username
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should validate username format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'another@example.com', // different email
          username: 'invalid username!', // invalid username with spaces and special characters
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should validate password requirements', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'another@example.com', // different email
          username: 'uniqueuser2', // unique username
          password: 'weak',
          confirmPassword: 'weak',
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a registered user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.token).toBeDefined();
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info for authenticated user', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should not allow access without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.message).toBe('Authentication required');
    });
  });
});