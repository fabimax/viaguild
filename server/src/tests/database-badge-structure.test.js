/**
 * Test that existing badge data in database has correct structure for config objects
 */

const { PrismaClient } = require('@prisma/client');
const badgeService = require('../services/badge.service');

const prisma = new PrismaClient();

describe('Database Badge Structure', () => {
  
  test('should find badge templates with config objects', async () => {
    const templates = await prisma.badgeTemplate.findMany({
      take: 3
    });
    
    console.log('Found templates:', templates.length);
    
    if (templates.length > 0) {
      const template = templates[0];
      console.log('First template config structure:', {
        hasBorderConfig: !!template.defaultBorderConfig,
        hasBackgroundConfig: !!template.defaultBackgroundConfig,
        hasForegroundConfig: !!template.defaultForegroundConfig,
        borderConfig: template.defaultBorderConfig,
        backgroundConfig: template.defaultBackgroundConfig,
        foregroundConfig: template.defaultForegroundConfig
      });
      
      // All templates should have config objects
      expect(template.defaultBorderConfig).toBeTruthy();
      expect(template.defaultBackgroundConfig).toBeTruthy();
      expect(template.defaultForegroundConfig).toBeTruthy();
    }
  });
  
  test('should find badge instances and test display props extraction', async () => {
    const instances = await prisma.badgeInstance.findMany({
      include: {
        template: true
      },
      take: 3
    });
    
    console.log('Found instances:', instances.length);
    
    if (instances.length > 0) {
      const instance = instances[0];
      console.log('First instance structure:', {
        hasOverrideBorderConfig: !!instance.overrideBorderConfig,
        hasOverrideBackgroundConfig: !!instance.overrideBackgroundConfig,
        hasOverrideForegroundConfig: !!instance.overrideForegroundConfig,
        templateHasBorderConfig: !!instance.template.defaultBorderConfig,
        templateHasBackgroundConfig: !!instance.template.defaultBackgroundConfig,
        templateHasForegroundConfig: !!instance.template.defaultForegroundConfig
      });
      
      // Test that getBadgeDisplayProps works with real data
      const displayProps = badgeService.getBadgeDisplayProps(instance);
      
      console.log('Display props extracted:', {
        borderColor: displayProps.borderColor,
        foregroundColor: displayProps.foregroundColor,
        hasBorderConfig: !!displayProps.borderConfig,
        hasBackgroundConfig: !!displayProps.backgroundConfig,
        hasForegroundConfig: !!displayProps.foregroundConfig,
        borderConfigType: displayProps.borderConfig?.type,
        backgroundConfigType: displayProps.backgroundConfig?.type,
        foregroundConfigType: displayProps.foregroundConfig?.type
      });
      
      // Should successfully extract display properties
      expect(displayProps.borderColor).toBeTruthy();
      expect(displayProps.foregroundColor).toBeTruthy();
      expect(displayProps.borderConfig).toBeTruthy();
      expect(displayProps.backgroundConfig).toBeTruthy();
      expect(displayProps.foregroundConfig).toBeTruthy();
      
      // Config objects should have proper structure
      expect(displayProps.borderConfig.type).toBeDefined();
      expect(displayProps.backgroundConfig.type).toBeDefined();
      expect(displayProps.foregroundConfig.type).toBeDefined();
    }
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
});

console.log('Database badge structure tests ready');