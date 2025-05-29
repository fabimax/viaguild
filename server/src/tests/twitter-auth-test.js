/**
 * Twitter OAuth 1.0a Authentication Test Script
 * 
 * This script tests the Twitter OAuth 1.0a authentication flow
 * Run this directly with Node.js to test Twitter API connectivity:
 * 
 * node src/tests/twitter-auth-test.js
 */

// Load environment variables
require('dotenv').config();

const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');

// Twitter API URLs
const REQUEST_TOKEN_URL = 'https://api.twitter.com/oauth/request_token';
const CALLBACK_URL = 'http://localhost:3000/api/auth/connect/twitter/callback';

// Twitter API credentials
const CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET;

console.log(`Testing Twitter OAuth with:`);
console.log(`- Consumer Key: ${CONSUMER_KEY ? (CONSUMER_KEY.substring(0, 5) + '...') : 'NOT SET'}`);
console.log(`- Consumer Secret: ${CONSUMER_SECRET ? 'CONFIGURED' : 'NOT SET'}`);
console.log(`- Callback URL: ${CALLBACK_URL}`);

// Create OAuth 1.0a instance
const oauth = OAuth({
  consumer: {
    key: CONSUMER_KEY,
    secret: CONSUMER_SECRET
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  }
});

// Test function to get request token
async function testGetRequestToken() {
  try {
    console.log('\nTesting request token...');
    
    // Request data
    const request_data = {
      url: REQUEST_TOKEN_URL,
      method: 'POST'
    };
    
    // Get authorization header with the callback
    const auth = oauth.authorize(request_data);
    const headers = oauth.toHeader(auth);
    
    console.log('Authorization header:', headers);
    
    // Make the request
    const result = await axios.post(
      REQUEST_TOKEN_URL, 
      querystring.stringify({ oauth_callback: CALLBACK_URL }), 
      { headers }
    );
    
    console.log('Success! Request token response:', result.data);
    return true;
  } catch (error) {
    console.error('Error getting request token:');
    console.error(`Status: ${error.response?.status}`);
    console.error(`Data:`, error.response?.data);
    
    if (error.response?.status === 401) {
      console.log('\n🔴 Authentication Error (401)');
      console.log('This usually means:');
      console.log('1. Your consumer key or secret is incorrect');
      console.log('2. Your app is not properly configured for OAuth 1.0a in Twitter Developer Portal');
      console.log('3. Your app might be in a restricted state or needs activation');
    }
    
    return false;
  }
}

// Run the test
(async () => {
  console.log('\n🔄 Starting Twitter OAuth test...');
  
  // Verify credentials
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    console.error('❌ Error: Twitter API credentials not configured');
    console.log('Make sure TWITTER_CONSUMER_KEY and TWITTER_CONSUMER_SECRET are set in your .env file');
    return;
  }
  
  // Test getting request token
  const success = await testGetRequestToken();
  
  if (success) {
    console.log('\n✅ Test completed successfully!');
    console.log('Your Twitter OAuth 1.0a configuration is working correctly.');
  } else {
    console.log('\n❌ Test failed!');
    console.log('Please check your Twitter Developer settings at developer.twitter.com:');
    console.log('1. Verify your Consumer Key and Secret are correct');
    console.log('2. Ensure OAuth 1.0a is enabled in User Authentication Settings');
    console.log('3. Confirm the callback URL is set to:', CALLBACK_URL);
    console.log('4. Check that your app has at least "Read" permissions');
    console.log('5. Make sure your app is in "Live" environment mode if applicable');
  }
})();