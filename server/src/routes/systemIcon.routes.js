const express = require('express');
const router = express.Router();
const systemIconController = require('../controllers/systemIcon.controller');
const { authenticate } = require('../middleware/auth.middleware'); // Optional: if you want to protect this

// GET /api/system-icons/:iconName
// For a public icon library, authentication might not be needed.
// If needed, uncomment and use: router.get('/:iconName', authenticate, systemIconController.getIconSvg);
router.get('/:iconName', systemIconController.getIconSvg);

module.exports = router; 