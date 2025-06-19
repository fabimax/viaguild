const express = require('express');
const router = express.Router();
const systemIconController = require('../controllers/systemIcon.controller');
const { authenticate } = require('../middleware/auth.middleware'); // Optional: if you want to protect this

// GET /api/system-icons - List all available system icons
router.get('/', systemIconController.getAllIcons);

// GET /api/system-icons/:iconName - Get specific icon SVG
// For a public icon library, authentication might not be needed.
// If needed, uncomment and use: router.get('/:iconName', authenticate, systemIconController.getIconSvg);
router.get('/:iconName', systemIconController.getIconSvg);

module.exports = router; 