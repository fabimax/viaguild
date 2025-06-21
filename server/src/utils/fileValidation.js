/**
 * File validation utilities for secure upload handling
 * Includes magic number validation to prevent malicious files
 */

const MAGIC_NUMBERS = {
  // Image formats
  png: {
    mime: 'image/png',
    signatures: [
      Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) // PNG signature
    ]
  },
  jpeg: {
    mime: 'image/jpeg',
    signatures: [
      Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG with JFIF
      Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]), // JPEG with EXIF
      Buffer.from([0xFF, 0xD8, 0xFF, 0xE8]), // JPEG with SPIFF
      Buffer.from([0xFF, 0xD8, 0xFF, 0xDB]), // JPEG raw
      Buffer.from([0xFF, 0xD8, 0xFF, 0xEE])  // JPEG
    ]
  },
  gif: {
    mime: 'image/gif',
    signatures: [
      Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
      Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])  // GIF89a
    ]
  },
  webp: {
    mime: 'image/webp',
    signatures: [
      // WebP files start with RIFF....WEBP
      Buffer.from([0x52, 0x49, 0x46, 0x46]), // "RIFF" - check at position 0
      Buffer.from([0x57, 0x45, 0x42, 0x50])  // "WEBP" - check at position 8
    ],
    checkPositions: [0, 8] // Special handling for WebP
  },
  svg: {
    mime: 'image/svg+xml',
    // SVG is XML text, so we check for common SVG patterns
    textSignatures: [
      '<?xml',
      '<svg',
      '<!DOCTYPE svg'
    ]
  }
};

// Mapping of MIME types to magic number types
const MIME_TO_TYPE = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg'
};

/**
 * Validates a file buffer against expected magic numbers
 * @param {Buffer} buffer - The file buffer to validate
 * @param {string} expectedMimeType - The MIME type claimed by the upload
 * @returns {boolean} - True if file is valid, false otherwise
 */
function validateMagicNumber(buffer, expectedMimeType) {
  const fileType = MIME_TO_TYPE[expectedMimeType];
  
  if (!fileType) {
    console.warn(`Unknown MIME type: ${expectedMimeType}`);
    return false;
  }
  
  console.log(`Validating magic number for ${fileType} (${expectedMimeType}), buffer length: ${buffer.length}`);

  const config = MAGIC_NUMBERS[fileType];
  
  if (!config) {
    console.warn(`No magic number config for type: ${fileType}`);
    return false;
  }

  // Special handling for SVG (text-based format)
  if (fileType === 'svg') {
    const fileStart = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
    const trimmedStart = fileStart.trim().toLowerCase();
    
    console.log('SVG validation - First 200 chars:', fileStart.substring(0, 200));
    console.log('SVG validation - Trimmed start:', trimmedStart.substring(0, 100));
    
    // Check for common SVG patterns
    // SVG files might have whitespace, comments, or other XML before the actual SVG tag
    const svgPatterns = [
      '<?xml',
      '<svg',
      '<!doctype svg',
      '<html', // Some SVGs are embedded in HTML
      '<!--' // Some SVGs start with comments
    ];
    
    // Also check if it contains an SVG tag somewhere in the first 1000 chars
    const containsSvgTag = trimmedStart.includes('<svg');
    
    const isValid = svgPatterns.some(pattern => trimmedStart.startsWith(pattern)) || containsSvgTag;
    console.log('SVG validation result:', isValid);
    
    return isValid;
  }

  // Special handling for WebP (needs position checking)
  if (fileType === 'webp') {
    // Check RIFF at position 0
    const riffMatch = buffer.subarray(0, 4).equals(config.signatures[0]);
    // Check WEBP at position 8
    const webpMatch = buffer.subarray(8, 12).equals(config.signatures[1]);
    return riffMatch && webpMatch;
  }

  // Standard binary signature checking
  return config.signatures.some(signature => {
    if (buffer.length < signature.length) {
      return false;
    }
    return buffer.subarray(0, signature.length).equals(signature);
  });
}

/**
 * Enhanced multer file filter with magic number validation
 * @param {Array<string>} allowedMimeTypes - Array of allowed MIME types
 * @returns {Function} Multer fileFilter function
 */
function createSecureFileFilter(allowedMimeTypes) {
  return async (req, file, cb) => {
    // First check: MIME type whitelist
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
    }

    // Store the file stream chunks for magic number validation
    const chunks = [];
    let totalSize = 0;
    
    file.stream.on('data', (chunk) => {
      // Only collect first 12 bytes for magic number check
      if (totalSize < 12) {
        chunks.push(chunk);
        totalSize += chunk.length;
      }
    });

    file.stream.on('end', () => {
      const buffer = Buffer.concat(chunks).subarray(0, 12);
      
      // Second check: Magic number validation
      if (!validateMagicNumber(buffer, file.mimetype)) {
        return cb(new Error('File content does not match declared type. Possible security risk.'));
      }
      
      cb(null, true);
    });

    file.stream.on('error', (err) => {
      cb(err);
    });
  };
}

/**
 * Validates a buffer that's already in memory
 * Used for files that have already been uploaded to memory storage
 * @param {Buffer} buffer - The complete file buffer
 * @param {string} mimeType - The claimed MIME type
 * @throws {Error} If validation fails
 */
function validateBufferMagicNumber(buffer, mimeType) {
  if (!validateMagicNumber(buffer, mimeType)) {
    throw new Error('File content does not match declared type. Possible security risk.');
  }
}

module.exports = {
  validateMagicNumber,
  createSecureFileFilter,
  validateBufferMagicNumber,
  MAGIC_NUMBERS,
  MIME_TO_TYPE
};