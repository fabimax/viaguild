/**
 * Twitch OAuth 2.0 Authentication Test Script
 * 
 * This script tests the Twitch OAuth 2.0 authentication flow
 * Run this directly with Node.js to test Twitch API connectivity:
 * 
 * node src/tests/twitch-api-test.js
 */

// Load environment variables
require('dotenv').config();

const axios = require('axios');

// Twitch API URLs
const AUTHORIZE_URL = 'https://id.twitch.tv/oauth2/authorize';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate';

// Twitch API credentials
const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const REDIRECT_URI = process.env.TWITCH_REDIRECT_URI || 'http://localhost:3000/api/auth/connect/twitch/callback';

console.log(`Testing Twitch OAuth with:`);
console.log(`- Client ID: ${CLIENT_ID ? (CLIENT_ID.substring(0, 5) + '...') : 'NOT SET'}`);
console.log(`- Client Secret: ${CLIENT_SECRET ? 'CONFIGURED' : 'NOT SET'}`);
console.log(`- Redirect URI: ${REDIRECT_URI}`);

/**
 * Generate a sample authorization URL
 * @returns {string} Authorization URL
 */
function generateAuthURL() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'user:read:email',
    state: 'test-state'
  });
  
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Test if client credentials are valid by trying to get an app access token
 */
async function testAppToken() {
  try {
    console.log('\nTesting client credentials by requesting an app access token...');
    
    const response = await axios.post(TOKEN_URL, null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials'
      }
    });
    
    console.log('✅ Success! Received app access token.');
    console.log('- Type:', response.data.token_type);
    console.log('- Expires in:', response.data.expires_in, 'seconds');
    
    return { success: true, token: response.data.access_token };
  } catch (error) {
    console.error('❌ Error getting app access token:');
    if (error.response) {
      console.error(`- Status: ${error.response.status}`);
      console.error(`- Message:`, error.response.data);
    } else {
      console.error(error.message);
    }
    
    return { success: false };
  }
}

/**
 * Validate an access token
 * @param {string} token - The access token to validate
 */
async function validateToken(token) {
  try {
    console.log('\nValidating access token...');
    
    const response = await axios.get(VALIDATE_URL, {
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });
    
    console.log('✅ Token is valid!');
    console.log('- Client ID:', response.data.client_id);
    console.log('- Scopes:', response.data.scopes.join(', ') || 'None');
    console.log('- User ID:', response.data.user_id || 'None (App Token)');
    
    return true;
  } catch (error) {
    console.error('❌ Token validation failed:');
    if (error.response) {
      console.error(`- Status: ${error.response.status}`);
      console.error(`- Message:`, error.response.data);
    } else {
      console.error(error.message);
    }
    
    return false;
  }
}

// Run the test
(async () => {
  console.log('\n🔄 Starting Twitch OAuth test...');
  
  // Verify credentials
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Error: Twitch API credentials not configured');
    console.log('Make sure TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are set in your .env file');
    return;
  }
  
  // Generate and display authorization URL
  const authUrl = generateAuthURL();
  console.log('\nSample authorization URL:');
  console.log(authUrl);
  
  // Test app access token
  const appTokenResult = await testAppToken();
  
  if (appTokenResult.success) {
    // Validate the token if successful
    await validateToken(appTokenResult.token);
    
    console.log('\n✅ Test completed successfully!');
    console.log('Your Twitch OAuth 2.0 configuration is working correctly.');
    console.log('\nTo complete the integration:');
    console.log('1. Ensure your app is registered at https://dev.twitch.tv/console/apps');
    console.log('2. Verify your redirect URI is set to:', REDIRECT_URI);
    console.log('3. Make sure you have the correct scopes selected in your app settings');
  } else {
    console.log('\n❌ Test failed!');
    console.log('Please check your Twitch Developer settings at https://dev.twitch.tv/console:');
    console.log('1. Verify your Client ID and Client Secret are correct');
    console.log('2. Ensure your app is properly registered and approved');
    console.log('3. Confirm the redirect URI is set to:', REDIRECT_URI);
  }
})();