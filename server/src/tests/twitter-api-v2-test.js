const { TwitterApi } = require('twitter-api-v2');
require('dotenv').config();

// Use your consumer keys
const consumerKey = process.env.TWITTER_CONSUMER_KEY;
const consumerSecret = process.env.TWITTER_CONSUMER_SECRET;
const callbackURL = 'http://localhost:3000/api/auth/connect/twitter/callback';

// Create client
const client = new TwitterApi({ 
  appKey: consumerKey, 
  appSecret: consumerSecret 
});

async function testAuth() {
  try {
    console.log('Testing Twitter authentication with:');
    console.log(`- Consumer Key: ${consumerKey.substring(0, 5)}...`);
    console.log(`- Callback URL: ${callbackURL}`);
    
    // Create OAuth 1.0a authentication URL
    const authLink = await client.generateAuthLink(callbackURL);
    
    console.log('\n✅ SUCCESS! Authentication URL generated:');
    console.log('- OAuth Token:', authLink.oauth_token);
    console.log('- Auth URL:', authLink.url);
    
    console.log('\nYour Twitter API credentials are working correctly!');
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Check your Twitter Developer settings and API credentials.');
    
    if (error.data) {
      console.error('Response data:', error.data);
    }
  }
}

testAuth();