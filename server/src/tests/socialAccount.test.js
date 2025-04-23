const request = require('supertest');
const app = require('../app');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const prisma = new PrismaClient();

/**
 * Social Account API Tests
 * Tests the social account endpoints for fetching, creating, and removing social accounts
 */
describe('Social Account API', () => {
  // Test user data
  let testUser;
  let authToken;
  let socialAccountId;

  // Create a test user before running tests
  beforeAll(async () => {
    // Create a test user
    const passwordHash = await bcrypt.hash('Password123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'social-test@example.com',
        passwordHash,
        firstName: 'Social',
        lastName: 'Test',
      },
    });

    // Generate token for the test user
    authToken = jwt.sign({ userId: testUser.id }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });
  });

  // Clean up database after tests
  afterAll(async () => {
    // Delete test social accounts and user
    await prisma.socialAccount.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/social-accounts/mock/twitter', () => {
    it('should connect a Twitter account for the authenticated user', async () => {
      const response = await request(app)
        .post('/api/social-accounts/mock/twitter')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Twitter account connected successfully');
      expect(response.body.socialAccount).toHaveProperty('id');
      expect(response.body.socialAccount.provider).toBe('twitter');
      expect(response.body.socialAccount.userId).toBe(testUser.id);

      // Save the social account ID for later tests
      socialAccountId = response.body.socialAccount.id;
    });
  });

  describe('GET /api/social-accounts', () => {
    it('should get all social accounts for the authenticated user', async () => {
      const response = await request(app)
        .get('/api/social-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.socialAccounts).toBeInstanceOf(Array);
      expect(response.body.socialAccounts.length).toBeGreaterThan(0);
      expect(response.body.socialAccounts[0].provider).toBe('twitter');
      expect(response.body.socialAccounts[0].userId).toBe(testUser.id);
    });

    it('should not allow access without authentication', async () => {
      const response = await request(app)
        .get('/api/social-accounts')
        .expect(401);

      expect(response.body.message).toBe('Authentication required');
    });
  });

  describe('DELETE /api/social-accounts/:id', () => {
    it('should remove a social account', async () => {
      const response = await request(app)
        .delete(`/api/social-accounts/${socialAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Social account removed successfully');

      // Verify the account was removed
      const checkResponse = await request(app)
        .get('/api/social-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const accountStillExists = checkResponse.body.socialAccounts.some(
        (account) => account.id === socialAccountId
      );
      expect(accountStillExists).toBe(false);
    });

    it('should return 404 for non-existent social account', async () => {
      const response = await request(app)
        .delete(`/api/social-accounts/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toBe('Social account not found');
    });
  });

  describe('POST /api/social-accounts/mock/bluesky', () => {
    it('should connect a Bluesky account for the authenticated user', async () => {
      const response = await request(app)
        .post('/api/social-accounts/mock/bluesky')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Bluesky account connected successfully');
      expect(response.body.socialAccount).toHaveProperty('id');
      expect(response.body.socialAccount.provider).toBe('bluesky');
      expect(response.body.socialAccount.userId).toBe(testUser.id);
    });
  });
});