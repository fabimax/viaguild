const systemIconService = require('../services/systemIcon.service');

class SystemIconController {
  /**
   * Get all available system icons
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllIcons(req, res) {
    try {
      const icons = await systemIconService.getAllIcons();
      res.json({
        success: true,
        data: icons,
        total: icons.length
      });
    } catch (error) {
      console.error('Error fetching system icons:', error);
      res.status(500).json({ error: 'Failed to fetch system icons' });
    }
  }

  /**
   * Get SVG content of a system icon by its name
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getIconSvg(req, res) {
    try {
      const { iconName } = req.params;
      const svgContent = await systemIconService.getIconSvgByName(iconName);
      if (svgContent) {
        // It's good practice to set the Content-Type for SVGs
        res.header('Content-Type', 'image/svg+xml');
        res.send(svgContent);
      } else {
        res.status(404).json({ error: 'System icon not found' });
      }
    } catch (error) {
      console.error('Error fetching system icon:', error);
      res.status(500).json({ error: 'Failed to fetch system icon' });
    }
  }
}

module.exports = new SystemIconController(); 