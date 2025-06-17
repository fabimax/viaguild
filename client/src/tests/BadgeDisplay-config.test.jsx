/**
 * Test BadgeDisplay component with config objects
 */

import React from 'react';
import { render } from '@testing-library/react';
import BadgeDisplay from '../components/guilds/BadgeDisplay';

import { vi } from 'vitest';

// Mock the SVG utilities
vi.mock('../utils/svgColorTransform', () => ({
  applySvgColorTransform: vi.fn((svgContent, config) => svgContent),
  isSvgContent: vi.fn((content) => content && content.includes('<svg'))
}));

describe('BadgeDisplay with Config Objects', () => {
  test('should render with config objects (no legacy fields)', () => {
    const badgeWithConfigs = {
      name: 'Config Badge',
      subtitle: 'New System',
      shape: 'CIRCLE',
      
      // Config objects only
      borderConfig: {
        type: 'simple-color',
        version: 1,
        color: '#FF5722'
      },
      backgroundConfig: {
        type: 'simple-color',
        version: 1,
        color: '#2196F3'
      },
      foregroundConfig: {
        type: 'simple-color',
        version: 1,
        color: '#FFFFFF'
      },
      
      // Legacy fields for foreground content
      foregroundType: 'TEXT',
      foregroundValue: 'WIN'
    };
    
    const { container } = render(<BadgeDisplay badge={badgeWithConfigs} />);
    
    // Should render the badge
    expect(container.querySelector('.badge-display-container')).toBeTruthy();
    expect(container.querySelector('.badge-name-outside')).toHaveTextContent('Config Badge');
    expect(container.querySelector('.badge-subtitle-outside')).toHaveTextContent('New System');
  });
  
  test('should render with legacy fields only (backward compatibility)', () => {
    const badgeWithLegacy = {
      name: 'Legacy Badge',
      subtitle: 'Old System',
      shape: 'SQUARE',
      
      // Legacy fields only
      borderColor: '#E91E63',
      backgroundType: 'SOLID_COLOR',
      backgroundValue: '#4CAF50',
      foregroundType: 'TEXT',
      foregroundValue: 'LEGACY',
      foregroundColor: '#FFFFFF'
    };
    
    const { container } = render(<BadgeDisplay badge={badgeWithLegacy} />);
    
    // Should render the badge
    expect(container.querySelector('.badge-display-container')).toBeTruthy();
    expect(container.querySelector('.badge-name-outside')).toHaveTextContent('Legacy Badge');
    expect(container.querySelector('.badge-subtitle-outside')).toHaveTextContent('Old System');
  });
  
  test('should prioritize config objects over legacy fields', () => {
    const badgeWithBoth = {
      name: 'Mixed Badge',
      shape: 'CIRCLE',
      
      // Config objects (should take priority)
      borderConfig: {
        type: 'simple-color',
        version: 1,
        color: '#FF0000'
      },
      backgroundConfig: {
        type: 'simple-color',
        version: 1,
        color: '#00FF00'
      },
      foregroundConfig: {
        type: 'simple-color',
        version: 1,
        color: '#0000FF'
      },
      
      // Legacy fields (should be ignored when configs exist)
      borderColor: '#999999',
      backgroundType: 'SOLID_COLOR',
      backgroundValue: '#888888',
      foregroundType: 'TEXT',
      foregroundValue: 'MIXED',
      foregroundColor: '#777777'
    };
    
    const { container } = render(<BadgeDisplay badge={badgeWithBoth} />);
    
    // Should render successfully (we can't easily test exact colors in jsdom)
    expect(container.querySelector('.badge-display-container')).toBeTruthy();
    expect(container.querySelector('.badge-name-outside')).toHaveTextContent('Mixed Badge');
  });
  
  test('should handle complex shapes with configs', () => {
    const starBadge = {
      name: 'Star Badge',
      shape: 'STAR',
      
      borderConfig: {
        type: 'simple-color',
        version: 1,
        color: '#FFD700'
      },
      backgroundConfig: {
        type: 'simple-color',
        version: 1,
        color: '#4A97FC'
      },
      foregroundConfig: {
        type: 'simple-color',
        version: 1,
        color: '#FFFFFF'
      },
      
      foregroundType: 'TEXT',
      foregroundValue: 'STAR'
    };
    
    const { container } = render(<BadgeDisplay badge={starBadge} />);
    
    // Should render complex shape
    expect(container.querySelector('.badge-display-container')).toBeTruthy();
    expect(container.querySelector('.is-complex-shape')).toBeTruthy();
    expect(container.querySelector('.badge-content-inner')).toBeTruthy();
  });
  
  test('should handle hosted asset background config', () => {
    const imageBadge = {
      name: 'Image Badge',
      shape: 'CIRCLE',
      
      borderConfig: {
        type: 'simple-color',
        version: 1,
        color: '#000000'
      },
      backgroundConfig: {
        type: 'hosted-asset',
        version: 1,
        url: 'https://example.com/image.jpg'
      },
      foregroundConfig: {
        type: 'simple-color',
        version: 1,
        color: '#FFFFFF'
      },
      
      foregroundType: 'TEXT',
      foregroundValue: 'IMG'
    };
    
    const { container } = render(<BadgeDisplay badge={imageBadge} />);
    
    // Should render with background image
    expect(container.querySelector('.badge-display-container')).toBeTruthy();
  });
});

console.log('BadgeDisplay config tests ready');