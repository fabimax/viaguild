const request = require('supertest');
const app = require('../app');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const prisma = new PrismaClient();

/**
 * User API Tests
 * Tests user search and profile viewing endpoints
 */
describe('User API', () => {
  // Test users
  let testUser1;
  let testUser2;
  let authToken;
  let twitterAccount;
  let blueskyAccount;

  // Create test users and social accounts before running tests
  beforeAll(async () => {
    // Create test users
    const passwordHash = await bcrypt.hash('Password123', 10);
    
    // First test user with social accounts
    testUser1 = await prisma.user.create({
      data: {
        email: 'search-test1@example.com',
        username: 'searchtest1',
        passwordHash,
        bio: 'Test user with social accounts',
        isPublic: true,
      },
    });
    
    // Second test user without social accounts
    testUser2 = await prisma.user.create({
      data: {
        email: 'search-test2@example.com',
        username: 'searchtest2',
        passwordHash,
        bio: 'Test user without social accounts',
        isPublic: false,
      },
    });

    // Generate token for the first test user
    authToken = jwt.sign({ userId: testUser1.id }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });
    
    // Create test social accounts for the first user
    twitterAccount = await prisma.socialAccount.create({
      data: {
        provider: 'twitter',
        providerId: 'twitter12345',
        username: 'twitterusername',
        userId: testUser1.id,
      },
    });
    
    blueskyAccount = await prisma.socialAccount.create({
      data: {
        provider: 'bluesky',
        providerId: 'bluesky12345',
        username: 'blueskyusername',
        userId: testUser1.id,
      },
    });
  });

  // Clean up database after tests
  afterAll(async () => {
    // Delete test social accounts and users
    await prisma.socialAccount.deleteMany({
      where: {
        userId: {
          in: [testUser1.id, testUser2.id],
        },
      },
    });
    
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testUser1.id, testUser2.id],
        },
      },
    });
    
    await prisma.$disconnect();
  });

  describe('GET /api/users/search', () => {
    it('should search for users by ViaGuild username', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'searchtest', platform: 'viaguild' })
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.results[0].username).toBe('searchtest1');
      expect(response.body.results[0].matchedAccounts[0].type).toBe('viaguild');
    });

    it('should search for users by Twitter username', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'twitter', platform: 'twitter' })
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.results[0].username).toBe('searchtest1');
      expect(response.body.results[0].matchedAccounts[0].type).toBe('twitter');
    });

    it('should search for users by Bluesky username', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'bluesky', platform: 'bluesky' })
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.results[0].username).toBe('searchtest1');
      expect(response.body.results[0].matchedAccounts[0].type).toBe('bluesky');
    });

    it('should search across all platforms', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'test' })
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.results[0].matchedAccounts.length).toBeGreaterThan(0);
    });

    it('should require minimum query length', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'a' })
        .expect(400);

      expect(response.body.message).toBe('Search query must be at least 2 characters long');
    });
  });

  describe('GET /api/users/:username', () => {
    it('should get a public user profile', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser1.username}`)
        .expect(200);

      expect(response.body.user.username).toBe(testUser1.username);
      expect(response.body.user.bio).toBe('Test user with social accounts');
      expect(response.body.user.socialAccounts).toHaveLength(2);
      expect(response.body.user).not.toHaveProperty('email');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 403 for private profiles', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser2.username}`)
        .expect(403);

      expect(response.body.message).toBe('This profile is private');
    });

    it('should return 404 for non-existent users', async () => {
      const response = await request(app)
        .get('/api/users/nonexistentuser')
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile settings', async () => {
      const updateData = {
        bio: 'Updated bio for test user',
        isPublic: true,
        hiddenAccounts: [blueskyAccount.id],
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.bio).toBe(updateData.bio);
      expect(response.body.user.isPublic).toBe(updateData.isPublic);
      expect(response.body.user.hiddenAccounts).toContain(blueskyAccount.id);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ bio: 'Test bio' })
        .expect(401);

      expect(response.body.message).toBe('Authentication required');
    });
  });

  describe('GET /api/users/:username/social-accounts', () => {
    it('should get public social accounts for a user', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser1.username}/social-accounts`)
        .expect(200);

      expect(response.body.socialAccounts).toBeDefined();
      expect(Array.isArray(response.body.socialAccounts)).toBe(true);
      // Since we hidden one account in previous test
      expect(response.body.socialAccounts.length).toBe(1);
      expect(response.body.socialAccounts[0].provider).toBe('twitter');
    });

    it('should return 403 for private profiles', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser2.username}/social-accounts`)
        .expect(403);

      expect(response.body.message).toBe('This profile is private');
    });

    it('should return 404 for non-existent users', async () => {
      const response = await request(app)
        .get('/api/users/nonexistentuser/social-accounts')
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });
  });
});