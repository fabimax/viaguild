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
  colorSlots: providedColorSlots,
  gradientDefinitions = {},
  originalGradientDefinitions = {},
  onColorChange 
}) => {
  const [expandedGroups, setExpandedGroups] = useState({});

  console.log('SvgColorCustomization received props:', { elementColorMap, gradientDefinitions });

  if (!elementColorMap || Object.keys(elementColorMap).length === 0) {
    return null;
  }

  // Use provided colorSlots if available, otherwise convert elementColorMap to colorSlots format
  const colorSlots = providedColorSlots || [];
  
  if (!providedColorSlots) {
    console.log('SvgColorCustomization converting elementColorMap:', elementColorMap);
    Object.entries(elementColorMap).forEach(([path, colors]) => {
    if (colors.fill) {
      colorSlots.push({
        id: `${path}-fill`,
        label: colors.fill.isGradient ? `${path} (gradient fill)` : `${path} (fill)`,
        originalColor: colors.fill.original,
        currentColor: colors.fill.current,
        elementPath: path,
        colorType: 'fill',
        isGradient: colors.fill.isGradient || false,
        cannotCustomize: colors.fill.cannotCustomize || false
      });
    }
    
    if (colors.stroke) {
      colorSlots.push({
        id: `${path}-stroke`,
        label: colors.stroke.isGradient ? `${path} (gradient stroke)` : `${path} (stroke)`,
        originalColor: colors.stroke.original,
        currentColor: colors.stroke.current,
        elementPath: path,
        colorType: 'stroke',
        isGradient: colors.stroke.isGradient || false,
        cannotCustomize: colors.stroke.cannotCustomize || false
      });
    }
  });
  }

  // Separate solid colors from gradients
  const solidColorGroups = {};
  const gradientGroups = {};
  
  colorSlots.forEach(slot => {
    if (slot.isGradient) {
      // For gradient slots, we need to extract the gradient ID and create stop slots
      const gradientId = slot.gradientId || (slot.originalColor === 'GRADIENT' ? 
        `GRADIENT_${slot.elementPath}` : slot.originalColor);
      
      console.log('Processing gradient slot with gradientId:', slot.gradientId);
      console.log('gradientDefinitions type:', typeof gradientDefinitions);
      console.log('gradientDefinitions keys:', Object.keys(gradientDefinitions));
      console.log('slot.gradientId type:', typeof slot.gradientId);
      console.log('Direct access test:', gradientDefinitions[slot.gradientId]);
      
      // Try to find the gradient definition using the actual gradient ID from the slot
      const actualGradientId = slot.gradientId; // This contains "linearGrad1", "radialGrad1", etc.
      if (actualGradientId && gradientDefinitions && gradientDefinitions[actualGradientId]) {
        // Create individual slots for each gradient stop
        const gradient = gradientDefinitions[actualGradientId];
        const originalGradient = originalGradientDefinitions[actualGradientId];
        console.log(`Creating ${gradient.stops.length} stop slots for ${actualGradientId}:`, gradient.stops);
        gradient.stops.forEach((stop, stopIndex) => {
          const originalStop = originalGradient?.stops[stopIndex];
          const stopSlot = {
            id: `${slot.id}-stop-${stopIndex}`,
            label: `${gradientId} - Stop ${stopIndex + 1}`,
            originalColor: originalStop?.color || stop.color, // Use original color, fallback to current
            currentColor: stop.color,
            elementPath: slot.elementPath,
            colorType: slot.colorType,
            isGradientStop: true,
            gradientId: gradientId,
            stopIndex: stopIndex,
            stopOffset: stop.offset,
            stopOpacity: stop.opacity
          };
          
          if (!gradientGroups[gradientId]) {
            gradientGroups[gradientId] = [];
          }
          gradientGroups[gradientId].push(stopSlot);
        });
      } else {
        // Fallback for gradients without definitions
        if (!gradientGroups[gradientId]) {
          gradientGroups[gradientId] = [];
        }
        gradientGroups[gradientId].push(slot);
      }
    } else {
      // Group solid colors by original color (like BadgeIconUpload does)
      const groupKey = slot.originalColor === 'UNSPECIFIED' ? 'UNSPECIFIED_GROUP' : slot.originalColor;
      if (!solidColorGroups[groupKey]) {
        solidColorGroups[groupKey] = [];
      }
      solidColorGroups[groupKey].push(slot);
    }
  });

  const toggleGroup = (color) => {
    setExpandedGroups(prev => ({
      ...prev,
      [color]: !prev[color]
    }));
  };

  const handleGroupColorChange = (originalColor, newHex, newAlpha, isGradient = false) => {
    const parsedAlpha = parseFloat(newAlpha);
    if (isNaN(parsedAlpha)) return;
    
    const newFormattedColor = formatHexWithAlpha(newHex, parsedAlpha);
    
    // Update element color map
    const updatedElementColorMap = { ...elementColorMap };
    const slotsToUpdate = isGradient ? gradientGroups[originalColor] : solidColorGroups[originalColor];
    
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

  // Helper function to render a color group (used for both solid colors and gradients)
  const renderColorGroup = (originalColor, slots, isGradient = false) => {
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
          
          {isGradient ? (
            // For gradients, show "Edit Gradient" button instead of color picker
            <div className="control-group svg-color-control" style={{ marginTop: '8px', paddingLeft: '30px' }}>
              <button 
                type="button"
                onClick={() => toggleGroup(originalColor)}
                style={{
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  cursor: 'pointer'
                }}
              >
                Edit Gradient {isExpanded ? '▲' : '▼'}
              </button>
              <span className="color-display-hex8" style={{ marginLeft: '10px' }}>
                {slots.length} gradient stop{slots.length > 1 ? 's' : ''}
              </span>
              <button 
                type="button" 
                onClick={() => {
                  // Reset all stops in this gradient to original colors
                  console.log('Resetting all stops for gradient:', originalColor);
                  
                  // Find the gradient ID from the first slot
                  const firstGradientSlot = slots.find(slot => slot.isGradientStop);
                  if (firstGradientSlot && firstGradientSlot.gradientId) {
                    const gradientId = firstGradientSlot.gradientId;
                    
                    // Create updated gradient definitions with all original colors
                    const updatedGradientDefinitions = { ...gradientDefinitions };
                    const originalGradient = originalGradientDefinitions[gradientId];
                    if (updatedGradientDefinitions[gradientId] && originalGradient) {
                      updatedGradientDefinitions[gradientId] = {
                        ...updatedGradientDefinitions[gradientId],
                        stops: updatedGradientDefinitions[gradientId].stops.map((stop, idx) => ({
                          ...stop,
                          color: originalGradient.stops[idx]?.color || stop.color
                        }))
                      };
                    }
                    
                    // Call onColorChange with gradient update
                    onColorChange(elementColorMap, updatedGradientDefinitions);
                  }
                }} 
                className="reset-color-btn" 
                style={{ fontSize: '12px', padding: '4px 8px', marginLeft: '10px' }}
              >
                Reset All Stops
              </button>
            </div>
          ) : (
            // For solid colors, show regular color picker
            <div className="control-group svg-color-control" style={{ marginTop: '8px', paddingLeft: '30px' }}>
              <input 
                type="color" 
                value={allSameColor ? currentHex : '#000000'}
                onChange={(e) => handleGroupColorChange(originalColor, e.target.value, currentAlpha, isGradient)}
                disabled={!allSameColor}
                style={{ opacity: allSameColor ? 1 : 0.5 }}
              />
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={allSameColor ? currentAlpha : 1}
                onChange={(e) => handleGroupColorChange(originalColor, currentHex, parseFloat(e.target.value), isGradient)}
                disabled={!allSameColor}
                style={{ opacity: allSameColor ? 1 : 0.5 }}
              />
              <span className="color-display-hex8">
                {allSameColor ? groupCurrentColor : `Mixed colors - expand to edit individually`}
              </span>
              <button 
                type="button" 
                onClick={() => {
                  // Reset all slots in this group to their original colors
                  console.log('Resetting group to original colors:', originalColor, 'for', slots.length, 'slots');
                  
                  const updatedElementColorMap = { ...elementColorMap };
                  slots.forEach(slot => {
                    if (!updatedElementColorMap[slot.elementPath]) {
                      updatedElementColorMap[slot.elementPath] = {};
                    }
                    updatedElementColorMap[slot.elementPath][slot.colorType] = {
                      original: slot.originalColor,
                      current: slot.originalColor
                    };
                  });
                  
                  onColorChange(updatedElementColorMap);
                }} 
                disabled={!allSameColor}
                className="reset-color-btn" 
                style={{ 
                  fontSize: '12px', 
                  padding: '4px 8px', 
                  marginLeft: '10px',
                  opacity: allSameColor ? 1 : 0.5
                }}
              >
                Reset Group
              </button>
            </div>
          )}
        </div>
        
        {isExpanded && (
          <div className="color-group-items" style={{ paddingLeft: '30px', marginTop: '10px' }}>
            {slots.map((slot) => {
              const { hex: slotHex, alpha: slotAlpha } = parseColorString(slot.currentColor);
              return (
                <div key={slot.id} style={{ marginBottom: '10px' }}>
                  <label style={{ fontWeight: 'normal', marginBottom: '5px', display: 'block' }}>
                    {slot.label}
                    {slot.isGradientStop && (
                      <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '8px' }}>
                        (Position: {slot.stopOffset})
                      </span>
                    )}
                  </label>
                  <div className="control-group svg-color-control">
                    <input 
                      type="color" 
                      value={slotHex}
                      onChange={(e) => {
                        const newColor = formatHexWithAlpha(e.target.value, slotAlpha);
                        
                        if (slot.isGradientStop) {
                          // Handle gradient stop color change
                          console.log('Gradient stop color change:', slot.gradientId, 'stop', slot.stopIndex, 'to', newColor);
                          
                          // Create updated gradient definitions
                          const updatedGradientDefinitions = { ...gradientDefinitions };
                          if (updatedGradientDefinitions[slot.gradientId]) {
                            updatedGradientDefinitions[slot.gradientId] = {
                              ...updatedGradientDefinitions[slot.gradientId],
                              stops: updatedGradientDefinitions[slot.gradientId].stops.map((stop, idx) =>
                                idx === slot.stopIndex ? { ...stop, color: newColor } : stop
                              )
                            };
                          }
                          
                          // Call onColorChange with gradient update info
                          onColorChange(elementColorMap, updatedGradientDefinitions);
                        } else {
                          // Handle regular slot color change
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
                        }
                      }}
                    />
                    <input 
                      type="range" 
                      min="0" max="1" step="0.01" 
                      value={slotAlpha}
                      onChange={(e) => {
                        const newColor = formatHexWithAlpha(slotHex, parseFloat(e.target.value));
                        
                        if (slot.isGradientStop) {
                          // Handle gradient stop alpha change
                          console.log('Gradient stop alpha change:', slot.gradientId, 'stop', slot.stopIndex, 'to', newColor);
                          // TODO: Implement actual gradient stop modification in SVG
                        } else {
                          // Handle regular slot alpha change
                          const updatedElementColorMap = { ...elementColorMap };
                          if (!updatedElementColorMap[slot.elementPath]) {
                            updatedElementColorMap[slot.elementPath] = {};
                          }
                          updatedElementColorMap[slot.elementPath][slot.colorType] = {
                            original: slot.originalColor,
                            current: newColor
                          };
                          onColorChange(updatedElementColorMap);
                        }
                      }}
                    />
                    <span className="color-display-hex8">{slot.currentColor}</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (slot.isGradientStop) {
                          // Reset gradient stop to original color
                          console.log('Resetting gradient stop:', slot.gradientId, 'stop', slot.stopIndex, 'to original:', slot.originalColor);
                          console.log('Current slot details:', slot);
                          
                          // Create updated gradient definitions with original color
                          const updatedGradientDefinitions = { ...gradientDefinitions };
                          const originalGradient = originalGradientDefinitions[slot.gradientId];
                          if (updatedGradientDefinitions[slot.gradientId] && originalGradient) {
                            const originalStopColor = originalGradient.stops[slot.stopIndex]?.color || slot.originalColor;
                            updatedGradientDefinitions[slot.gradientId] = {
                              ...updatedGradientDefinitions[slot.gradientId],
                              stops: updatedGradientDefinitions[slot.gradientId].stops.map((stop, idx) =>
                                idx === slot.stopIndex ? { ...stop, color: originalStopColor } : stop
                              )
                            };
                          }
                          
                          // Call onColorChange with gradient update
                          onColorChange(elementColorMap, updatedGradientDefinitions);
                        } else {
                          // Reset solid color slot to original color
                          console.log('Resetting solid color slot:', slot.elementPath, slot.colorType, 'to original:', slot.originalColor);
                          const updatedElementColorMap = { ...elementColorMap };
                          if (!updatedElementColorMap[slot.elementPath]) {
                            updatedElementColorMap[slot.elementPath] = {};
                          }
                          updatedElementColorMap[slot.elementPath][slot.colorType] = {
                            original: slot.originalColor,
                            current: slot.originalColor
                          };
                          onColorChange(updatedElementColorMap);
                        }
                      }} 
                      className="reset-color-btn" 
                      style={{ fontSize: '12px', padding: '2px 8px', marginLeft: '8px' }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="control-section" style={{ marginTop: '20px' }}>
      <h3>{title}</h3>
      
      {/* Solid Colors Section */}
      {Object.keys(solidColorGroups).length > 0 && (
        <div className="svg-color-controls">
          <h4>Solid Colors:</h4>
          {Object.entries(solidColorGroups).map(([originalColor, slots]) => 
            renderColorGroup(originalColor, slots, false)
          )}
        </div>
      )}
      
      {/* Gradient Colors Section */}
      {Object.keys(gradientGroups).length > 0 && (
        <div className="svg-color-controls" style={{ marginTop: '20px' }}>
          <h4>Gradient Colors:</h4>
          {Object.entries(gradientGroups).map(([originalColor, slots]) => 
            renderColorGroup(originalColor, slots, true)
          )}
        </div>
      )}
      
      {/* Show message if no colors detected */}
      {Object.keys(solidColorGroups).length === 0 && Object.keys(gradientGroups).length === 0 && (
        <div className="svg-color-controls">
          <p>No customizable colors detected in this SVG.</p>
        </div>
      )}
    </div>
  );
};

export default SvgColorCustomization;