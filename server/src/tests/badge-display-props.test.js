/**
 * Test badge display props extraction with config objects
 */

const badgeService = require('../services/badge.service');

// Mock data for testing
const mockTemplateWithConfigs = {
  id: 'template-1',
  defaultBadgeName: 'Test Badge',
  defaultSubtitleText: 'Test Subtitle',
  defaultOuterShape: 'CIRCLE',
  inherentTier: null,
  
  // Legacy fields
  defaultBorderColor: '#FFD700',
  defaultBackgroundType: 'SOLID_COLOR', 
  defaultBackgroundValue: '#4A97FC',
  defaultForegroundType: 'TEXT',
  defaultForegroundValue: 'WIN',
  defaultForegroundColor: '#FFFFFF',
  defaultForegroundColorConfig: null,
  
  // New config objects
  defaultBorderConfig: {
    type: 'simple-color',
    version: 1,
    color: '#FFD700'
  },
  defaultBackgroundConfig: {
    type: 'simple-color', 
    version: 1,
    color: '#4A97FC'
  },
  defaultForegroundConfig: {
    type: 'simple-color',
    version: 1,
    color: '#FFFFFF'
  }
};

const mockTemplateWithoutConfigs = {
  id: 'template-2', 
  defaultBadgeName: 'Legacy Badge',
  defaultSubtitleText: 'Legacy Subtitle',
  defaultOuterShape: 'SQUARE',
  inherentTier: 'GOLD',
  
  // Only legacy fields (no config objects)
  defaultBorderColor: '#AA0000',
  defaultBackgroundType: 'SOLID_COLOR',
  defaultBackgroundValue: '#00AA00', 
  defaultForegroundType: 'SYSTEM_ICON',
  defaultForegroundValue: 'Shield',
  defaultForegroundColor: '#0000AA',
  defaultForegroundColorConfig: null,
  
  // No config objects
  defaultBorderConfig: null,
  defaultBackgroundConfig: null,
  defaultForegroundConfig: null
};

const mockBadgeInstanceNoOverrides = {
  id: 'instance-1',
  template: mockTemplateWithConfigs,
  
  // No overrides
  overrideBadgeName: null,
  overrideSubtitle: null, 
  overrideOuterShape: null,
  overrideBorderColor: null,
  overrideBackgroundType: null,
  overrideBackgroundValue: null,
  overrideForegroundType: null,
  overrideForegroundValue: null,
  overrideForegroundColor: null,
  overrideForegroundColorConfig: null,
  overrideBorderConfig: null,
  overrideBackgroundConfig: null,
  overrideForegroundConfig: null,
  
  measureValue: 85.5
};

const mockBadgeInstanceWithOverrides = {
  id: 'instance-2',
  template: mockTemplateWithConfigs,
  
  // Override configs
  overrideBorderConfig: {
    type: 'simple-color',
    version: 1,
    color: '#FF0000'
  },
  overrideBackgroundConfig: {
    type: 'simple-color',
    version: 1, 
    color: '#00FF00'
  },
  overrideForegroundConfig: {
    type: 'simple-color',
    version: 1,
    color: '#0000FF'
  },
  
  // Legacy overrides (should be ignored in favor of configs)
  overrideBorderColor: '#999999',
  overrideBackgroundValue: '#888888',
  overrideForegroundColor: '#777777',
  
  measureValue: 92.0
};

describe('BadgeService.getBadgeDisplayProps', () => {
  
  test('should extract props from config objects when available', () => {
    const props = badgeService.getBadgeDisplayProps(mockBadgeInstanceNoOverrides);
    
    // Should use template config objects
    expect(props.borderColor).toBe('#FFD700');
    expect(props.foregroundColor).toBe('#FFFFFF');
    
    // Should include config objects in response
    expect(props.borderConfig).toEqual({
      type: 'simple-color',
      version: 1,
      color: '#FFD700'
    });
    expect(props.backgroundConfig).toEqual({
      type: 'simple-color',
      version: 1,
      color: '#4A97FC'
    });
    expect(props.foregroundConfig).toEqual({
      type: 'simple-color', 
      version: 1,
      color: '#FFFFFF'
    });
    
    // Should preserve legacy fields for backward compatibility
    expect(props.backgroundType).toBe('SOLID_COLOR');
    expect(props.backgroundValue).toBe('#4A97FC');
    expect(props.foregroundType).toBe('TEXT');
    expect(props.foregroundValue).toBe('WIN');
  });
  
  test('should prioritize override configs over template configs', () => {
    const props = badgeService.getBadgeDisplayProps(mockBadgeInstanceWithOverrides);
    
    // Should use override config colors, not legacy override colors
    expect(props.borderColor).toBe('#FF0000'); // from override config, not #999999
    expect(props.foregroundColor).toBe('#0000FF'); // from override config, not #777777
    
    // Should include override config objects
    expect(props.borderConfig.color).toBe('#FF0000');
    expect(props.backgroundConfig.color).toBe('#00FF00');
    expect(props.foregroundConfig.color).toBe('#0000FF');
  });
  
  test('should fallback to legacy fields when configs not available', () => {
    const mockInstance = {
      ...mockBadgeInstanceNoOverrides,
      template: mockTemplateWithoutConfigs
    };
    
    const props = badgeService.getBadgeDisplayProps(mockInstance);
    
    // Should extract colors from legacy fields
    expect(props.borderColor).toBe('#FFD700'); // tier override for GOLD
    expect(props.foregroundColor).toBe('#0000AA');
    
    // Should create config objects from legacy fields
    expect(props.borderConfig).toBeTruthy();
    expect(props.backgroundConfig).toBeTruthy();
    expect(props.foregroundConfig).toBeTruthy();
  });
  
  test('should enforce tier border colors for tiered badges', () => {
    const mockInstance = {
      ...mockBadgeInstanceNoOverrides,
      template: mockTemplateWithoutConfigs // has inherentTier: 'GOLD'
    };
    
    const props = badgeService.getBadgeDisplayProps(mockInstance);
    
    // Should override border color with tier color
    expect(props.borderColor).toBe('#FFD700'); // GOLD tier color
  });
  
  test('should include all required display properties', () => {
    const props = badgeService.getBadgeDisplayProps(mockBadgeInstanceNoOverrides);
    
    // Content properties
    expect(props.name).toBe('Test Badge');
    expect(props.subtitle).toBe('Test Subtitle');
    expect(props.shape).toBe('CIRCLE');
    
    // Visual properties (legacy)
    expect(props.borderColor).toBeDefined();
    expect(props.backgroundType).toBeDefined();
    expect(props.backgroundValue).toBeDefined();
    expect(props.foregroundType).toBeDefined();
    expect(props.foregroundValue).toBeDefined();
    expect(props.foregroundColor).toBeDefined();
    
    // Visual properties (configs)
    expect(props.borderConfig).toBeDefined();
    expect(props.backgroundConfig).toBeDefined();
    expect(props.foregroundConfig).toBeDefined();
    
    // Measure properties
    expect(props.measureValue).toBe(85.5);
  });
});

console.log('Badge display props tests ready to run');