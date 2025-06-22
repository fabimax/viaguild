import React, { useState, useEffect } from 'react';

// HSL conversion utilities
const hexToHsl = (hex) => {
  // Remove # and convert to RGB
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    
    switch (max) {
      case r: h = (g - b) / diff + (g < b ? 6 : 0); break;
      case g: h = (b - r) / diff + 2; break;
      case b: h = (r - g) / diff + 4; break;
    }
    h /= 6;
  }

  return {
    h: h * 360, // 0-360
    s: s * 100, // 0-100
    l: l * 100  // 0-100
  };
};

const hslToHex = (h, s, l) => {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (c) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

// Apply HSL adjustments to a color
const adjustColorHsl = (hex, hueDelta, satDelta, lightDelta) => {
  if (!hex || !hex.startsWith('#')) return hex;
  
  const baseHex = hex.length === 9 ? hex.substring(0, 7) : hex;
  const alpha = hex.length === 9 ? hex.substring(7) : null;
  
  const hsl = hexToHsl(baseHex);
  
  // Apply adjustments with clamping
  const newH = (hsl.h + hueDelta + 360) % 360; // Wrap around
  const newS = Math.max(0, Math.min(100, hsl.s + satDelta));
  const newL = Math.max(0, Math.min(100, hsl.l + lightDelta));
  
  const newHex = hslToHex(newH, newS, newL);
  return alpha ? newHex + alpha : newHex;
};

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
  const [expandedGradientSections, setExpandedGradientSections] = useState({});
  const [openGradientPicker, setOpenGradientPicker] = useState(null); // Track which gradient picker is open
  const [globalAdjustments, setGlobalAdjustments] = useState({
    hue: 0,      // -180 to +180
    saturation: 0, // -100 to +100  
    lightness: 0,   // -100 to +100
    alpha: 0       // -100 to +100
  });
  const [gradientAdjustments, setGradientAdjustments] = useState({});
  const [gradientTransparency, setGradientTransparency] = useState({});
  
  // Group adjustments state
  const [groupAdjustments, setGroupAdjustments] = useState({}); // { groupId: { hue: 0, saturation: 0, lightness: 0, alpha: 0 } }
  const [elementGroups, setElementGroups] = useState({}); // { elementId: groupId }
  const [groups, setGroups] = useState({}); // { groupId: { name: "Group 1", id: "group1" } }
  const [selectionMode, setSelectionMode] = useState(null); // null or groupId being edited
  const [selectedElements, setSelectedElements] = useState(new Set()); // temp selection state

  // Reset global adjustments when a new SVG is uploaded (only track the keys, not the values)
  useEffect(() => {
    setGlobalAdjustments({ hue: 0, saturation: 0, lightness: 0, alpha: 0 });
    setGradientAdjustments({});
    setGradientTransparency({});
    setOpenGradientPicker(null);
    // Reset group state
    setGroupAdjustments({});
    setElementGroups({});
    setGroups({});
    setSelectionMode(null);
    setSelectedElements(new Set());
  }, [Object.keys(elementColorMap || {}).join(',')]); // Only reset when the structure changes (new SVG)

  // Close gradient picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openGradientPicker && !event.target.closest('.gradient-picker-popup') && !event.target.closest('.gradient-preview-trigger')) {
        setOpenGradientPicker(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openGradientPicker]);
  
  // Helper to get gradient-specific adjustments
  const getGradientAdjustments = (gradientId) => {
    return gradientAdjustments[gradientId] || { hue: 0, saturation: 0, lightness: 0, alpha: 0 };
  };
  
  // Helper to get gradient transparency
  const getGradientTransparency = (gradientId) => {
    return gradientTransparency[gradientId] || 0;
  };
  
  // Helper to set gradient-specific adjustments
  const setGradientSpecificAdjustments = (gradientId, adjustments) => {
    setGradientAdjustments(prev => ({
      ...prev,
      [gradientId]: adjustments
    }));
  };
  
  // Helper to create a new group
  const createNewGroup = () => {
    const existingGroupNumbers = Object.values(groups).map(group => {
      const match = group.name.match(/^Group (\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextNumber = Math.max(0, ...existingGroupNumbers) + 1;
    const groupId = `group${nextNumber}`;
    const groupName = `Group ${nextNumber}`;
    
    // Create the group
    setGroups(prev => ({
      ...prev,
      [groupId]: { name: groupName, id: groupId }
    }));
    
    // Initialize group adjustments
    setGroupAdjustments(prev => ({
      ...prev,
      [groupId]: { hue: 0, saturation: 0, lightness: 0, alpha: 0 }
    }));
    
    return groupId;
  };
  
  // Helper to reset a group to original colors
  const resetGroup = (groupId) => {
    // Reset group adjustments
    setGroupAdjustments(prev => ({
      ...prev,
      [groupId]: { hue: 0, saturation: 0, lightness: 0, alpha: 0 }
    }));
    
    // Get all elements in this group and reset them to original colors
    const elementsInGroup = Object.keys(elementGroups).filter(elementId => 
      elementGroups[elementId] === groupId
    );
    
    if (elementsInGroup.length === 0) return;
    
    const updatedElementColorMap = { ...elementColorMap };
    const updatedGradientDefinitions = { ...gradientDefinitions };
    
    elementsInGroup.forEach(elementId => {
      if (elementId.startsWith('group-')) {
        // Handle group-level color resets
        const originalColor = elementId.replace('group-', '');
        const slots = solidColorGroups[originalColor] || [];
        
        slots.forEach(slot => {
          if (!updatedElementColorMap[slot.elementPath]) {
            updatedElementColorMap[slot.elementPath] = {};
          }
          updatedElementColorMap[slot.elementPath][slot.colorType] = {
            original: slot.originalColor,
            current: slot.originalColor
          };
        });
      } else if (elementId.startsWith('slot-') || elementId.startsWith('stop-')) {
        // Handle individual slot/stop resets
        let foundSlot = null;
        
        // Search in solid color groups
        Object.values(solidColorGroups).forEach(slots => {
          const slot = slots.find(s => `slot-${s.id}` === elementId || `stop-${s.id}` === elementId);
          if (slot) foundSlot = slot;
        });
        
        // Search in gradient groups if not found
        if (!foundSlot) {
          Object.values(gradientGroups).forEach(gradientGroup => {
            const slot = gradientGroup.stops.find(s => `slot-${s.id}` === elementId || `stop-${s.id}` === elementId);
            if (slot) foundSlot = slot;
          });
        }
        
        if (foundSlot) {
          if (foundSlot.isGradientStop) {
            // Reset gradient stop
            const gradientId = foundSlot.gradientId;
            const originalGradient = originalGradientDefinitions[gradientId];
            if (updatedGradientDefinitions[gradientId] && originalGradient) {
              const originalStopColor = originalGradient.stops[foundSlot.stopIndex]?.color || foundSlot.originalColor;
              updatedGradientDefinitions[gradientId] = {
                ...updatedGradientDefinitions[gradientId],
                stops: updatedGradientDefinitions[gradientId].stops.map((stop, idx) => 
                  idx === foundSlot.stopIndex ? { ...stop, color: originalStopColor } : stop
                )
              };
            }
          } else {
            // Reset solid color slot
            if (!updatedElementColorMap[foundSlot.elementPath]) {
              updatedElementColorMap[foundSlot.elementPath] = {};
            }
            updatedElementColorMap[foundSlot.elementPath][foundSlot.colorType] = {
              original: foundSlot.originalColor,
              current: foundSlot.originalColor
            };
          }
        }
      }
    });
    
    onColorChange(updatedElementColorMap, updatedGradientDefinitions);
  };


  if (!elementColorMap || Object.keys(elementColorMap).length === 0) {
    return null;
  }

  // Use provided colorSlots if available, otherwise convert elementColorMap to colorSlots format
  const colorSlots = providedColorSlots || [];
  
  if (!providedColorSlots) {
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
      
      // Try to find the gradient definition using the actual gradient ID from the slot
      const actualGradientId = slot.gradientId; // This contains "linearGrad1", "radialGrad1", etc.
      
      if (actualGradientId && gradientDefinitions && gradientDefinitions[actualGradientId]) {
        // Initialize gradient group if not exists
        if (!gradientGroups[gradientId]) {
          gradientGroups[gradientId] = {
            gradientId: actualGradientId,
            stops: [],
            elements: [] // Track which elements use this gradient
          };
        }
        
        // Add element info
        gradientGroups[gradientId].elements.push({
          elementPath: slot.elementPath,
          colorType: slot.colorType,
          label: slot.label,
          slotId: slot.id
        });
        
        // Create stop slots only if not already created
        if (gradientGroups[gradientId].stops.length === 0) {
          const gradient = gradientDefinitions[actualGradientId];
          const originalGradient = originalGradientDefinitions[actualGradientId];
          
          gradient.stops.forEach((stop, stopIndex) => {
            const originalStop = originalGradient?.stops[stopIndex];
            
            const stopSlot = {
              id: `${gradientId}-stop-${stopIndex}`,
              label: `Stop ${stopIndex + 1}`,
              originalColor: originalStop?.color || stop.color,
              currentColor: stop.color,
              isGradientStop: true,
              gradientId: actualGradientId,
              stopIndex: stopIndex,
              stopOffset: stop.offset,
              stopOpacity: stop.opacity
            };
            
            gradientGroups[gradientId].stops.push(stopSlot);
          });
        }
      } else {
        // Fallback for gradients without definitions
        if (!gradientGroups[gradientId]) {
          gradientGroups[gradientId] = {
            gradientId: gradientId,
            stops: [slot],
            elements: [{
              elementPath: slot.elementPath,
              colorType: slot.colorType,
              label: slot.label,
              slotId: slot.id
            }]
          };
        }
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

  const toggleGradientSection = (gradientId, section) => {
    const key = `${gradientId}-${section}`;
    setExpandedGradientSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Apply global HSL adjustments to all colors
  const handleGlobalAdjustment = (type, value) => {
    const newAdjustments = { ...globalAdjustments, [type]: parseFloat(value) };
    setGlobalAdjustments(newAdjustments);

    // Apply to all solid colors (additive: apply adjustment delta to current colors)
    const updatedElementColorMap = { ...elementColorMap };
    const deltaHue = newAdjustments.hue - globalAdjustments.hue;
    const deltaSat = newAdjustments.saturation - globalAdjustments.saturation;
    const deltaLight = newAdjustments.lightness - globalAdjustments.lightness;
    const deltaAlpha = newAdjustments.alpha - globalAdjustments.alpha;
    
    Object.keys(updatedElementColorMap).forEach(path => {
      const element = updatedElementColorMap[path];
      if (element.fill && !element.fill.isGradient) {
        // First apply HSL adjustments
        const adjustedColor = adjustColorHsl(
          element.fill.current, // Use current color, not original
          deltaHue,             // Apply only the delta change
          deltaSat, 
          deltaLight
        );
        // Then apply alpha adjustment if needed
        if (deltaAlpha !== 0) {
          const { hex, alpha } = parseColorString(adjustedColor);
          const newAlpha = Math.max(0, Math.min(1, alpha + (deltaAlpha / 100)));
          element.fill.current = formatHexWithAlpha(hex, newAlpha);
        } else {
          element.fill.current = adjustedColor;
        }
      }
      if (element.stroke && !element.stroke.isGradient) {
        // First apply HSL adjustments
        const adjustedColor = adjustColorHsl(
          element.stroke.current, // Use current color, not original
          deltaHue,               // Apply only the delta change
          deltaSat, 
          deltaLight
        );
        // Then apply alpha adjustment if needed
        if (deltaAlpha !== 0) {
          const { hex, alpha } = parseColorString(adjustedColor);
          const newAlpha = Math.max(0, Math.min(1, alpha + (deltaAlpha / 100)));
          element.stroke.current = formatHexWithAlpha(hex, newAlpha);
        } else {
          element.stroke.current = adjustedColor;
        }
      }
    });

    // Apply to all gradient stops (additive: apply adjustment delta to current stops)
    const updatedGradientDefinitions = { ...gradientDefinitions };
    Object.keys(updatedGradientDefinitions).forEach(gradientId => {
      const gradient = updatedGradientDefinitions[gradientId];
      if (gradient) {
        gradient.stops = gradient.stops.map((stop) => {
          // First apply HSL adjustments
          const adjustedColor = adjustColorHsl(
            stop.color,    // Use current stop color, not original
            deltaHue,      // Apply only the delta change
            deltaSat, 
            deltaLight
          );
          // Then apply alpha adjustment if needed
          if (deltaAlpha !== 0) {
            const { hex, alpha } = parseColorString(adjustedColor);
            const newAlpha = Math.max(0, Math.min(1, alpha + (deltaAlpha / 100)));
            return { ...stop, color: formatHexWithAlpha(hex, newAlpha) };
          } else {
            return { ...stop, color: adjustedColor };
          }
        });
      }
    });

    // Notify parent of changes
    onColorChange(updatedElementColorMap, updatedGradientDefinitions);
  };

  // Apply group HSL adjustments to all elements in a specific group
  const handleGroupAdjustment = (groupId, type, value) => {
    const currentAdjustments = groupAdjustments[groupId] || { hue: 0, saturation: 0, lightness: 0, alpha: 0 };
    const newAdjustments = { ...currentAdjustments, [type]: parseFloat(value) };
    
    // Update group adjustments state
    setGroupAdjustments(prev => ({
      ...prev,
      [groupId]: newAdjustments
    }));

    // Calculate deltas
    const deltaHue = newAdjustments.hue - currentAdjustments.hue;
    const deltaSat = newAdjustments.saturation - currentAdjustments.saturation;
    const deltaLight = newAdjustments.lightness - currentAdjustments.lightness;
    const deltaAlpha = newAdjustments.alpha - currentAdjustments.alpha;

    // Use callback to get current elementGroups state at time of execution
    setElementGroups(currentElementGroups => {
      // Get all elements assigned to this group using current state
      const elementsInGroup = Object.keys(currentElementGroups).filter(elementId => 
        currentElementGroups[elementId] === groupId
      );
      
      

      if (elementsInGroup.length === 0) return currentElementGroups; // No elements in group

      const updatedElementColorMap = { ...elementColorMap };
      const updatedGradientDefinitions = { ...gradientDefinitions };
      const processedPaths = new Set(); // Track which paths we've already processed

      elementsInGroup.forEach(elementId => {
        if (elementId.startsWith('group-')) {
          // Handle group-level color adjustments (e.g., group-#FF0000 or group-linearGradient123)
          const originalColor = elementId.replace('group-', '');
          
          // Check if it's a solid color group
          const solidSlots = solidColorGroups[originalColor] || [];
          if (elementId === 'group-#EB7830FF') {
            console.log('[GROUP-BUG] solidColorGroups[#EB7830FF] contains:', solidSlots.length, 'slots');
            console.log('[GROUP-BUG] Slot paths:', solidSlots.map(s => s.elementPath));
          }
          if (solidSlots.length > 0) {
            solidSlots.forEach(slot => {
              // Skip if we've already processed this path
              const pathKey = `${slot.elementPath}-${slot.colorType}`;
              if (processedPaths.has(pathKey)) {
                return;
              }
              processedPaths.add(pathKey);
              
              if (!updatedElementColorMap[slot.elementPath]) {
                updatedElementColorMap[slot.elementPath] = {};
              }
              
              const currentColor = slot.currentColor;
              // Apply HSL adjustments
              const adjustedColor = adjustColorHsl(currentColor, deltaHue, deltaSat, deltaLight);
              
              // Apply alpha adjustment if needed
              let finalColor = adjustedColor;
              if (deltaAlpha !== 0) {
                const { hex, alpha } = parseColorString(adjustedColor);
                const newAlpha = Math.max(0, Math.min(1, alpha + (deltaAlpha / 100)));
                finalColor = formatHexWithAlpha(hex, newAlpha);
              }
              
              updatedElementColorMap[slot.elementPath][slot.colorType] = {
                original: slot.originalColor,
                current: finalColor
              };
              
            });
          }
          
          // Check if it's a gradient group
          const gradientGroup = gradientGroups[originalColor];
          if (gradientGroup && gradientGroup.gradientId) {
            const gradientId = gradientGroup.gradientId;
            if (updatedGradientDefinitions[gradientId]) {
              updatedGradientDefinitions[gradientId] = {
                ...updatedGradientDefinitions[gradientId],
                stops: updatedGradientDefinitions[gradientId].stops.map((stop) => {
                  // Apply HSL adjustments
                  const adjustedColor = adjustColorHsl(stop.color, deltaHue, deltaSat, deltaLight);
                  
                  // Apply alpha adjustment if needed
                  let finalColor = adjustedColor;
                  if (deltaAlpha !== 0) {
                    const { hex, alpha } = parseColorString(adjustedColor);
                    const newAlpha = Math.max(0, Math.min(1, alpha + (deltaAlpha / 100)));
                    finalColor = formatHexWithAlpha(hex, newAlpha);
                  }
                  
                  return { ...stop, color: finalColor };
                })
              };
            }
          }
        } else if (elementId.startsWith('slot-')) {
          // Handle individual slot adjustments
          // Find the slot in solidColorGroups or gradientGroups
          let foundSlot = null;
          
          // Search in solid color groups
          Object.values(solidColorGroups).forEach(slots => {
            const slot = slots.find(s => `slot-${s.id}` === elementId);
            if (slot) foundSlot = slot;
          });
          
          // Search in gradient groups if not found in solid colors
          if (!foundSlot) {
            Object.values(gradientGroups).forEach(gradientGroup => {
              const slot = gradientGroup.stops.find(s => `slot-${s.id}` === elementId);
              if (slot) foundSlot = slot;
            });
          }
          
          if (foundSlot) {
            if (foundSlot.isGradientStop) {
              // Handle gradient stop
              const gradientId = foundSlot.gradientId;
              if (updatedGradientDefinitions[gradientId]) {
                updatedGradientDefinitions[gradientId] = {
                  ...updatedGradientDefinitions[gradientId],
                  stops: updatedGradientDefinitions[gradientId].stops.map((stop, idx) => {
                    if (idx === foundSlot.stopIndex) {
                      // Apply HSL adjustments
                      const adjustedColor = adjustColorHsl(stop.color, deltaHue, deltaSat, deltaLight);
                      
                      // Apply alpha adjustment if needed
                      let finalColor = adjustedColor;
                      if (deltaAlpha !== 0) {
                        const { hex, alpha } = parseColorString(adjustedColor);
                        const newAlpha = Math.max(0, Math.min(1, alpha + (deltaAlpha / 100)));
                        finalColor = formatHexWithAlpha(hex, newAlpha);
                      }
                      
                      return { ...stop, color: finalColor };
                    }
                    return stop;
                  })
                };
              }
            } else {
              // Handle solid color slot
              const pathKey = `${foundSlot.elementPath}-${foundSlot.colorType}`;
              if (processedPaths.has(pathKey)) {
                return; // Skip if already processed
              }
              processedPaths.add(pathKey);
              
              if (!updatedElementColorMap[foundSlot.elementPath]) {
                updatedElementColorMap[foundSlot.elementPath] = {};
              }
              
              const currentColor = foundSlot.currentColor;
              // Apply HSL adjustments
              const adjustedColor = adjustColorHsl(currentColor, deltaHue, deltaSat, deltaLight);
              
              // Apply alpha adjustment if needed
              let finalColor = adjustedColor;
              if (deltaAlpha !== 0) {
                const { hex, alpha } = parseColorString(adjustedColor);
                const newAlpha = Math.max(0, Math.min(1, alpha + (deltaAlpha / 100)));
                finalColor = formatHexWithAlpha(hex, newAlpha);
              }
              
              updatedElementColorMap[foundSlot.elementPath][foundSlot.colorType] = {
                original: foundSlot.originalColor,
                current: finalColor
              };
              
            }
          }
        } else if (elementId.startsWith('stop-')) {
          // Handle individual gradient stops (same as slot- logic above for gradient stops)
          let foundSlot = null;
          Object.values(gradientGroups).forEach(gradientGroup => {
            const slot = gradientGroup.stops.find(s => `stop-${s.id}` === elementId);
            if (slot) foundSlot = slot;
          });
          
          if (foundSlot && foundSlot.isGradientStop) {
            const gradientId = foundSlot.gradientId;
            if (updatedGradientDefinitions[gradientId]) {
              updatedGradientDefinitions[gradientId] = {
                ...updatedGradientDefinitions[gradientId],
                stops: updatedGradientDefinitions[gradientId].stops.map((stop, idx) => {
                  if (idx === foundSlot.stopIndex) {
                    // Apply HSL adjustments
                    const adjustedColor = adjustColorHsl(stop.color, deltaHue, deltaSat, deltaLight);
                    
                    // Apply alpha adjustment if needed
                    let finalColor = adjustedColor;
                    if (deltaAlpha !== 0) {
                      const { hex, alpha } = parseColorString(adjustedColor);
                      const newAlpha = Math.max(0, Math.min(1, alpha + (deltaAlpha / 100)));
                      finalColor = formatHexWithAlpha(hex, newAlpha);
                    }
                    
                    return { ...stop, color: finalColor };
                  }
                  return stop;
                })
              };
            }
          }
        }
      });

      // Notify parent of changes
      const allPaths = Object.keys(updatedElementColorMap);
      const modifiedPaths = Array.from(processedPaths).map(p => p.split('-')[0]); // Extract path from pathKey
      console.log('[GROUP-BUG]', `Group ${groupId}: ${elementsInGroup.length} elements → ${modifiedPaths.length} modified paths (${allPaths.length} total in map)`);
      if (modifiedPaths.length !== elementsInGroup.length) {
        console.log('[GROUP-BUG] Elements in group:', elementsInGroup);
        console.log('[GROUP-BUG] Actually modified paths:', modifiedPaths);
      }
      onColorChange(updatedElementColorMap, updatedGradientDefinitions);
      
      // Return the unchanged elementGroups state
      return currentElementGroups;
    });
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

  // Helper function to create CSS gradient string from gradient definition
  const createGradientPreview = (gradientId, customGradientDefinitions = null) => {
    const sourceDefinitions = customGradientDefinitions || gradientDefinitions;
    const gradientDef = sourceDefinitions[gradientId];
    if (!gradientDef || !gradientDef.stops || gradientDef.stops.length === 0) {
      return '#cccccc'; // Fallback to gray
    }
    
    // For preview purposes, normalize stop positions to make gradients more visible
    const originalStops = gradientDef.stops;
    let normalizedStops = [...originalStops];
    
    // If stops are clustered in a small range, spread them across 0%-100% for better preview
    if (originalStops.length >= 2) {
      const positions = originalStops.map(stop => parseFloat(stop.offset.replace('%', '')));
      const minPos = Math.min(...positions);
      const maxPos = Math.max(...positions);
      
      // If the range is very small (less than 10%), spread it out for preview
      if (maxPos - minPos < 10) {
        normalizedStops = originalStops.map((stop, index) => ({
          ...stop,
          offset: `${(index / (originalStops.length - 1)) * 100}%`
        }));
      }
    }
    
    const stops = normalizedStops.map(stop => {
      // Handle offset - ensure it has % and is properly formatted
      let offset = stop.offset || '0%';
      if (!offset.includes('%')) {
        offset = `${offset}%`;
      }
      
      // Handle stop opacity by converting color to rgba
      let colorWithOpacity = stop.color;
      if (stop.opacity && stop.opacity !== '1') {
        const opacity = parseFloat(stop.opacity);
        
        // Convert hex to rgba if needed
        if (colorWithOpacity.startsWith('#')) {
          const hex = colorWithOpacity.replace('#', '');
          let r, g, b;
          
          if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
          } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
          } else if (hex.length === 8) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
            // If hex already has alpha, combine with stop-opacity
            const hexAlpha = parseInt(hex.substring(6, 8), 16) / 255;
            const finalOpacity = hexAlpha * opacity;
            colorWithOpacity = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
            return `${colorWithOpacity} ${offset}`;
          }
          
          colorWithOpacity = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        } else if (colorWithOpacity.includes('rgb')) {
          // Handle existing rgba/rgb colors
          const rgbaMatch = colorWithOpacity.match(/rgba?\(([^)]+)\)/);
          if (rgbaMatch) {
            const values = rgbaMatch[1].split(',').map(v => v.trim());
            if (values.length === 3) {
              colorWithOpacity = `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${opacity})`;
            } else if (values.length === 4) {
              const existingAlpha = parseFloat(values[3]);
              colorWithOpacity = `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${existingAlpha * opacity})`;
            }
          }
        } else {
          // Handle named colors by converting to rgba
          // For simplicity, handle common cases
          const namedColorMap = {
            'white': 'rgba(255, 255, 255',
            'black': 'rgba(0, 0, 0',
            'red': 'rgba(255, 0, 0',
            'green': 'rgba(0, 255, 0',
            'blue': 'rgba(0, 0, 255'
          };
          
          const baseName = colorWithOpacity.toLowerCase();
          if (namedColorMap[baseName]) {
            colorWithOpacity = `${namedColorMap[baseName]}, ${opacity})`;
          }
        }
      }
      
      return `${colorWithOpacity} ${offset}`;
    }).join(', ');
    
    const finalCSS = gradientDef.type === 'lineargradient' 
      ? `linear-gradient(90deg, ${stops})`
      : gradientDef.type === 'radialgradient'
      ? `radial-gradient(circle, ${stops})`
      : '#cccccc';
    
    return finalCSS;
  };

  // Helper function to render a color group (used for both solid colors and gradients)
  const renderColorGroup = (originalColor, slots, isGradient = false, gradientGroup = null) => {
    // Handle special unspecified group
    const isUnspecifiedGroup = originalColor === 'UNSPECIFIED_GROUP';
    const displayGroupName = isUnspecifiedGroup ? 'Unspecified' : originalColor;
    
    // Check if this is an unlinked gradient (has a parent gradient it was cloned from)
    const isUnlinkedGradient = isGradient && gradientGroup && gradientGroup.gradientId && 
      gradientGroup.gradientId.includes('-') && gradientGroup.gradientId.match(/^(.+)-\w+$/);
    const parentGradientId = isUnlinkedGradient ? gradientGroup.gradientId.match(/^(.+)-\w+$/)[1] : null;
    
    // For gradients, create a current gradient preview; for solid colors, use the original color
    let groupDisplayColor;
    if (isGradient) {
      // Find the gradient ID from the first slot and create current gradient preview
      const firstGradientSlot = slots.find(slot => slot.isGradientStop);
      if (firstGradientSlot && firstGradientSlot.gradientId) {
        // Use current gradientDefinitions (not original) to show current state
        groupDisplayColor = createGradientPreview(firstGradientSlot.gradientId, gradientDefinitions);
      } else {
        groupDisplayColor = '#cccccc'; // Fallback
      }
    } else {
      groupDisplayColor = isUnspecifiedGroup ? '#000000FF' : originalColor;
    }
    
    // Check if all slots in group have same current color
    const allSameColor = slots.every(slot => slot.currentColor === slots[0].currentColor);
    
    // For group controls, only show unified values when all colors are the same
    const groupCurrentColor = allSameColor ? slots[0].currentColor : groupDisplayColor;
    const parsedCurrent = parseColorString(groupCurrentColor);
    const currentHex = parsedCurrent.hex;
    const currentAlpha = parsedCurrent.alpha;
    const isExpanded = expandedGroups[originalColor];
    
    // Determine if expand button should be shown/active
    const canExpand = slots.length > 1;
    const elementCount = isGradient && gradientGroup ? gradientGroup.elements.length : slots.length;
    
    return (
      <div key={originalColor} className="color-group" style={{ marginBottom: '8px' }}>
        {/* New compact single-row layout */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '4px 0'
        }}>
          {/* Expand button - disabled for single items */}
          <button 
            type="button"
            onClick={() => canExpand && toggleGroup(originalColor)}
            disabled={!canExpand}
            style={{
              background: canExpand ? '#f0f0f0' : '#f8f9fa',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: canExpand ? 'pointer' : 'default',
              fontSize: '14px',
              padding: '2px 6px',
              width: '27px',
              height: '20px',
              lineHeight: '1',
              color: canExpand ? '#333' : '#adb5bd',
              opacity: canExpand ? 1 : 0.5
            }}
            title={canExpand ? (isExpanded ? 'Collapse' : 'Expand') : 'Single item - no expansion'}
          >
            {canExpand ? (isExpanded ? '▼' : '▶') : '•'}
          </button>
          
          {/* Color picker - only for solid colors */}
          {!isGradient && (
            <input 
              type="color" 
              value={allSameColor ? currentHex : '#000000'}
              onChange={(e) => handleGroupColorChange(originalColor, e.target.value, currentAlpha, isGradient)}
              disabled={!allSameColor}
              style={{ 
                opacity: allSameColor ? 1 : 0.5,
                width: '32px',
                height: '24px',
                appearance: 'auto',
                WebkitAppearance: 'auto',
                padding: '0',
                border: 'none'
              }}
            />
          )}
          
          {/* Current gradient preview - only for gradients */}
          {isGradient && (
            <span 
              className="gradient-preview-trigger"
              onClick={() => {
                const gradientId = gradientGroup?.gradientId;
                if (gradientId) {
                  setOpenGradientPicker(openGradientPicker === gradientId ? null : gradientId);
                }
              }}
              style={{
                display: 'inline-block',
                width: '32px',
                height: '24px',
                background: groupDisplayColor,
                border: '1px solid #ccc',
                borderRadius: '3px',
                flexShrink: 0,
                position: 'relative'
              }}
            >
              {/* Gradient picker popup positioned relative to this span */}
              {openGradientPicker === gradientGroup?.gradientId && (
                <div 
                  className="gradient-picker-popup"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    zIndex: 1000,
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    padding: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    minWidth: '250px',
                    marginTop: '4px'
                  }}
                >
                  <div style={{ marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                    Gradient Adjustments
                  </div>
                  
                  {/* HSL sliders for gradient */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Hue */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <label style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                          Hue: {getGradientAdjustments(gradientGroup?.gradientId).hue}°
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const gradientId = gradientGroup?.gradientId;
                            const currentAdj = getGradientAdjustments(gradientId);
                            setGradientSpecificAdjustments(gradientId, { ...currentAdj, hue: 0 });
                            
                            // Apply HSL adjustments to gradient (reset hue to 0)
                            const updatedGradientDefinitions = { ...gradientDefinitions };
                            const gradient = updatedGradientDefinitions[gradientId];
                            const originalGradient = originalGradientDefinitions[gradientId];
                            
                            if (gradient && originalGradient) {
                              gradient.stops = gradient.stops.map((stop, idx) => {
                                const originalStop = originalGradient.stops[idx];
                                if (originalStop) {
                                  const { hex: originalHex, alpha: originalAlpha } = parseColorString(originalStop.color);
                                  const adjustedColor = adjustColorHsl(originalHex, 0, currentAdj.saturation, currentAdj.lightness);
                                  return { ...stop, color: formatHexWithAlpha(adjustedColor, originalAlpha) };
                                }
                                return stop;
                              });
                              onColorChange(elementColorMap, updatedGradientDefinitions);
                            }
                          }}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            background: '#f0f0f0',
                            border: '1px solid #ccc',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            color: '#666'
                          }}
                        >
                          ↻
                        </button>
                      </div>
                      <input
                        type="range"
                        min="-180" max="180" step="1"
                        value={getGradientAdjustments(gradientGroup?.gradientId).hue}
                        onChange={(e) => {
                          const gradientId = gradientGroup?.gradientId;
                          const newHue = parseInt(e.target.value);
                          const currentAdj = getGradientAdjustments(gradientId);
                          setGradientSpecificAdjustments(gradientId, { ...currentAdj, hue: newHue });
                          
                          // Apply HSL adjustments to gradient
                          const updatedGradientDefinitions = { ...gradientDefinitions };
                          const gradient = updatedGradientDefinitions[gradientId];
                          const originalGradient = originalGradientDefinitions[gradientId];
                          
                          if (gradient && originalGradient) {
                            gradient.stops = gradient.stops.map((stop, idx) => {
                              const originalStop = originalGradient.stops[idx];
                              if (originalStop) {
                                const { hex: originalHex, alpha: originalAlpha } = parseColorString(originalStop.color);
                                const adjustedColor = adjustColorHsl(originalHex, newHue, currentAdj.saturation, currentAdj.lightness);
                                return { ...stop, color: formatHexWithAlpha(adjustedColor, originalAlpha) };
                              }
                              return stop;
                            });
                            onColorChange(elementColorMap, updatedGradientDefinitions);
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                    </div>
                    
                    {/* Saturation */}
                    <div>
                      <label style={{ fontSize: '12px', color: '#666', marginBottom: '2px', display: 'block' }}>
                        Saturation: {getGradientAdjustments(gradientGroup?.gradientId).saturation}%
                      </label>
                      <input
                        type="range"
                        min="-100" max="100" step="1"
                        value={getGradientAdjustments(gradientGroup?.gradientId).saturation}
                        onChange={(e) => {
                          const gradientId = gradientGroup?.gradientId;
                          const newSat = parseInt(e.target.value);
                          const currentAdj = getGradientAdjustments(gradientId);
                          setGradientSpecificAdjustments(gradientId, { ...currentAdj, saturation: newSat });
                          
                          // Apply HSL adjustments to gradient
                          const updatedGradientDefinitions = { ...gradientDefinitions };
                          const gradient = updatedGradientDefinitions[gradientId];
                          const originalGradient = originalGradientDefinitions[gradientId];
                          
                          if (gradient && originalGradient) {
                            gradient.stops = gradient.stops.map((stop, idx) => {
                              const originalStop = originalGradient.stops[idx];
                              if (originalStop) {
                                const { hex: originalHex, alpha: originalAlpha } = parseColorString(originalStop.color);
                                const adjustedColor = adjustColorHsl(originalHex, currentAdj.hue, newSat, currentAdj.lightness);
                                return { ...stop, color: formatHexWithAlpha(adjustedColor, originalAlpha) };
                              }
                              return stop;
                            });
                            onColorChange(elementColorMap, updatedGradientDefinitions);
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                    </div>
                    
                    {/* Lightness */}
                    <div>
                      <label style={{ fontSize: '12px', color: '#666', marginBottom: '2px', display: 'block' }}>
                        Lightness: {getGradientAdjustments(gradientGroup?.gradientId).lightness}%
                      </label>
                      <input
                        type="range"
                        min="-100" max="100" step="1"
                        value={getGradientAdjustments(gradientGroup?.gradientId).lightness}
                        onChange={(e) => {
                          const gradientId = gradientGroup?.gradientId;
                          const newLight = parseInt(e.target.value);
                          const currentAdj = getGradientAdjustments(gradientId);
                          setGradientSpecificAdjustments(gradientId, { ...currentAdj, lightness: newLight });
                          
                          // Apply HSL adjustments to gradient
                          const updatedGradientDefinitions = { ...gradientDefinitions };
                          const gradient = updatedGradientDefinitions[gradientId];
                          const originalGradient = originalGradientDefinitions[gradientId];
                          
                          if (gradient && originalGradient) {
                            gradient.stops = gradient.stops.map((stop, idx) => {
                              const originalStop = originalGradient.stops[idx];
                              if (originalStop) {
                                const { hex: originalHex, alpha: originalAlpha } = parseColorString(originalStop.color);
                                const adjustedColor = adjustColorHsl(originalHex, currentAdj.hue, currentAdj.saturation, newLight);
                                return { ...stop, color: formatHexWithAlpha(adjustedColor, originalAlpha) };
                              }
                              return stop;
                            });
                            onColorChange(elementColorMap, updatedGradientDefinitions);
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                    </div>
                    
                    {/* Alpha */}
                    <div>
                      <label style={{ fontSize: '12px', color: '#666', marginBottom: '2px', display: 'block' }}>
                        Alpha: {getGradientAdjustments(gradientGroup?.gradientId).alpha > 0 ? '+' : ''}{getGradientAdjustments(gradientGroup?.gradientId).alpha}%
                      </label>
                      <input
                        type="range"
                        min="-100" max="100" step="1"
                        value={getGradientAdjustments(gradientGroup?.gradientId).alpha}
                        onChange={(e) => {
                          const gradientId = gradientGroup?.gradientId;
                          const newAlpha = parseInt(e.target.value);
                          const currentAdj = getGradientAdjustments(gradientId);
                          setGradientSpecificAdjustments(gradientId, { ...currentAdj, alpha: newAlpha });
                          
                          // Apply HSL and alpha adjustments to gradient
                          const updatedGradientDefinitions = { ...gradientDefinitions };
                          const gradient = updatedGradientDefinitions[gradientId];
                          const originalGradient = originalGradientDefinitions[gradientId];
                          
                          if (gradient && originalGradient) {
                            gradient.stops = gradient.stops.map((stop, idx) => {
                              const originalStop = originalGradient.stops[idx];
                              if (originalStop) {
                                const { hex: originalHex, alpha: originalAlpha } = parseColorString(originalStop.color);
                                // First apply HSL adjustments
                                const adjustedColor = adjustColorHsl(originalHex, currentAdj.hue, currentAdj.saturation, currentAdj.lightness);
                                // Then apply alpha adjustment
                                const newAlphaValue = Math.max(0, Math.min(1, originalAlpha + (newAlpha / 100)));
                                return { ...stop, color: formatHexWithAlpha(adjustedColor, newAlphaValue) };
                              }
                              return stop;
                            });
                            onColorChange(elementColorMap, updatedGradientDefinitions);
                          }
                        }}
                        className="transparency-slider"
                        style={{ 
                          width: '100%',
                          height: '4px',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          background: 'linear-gradient(to right, transparent, #000)',
                          borderRadius: '4px',
                          outline: 'none',
                          border: 'none',
                          padding: '4px',
                          margin: '5px 0'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </span>
          )}
          
          {/* Horizontal transparency slider - only for solid colors */}
          {!isGradient && (
            <input 
              type="range" 
              min="0" max="1" step="0.01" 
              value={allSameColor ? currentAlpha : 1}
              onChange={(e) => handleGroupColorChange(originalColor, currentHex, parseFloat(e.target.value), isGradient)}
              disabled={!allSameColor}
              className="transparency-slider"
              style={{ 
                opacity: allSameColor ? 1 : 0.5,
                width: '60px',
                height: '4px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: 'linear-gradient(to right, transparent, #000)',
                borderRadius: '2px',
                outline: 'none',
                border: 'none',
                padding: '0',
                margin: '0'
              }}
            />
          )}
          
          {/* Gradient transparency slider - only for gradients */}
          {isGradient && (
            <input 
              type="range" 
              min="-100" max="100" step="1" 
              value={getGradientTransparency(gradientGroup?.gradientId) || 0}
              onChange={(e) => {
                const gradientId = gradientGroup?.gradientId;
                if (gradientId && gradientDefinitions[gradientId]) {
                  const transparencyDelta = parseFloat(e.target.value);
                  
                  // Apply transparency delta to all stops
                  const updatedGradientDefinitions = { ...gradientDefinitions };
                  const gradient = updatedGradientDefinitions[gradientId];
                  
                  gradient.stops = gradient.stops.map((stop, idx) => {
                    // Get original stop from original gradient definition
                    const originalGradient = originalGradientDefinitions[gradientId];
                    const originalStop = originalGradient?.stops[idx];
                    
                    if (originalStop) {
                      // Parse the original color to extract hex and alpha
                      const { hex: originalHex, alpha: originalAlpha } = parseColorString(originalStop.color);
                      
                      // Apply transparency delta to the original alpha
                      const newAlpha = Math.max(0, Math.min(1, originalAlpha + (transparencyDelta / 100)));
                      
                      // Create new color string with updated alpha (same as individual stops)
                      const newColor = formatHexWithAlpha(originalHex, newAlpha);
                      
                      return { ...stop, color: newColor };
                    }
                    return stop;
                  });
                  
                  // Store the transparency delta for this gradient
                  setGradientTransparency(prev => ({
                    ...prev,
                    [gradientId]: transparencyDelta
                  }));
                  
                  // Also update element color map for elements using this gradient
                  const updatedElementColorMap = { ...elementColorMap };
                  Object.keys(updatedElementColorMap).forEach(path => {
                    const element = updatedElementColorMap[path];
                    if (element.fill && element.fill.isGradient && element.fill.gradientId === gradientId) {
                      element.fill.current = `url(#${gradientId})`;
                    }
                    if (element.stroke && element.stroke.isGradient && element.stroke.gradientId === gradientId) {
                      element.stroke.current = `url(#${gradientId})`;
                    }
                  });
                  
                  onColorChange(updatedElementColorMap, updatedGradientDefinitions);
                }
              }}
              className="transparency-slider"
              style={{ 
                width: '60px',
                height: '4px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: 'linear-gradient(to right, transparent, #000)',
                borderRadius: '2px',
                outline: 'none',
                border: 'none',
                padding: '0',
                margin: '0'
              }}
              title={`Gradient transparency: ${getGradientTransparency(gradientGroup?.gradientId) || 0}%`}
            />
          )}
          
          {/* Reset button with icon */}
          <button 
            type="button" 
            onClick={() => {
              if (isGradient) {
                // Reset all stops in this gradient to original colors
                const firstGradientSlot = slots.find(slot => slot.isGradientStop);
                if (firstGradientSlot && firstGradientSlot.gradientId) {
                  const gradientId = firstGradientSlot.gradientId;
                  
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
                  
                  // Reset gradient transparency state
                  setGradientTransparency(prev => ({
                    ...prev,
                    [gradientId]: 0
                  }));
                  
                  // Reset gradient adjustments state (for the popup sliders)
                  setGradientAdjustments(prev => ({
                    ...prev,
                    [gradientId]: { hue: 0, saturation: 0, lightness: 0, alpha: 0 }
                  }));
                  
                  onColorChange(elementColorMap, updatedGradientDefinitions);
                }
              } else {
                // Reset all slots in this group to their original colors
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
              }
            }} 
            style={{ 
              fontSize: '14px', 
              padding: '2px 6px',
              background: 'transparent',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
              width: '24px',
              height: '24px',
              color: '#666'
            }}
            title="Reset to original"
          >
            ↻
          </button>
          
          {/* Add to Group button, group label, or selection checkbox */}
          {selectionMode ? (
            <input
              type="checkbox"
              checked={selectedElements.has(`group-${originalColor}`) || elementGroups[`group-${originalColor}`] === selectionMode}
              onChange={(e) => {
                const elementId = `group-${originalColor}`;
                
                if (e.target.checked) {
                  // Add to selection
                  setSelectedElements(prev => {
                    const newSet = new Set(prev);
                    newSet.add(elementId);
                    // If this is a gradient group, also auto-select all its individual stops
                    if (isGradient && gradientGroup && gradientGroup.stops) {
                      gradientGroup.stops.forEach(stop => {
                        newSet.add(`stop-${stop.id}`);
                      });
                    }
                    // If this is a solid color group, also auto-select all its individual slots
                    if (!isGradient && solidColorGroups[originalColor]) {
                      solidColorGroups[originalColor].forEach(slot => {
                        newSet.add(`slot-${slot.id}`);
                      });
                    }
                    return newSet;
                  });
                } else {
                  // Remove from selection AND from current group if already assigned
                  setSelectedElements(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(elementId);
                    // If this is a gradient group, also auto-unselect all its individual stops
                    if (isGradient && gradientGroup && gradientGroup.stops) {
                      gradientGroup.stops.forEach(stop => {
                        newSet.delete(`stop-${stop.id}`);
                      });
                    }
                    // If this is a solid color group, also auto-unselect all its individual slots
                    if (!isGradient && solidColorGroups[originalColor]) {
                      solidColorGroups[originalColor].forEach(slot => {
                        newSet.delete(`slot-${slot.id}`);
                      });
                    }
                    return newSet;
                  });
                  
                  // If this element was already assigned to the current group, remove it
                  if (elementGroups[elementId] === selectionMode) {
                    setElementGroups(prev => {
                      const newElementGroups = { ...prev };
                      delete newElementGroups[elementId];
                      
                      // Also remove all child elements from the group
                      if (isGradient && gradientGroup && gradientGroup.stops) {
                        gradientGroup.stops.forEach(stop => {
                          delete newElementGroups[`stop-${stop.id}`];
                        });
                      }
                      if (!isGradient && solidColorGroups[originalColor]) {
                        solidColorGroups[originalColor].forEach(slot => {
                          delete newElementGroups[`slot-${slot.id}`];
                        });
                      }
                      
                      return newElementGroups;
                    });
                  }
                }
              }}
              style={{
                width: '14px',
                height: '14px',
                margin: '5px',
                cursor: 'pointer'
              }}
            />
          ) : (console.log('Checking elementGroups for:', `group-${originalColor}`, 'Current assignment:', elementGroups[`group-${originalColor}`], 'All elementGroups:', elementGroups), elementGroups[`group-${originalColor}`]) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                fontSize: '11px',
                background: '#e3f2fd',
                color: '#1976d2',
                padding: '2px 6px',
                borderRadius: '3px',
                border: '1px solid #bbdefb',
                fontWeight: '500'
              }}>
                {groups[elementGroups[`group-${originalColor}`]]?.name || 'Unknown Group'}
              </span>
              <button 
                type="button" 
                onClick={() => {
                  // Remove from current group
                  setElementGroups(prev => {
                    const newElementGroups = { ...prev };
                    delete newElementGroups[`group-${originalColor}`];
                    
                    // Also remove all individual slots of this color from the group
                    const solidSlots = solidColorGroups[originalColor] || [];
                    solidSlots.forEach(slot => {
                      delete newElementGroups[`slot-${slot.id}`];
                    });
                    
                    return newElementGroups;
                  });
                }} 
                style={{ 
                  fontSize: '12px', 
                  padding: '2px 4px',
                  background: 'transparent',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  width: '20px',
                  height: '20px',
                  color: '#666'
                }}
                title="Remove from group"
              >
                ×
              </button>
            </div>
          ) : Object.keys(groups).length > 0 ? (
            <select
              defaultValue=""
              onChange={(e) => {
                console.log('Dropdown changed:', { 
                  selectedValue: e.target.value,
                  selectedIndex: e.target.selectedIndex,
                  optionText: e.target.options[e.target.selectedIndex]?.text 
                });
                if (e.target.value) {
                  setElementGroups(prev => {
                    const newGroups = {
                      ...prev,
                      [`group-${originalColor}`]: e.target.value
                    };
                    console.log('Assigning element to group:', {
                      elementId: `group-${originalColor}`,
                      groupId: e.target.value,
                      newGroups
                    });
                    return newGroups;
                  });
                }
              }}
              style={{
                fontSize: '9px',
                padding: '2px 2px',
                background: 'transparent',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                width: '52px',
                height: '24px',
                color: '#666'
              }}
              title="Add to group"
            >
              <option value="" disabled style={{ display: 'none' }}>Select</option>
              {Object.entries(groups).map(([groupId, group]) => (
                <option key={groupId} value={groupId}>{group.name}</option>
              ))}
            </select>
          ) : null}
          
          {/* Spacer to push content to right */}
          <div style={{ flex: 1 }} />
          
          {/* Original hex value or gradient info */}
          <span style={{ 
            fontSize: '12px', 
            fontFamily: 'monospace',
            color: '#6c757d',
            minWidth: '60px'
          }}>
            {isGradient ? `${slots.length} stop${slots.length !== 1 ? 's' : ''}` : (isUnspecifiedGroup ? '#000000' : currentHex)}
          </span>
          
          {/* Element count (only show if > 1) */}
          {elementCount > 1 && (
            <span style={{ 
              fontSize: '12px',
              color: '#6c757d',
              minWidth: '20px'
            }}>
              ({elementCount})
            </span>
          )}
          
          {/* Original color/gradient preview */}
          <span 
            title={isUnspecifiedGroup ? 'unspecified' : 
                   originalColor === 'none' ? 'none' : 
                   originalColor === 'transparent' ? 'transparent' : 
                   isGradient ? 'original gradient' : originalColor}
            style={{
              display: 'inline-block',
              width: '20px',
              height: '20px',
              background: isGradient ? 
                (gradientGroup && gradientGroup.gradientId && originalGradientDefinitions[gradientGroup.gradientId] ? 
                  createGradientPreview(gradientGroup.gradientId, originalGradientDefinitions) : '#cccccc') :
                (isUnspecifiedGroup ? '#000000' : (originalColor === 'none' || originalColor === 'transparent') ? '#f8f9fa' : groupDisplayColor),
              border: '1px solid #ccc',
              borderRadius: '3px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
              color: isUnspecifiedGroup ? '#ffffff' : '#666',
              cursor: 'default'
            }}>
            {!isGradient && (isUnspecifiedGroup ? 'U' : 
             originalColor === 'none' ? 'N' : 
             originalColor === 'transparent' ? 'T' : '')}
          </span>
          
          {/* Relink button for unlinked gradients */}
          {isUnlinkedGradient && (
            <button
              type="button"
              onClick={() => {
                // Update the element to use the parent gradient again
                const updatedElementColorMap = { ...elementColorMap };
                const element = gradientGroup.elements[0]; // Unlinked gradients only have one element
                
                if (updatedElementColorMap[element.elementPath] && 
                    updatedElementColorMap[element.elementPath][element.colorType]) {
                  updatedElementColorMap[element.elementPath][element.colorType] = {
                    ...updatedElementColorMap[element.elementPath][element.colorType],
                    gradientId: parentGradientId,
                    current: `url(#${parentGradientId})`
                  };
                }
                
                // Optional: Remove the cloned gradient definition to clean up
                const updatedGradientDefinitions = { ...gradientDefinitions };
                delete updatedGradientDefinitions[gradientGroup.gradientId];
                
                // Call onColorChange with updated maps
                onColorChange(updatedElementColorMap, updatedGradientDefinitions);
              }}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              title={`Relink to ${parentGradientId}`}
            >
              Link
            </button>
          )}
        </div>
        
        {isExpanded && canExpand && (
          <div className="color-group-items" style={{ paddingLeft: '30px', marginTop: '10px' }}>
            {isGradient ? (
              // Gradient-specific sections
              <div>
                
                {/* Unlink Elements Section */}
                {gradientGroup && gradientGroup.elements.length > 1 && (
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <button 
                        type="button"
                        onClick={() => toggleGradientSection(gradientGroup.gradientId, 'unlink')}
                        style={{
                          background: '#f0f0f0',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '2px 8px',
                          minWidth: '30px',
                          lineHeight: '1',
                          color: '#4f46e5'
                        }}
                        title={expandedGradientSections[`${gradientGroup.gradientId}-unlink`] ? 'Collapse' : 'Expand'}
                      >
                        {expandedGradientSections[`${gradientGroup.gradientId}-unlink`] ? '▼' : '▶'}
                      </button>
                      <h5 style={{ margin: 0, color: '#495057' }}>Unlink Elements</h5>
                    </div>
                    
                    {expandedGradientSections[`${gradientGroup.gradientId}-unlink`] && (
                      <div style={{ paddingLeft: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                        <p style={{ fontSize: '0.9em', color: '#666', margin: '0 0 10px 0' }}>
                          Unlink an element to edit its gradient independently
                        </p>
                        {gradientGroup.elements.map(element => (
                          <div key={element.slotId} style={{ marginBottom: '5px' }}>
                            <span style={{ marginRight: '10px' }}>{element.label}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const originalGradientId = gradientGroup.gradientId;
                                const newGradientId = `${originalGradientId}-${element.elementPath.replace(/[^\w]/g, '_')}`;
                                
                                const updatedGradientDefinitions = { ...gradientDefinitions };
                                if (gradientDefinitions[originalGradientId]) {
                                  updatedGradientDefinitions[newGradientId] = {
                                    ...gradientDefinitions[originalGradientId],
                                    stops: gradientDefinitions[originalGradientId].stops.map(stop => ({ ...stop }))
                                  };
                                }
                                
                                const updatedElementColorMap = { ...elementColorMap };
                                if (updatedElementColorMap[element.elementPath] && 
                                    updatedElementColorMap[element.elementPath][element.colorType]) {
                                  updatedElementColorMap[element.elementPath][element.colorType] = {
                                    ...updatedElementColorMap[element.elementPath][element.colorType],
                                    gradientId: newGradientId,
                                    current: `url(#${newGradientId})`
                                  };
                                }
                                
                                onColorChange(updatedElementColorMap, updatedGradientDefinitions);
                              }}
                              style={{
                                fontSize: '12px',
                                padding: '2px 8px',
                                background: '#4f46e5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              Unlink
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Edit Gradient Stops Section */}
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <h5 style={{ margin: 0, color: '#495057' }}>Edit Gradient Stops</h5>
                  </div>
                  
                  <div style={{ paddingLeft: '20px' }}>
                    {slots.map((slot) => {
                        const { hex: slotHex, alpha: slotAlpha } = parseColorString(slot.currentColor);
                        return (
                          <div key={slot.id} style={{ marginBottom: '8px' }}>
                            {/* Individual stop compact layout */}
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              padding: '4px 0'
                            }}>
                              {/* Label */}
                              <span style={{ 
                                fontWeight: 'normal', 
                                fontSize: '12px',
                                minWidth: '80px',
                                color: '#495057'
                              }}>
                                {slot.label}
                                {slot.isGradientStop && (
                                  <span style={{ fontSize: '10px', color: '#999', display: 'block' }}>
                                    @{slot.stopOffset}
                                  </span>
                                )}
                              </span>
                              
                              {/* Color picker */}
                              <input 
                                type="color" 
                                value={slotHex}
                                onChange={(e) => {
                                  const newColor = formatHexWithAlpha(e.target.value, slotAlpha);
                                  
                                  if (slot.isGradientStop) {
                                    const updatedGradientDefinitions = { ...gradientDefinitions };
                                    if (updatedGradientDefinitions[slot.gradientId]) {
                                      updatedGradientDefinitions[slot.gradientId] = {
                                        ...updatedGradientDefinitions[slot.gradientId],
                                        stops: updatedGradientDefinitions[slot.gradientId].stops.map((stop, idx) =>
                                          idx === slot.stopIndex ? { ...stop, color: newColor } : stop
                                        )
                                      };
                                    }
                                    onColorChange(elementColorMap, updatedGradientDefinitions);
                                  }
                                }}
                                style={{ 
                                  width: '28px', 
                                  height: '20px',
                                  appearance: 'auto',
                                  WebkitAppearance: 'auto',
                                  padding: '0',
                                  border: 'none'
                                }}
                              />
                              
                              {/* Horizontal transparency slider */}
                              <input 
                                type="range" 
                                min="0" max="1" step="0.01" 
                                value={slotAlpha}
                                onChange={(e) => {
                                  const newColor = formatHexWithAlpha(slotHex, parseFloat(e.target.value));
                                  
                                  if (slot.isGradientStop) {
                                    const updatedGradientDefinitions = { ...gradientDefinitions };
                                    if (updatedGradientDefinitions[slot.gradientId]) {
                                      updatedGradientDefinitions[slot.gradientId] = {
                                        ...updatedGradientDefinitions[slot.gradientId],
                                        stops: updatedGradientDefinitions[slot.gradientId].stops.map((stop, idx) =>
                                          idx === slot.stopIndex ? { ...stop, color: newColor } : stop
                                        )
                                      };
                                    }
                                    onColorChange(elementColorMap, updatedGradientDefinitions);
                                  }
                                }}
                                className="transparency-slider"
                                style={{ 
                                  width: '60px',
                                  height: '4px',
                                  appearance: 'none',
                                  WebkitAppearance: 'none',
                                  background: 'linear-gradient(to right, transparent, #000)',
                                  borderRadius: '2px',
                                  outline: 'none',
                                  border: 'none',
                                  padding: '0',
                                  margin: '0'
                                }}
                              />
                              
                              {/* Reset button with icon */}
                              <button 
                                type="button" 
                                onClick={() => {
                                  if (slot.isGradientStop) {
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
                                    onColorChange(elementColorMap, updatedGradientDefinitions);
                                  }
                                }} 
                                style={{ 
                                  fontSize: '12px', 
                                  padding: '2px 6px',
                                  background: 'transparent',
                                  border: '1px solid #ccc',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  width: '20px',
                                  height: '20px',
                                  color: '#666'
                                }}
                                title="Reset to original"
                              >
                                ↻
                              </button>
                              
                              {/* Add to Group button, group label, or selection checkbox for individual gradient stop */}
                              {selectionMode ? (
                                <input
                                  type="checkbox"
                                  checked={selectedElements.has(`stop-${slot.id}`) || elementGroups[`stop-${slot.id}`] === selectionMode}
                                  onChange={(e) => {
                                    const elementId = `stop-${slot.id}`;
                                    
                                    if (e.target.checked) {
                                      // Add to selection
                                      setSelectedElements(prev => {
                                        const newSet = new Set(prev);
                                        newSet.add(elementId);
                                        return newSet;
                                      });
                                    } else {
                                      // Remove from selection
                                      setSelectedElements(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(elementId);
                                        // If unchecking this gradient stop, also uncheck the parent gradient group
                                        if (slot.gradientId) {
                                          // Find the gradient group that contains this stop
                                          Object.keys(gradientGroups).forEach(originalColor => {
                                            const gradientGroup = gradientGroups[originalColor];
                                            if (gradientGroup.gradientId === slot.gradientId) {
                                              const parentGroupId = `group-${originalColor}`;
                                              newSet.delete(parentGroupId);
                                            }
                                          });
                                        }
                                        return newSet;
                                      });
                                      
                                      // If this element was already assigned to the current group, remove it
                                      if (elementGroups[elementId] === selectionMode) {
                                        setElementGroups(prev => {
                                          const newElementGroups = { ...prev };
                                          delete newElementGroups[elementId];
                                          return newElementGroups;
                                        });
                                      }
                                    }
                                  }}
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    margin: '4px',
                                    cursor: 'pointer'
                                  }}
                                />
                              ) : elementGroups[`stop-${slot.id}`] ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  <span style={{
                                    fontSize: '10px',
                                    background: '#e3f2fd',
                                    color: '#1976d2',
                                    padding: '1px 4px',
                                    borderRadius: '2px',
                                    border: '1px solid #bbdefb',
                                    fontWeight: '500'
                                  }}>
                                    {groups[elementGroups[`stop-${slot.id}`]]?.name || 'Unknown'}
                                  </span>
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      // Remove from current group
                                      setElementGroups(prev => {
                                        const newElementGroups = { ...prev };
                                        const currentGroupId = elementGroups[`stop-${slot.id}`];
                                        delete newElementGroups[`stop-${slot.id}`];
                                        
                                        // Also remove the parent gradient group if it was in the same group
                                        if (slot.gradientId && currentGroupId) {
                                          // Find the gradient group that contains this stop
                                          Object.keys(gradientGroups).forEach(originalColor => {
                                            const gradientGroup = gradientGroups[originalColor];
                                            if (gradientGroup.gradientId === slot.gradientId) {
                                              const parentGroupId = `group-${originalColor}`;
                                              if (newElementGroups[parentGroupId] === currentGroupId) {
                                                delete newElementGroups[parentGroupId];
                                              }
                                            }
                                          });
                                        }
                                        
                                        return newElementGroups;
                                      });
                                    }} 
                                    style={{ 
                                      fontSize: '10px', 
                                      padding: '1px 3px',
                                      background: 'transparent',
                                      border: '1px solid #ccc',
                                      borderRadius: '2px',
                                      cursor: 'pointer',
                                      width: '16px',
                                      height: '16px',
                                      color: '#666'
                                    }}
                                    title="Remove from group"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : Object.keys(groups).length > 0 ? (
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setElementGroups(prev => ({
                                        ...prev,
                                        [`stop-${slot.id}`]: e.target.value
                                      }));
                                    }
                                  }}
                                  style={{
                                    fontSize: '8px',
                                    padding: '1px 1px',
                                    background: 'transparent',
                                    border: '1px solid #ccc',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    width: '42px',
                                    height: '20px',
                                    color: '#666'
                                  }}
                                  title="Add to group"
                                >
                                  <option value="" disabled style={{ display: 'none' }}>Select</option>
                                  {Object.entries(groups).map(([groupId, group]) => (
                                    <option key={groupId} value={groupId}>{group.name}</option>
                                  ))}
                                </select>
                              ) : null}
                              
                              {/* Current hex value */}
                              <span style={{ 
                                fontSize: '11px', 
                                fontFamily: 'monospace',
                                color: '#6c757d',
                                minWidth: '60px'
                              }}>
                                {slot.currentColor}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                </div>
              </div>
            ) : (
              // Solid color controls with compact layout
              slots.map((slot, index) => {
                const { hex: slotHex, alpha: slotAlpha } = parseColorString(slot.currentColor);
                return (
                  <div key={slot.id} style={{ marginBottom: '8px' }}>
                    {/* Individual slot compact layout */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      padding: '4px 0'
                    }}>
                      {/* Numbered label */}
                      <span style={{ 
                        fontWeight: 'normal', 
                        fontSize: '12px',
                        minWidth: '20px',
                        color: '#495057'
                      }}>
                        {index + 1}.
                      </span>
                      
                      {/* Color picker */}
                      <input 
                        type="color" 
                        value={slotHex}
                        onChange={(e) => {
                          const newColor = formatHexWithAlpha(e.target.value, slotAlpha);
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
                        style={{ 
                          width: '28px', 
                          height: '20px',
                          appearance: 'auto',
                          WebkitAppearance: 'auto',
                          padding: '0',
                          border: 'none'
                        }}
                      />
                      
                      {/* Horizontal transparency slider */}
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
                        className="transparency-slider"
                        style={{ 
                          width: '60px',
                          height: '4px',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          background: 'linear-gradient(to right, transparent, #000)',
                          borderRadius: '2px',
                          outline: 'none',
                          border: 'none',
                          padding: '0',
                          margin: '0'
                        }}
                      />
                      
                      {/* Reset button with icon */}
                      <button 
                        type="button" 
                        onClick={() => {
                          const updatedElementColorMap = { ...elementColorMap };
                          if (!updatedElementColorMap[slot.elementPath]) {
                            updatedElementColorMap[slot.elementPath] = {};
                          }
                          updatedElementColorMap[slot.elementPath][slot.colorType] = {
                            original: slot.originalColor,
                            current: slot.originalColor
                          };
                          onColorChange(updatedElementColorMap);
                        }} 
                        style={{ 
                          fontSize: '12px', 
                          padding: '2px 6px',
                          background: 'transparent',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          width: '20px',
                          height: '20px',
                          color: '#666'
                        }}
                        title="Reset to original"
                      >
                        ↻
                      </button>
                      
                      {/* Add to Group button, group label, or selection checkbox for individual slot */}
                      {selectionMode ? (
                        <input
                          type="checkbox"
                          checked={selectedElements.has(`slot-${slot.id}`) || elementGroups[`slot-${slot.id}`] === selectionMode}
                          onChange={(e) => {
                            const elementId = `slot-${slot.id}`;
                            
                            if (e.target.checked) {
                              // Add to selection
                              setSelectedElements(prev => {
                                const newSet = new Set(prev);
                                newSet.add(elementId);
                                return newSet;
                              });
                            } else {
                              // Remove from selection
                              setSelectedElements(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(elementId);
                                // If unchecking this slot, also uncheck the parent group
                                const parentGroupId = `group-${slot.originalColor}`;
                                newSet.delete(parentGroupId);
                                return newSet;
                              });
                              
                              // If this element was already assigned to the current group, remove it
                              if (elementGroups[elementId] === selectionMode) {
                                setElementGroups(prev => {
                                  const newElementGroups = { ...prev };
                                  delete newElementGroups[elementId];
                                  return newElementGroups;
                                });
                              }
                            }
                          }}
                          style={{
                            width: '12px',
                            height: '12px',
                            margin: '4px',
                            cursor: 'pointer'
                          }}
                        />
                      ) : elementGroups[`slot-${slot.id}`] ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <span style={{
                            fontSize: '10px',
                            background: '#e3f2fd',
                            color: '#1976d2',
                            padding: '1px 4px',
                            borderRadius: '2px',
                            border: '1px solid #bbdefb',
                            fontWeight: '500'
                          }}>
                            {groups[elementGroups[`slot-${slot.id}`]]?.name || 'Unknown'}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => {
                              // Remove from current group
                              setElementGroups(prev => {
                                const newElementGroups = { ...prev };
                                delete newElementGroups[`slot-${slot.id}`];
                                // Also remove the parent solid color group if it was in the same group
                                const parentGroupId = `group-${slot.originalColor}`;
                                if (newElementGroups[parentGroupId] === elementGroups[`slot-${slot.id}`]) {
                                  delete newElementGroups[parentGroupId];
                                }
                                return newElementGroups;
                              });
                            }} 
                            style={{ 
                              fontSize: '10px', 
                              padding: '1px 3px',
                              background: 'transparent',
                              border: '1px solid #ccc',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              width: '16px',
                              height: '16px',
                              color: '#666'
                            }}
                            title="Remove from group"
                          >
                            ×
                          </button>
                        </div>
                      ) : Object.keys(groups).length > 0 ? (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setElementGroups(prev => ({
                                ...prev,
                                [`slot-${slot.id}`]: e.target.value
                              }));
                            }
                          }}
                          style={{
                            fontSize: '8px',
                            padding: '1px 1px',
                            background: 'transparent',
                            border: '1px solid #ccc',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            width: '42px',
                            height: '20px',
                            color: '#666'
                          }}
                          title="Add to group"
                        >
                          <option value="" disabled style={{ display: 'none' }}>Select</option>
                          {Object.entries(groups).map(([groupId, group]) => (
                            <option key={groupId} value={groupId}>{group.name}</option>
                          ))}
                        </select>
                      ) : null}
                      
                      {/* Current hex value */}
                      <span style={{ 
                        fontSize: '11px', 
                        fontFamily: 'monospace',
                        color: '#6c757d',
                        minWidth: '60px'
                      }}>
                        {slot.currentColor}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="control-section" style={{ marginTop: '20px' }}>
      <h3>{title}</h3>
      
      {/* Reset All to Original button */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => {
            // Reset global adjustments state
            setGlobalAdjustments({ hue: 0, saturation: 0, lightness: 0, alpha: 0 });
            
            // Reset gradient adjustments state
            setGradientAdjustments({});
            
            // Reset all solid colors to original
            const updatedElementColorMap = { ...elementColorMap };
            Object.keys(updatedElementColorMap).forEach(path => {
              const element = updatedElementColorMap[path];
              if (element.fill) {
                if (element.fill.isGradient && element.fill.gradientId) {
                  // For gradients, preserve the URL reference
                  element.fill.current = `url(#${element.fill.gradientId})`;
                } else if (element.fill.original === 'UNSPECIFIED') {
                  // Handle UNSPECIFIED colors - they should default to black
                  element.fill.current = '#000000FF';
                } else {
                  // Regular solid colors
                  element.fill.current = element.fill.original;
                }
              }
              if (element.stroke) {
                if (element.stroke.isGradient && element.stroke.gradientId) {
                  // For gradients, preserve the URL reference
                  element.stroke.current = `url(#${element.stroke.gradientId})`;
                } else if (element.stroke.original === 'UNSPECIFIED') {
                  // Handle UNSPECIFIED colors - they should default to black
                  element.stroke.current = '#000000FF';
                } else {
                  // Regular solid colors
                  element.stroke.current = element.stroke.original;
                }
              }
            });
            
            // Reset all gradient stops to original
            const updatedGradientDefinitions = { ...gradientDefinitions };
            Object.keys(updatedGradientDefinitions).forEach(gradientId => {
              const gradient = updatedGradientDefinitions[gradientId];
              const originalGradient = originalGradientDefinitions[gradientId];
              if (gradient && originalGradient) {
                gradient.stops = gradient.stops.map((stop, index) => {
                  const originalStop = originalGradient.stops[index];
                  return { ...stop, color: originalStop?.color || stop.color };
                });
              }
            });
            
            onColorChange(updatedElementColorMap, updatedGradientDefinitions);
          }}
          style={{
            fontSize: '12px',
            padding: '6px 16px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Reset All to Original
        </button>
      </div>
      
      {/* Global Adjustments Section */}
      <div className="global-adjustments" style={{ marginBottom: '20px', padding: '12px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h4 style={{ margin: '0', color: '#495057', fontSize: '1em' }}>Global Adjustments</h4>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', alignItems: 'center' }}>
          {/* Hue Control */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.85em', fontWeight: '500', color: '#495057' }}>
                Hue: {globalAdjustments.hue}°
              </label>
              <button
                type="button"
                onClick={() => {
                  // Only reset hue (no clamping issues with hue)
                  const deltaHue = 0 - globalAdjustments.hue;
                  
                  // Update state to reset only hue
                  setGlobalAdjustments(prev => ({ ...prev, hue: 0 }));
                  
                  // Apply the hue reset delta
                  const updatedElementColorMap = { ...elementColorMap };
                  Object.keys(updatedElementColorMap).forEach(path => {
                    const element = updatedElementColorMap[path];
                    if (element.fill && !element.fill.isGradient) {
                      const adjustedColor = adjustColorHsl(element.fill.current, deltaHue, 0, 0);
                      element.fill.current = adjustedColor;
                    }
                    if (element.stroke && !element.stroke.isGradient) {
                      const adjustedColor = adjustColorHsl(element.stroke.current, deltaHue, 0, 0);
                      element.stroke.current = adjustedColor;
                    }
                  });
                  
                  const updatedGradientDefinitions = { ...gradientDefinitions };
                  Object.keys(updatedGradientDefinitions).forEach(gradientId => {
                    const gradient = updatedGradientDefinitions[gradientId];
                    if (gradient) {
                      gradient.stops = gradient.stops.map((stop) => {
                        const adjustedColor = adjustColorHsl(stop.color, deltaHue, 0, 0);
                        return { ...stop, color: adjustedColor };
                      });
                    }
                  });
                  
                  onColorChange(updatedElementColorMap, updatedGradientDefinitions);
                }}
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  background: 'transparent',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  color: '#666'
                }}
                title="Reset hue"
              >
                ↻
              </button>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={globalAdjustments.hue}
              onChange={(e) => handleGlobalAdjustment('hue', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          
          {/* Saturation Control */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85em', fontWeight: '500', color: '#495057' }}>
              Saturation: {globalAdjustments.saturation > 0 ? '+' : ''}{globalAdjustments.saturation}%
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={globalAdjustments.saturation}
              onChange={(e) => handleGlobalAdjustment('saturation', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          
          {/* Lightness Control */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85em', fontWeight: '500', color: '#495057' }}>
              Lightness: {globalAdjustments.lightness > 0 ? '+' : ''}{globalAdjustments.lightness}%
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={globalAdjustments.lightness}
              onChange={(e) => handleGlobalAdjustment('lightness', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          
          {/* Alpha Control */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85em', fontWeight: '500', color: '#495057' }}>
              Alpha: {globalAdjustments.alpha > 0 ? '+' : ''}{globalAdjustments.alpha}%
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={globalAdjustments.alpha}
              onChange={(e) => handleGlobalAdjustment('alpha', e.target.value)}
              className="transparency-slider"
              style={{ 
                width: '100%',
                height: '4px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: 'linear-gradient(to right, transparent, #000)',
                borderRadius: '4px',
                outline: 'none',
                border: 'none',
                padding: '4px',
                margin: '5px 0'
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Group Adjustments Section */}
      <div className="group-adjustments" style={{ marginBottom: '20px', padding: '12px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h4 style={{ margin: '0', color: '#495057', fontSize: '1em' }}>Group Adjustments</h4>
          <button
            type="button"
            onClick={() => {
              createNewGroup();
            }}
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            + Create Group
          </button>
        </div>
        
        
        {/* Group adjustment panels will be rendered here */}
        {Object.entries(groups).map(([groupId, group]) => {
          const adjustments = groupAdjustments[groupId] || { hue: 0, saturation: 0, lightness: 0, alpha: 0 };
          
          return (
            <div key={groupId} style={{ marginTop: '15px', padding: '10px', background: '#ffffff', borderRadius: '4px', border: '1px solid #dee2e6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h5 style={{ margin: '0', color: '#495057' }}>{group.name} Adjustments</h5>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectionMode === groupId) {
                        // Finish selecting - assign selected elements to this group (single membership)
                        setElementGroups(prev => {
                          const newElementGroups = { ...prev };
                          selectedElements.forEach(elementId => {
                            newElementGroups[elementId] = groupId;
                          });
                          return newElementGroups;
                        });
                        // Exit selection mode
                        setSelectionMode(null);
                        setSelectedElements(new Set());
                      } else {
                        // Enter selection mode for this group
                        setSelectionMode(groupId);
                        setSelectedElements(new Set());
                      }
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '3px 6px',
                      background: selectionMode === groupId ? '#dc3545' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    {selectionMode === groupId ? 'Finish Selecting' : 'Select Elements'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Delete group
                      setGroups(prev => {
                        const newGroups = { ...prev };
                        delete newGroups[groupId];
                        return newGroups;
                      });
                      setGroupAdjustments(prev => {
                        const newAdjustments = { ...prev };
                        delete newAdjustments[groupId];
                        return newAdjustments;
                      });
                      // Remove elements from this group
                      setElementGroups(prev => {
                        const newElementGroups = { ...prev };
                        Object.keys(newElementGroups).forEach(elementId => {
                          if (newElementGroups[elementId] === groupId) {
                            delete newElementGroups[elementId];
                          }
                        });
                        return newElementGroups;
                      });
                      if (selectionMode === groupId) {
                        setSelectionMode(null);
                        setSelectedElements(new Set());
                      }
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '3px 6px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {/* Group adjustment sliders */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
                {/* Hue Control */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85em', fontWeight: '500', color: '#495057' }}>
                    Hue: {adjustments.hue}°
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={adjustments.hue}
                    onChange={(e) => {
                      const newHue = parseInt(e.target.value);
                      handleGroupAdjustment(groupId, 'hue', newHue);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
                
                {/* Saturation Control */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85em', fontWeight: '500', color: '#495057' }}>
                    Saturation: {adjustments.saturation > 0 ? '+' : ''}{adjustments.saturation}%
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={adjustments.saturation}
                    onChange={(e) => {
                      const newSaturation = parseInt(e.target.value);
                      handleGroupAdjustment(groupId, 'saturation', newSaturation);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
                
                {/* Lightness Control */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85em', fontWeight: '500', color: '#495057' }}>
                    Lightness: {adjustments.lightness > 0 ? '+' : ''}{adjustments.lightness}%
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={adjustments.lightness}
                    onChange={(e) => {
                      const newLightness = parseInt(e.target.value);
                      handleGroupAdjustment(groupId, 'lightness', newLightness);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
                
                {/* Alpha Control */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85em', fontWeight: '500', color: '#495057' }}>
                    Alpha: {adjustments.alpha > 0 ? '+' : ''}{adjustments.alpha}%
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={adjustments.alpha}
                    onChange={(e) => {
                      const newAlpha = parseInt(e.target.value);
                      handleGroupAdjustment(groupId, 'alpha', newAlpha);
                    }}
                    className="transparency-slider"
                    style={{ 
                      width: '100%',
                      height: '4px',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      background: 'linear-gradient(to right, transparent, #000)',
                      borderRadius: '4px',
                      outline: 'none',
                      border: 'none',
                      padding: '4px',
                      margin: '5px 0'
                    }}
                  />
                </div>
              </div>
              
              {/* Reset button */}
              <button
                type="button"
                onClick={() => {
                  resetGroup(groupId);
                }}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Reset Group
              </button>
            </div>
          );
        })}
      </div>
      
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
          {Object.entries(gradientGroups).map(([originalColor, gradientGroup]) => 
            renderColorGroup(originalColor, gradientGroup.stops, true, gradientGroup)
          )}
        </div>
      )}
      
      {/* Show message if no colors detected */}
      {Object.keys(solidColorGroups).length === 0 && Object.keys(gradientGroups).length === 0 && (
        <div className="svg-color-controls">
          <p>No customizable colors detected in this SVG.</p>
        </div>
      )}
      
      {/* Custom CSS for transparency sliders */}
      <style jsx>{`
        .transparency-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 3px;
          height: 16px;
          background: #333;
          cursor: pointer;
          border-radius: 1px;
          border: 1px solid #fff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        .transparency-slider::-moz-range-thumb {
          width: 3px;
          height: 16px;
          background: #333;
          cursor: pointer;
          border-radius: 1px;
          border: 1px solid #fff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
          border: none;
        }
      `}</style>
    </div>
  );
};

export default SvgColorCustomization;