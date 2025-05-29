/**
 * Encryption utilities for securely handling sensitive credentials
 * Uses Node.js built-in crypto module with AES-256-CBC encryption
 */
const crypto = require('crypto');

// Create a standardized key of correct length from the environment variable
function getEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY || 'default-development-encryption-key-change-me';
  
  // Create a hash of the provided key to ensure it's the right length (32 bytes)
  return crypto.createHash('sha256').update(String(envKey)).digest();
}

const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts a string (like an app password)
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text (IV + encrypted content) as a hex string
 */
function encrypt(text) {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Get standardized key
    const key = getEncryptionKey();
    
    // Create cipher with key and IV
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine IV and encrypted content and return as hex string
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypts an encrypted string
 * @param {string} encryptedText - Encrypted text (IV + encrypted content) as a hex string
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText) {
  try {
    // Extract IV and encrypted content
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedContent = textParts[1];
    
    // Get standardized key
    const key = getEncryptionKey();
    
    // Create decipher with key and IV
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    // Decrypt the content
    let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

module.exports = {
  encrypt,
  decrypt
};