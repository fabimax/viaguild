const request = require('supertest');
const app = require('../app');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const prisma = new PrismaClient();

/**
 * User Search Privacy Tests
 * Tests that search respects hidden accounts privacy settings
 */
describe('User Search Privacy', () => {
  // Test user with social accounts
  let testUser;
  let authToken;
  let twitterAccount;
  let blueskyAccount;

  // Create test user and social accounts before running tests
  beforeAll(async () => {
    // Create test user
    const passwordHash = await bcrypt.hash('Password123', 10);
    
    testUser = await prisma.user.create({
      data: {
        email: 'privacy-test@example.com',
        username: 'privacytest',
        passwordHash,
        bio: 'Test user for privacy settings',
        isPublic: true,
        hiddenAccounts: [], // Start with no hidden accounts
      },
    });

    // Generate token for the test user
    authToken = jwt.sign({ userId: testUser.id }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });
    
    // Create test social accounts
    twitterAccount = await prisma.socialAccount.create({
      data: {
        provider: 'twitter',
        providerId: 'twitter-privacy-123',
        username: 'twitterprivacy',
        userId: testUser.id,
      },
    });
    
    blueskyAccount = await prisma.socialAccount.create({
      data: {
        provider: 'bluesky',
        providerId: 'bluesky-privacy-123',
        username: 'blueskyprivacy',
        userId: testUser.id,
      },
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

  // Test that initially all accounts are searchable
  it('should find user by all social accounts when none are hidden', async () => {
    // Search by Twitter username
    const twitterResponse = await request(app)
      .get('/api/users/search')
      .query({ q: 'twitterprivacy', platform: 'twitter' })
      .expect(200);
      
    expect(twitterResponse.body.results.length).toBe(1);
    expect(twitterResponse.body.results[0].username).toBe('privacytest');
    
    // Search by Bluesky username
    const blueskyResponse = await request(app)
      .get('/api/users/search')
      .query({ q: 'blueskyprivacy', platform: 'bluesky' })
      .expect(200);
      
    expect(blueskyResponse.body.results.length).toBe(1);
    expect(blueskyResponse.body.results[0].username).toBe('privacytest');
  });
  
  // Test that hidden accounts are not searchable
  it('should not find user by hidden social accounts', async () => {
    // Hide the Bluesky account
    await prisma.user.update({
      where: { id: testUser.id },
      data: { hiddenAccounts: [blueskyAccount.id] },
    });
    
    // Search by Twitter username (should still find)
    const twitterResponse = await request(app)
      .get('/api/users/search')
      .query({ q: 'twitterprivacy', platform: 'twitter' })
      .expect(200);
      
    expect(twitterResponse.body.results.length).toBe(1);
    expect(twitterResponse.body.results[0].username).toBe('privacytest');
    
    // Search by Bluesky username (should NOT find)
    const blueskyResponse = await request(app)
      .get('/api/users/search')
      .query({ q: 'blueskyprivacy', platform: 'bluesky' })
      .expect(200);
      
    // Should not find any results
    expect(blueskyResponse.body.results.length).toBe(0);
  });
  
  // Test that hiding all accounts still allows searching by ViaGuild username
  it('should find user by ViaGuild username even with all social accounts hidden', async () => {
    // Hide both social accounts
    await prisma.user.update({
      where: { id: testUser.id },
      data: { hiddenAccounts: [blueskyAccount.id, twitterAccount.id] },
    });
    
    // Search by ViaGuild username
    const response = await request(app)
      .get('/api/users/search')
      .query({ q: 'privacytest', platform: 'all' })
      .expect(200);
      
    expect(response.body.results.length).toBe(1);
    expect(response.body.results[0].username).toBe('privacytest');
    expect(response.body.results[0].matchedAccounts[0].type).toBe('viaguild');
    
    // Should not have any visible social accounts in the results
    expect(response.body.results[0].socialAccounts.length).toBe(0);
  });
});