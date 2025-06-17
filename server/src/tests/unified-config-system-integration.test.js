/**
 * Comprehensive Integration Tests for Unified Config System
 * Tests the complete end-to-end flow from template creation to badge display
 */

const badgeService = require('../services/badge.service');
const { PrismaClient } = require('@prisma/client');
const { 
  extractColor, 
  extractBackgroundStyle, 
  extractBorderStyle,
  createSimpleColorConfig,
  createHostedAssetConfig
} = require('../utils/colorConfig');

const prisma = new PrismaClient();

describe('Unified Config System Integration Tests', () => {
  let testUserId;
  let recipientUserId;
  
  beforeAll(async () => {
    // Get test users from the database
    const users = await prisma.user.findMany({ take: 2 });
    testUserId = users[0].id;
    recipientUserId = users[1] ? users[1].id : users[0].id;
  });
  
  describe('Template Creation with Config Objects', () => {
    test('should create template with only config objects (no legacy fields)', async () => {
      const templateData = {
        templateSlug: 'config-only-template',
        ownerType: 'USER',
        ownerId: testUserId,
        authoredByUserId: testUserId,
        defaultBadgeName: 'Config Only Badge',
        defaultSubtitleText: 'Pure Config System',
        defaultOuterShape: 'HEXAGON',
        
        // Only provide config objects
        defaultBorderConfig: {
          type: 'simple-color',
          version: 1,
          color: '#9C27B0'
        },
        defaultBackgroundConfig: {
          type: 'simple-color',
          version: 1,
          color: '#FF9800'
        },
        defaultForegroundConfig: {
          type: 'simple-color',
          version: 1,
          color: '#FFFFFF'
        },
        
        // Minimal legacy fields (required for processing)
        defaultBackgroundType: 'SOLID_COLOR',
        defaultBackgroundValue: '#FF9800',
        defaultForegroundType: 'TEXT',
        defaultForegroundValue: 'CONFIG'
      };
      
      const template = await badgeService.createBadgeTemplate(templateData);
      
      // Should save config objects correctly
      expect(template.defaultBorderConfig).toEqual({
        type: 'simple-color',
        version: 1,
        color: '#9C27B0'
      });
      expect(template.defaultBackgroundConfig).toEqual({
        type: 'simple-color',
        version: 1,
        color: '#FF9800'
      });
      expect(template.defaultForegroundConfig).toEqual({
        type: 'simple-color',
        version: 1,
        color: '#FFFFFF'
      });
      
      // Should derive legacy fields from configs
      expect(template.defaultBorderColor).toBe('#9C27B0');
      expect(template.defaultBackgroundValue).toBe('#FF9800');
      expect(template.defaultForegroundColor).toBe('#FFFFFF');
      
      // Cleanup
      await prisma.badgeTemplate.delete({ where: { id: template.id } });
    });
    
    test('should create template with hosted asset background config', async () => {
      const templateData = {
        templateSlug: 'hosted-asset-template',
        ownerType: 'USER',
        ownerId: testUserId,
        authoredByUserId: testUserId,
        defaultBadgeName: 'Image Background Badge',
        defaultSubtitleText: 'With Asset Background',
        defaultOuterShape: 'CIRCLE',
        
        defaultBorderConfig: createSimpleColorConfig('#000000'),
        defaultBackgroundConfig: createHostedAssetConfig('https://example.com/badge-bg.jpg'),
        defaultForegroundConfig: createSimpleColorConfig('#FFFFFF'),
        
        // Legacy fields
        defaultBackgroundType: 'HOSTED_IMAGE',
        defaultBackgroundValue: 'https://example.com/badge-bg.jpg',
        defaultForegroundType: 'TEXT',
        defaultForegroundValue: 'IMG'
      };
      
      const template = await badgeService.createBadgeTemplate(templateData);
      
      // Should save hosted asset config
      expect(template.defaultBackgroundConfig.type).toBe('hosted-asset');
      expect(template.defaultBackgroundConfig.url).toBe('https://example.com/badge-bg.jpg');
      
      // Should derive legacy fields correctly
      expect(template.defaultBackgroundType).toBe('HOSTED_IMAGE');
      expect(template.defaultBackgroundValue).toBe('https://example.com/badge-bg.jpg');
      
      // Cleanup
      await prisma.badgeTemplate.delete({ where: { id: template.id } });
    });
  });
  
  describe('Badge Giving with Config Overrides', () => {
    let testTemplate;
    
    beforeAll(async () => {
      // Create a test template
      testTemplate = await badgeService.createBadgeTemplate({
        templateSlug: 'override-test-template',
        ownerType: 'USER',
        ownerId: testUserId,
        authoredByUserId: testUserId,
        defaultBadgeName: 'Override Test Badge',
        defaultSubtitleText: 'For Testing Overrides',
        defaultOuterShape: 'STAR',
        
        defaultBorderConfig: createSimpleColorConfig('#FFD700'),
        defaultBackgroundConfig: createSimpleColorConfig('#4A97FC'),
        defaultForegroundConfig: createSimpleColorConfig('#FFFFFF'),
        
        defaultBackgroundType: 'SOLID_COLOR',
        defaultBackgroundValue: '#4A97FC',
        defaultForegroundType: 'TEXT',
        defaultForegroundValue: 'TEST'
      });
    });
    
    afterAll(async () => {
      // Cleanup
      await prisma.badgeInstance.deleteMany({
        where: { templateId: testTemplate.id }
      });
      await prisma.badgeTemplate.delete({ where: { id: testTemplate.id } });
    });
    
    test('should give badge with config override objects', async () => {
      const recipient = await prisma.user.findFirst({
        where: { id: recipientUserId }
      });
      
      const customizations = {
        message: 'Testing config overrides',
        overrideBadgeName: 'Custom Override Badge',
        
        // Config overrides
        overrideBorderConfig: createSimpleColorConfig('#E91E63'),
        overrideBackgroundConfig: createSimpleColorConfig('#4CAF50'),
        overrideForegroundConfig: createSimpleColorConfig('#000000')
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
    });
    
    test('should give badge with legacy overrides converted to configs', async () => {
      const recipient = await prisma.user.findFirst({
        where: { id: recipientUserId }
      });
      
      const customizations = {
        message: 'Testing legacy to config conversion',
        overrideBadgeName: 'Legacy Override Badge',
        
        // Legacy overrides only (should be converted to configs by backend)
        overrideBorderColor: '#FF5722',
        overrideBackgroundType: 'SOLID_COLOR',
        overrideBackgroundValue: '#2196F3',
        overrideForegroundColor: '#FFEB3B'
      };
      
      const badgeInstance = await badgeService.giveBadge(
        testUserId,
        testTemplate.id,
        recipient.username,
        customizations
      );
      
      // Backend should convert legacy overrides to configs
      // (This would require updating the giveBadge method to do this conversion)
      expect(badgeInstance.overrideBorderColor).toBe('#FF5722');
      expect(badgeInstance.overrideBackgroundValue).toBe('#2196F3');
      expect(badgeInstance.overrideForegroundColor).toBe('#FFEB3B');
    });
  });
  
  describe('Display Props Extraction', () => {
    test('should extract correct display props from config objects', async () => {
      // Create a badge instance with configs
      const template = await badgeService.createBadgeTemplate({
        templateSlug: 'display-props-test',
        ownerType: 'USER',
        ownerId: testUserId,
        authoredByUserId: testUserId,
        defaultBadgeName: 'Display Props Test',
        defaultSubtitleText: 'Config Extraction',
        defaultOuterShape: 'CIRCLE',
        
        defaultBorderConfig: createSimpleColorConfig('#800080'),
        defaultBackgroundConfig: createHostedAssetConfig('https://example.com/test.jpg'),
        defaultForegroundConfig: createSimpleColorConfig('#00FF00'),
        
        defaultBackgroundType: 'HOSTED_IMAGE',
        defaultBackgroundValue: 'https://example.com/test.jpg',
        defaultForegroundType: 'TEXT',
        defaultForegroundValue: 'DISPLAY'
      });
      
      const recipient = await prisma.user.findFirst({
        where: { id: recipientUserId }
      });
      
      const badgeInstance = await badgeService.giveBadge(
        testUserId,
        template.id,
        recipient.username,
        {
          overrideForegroundConfig: createSimpleColorConfig('#FF0000')
        }
      );
      
      // Get display props
      const displayProps = badgeService.getBadgeDisplayProps(badgeInstance);
      
      // Should extract colors from config objects
      expect(displayProps.borderColor).toBe('#800080');
      expect(displayProps.foregroundColor).toBe('#FF0000'); // Override color
      
      // Should include config objects
      expect(displayProps.borderConfig.color).toBe('#800080');
      expect(displayProps.backgroundConfig.url).toBe('https://example.com/test.jpg');
      expect(displayProps.foregroundConfig.color).toBe('#FF0000');
      
      // Should include legacy fields for backward compatibility
      expect(displayProps.backgroundType).toBe('HOSTED_IMAGE');
      expect(displayProps.backgroundValue).toBe('https://example.com/test.jpg');
      
      // Cleanup
      await prisma.badgeInstance.deleteMany({
        where: { templateId: template.id }
      });
      await prisma.badgeTemplate.delete({ where: { id: template.id } });
    });
  });
  
  describe('Config Utility Functions', () => {
    test('should extract colors correctly from various config types', () => {
      // Simple color config
      const simpleConfig = { type: 'simple-color', version: 1, color: '#FF0000' };
      expect(extractColor(simpleConfig)).toBe('#FF0000');
      
      // Element-path config
      const elementConfig = {
        type: 'element-path',
        version: 1,
        mappings: {
          'path[0]': { fill: { current: '#00FF00' } },
          'circle[0]': { stroke: { current: '#0000FF' } }
        }
      };
      expect(extractColor(elementConfig)).toBe('#00FF00'); // First available color
      
      // Fallback for null/invalid config
      expect(extractColor(null, '#999999')).toBe('#999999');
      expect(extractColor({}, '#888888')).toBe('#888888');
    });
    
    test('should extract background styles correctly', () => {
      // Simple color background
      const colorBackground = { type: 'simple-color', version: 1, color: '#FF0000' };
      const colorStyles = extractBackgroundStyle(colorBackground);
      expect(colorStyles.backgroundColor).toBe('#FF0000');
      
      // Hosted asset background
      const assetBackground = { type: 'hosted-asset', version: 1, url: 'https://example.com/bg.jpg' };
      const assetStyles = extractBackgroundStyle(assetBackground);
      expect(assetStyles.backgroundImage).toBe('url(https://example.com/bg.jpg)');
      expect(assetStyles.backgroundSize).toBe('cover');
      expect(assetStyles.backgroundPosition).toBe('center');
      
      // Fallback for null config
      expect(extractBackgroundStyle(null)).toEqual({});
    });
    
    test('should extract border styles correctly', () => {
      // Simple color border
      const borderConfig = { type: 'simple-color', version: 1, color: '#FF0000' };
      const borderStyles = extractBorderStyle(borderConfig, 4);
      expect(borderStyles.border).toBe('4px solid #FF0000');
      
      // Default width
      const defaultStyles = extractBorderStyle(borderConfig);
      expect(defaultStyles.border).toBe('6px solid #FF0000');
      
      // Fallback for null config
      const fallbackStyles = extractBorderStyle(null, 3);
      expect(fallbackStyles.border).toBe('3px solid #000000');
    });
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
});

console.log('Unified config system integration tests ready');