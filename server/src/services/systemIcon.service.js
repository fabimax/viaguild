const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SystemIconService {
  /**
   * Get all available system icons
   * @returns {Promise<Array>} Array of system icon metadata
   */
  async getAllIcons() {
    const icons = await prisma.systemIcon.findMany({
      where: {
        isAvailable: true
      },
      select: {
        name: true,
        description: true,
        category: true,
        tags: true,
        createdAt: true
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    return icons;
  }

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