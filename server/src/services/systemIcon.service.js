const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SystemIconService {
  /**
   * Get System Icon SVG content by its unique name
   * @param {string} iconName - The unique name of the system icon
   * @returns {Promise<string|null>} SVG content string or null if not found
   */
  async getIconSvgByName(iconName) {
    if (!iconName) {
      return null;
    }
    const icon = await prisma.systemIcon.findUnique({
      where: { name: iconName },
      select: { svgContent: true },
    });
    return icon ? icon.svgContent : null;
  }
}

module.exports = new SystemIconService(); 