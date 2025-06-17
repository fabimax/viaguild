/**
 * Test badge template creation and giving with config objects
 */

const badgeService = require('../services/badge.service');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Badge Creation with Config Objects', () => {
  let testUserId;
  let testTemplate;
  
  beforeAll(async () => {
    // Get a test user from the database
    const user = await prisma.user.findFirst();
    testUserId = user.id;
  });
  
  test('should create badge template with config objects', async () => {
    const templateData = {
      templateSlug: 'test-config-template',
      ownerType: 'USER',
      ownerId: testUserId,
      authoredByUserId: testUserId,
      defaultBadgeName: 'Config Test Badge',
      defaultSubtitleText: 'Testing Config System',
      defaultOuterShape: 'CIRCLE',
      
      // New unified config objects
      defaultBorderConfig: {
        type: 'simple-color',
        version: 1,
        color: '#FF5722'
      },
      defaultBackgroundConfig: {
        type: 'simple-color',
        version: 1,
        color: '#2196F3'
      },
      defaultForegroundConfig: {
        type: 'simple-color',
        version: 1,
        color: '#FFFFFF'
      },
      
      // Legacy fields (should be derived from configs)
      defaultBackgroundType: 'SOLID_COLOR',
      defaultBackgroundValue: '#2196F3',
      defaultForegroundType: 'TEXT',
      defaultForegroundValue: 'TEST'
    };
    
    testTemplate = await badgeService.createBadgeTemplate(templateData);
    
    // Should save config objects correctly
    expect(testTemplate.defaultBorderConfig).toEqual({
      type: 'simple-color',
      version: 1,
      color: '#FF5722'
    });
    expect(testTemplate.defaultBackgroundConfig).toEqual({
      type: 'simple-color',
      version: 1,
      color: '#2196F3'
    });
    expect(testTemplate.defaultForegroundConfig).toEqual({
      type: 'simple-color',
      version: 1,
      color: '#FFFFFF'
    });
    
    // Should derive legacy fields from configs
    expect(testTemplate.defaultBorderColor).toBe('#FF5722');
    expect(testTemplate.defaultBackgroundType).toBe('SOLID_COLOR');
    expect(testTemplate.defaultBackgroundValue).toBe('#2196F3');
    expect(testTemplate.defaultForegroundColor).toBe('#FFFFFF');
    
    console.log('Created template with config objects:', {
      id: testTemplate.id,
      borderConfig: testTemplate.defaultBorderConfig,
      backgroundConfig: testTemplate.defaultBackgroundConfig,
      foregroundConfig: testTemplate.defaultForegroundConfig
    });
  });
  
  test('should give badge with config override objects', async () => {
    // Get recipient user
    const users = await prisma.user.findMany({ take: 2 });
    const recipient = users.find(u => u.id !== testUserId) || users[0];
    
    const customizations = {
      message: 'Test badge with config overrides',
      overrideBadgeName: 'Custom Config Badge',
      
      // Config overrides
      overrideBorderConfig: {
        type: 'simple-color',
        version: 1,
        color: '#E91E63'
      },
      overrideBackgroundConfig: {
        type: 'simple-color',
        version: 1,
        color: '#4CAF50'
      },
      overrideForegroundConfig: {
        type: 'simple-color',
        version: 1,
        color: '#000000'
      }
    };
    
    const badgeInstance = await badgeService.giveBadge(
      testUserId,
      testTemplate.id,
      recipient.username,
      customizations
    );
    
    // Should save override configs
    expect(badgeInstance.overrideBorderConfig).toEqual({
      type: 'simple-color',
      version: 1,
      color: '#E91E63'
    });
    expect(badgeInstance.overrideBackgroundConfig).toEqual({
      type: 'simple-color',
      version: 1,
      color: '#4CAF50'
    });
    expect(badgeInstance.overrideForegroundConfig).toEqual({
      type: 'simple-color',
      version: 1,
      color: '#000000'
    });
    
    // Test display props extraction with overrides
    const displayProps = badgeService.getBadgeDisplayProps(badgeInstance);
    
    // Should use override config colors
    expect(displayProps.borderColor).toBe('#E91E63');
    expect(displayProps.foregroundColor).toBe('#000000');
    
    // Should include config objects in display props
    expect(displayProps.borderConfig.color).toBe('#E91E63');
    expect(displayProps.backgroundConfig.color).toBe('#4CAF50');
    expect(displayProps.foregroundConfig.color).toBe('#000000');
    
    console.log('Created badge instance with config overrides:', {
      id: badgeInstance.id,
      displayBorderColor: displayProps.borderColor,
      displayForegroundColor: displayProps.foregroundColor,
      configTypes: {
        border: displayProps.borderConfig.type,
        background: displayProps.backgroundConfig.type,
        foreground: displayProps.foregroundConfig.type
      }
    });
  });
  
  afterAll(async () => {
    // Cleanup: delete test template
    if (testTemplate) {
      await prisma.badgeInstance.deleteMany({
        where: { templateId: testTemplate.id }
      });
      await prisma.badgeTemplate.delete({
        where: { id: testTemplate.id }
      });
    }
    await prisma.$disconnect();
  });
});

console.log('Badge creation config tests ready');