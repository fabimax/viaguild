const express = require('express');
const multer = require('multer');
const { uploadController } = require('../controllers/upload.controller.js');
const { authenticate } = require('../middleware/auth.middleware.js');

const router = express.Router();

/**
 * Configure multer for memory storage
 * Files are temporarily stored in memory before processing and uploading to R2
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed image types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

// Multer for handling both file and text fields
const uploadWithFields = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for badge icons
  },
  fileFilter: (req, file, cb) => {
    // Allowed image types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

// Multer for badge backgrounds (5MB limit, includes SVG)
const uploadBackgrounds = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for backgrounds
  },
  fileFilter: (req, file, cb) => {
    // Allowed image types (including SVG for backgrounds)
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed for backgrounds.'));
    }
  },
});

/**
 * Upload user avatar
 * POST /api/upload/avatar
 * Requires authentication
 */
router.post(
  '/avatar',
  authenticate,
  upload.single('avatar'),
  uploadController.uploadUserAvatar
);

/**
 * Upload guild avatar
 * POST /api/upload/guild/:guildId/avatar
 * Requires authentication and MANAGE_GUILD permission
 */
router.post(
  '/guild/:guildId/avatar',
  authenticate,
  upload.single('avatar'),
  uploadController.uploadGuildAvatar
);

/**
 * Upload cluster avatar
 * POST /api/upload/cluster/:clusterId/avatar
 * Requires authentication and MANAGE_CLUSTER permission
 */
router.post(
  '/cluster/:clusterId/avatar',
  authenticate,
  upload.single('avatar'),
  uploadController.uploadClusterAvatar
);

/**
 * Upload badge SVG (as text, not file)
 * POST /api/upload/badge-svg
 * Requires authentication
 */
router.post(
  '/badge-svg',
  authenticate,
  uploadController.uploadBadgeSvg
);

/**
 * Upload badge icon (SVG or image file)
 * POST /api/upload/badge-icon
 * Requires authentication
 */
router.post(
  '/badge-icon',
  authenticate,
  uploadWithFields.single('icon'),
  uploadController.uploadBadgeIcon
);

/**
 * Get current temporary badge icon
 * GET /api/upload/badge-icon/current
 * Requires authentication
 * Used for tab discovery and synchronization
 */
router.get(
  '/badge-icon/current',
  authenticate,
  uploadController.getCurrentBadgeIcon
);

/**
 * Get presigned upload URL for direct client uploads
 * POST /api/upload/presigned-url
 * Requires authentication
 */
router.post(
  '/presigned-url',
  authenticate,
  uploadController.getPresignedUploadUrl
);

/**
 * Delete an uploaded asset
 * DELETE /api/upload/asset/:assetId
 * Requires authentication and ownership
 */
router.delete(
  '/asset/:assetId',
  authenticate,
  uploadController.deleteAsset
);

/**
 * Delete a temporary badge icon
 * DELETE /api/upload/badge-icon/:assetId
 * Requires authentication and ownership
 */
router.delete(
  '/badge-icon/:assetId',
  authenticate,
  uploadController.deleteTempBadgeIcon
);

/**
 * Delete a preview avatar
 * POST /api/upload/delete-preview
 * Requires authentication
 * Used for cleanup when component unmounts
 */
router.post(
  '/delete-preview',
  authenticate,
  uploadController.deletePreview
);

/**
 * Delete a preview avatar (beacon endpoint)
 * POST /api/upload/delete-preview-beacon
 * Accepts auth token in body for sendBeacon compatibility
 */
router.post(
  '/delete-preview-beacon',
  uploadController.deletePreviewBeacon
);

/**
 * Delete a badge icon (beacon endpoint)
 * POST /api/upload/badge-icon-beacon
 * Accepts auth token in body for sendBeacon compatibility
 */
router.post(
  '/badge-icon-beacon',
  uploadController.deleteBadgeIconBeacon
);

/**
 * Upload badge background image
 * POST /api/upload/badge-background
 * Requires authentication
 */
router.post(
  '/badge-background',
  authenticate,
  uploadBackgrounds.single('background'),
  uploadController.uploadBadgeBackground
);

/**
 * Get current temporary badge background
 * GET /api/upload/badge-background/current
 * Requires authentication
 * Used for tab discovery and synchronization
 */
router.get(
  '/badge-background/current',
  authenticate,
  uploadController.getCurrentBadgeBackground
);

/**
 * Delete a temporary badge background
 * DELETE /api/upload/badge-background/:assetId
 * Requires authentication and ownership
 */
router.delete(
  '/badge-background/:assetId',
  authenticate,
  uploadController.deleteTempBadgeBackground
);

/**
 * Delete a badge background (beacon endpoint)
 * POST /api/upload/badge-background-beacon
 * Accepts auth token in body for sendBeacon compatibility
 */
router.post(
  '/badge-background-beacon',
  uploadController.deleteBadgeBackgroundBeacon
);

/**
 * Secure proxy to serve asset content
 * GET /api/upload/asset/:assetId/content
 * Requires authentication and ownership
 */
router.get(
  '/asset/:assetId/content',
  authenticate,
  uploadController.getAssetContent
);

/**
 * Error handling middleware for multer
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      // Check which endpoint was hit to give appropriate error message
      if (req.path.includes('badge-icon')) {
        return res.status(400).json({ error: 'File too large. Maximum size is 2MB for badge icons.' });
      } else if (req.path.includes('badge-background')) {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB for badge backgrounds.' });
      }
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: error.message });
  } else if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

module.exports = router;