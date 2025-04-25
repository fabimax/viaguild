const request = require('supertest');
const app = require('../app');
const { PrismaClient } = require('@prisma/client');
const twitterService = require('../services/twitter.service');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Mock Twitter service
jest.mock('../services/twitter.service');

const prisma = new PrismaClient();

/**
 * Twitter OAuth Tests
 * Tests the Twitter OAuth flow
 */
describe('Twitter OAuth', () => {
  // Test user data
  let testUser;
  let authToken;

  // Create a test user before running tests
  beforeAll(async () => {
    // Create a test user
    const passwordHash = await bcrypt.hash('Password123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'twitter-test@example.com',
        username: 'twittertest',
        passwordHash,
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

  describe('GET /api/auth/connect/twitter', () => {
    it('should redirect to Twitter authorization page', async () => {
      // Mock the getRequestToken function
      twitterService.getRequestToken.mockResolvedValue({
        success: true,
        data: {
          oauth_token: 'mock_token',
          oauth_token_secret: 'mock_secret'
        }
      });

      // Mock the getAuthorizationURL function
      twitterService.getAuthorizationURL.mockReturnValue('https://api.twitter.com/oauth/authorize?oauth_token=mock_token');

      const response = await request(app)
        .get('/api/auth/connect/twitter')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(302); // Expect redirect

      expect(response.headers.location).toContain('api.twitter.com/oauth/authorize');
    });

    it('should handle Twitter API errors', async () => {
      // Mock a failed response
      twitterService.getRequestToken.mockResolvedValue({
        success: false,
        error: 'Twitter API error'
      });

      const response = await request(app)
        .get('/api/auth/connect/twitter')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.message).toContain('Failed to get request token from Twitter');
    });
  });

  describe('GET /api/auth/connect/twitter/callback', () => {
    it('should handle valid callback and create social account', async () => {
      // Mock the getAccessToken function
      twitterService.getAccessToken.mockResolvedValue({
        success: true,
        data: {
          oauth_token: 'access_token',
          oauth_token_secret: 'access_token_secret',
          user_id: '12345',
          screen_name: 'test_user'
        }
      });

      // Mock the getUserInfo function
      twitterService.getUserInfo.mockResolvedValue({
        success: true,
        data: {
          id_str: '12345',
          screen_name: 'test_user',
          name: 'Test User'
        }
      });

      // We need to store a token in the oauthTokens map before calling the callback
      // This is a bit of a hack for testing purposes
      const oauthTokens = require('../controllers/twitter.controller').oauthTokens;
      oauthTokens.set('valid_token', {
        user_id: testUser.id,
        oauth_token_secret: 'token_secret'
      });

      const response = await request(app)
        .get('/api/auth/connect/twitter/callback')
        .query({
          oauth_token: 'valid_token',
          oauth_verifier: 'valid_verifier'
        })
        .expect(302); // Expect redirect

      expect(response.headers.location).toContain('success=Twitter%20account%20connected%20successfully');

      // Verify the account was created
      const socialAccount = await prisma.socialAccount.findFirst({
        where: {
          provider: 'twitter',
          userId: testUser.id
        }
      });

      expect(socialAccount).toBeTruthy();
      expect(socialAccount.provider).toBe('twitter');
      expect(socialAccount.username).toBe('test_user');
    });

    it('should handle missing OAuth tokens', async () => {
      const response = await request(app)
        .get('/api/auth/connect/twitter/callback')
        .query({}) // No query params
        .expect(302);

      expect(response.headers.location).toContain('error=Twitter%20authentication%20failed');
    });
  });
});