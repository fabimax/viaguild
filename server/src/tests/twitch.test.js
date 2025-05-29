const request = require('supertest');
const app = require('../app');
const { PrismaClient } = require('@prisma/client');
const twitchService = require('../services/twitch.service');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Mock Twitch service
jest.mock('../services/twitch.service');

const prisma = new PrismaClient();

/**
 * Twitch OAuth Tests
 * Tests the Twitch OAuth flow
 */
describe('Twitch OAuth', () => {
  // Test user data
  let testUser;
  let authToken;

  // Create a test user before running tests
  beforeAll(async () => {
    // Create a test user
    const passwordHash = await bcrypt.hash('Password123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'twitch-test@example.com',
        username: 'twitchtest',
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

  describe('GET /api/auth/connect/twitch', () => {
    it('should redirect to Twitch authorization page', async () => {
      // Mock the getAuthorizationURL function
      twitchService.getAuthorizationURL.mockReturnValue('https://id.twitch.tv/oauth2/authorize?client_id=mock_client&redirect_uri=mock_uri&scope=mock_scope');

      const response = await request(app)
        .get('/api/auth/connect/twitch')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(302); // Expect redirect

      expect(response.headers.location).toContain('id.twitch.tv/oauth2/authorize');
    });

    it('should handle Twitch API errors', async () => {
      // Mock an error scenario
      twitchService.getAuthorizationURL.mockImplementation(() => {
        throw new Error('Twitch API credentials not configured');
      });

      const response = await request(app)
        .get('/api/auth/connect/twitch')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(302); // Expect redirect to error page

      // Should redirect to frontend with error
      expect(response.headers.location).toContain('error=');
    });
  });

  describe('GET /api/auth/connect/twitch/callback', () => {
    it('should handle valid callback and create social account', async () => {
      // Mock successful token response
      twitchService.getAccessToken.mockResolvedValue({
        success: true,
        data: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token'
        }
      });

      // Mock successful user info response
      twitchService.getUserInfo.mockResolvedValue({
        success: true,
        data: {
          id: '12345',
          login: 'twitch_user',
          display_name: 'Twitch User'
        }
      });

      // Create a valid state parameter
      const state = Buffer.from(JSON.stringify({
        userId: testUser.id,
        token: authToken
      })).toString('base64');

      const response = await request(app)
        .get('/api/auth/connect/twitch/callback')
        .query({
          code: 'valid_code',
          state: state
        })
        .expect(302); // Expect redirect

      expect(response.headers.location).toContain('success=Twitch%20account%20connected%20successfully');

      // Verify the account was created
      const socialAccount = await prisma.socialAccount.findFirst({
        where: {
          provider: 'twitch',
          userId: testUser.id
        }
      });

      expect(socialAccount).toBeTruthy();
      expect(socialAccount.provider).toBe('twitch');
      expect(socialAccount.username).toBe('twitch_user');
    });

    it('should handle missing parameters', async () => {
      const response = await request(app)
        .get('/api/auth/connect/twitch/callback')
        .query({}) // No query params
        .expect(302);

      expect(response.headers.location).toContain('error=Missing%20required%20parameters');
    });

    it('should handle invalid state parameter', async () => {
      const response = await request(app)
        .get('/api/auth/connect/twitch/callback')
        .query({
          code: 'valid_code',
          state: 'invalid_state'
        })
        .expect(302);

      expect(response.headers.location).toContain('error=Invalid%20state%20parameter');
    });
  });
});