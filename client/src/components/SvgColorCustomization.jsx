import React, { useState } from 'react';

// Helper to parse a color string into { hex: #RRGGBB, alpha: number (0-1) }
const parseColorString = (colorString) => {
  if (typeof colorString !== 'string') return { hex: '#000000', alpha: 1 };

  // Try HEX8: #RRGGBBAA
  if (colorString.startsWith('#') && colorString.length === 9) {
    const hex = colorString.substring(0, 7);
    const alphaHex = colorString.substring(7, 9);
    const alpha = parseInt(alphaHex, 16) / 255;
    return { hex, alpha: parseFloat(alpha.toFixed(2)) };
  }
  // Try HEX6: #RRGGBB
  if (colorString.startsWith('#') && colorString.length === 7) {
    return { hex: colorString, alpha: 1 };
  }
  return { hex: '#000000', alpha: 1 };
};

// Helper to format hex with alpha
const formatHexWithAlpha = (hex, alpha = 1) => {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return hex;
  
  if (alpha === null || typeof alpha === 'undefined' || Number(alpha) === 1) {
    return hex;
  }
  const alphaHex = Math.round(Number(alpha) * 255).toString(16).padStart(2, '0');
  return `${hex}${alphaHex}`;
};

/**
 * Reusable SVG color customization component
 * Used for both system icons and uploaded SVGs
 * Based on the working UI from BadgeIconUpload
 */
const SvgColorCustomization = ({ 
  title = "SVG Color Customization",
  elementColorMap, 
  onColorChange 
}) => {
  const [expandedGroups, setExpandedGroups] = useState({});

  if (!elementColorMap || Object.keys(elementColorMap).length === 0) {
    return null;
  }

  // Convert elementColorMap to colorSlots format (like BadgeIconUpload does)
  const colorSlots = [];
  Object.entries(elementColorMap).forEach(([path, colors]) => {
    if (colors.fill) {
      colorSlots.push({
        id: `${path}-fill`,
        label: `${path} (fill)`,
        originalColor: colors.fill.original,
        currentColor: colors.fill.current,
        elementPath: path,
        colorType: 'fill'
      });
    }
    
    if (colors.stroke) {
      colorSlots.push({
        id: `${path}-stroke`,
        label: `${path} (stroke)`,
        originalColor: colors.stroke.original,
        currentColor: colors.stroke.current,
        elementPath: path,
        colorType: 'stroke'
      });
    }
  });

  // Group slots by original color (like BadgeIconUpload does)
  const colorGroups = {};
  colorSlots.forEach(slot => {
    const groupKey = slot.originalColor === 'UNSPECIFIED' ? 'UNSPECIFIED_GROUP' : slot.originalColor;
    if (!colorGroups[groupKey]) {
      colorGroups[groupKey] = [];
    }
    colorGroups[groupKey].push(slot);
  });

  const toggleGroup = (color) => {
    setExpandedGroups(prev => ({
      ...prev,
      [color]: !prev[color]
    }));
  };

  const handleGroupColorChange = (originalColor, newHex, newAlpha) => {
    const parsedAlpha = parseFloat(newAlpha);
    if (isNaN(parsedAlpha)) return;
    
    const newFormattedColor = formatHexWithAlpha(newHex, parsedAlpha);
    
    // Update element color map
    const updatedElementColorMap = { ...elementColorMap };
    const slotsToUpdate = colorGroups[originalColor];
    
    slotsToUpdate.forEach(slot => {
      const { elementPath, colorType } = slot;
      if (!updatedElementColorMap[elementPath]) {
        updatedElementColorMap[elementPath] = {};
      }
      updatedElementColorMap[elementPath][colorType] = {
        original: slot.originalColor,
        current: newFormattedColor
      };
    });
    
    onColorChange(updatedElementColorMap);
  };

  return (
    <div className="control-section" style={{ marginTop: '20px' }}>
      <h3>{title}</h3>
      <div className="svg-color-controls">
        <h4>Detected SVG Colors:</h4>
        {Object.entries(colorGroups).map(([originalColor, slots]) => {
          // Handle special unspecified group
          const isUnspecifiedGroup = originalColor === 'UNSPECIFIED_GROUP';
          const displayGroupName = isUnspecifiedGroup ? 'Unspecified (defaults to black)' : originalColor;
          const groupDisplayColor = isUnspecifiedGroup ? '#000000FF' : originalColor;
          
          // Check if all slots in group have same current color
          const allSameColor = slots.every(slot => slot.currentColor === slots[0].currentColor);
          
          // For group controls, only show unified values when all colors are the same
          const groupCurrentColor = allSameColor ? slots[0].currentColor : groupDisplayColor;
          const parsedCurrent = parseColorString(groupCurrentColor);
          const currentHex = parsedCurrent.hex;
          const currentAlpha = parsedCurrent.alpha;
          const isExpanded = expandedGroups[originalColor];
          
          return (
            <div key={originalColor} className="color-group" style={{ marginBottom: '15px' }}>
              <div className="color-group-header" style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button 
                    type="button"
                    onClick={() => toggleGroup(originalColor)}
                    style={{
                      background: '#f0f0f0',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '2px 8px',
                      minWidth: '30px',
                      lineHeight: '1',
                      color: '#4f46e5'
                    }}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                  <span style={{
                    display: 'inline-block',
                    width: '1.5em',
                    height: '1.5em',
                    backgroundColor: groupDisplayColor,
                    border: '2px solid #ccc',
                    borderRadius: '3px'
                  }}></span>
                  <label style={{ fontWeight: 'bold' }}>
                    {displayGroupName} - {slots.length} element{slots.length > 1 ? 's' : ''}
                  </label>
                </div>
                
                <div className="control-group svg-color-control" style={{ marginTop: '8px', paddingLeft: '30px' }}>
                  <input 
                    type="color" 
                    value={allSameColor ? currentHex : '#000000'}
                    onChange={(e) => handleGroupColorChange(originalColor, e.target.value, currentAlpha)}
                    disabled={!allSameColor}
                    style={{ opacity: allSameColor ? 1 : 0.5 }}
                  />
                  <input 
                    type="range" 
                    min="0" max="1" step="0.01" 
                    value={allSameColor ? currentAlpha : 1}
                    onChange={(e) => handleGroupColorChange(originalColor, currentHex, parseFloat(e.target.value))}
                    disabled={!allSameColor}
                    style={{ opacity: allSameColor ? 1 : 0.5 }}
                  />
                  <span className="color-display-hex8">
                    {allSameColor ? groupCurrentColor : `Mixed colors - expand to edit individually`}
                  </span>
                </div>
              </div>
              
              {isExpanded && (
                <div className="color-group-items" style={{ paddingLeft: '30px', marginTop: '10px' }}>
                  {slots.map((slot) => {
                    const { hex: slotHex, alpha: slotAlpha } = parseColorString(slot.currentColor);
                    return (
                      <div key={slot.id} style={{ marginBottom: '10px' }}>
                        <label style={{ fontWeight: 'normal', marginBottom: '5px', display: 'block' }}>
                          {slot.label}
                        </label>
                        <div className="control-group svg-color-control">
                          <input 
                            type="color" 
                            value={slotHex}
                            onChange={(e) => {
                              const newColor = formatHexWithAlpha(e.target.value, slotAlpha);
                              console.log('Individual slot color change:', slot.elementPath, slot.colorType, 'to', newColor);
                              const updatedElementColorMap = { ...elementColorMap };
                              if (!updatedElementColorMap[slot.elementPath]) {
                                updatedElementColorMap[slot.elementPath] = {};
                              }
                              updatedElementColorMap[slot.elementPath][slot.colorType] = {
                                original: slot.originalColor,
                                current: newColor
                              };
                              console.log('Updated elementColorMap:', updatedElementColorMap);
                              onColorChange(updatedElementColorMap);
                            }}
                          />
                          <input 
                            type="range" 
                            min="0" max="1" step="0.01" 
                            value={slotAlpha}
                            onChange={(e) => {
                              const newColor = formatHexWithAlpha(slotHex, parseFloat(e.target.value));
                              const updatedElementColorMap = { ...elementColorMap };
                              if (!updatedElementColorMap[slot.elementPath]) {
                                updatedElementColorMap[slot.elementPath] = {};
                              }
                              updatedElementColorMap[slot.elementPath][slot.colorType] = {
                                original: slot.originalColor,
                                current: newColor
                              };
                              onColorChange(updatedElementColorMap);
                            }}
                          />
                          <span className="color-display-hex8">{slot.currentColor}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SvgColorCustomization;