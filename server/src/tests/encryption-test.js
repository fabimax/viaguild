/**
 * Test script to verify encryption key behavior
 * Run with: node src/tests/encryption-test.js
 */
require('dotenv').config();
const encryptionUtils = require('../utils/encryption.utils');

// Test data
const testData = 'This is sensitive information to encrypt!';

console.log('=== ENCRYPTION KEY TEST ===');
console.log('ENCRYPTION_KEY environment variable:', process.env.ENCRYPTION_KEY ? 'SET' : 'NOT SET');

// First encryption
const encrypted = encryptionUtils.encrypt(testData);
console.log('\n1. Encrypted data:', encrypted);

// Store original key
const originalKey = process.env.ENCRYPTION_KEY;

// Try decrypting with same key (should work)
try {
  const decrypted = encryptionUtils.decrypt(encrypted);
  console.log('\n2. Decryption with same key:');
  console.log('   SUCCESS! Decrypted:', decrypted);
  console.log('   Matches original:', decrypted === testData);
} catch (err) {
  console.log('\n2. Decryption with same key FAILED:', err.message);
}

// Modify environment key to simulate changing it
console.log('\n3. Temporarily changing encryption key...');
process.env.ENCRYPTION_KEY = 'this-is-a-completely-different-key';

// Try decrypting with different key (should fail if custom key is used)
try {
  const decrypted = encryptionUtils.decrypt(encrypted);
  console.log('\n4. Decryption with different key:');
  console.log('   WARNING! Decryption still worked, which means:');
  console.log('   - Either you\'re using the default fallback key');
  console.log('   - Or the key change didn\'t take effect in this process');
} catch (err) {
  console.log('\n4. Decryption with different key:');
  console.log('   GOOD! Decryption failed as expected:', err.message);
  console.log('   This confirms your custom key was used for encryption');
}

// Restore original key
process.env.ENCRYPTION_KEY = originalKey;

// Final verification
try {
  const decrypted = encryptionUtils.decrypt(encrypted);
  console.log('\n5. Decryption after restoring original key:');
  console.log('   SUCCESS! Decrypted:', decrypted);
  console.log('   Matches original:', decrypted === testData);
} catch (err) {
  console.log('\n5. Decryption after restoring original key FAILED:', err.message);
}

console.log('\n=== TEST COMPLETED ===');
if (!process.env.ENCRYPTION_KEY) {
  console.log('RECOMMENDATION: Set a custom ENCRYPTION_KEY in your .env file for better security');
}