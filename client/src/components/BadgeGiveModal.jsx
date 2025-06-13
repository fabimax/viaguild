import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BadgeDisplay from './guilds/BadgeDisplay';
import badgeService from '../services/badgeService';
import userService from '../services/userService';
import { applySvgColorTransform, isSvgContent } from '../utils/svgColorTransform';
import { 
  createSimpleColorConfig,
  createHostedAssetConfig,
  createElementPathConfig 
} from '../utils/colorConfig';
import '../styles/badge-give-modal.css';

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

const BadgeGiveModal = ({ isOpen, onClose, template, onSuccess }) => {
  const { currentUser, token } = useAuth();
  
  const [step, setStep] = useState(1); // 1: Search recipient, 2: Customize badge, 3: Confirm
  const [recipientSearch, setRecipientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const [svgExpandedGroups, setSvgExpandedGroups] = useState({}); // For SVG color group expand/collapse
  
  // Customization fields
  const [customizations, setCustomizations] = useState({
    overrideBadgeName: '',
    overrideSubtitle: '',
    overrideDisplayDescription: '',
    message: '',
    measureValue: null,
    // Legacy visual overrides
    overrideOuterShape: '',
    overrideBorderColor: '',
    overrideBackgroundType: '',
    overrideBackgroundValue: '',
    overrideForegroundType: '',
    overrideForegroundValue: '',
    overrideForegroundColor: '',
    overrideForegroundColorConfig: null,
    // New unified config overrides
    overrideBorderConfig: null,
    overrideBackgroundConfig: null,
    overrideForegroundConfig: null,
    // Metadata values
    metadataValues: {}
  });
  
  const [allocations, setAllocations] = useState(null);
  const [giving, setGiving] = useState(false);
  const [error, setError] = useState('');
  
  // Live preview state
  const [previewSvgContent, setPreviewSvgContent] = useState(null);
  const [svgFetched, setSvgFetched] = useState(false);
  const [transformedSvgContent, setTransformedSvgContent] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);

  // Load allocations when modal opens
  useEffect(() => {
    if (isOpen && currentUser) {
      loadAllocations();
    }
  }, [isOpen, currentUser]);

  // Fetch SVG content for preview when modal opens
  useEffect(() => {
    if (isOpen && template) {
      console.log('BadgeGiveModal: Full template structure:', template);
      console.log('BadgeGiveModal: Template opened:', {
        foregroundType: template.defaultForegroundType,
        foregroundValue: template.defaultForegroundValue?.substring(0, 100) + '...',
        hasColorConfig: !!template.defaultForegroundColorConfig,
        colorConfigKeys: template.defaultForegroundColorConfig ? Object.keys(template.defaultForegroundColorConfig.mappings || {}) : []
      });
      
      // Check if template has SVG content directly (some implementations might include it)
      if (template.defaultForegroundSvgContent && isSvgContent(template.defaultForegroundSvgContent)) {
        console.log('Found SVG content directly in template!');
        setPreviewSvgContent(template.defaultForegroundSvgContent);
        setSvgFetched(true);
      } else if (template.defaultForegroundType === 'UPLOADED_ICON' && 
          template.defaultForegroundValue && !isSvgContent(template.defaultForegroundValue)) {
        
        console.log('Fetching SVG content through secure proxy:', template.defaultForegroundValue);
        
        // Use our secure backend proxy to fetch SVG content
        fetch(`/api/fetch-svg?url=${encodeURIComponent(template.defaultForegroundValue)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch SVG');
            return response.text();
          })
          .then(svgContent => {
            if (isSvgContent(svgContent)) {
              console.log('SVG content fetched successfully through proxy:', svgContent.substring(0, 100) + '...');
              setPreviewSvgContent(svgContent);
              setSvgFetched(true);
            } else {
              throw new Error('Fetched content is not valid SVG');
            }
          })
          .catch(err => {
            console.error('Error fetching SVG content through proxy:', err);
            setSvgFetched(true); // Mark as attempted
          });
      } else if (template.defaultForegroundType === 'UPLOADED_ICON' && 
                 isSvgContent(template.defaultForegroundValue)) {
        // Direct SVG content
        console.log('Using direct SVG content from template');
        setPreviewSvgContent(template.defaultForegroundValue);
        setSvgFetched(true);
      } else {
        console.log('No SVG content to fetch - not UPLOADED_ICON or no value');
        setPreviewSvgContent(null);
        setSvgFetched(false);
      }
    }
  }, [isOpen, template, token]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setRecipientSearch('');
      setSearchResults([]);
      setSelectedRecipient(null);
      setCustomizations({
        overrideBadgeName: '',
        overrideSubtitle: '',
        overrideDisplayDescription: '',
        message: '',
        measureValue: null,
        overrideOuterShape: '',
        overrideBorderColor: '',
        overrideBackgroundType: '',
        overrideBackgroundValue: '',
        overrideForegroundType: '',
        overrideForegroundValue: '',
        overrideForegroundColor: '',
        overrideForegroundColorConfig: null,
        overrideBorderConfig: null,
        overrideBackgroundConfig: null,
        overrideForegroundConfig: null,
        metadataValues: {}
      });
      setError('');
      setPreviewSvgContent(null);
      setSvgFetched(false);
      setTransformedSvgContent(null);
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
      }
    }
  }, [isOpen, previewBlobUrl]);

  const loadAllocations = async () => {
    try {
      const data = await badgeService.getUserAllocations(currentUser.username);
      setAllocations(data);
    } catch (err) {
      console.error('Error loading allocations:', err);
    }
  };

  const handleSearch = async (query) => {
    setRecipientSearch(query);
    setSearchError('');
    setSelectedSearchIndex(-1);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await userService.searchUsers(query);
      // The API returns { results: [...], counts: {...} }
      const results = response.results || [];
      // Temporarily allow current user for testing
      setSearchResults(results.slice(0, 10)); // Show more results
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Error searching users');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSearchIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSearchIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSearchIndex >= 0 && searchResults[selectedSearchIndex]) {
          selectRecipient(searchResults[selectedSearchIndex]);
        }
        break;
      case 'Escape':
        setSearchResults([]);
        setSelectedSearchIndex(-1);
        break;
    }
  };

  const selectRecipient = (user) => {
    setSelectedRecipient(user);
    setSearchResults([]);
    setRecipientSearch(user.username);
    setStep(2);
  };

  const handleGiveBadge = async () => {
    if (!selectedRecipient) return;

    setGiving(true);
    setError('');

    try {
      // Filter out empty customizations
      const filteredCustomizations = Object.entries(customizations).reduce((acc, [key, value]) => {
        // Special handling for complex objects
        if (key === 'overrideForegroundColorConfig' || key.endsWith('Config')) {
          // Include if it has mappings with actual data or proper config structure
          if (value && ((value.mappings && Object.keys(value.mappings).length > 0) || 
                      (value.type && (value.color || value.url)))) {
            acc[key] = value;
            console.log(`Including ${key}:`, value);
          }
        } else if (key === 'metadataValues') {
          // Include if it has any metadata values
          if (value && Object.keys(value).length > 0) {
            acc[key] = value;
          }
        } else if (value !== '' && value !== null && value !== undefined) {
          // Regular filtering for simple values
          acc[key] = value;
        }
        return acc;
      }, {});

      // Generate new config objects from legacy overrides if they exist
      if (customizations.overrideBorderColor && !filteredCustomizations.overrideBorderConfig) {
        filteredCustomizations.overrideBorderConfig = createSimpleColorConfig(customizations.overrideBorderColor);
      }
      
      if ((customizations.overrideBackgroundType || customizations.overrideBackgroundValue) && 
          !filteredCustomizations.overrideBackgroundConfig) {
        if (customizations.overrideBackgroundType === 'HOSTED_IMAGE') {
          filteredCustomizations.overrideBackgroundConfig = createHostedAssetConfig(
            customizations.overrideBackgroundValue || template.defaultBackgroundValue
          );
        } else {
          filteredCustomizations.overrideBackgroundConfig = createSimpleColorConfig(
            customizations.overrideBackgroundValue || template.defaultBackgroundValue
          );
        }
      }
      
      if (customizations.overrideForegroundColor && !filteredCustomizations.overrideForegroundConfig && 
          !filteredCustomizations.overrideForegroundColorConfig) {
        filteredCustomizations.overrideForegroundConfig = createSimpleColorConfig(customizations.overrideForegroundColor);
      }

      console.log('Sending badge customizations:', filteredCustomizations);

      await badgeService.giveBadge(
        template.id,
        selectedRecipient.username,
        filteredCustomizations
      );

      // Reload allocations if it was a tiered badge
      if (template.inherentTier) {
        await loadAllocations();
      }

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error('Error giving badge:', err);
      setError(err.response?.data?.error || 'Failed to give badge');
    } finally {
      setGiving(false);
    }
  };

  // Real-time SVG transformation (like BadgeIconUpload does)
  useEffect(() => {
    if (previewSvgContent && customizations.overrideForegroundColorConfig) {
      console.log('Transforming SVG with color config:', customizations.overrideForegroundColorConfig);
      
      // Transform the SVG (same as BadgeIconUpload does)
      const transformedSvg = applySvgColorTransform(previewSvgContent, customizations.overrideForegroundColorConfig);
      setTransformedSvgContent(transformedSvg);
      
      // Create blob URL for preview (same as BadgeIconUpload does)
      const blob = new Blob([transformedSvg], { type: 'image/svg+xml' });
      const newBlobUrl = URL.createObjectURL(blob);
      
      // Clean up previous blob URL
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
      
      setPreviewBlobUrl(newBlobUrl);
      console.log('Created transformed SVG blob URL:', newBlobUrl);
    } else if (previewSvgContent) {
      // No color overrides, use original SVG
      setTransformedSvgContent(previewSvgContent);
      
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
      }
    }
  }, [previewSvgContent, customizations.overrideForegroundColorConfig]);

  const getPreviewProps = () => {
    // Use the transformed SVG content (like BadgeTemplateCreatePage does)
    let effectiveForegroundValue = customizations.overrideForegroundValue || template.defaultForegroundValue;
    let effectiveForegroundType = customizations.overrideForegroundType || template.defaultForegroundType;
    
    if (template.defaultForegroundType === 'UPLOADED_ICON' && transformedSvgContent) {
      // Use transformed SVG content as SYSTEM_ICON (same trick as BadgeTemplateCreatePage)
      effectiveForegroundType = 'SYSTEM_ICON';
      effectiveForegroundValue = transformedSvgContent;
      console.log('Using transformed SVG as SYSTEM_ICON for preview');
    }
    
    return {
      name: customizations.overrideBadgeName || template.defaultBadgeName,
      subtitle: customizations.overrideSubtitle || template.defaultSubtitleText,
      description: customizations.overrideDisplayDescription || template.defaultDisplayDescription,
      shape: customizations.overrideOuterShape || template.defaultOuterShape,
      
      // Legacy fields for backward compatibility
      borderColor: customizations.overrideBorderColor || template.defaultBorderColor,
      backgroundType: customizations.overrideBackgroundType || template.defaultBackgroundType,
      backgroundValue: customizations.overrideBackgroundValue || template.defaultBackgroundValue,
      foregroundType: effectiveForegroundType,
      foregroundValue: effectiveForegroundValue,
      foregroundColor: customizations.overrideForegroundColor || template.defaultForegroundColor,
      foregroundColorConfig: customizations.overrideForegroundColorConfig || template.defaultForegroundColorConfig,
      
      // New unified config objects
      borderConfig: customizations.overrideBorderConfig || 
        (customizations.overrideBorderColor ? createSimpleColorConfig(customizations.overrideBorderColor) : 
        (template.defaultBorderConfig || createSimpleColorConfig(template.defaultBorderColor))),
      backgroundConfig: customizations.overrideBackgroundConfig || 
        template.defaultBackgroundConfig || 
        (customizations.overrideBackgroundType === 'HOSTED_IMAGE' 
          ? createHostedAssetConfig(customizations.overrideBackgroundValue || template.defaultBackgroundValue)
          : createSimpleColorConfig(customizations.overrideBackgroundValue || template.defaultBackgroundValue)),
      foregroundConfig: customizations.overrideForegroundConfig || 
        customizations.overrideForegroundColorConfig ||
        template.defaultForegroundConfig ||
        template.defaultForegroundColorConfig ||
        createSimpleColorConfig(customizations.overrideForegroundColor || template.defaultForegroundColor),
      
      tier: template.inherentTier,
      measureValue: customizations.measureValue,
      measureLabel: template.measureLabel
    };
  };

  const checkAllocation = () => {
    if (!template.inherentTier || !allocations) return { hasAllocation: true, remaining: null };
    
    const tierAllocation = allocations.find(a => a.tier === template.inherentTier);
    return {
      hasAllocation: tierAllocation && tierAllocation.remaining > 0,
      remaining: tierAllocation?.remaining || 0
    };
  };

  if (!isOpen) return null;

  const allocation = checkAllocation();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content badge-give-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Give Badge: {template.defaultBadgeName}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-banner">
            <p>{error}</p>
          </div>
        )}

        {template.inherentTier && allocation.remaining !== null && (
          <div className="allocation-warning">
            <span className={`tier-badge ${template.inherentTier.toLowerCase()}`}>
              {template.inherentTier}
            </span>
            <span>
              {allocation.remaining} {allocation.remaining === 1 ? 'allocation' : 'allocations'} remaining
            </span>
          </div>
        )}

        <div className="modal-body">
          {step === 1 && (
            <div className="recipient-search-step">
              <h3>Step 1: Choose Recipient</h3>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={recipientSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="search-input"
                  autoFocus
                />
                {searching && <div className="search-loading">Searching...</div>}
                {searchError && <div className="search-error">{searchError}</div>}
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((user, index) => (
                      <div
                        key={user.id}
                        className={`search-result-item ${index === selectedSearchIndex ? 'selected' : ''}`}
                        onClick={() => selectRecipient(user)}
                        onMouseEnter={() => setSelectedSearchIndex(index)}
                      >
                        {user.avatar && (
                          <img src={user.avatar} alt={user.username} className="user-avatar" />
                        )}
                        <div className="user-info">
                          <div className="username">{user.username}</div>
                          {user.displayName && (
                            <div className="display-name">{user.displayName}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="customization-step">
              <h3>Step 2: Customize Badge (Optional)</h3>
              
              <div className="badge-preview-section">
                <h4>Preview</h4>
                <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
                  Debug: SVG fetched: {svgFetched ? 'Yes' : 'No'}, 
                  Has content: {previewSvgContent ? 'Yes' : 'No'}, 
                  Has transform: {transformedSvgContent ? 'Yes' : 'No'},
                  Has overrides: {customizations.overrideForegroundColorConfig ? 'Yes' : 'No'}
                </div>
                <BadgeDisplay badge={getPreviewProps()} />
              </div>

              <div className="customization-form">
                <div className="form-group">
                  <label>Custom Badge Name</label>
                  <input
                    type="text"
                    placeholder={template.defaultBadgeName}
                    value={customizations.overrideBadgeName}
                    onChange={(e) => setCustomizations(prev => ({
                      ...prev,
                      overrideBadgeName: e.target.value
                    }))}
                  />
                </div>

                <div className="form-group">
                  <label>Custom Subtitle</label>
                  <input
                    type="text"
                    placeholder={template.defaultSubtitleText || 'No subtitle'}
                    value={customizations.overrideSubtitle}
                    onChange={(e) => setCustomizations(prev => ({
                      ...prev,
                      overrideSubtitle: e.target.value
                    }))}
                  />
                </div>

                {template.definesMeasure && (
                  <div className="form-group">
                    <label>{template.measureLabel || 'Measure Value'}</label>
                    <input
                      type="number"
                      placeholder="Enter value..."
                      value={customizations.measureValue || ''}
                      onChange={(e) => setCustomizations(prev => ({
                        ...prev,
                        measureValue: e.target.value ? parseFloat(e.target.value) : null
                      }))}
                      step="any"
                    />
                    {template.measureBest !== null && template.measureWorst !== null && (
                      <div className="measure-range">
                        Range: {template.measureWorst} to {template.measureBest}
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata Fields */}
                {template.metadataFieldDefinitions && template.metadataFieldDefinitions.length > 0 && (
                  <div className="metadata-section">
                    <h4>Additional Information</h4>
                    {template.metadataFieldDefinitions
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map(field => (
                        <div key={field.id} className="form-group">
                          <label>
                            {field.label}
                            {field.prefix && <span className="field-prefix"> ({field.prefix})</span>}
                            {field.suffix && <span className="field-suffix"> {field.suffix})</span>}
                          </label>
                          <input
                            type="text"
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                            value={customizations.metadataValues[field.fieldKeyForInstanceData] || ''}
                            onChange={(e) => setCustomizations(prev => ({
                              ...prev,
                              metadataValues: {
                                ...prev.metadataValues,
                                [field.fieldKeyForInstanceData]: e.target.value
                              }
                            }))}
                          />
                        </div>
                      ))}
                  </div>
                )}

                {/* Advanced Customization Toggle */}
                <div className="advanced-toggle">
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? '▼' : '▶'} Advanced Customization
                  </button>
                </div>

                {/* Advanced Customization Options */}
                {showAdvanced && (
                  <div className="advanced-section">
                    <div className="form-group">
                      <label>Custom Description</label>
                      <textarea
                        placeholder={template.defaultDisplayDescription || 'Badge description...'}
                        value={customizations.overrideDisplayDescription}
                        onChange={(e) => setCustomizations(prev => ({
                          ...prev,
                          overrideDisplayDescription: e.target.value
                        }))}
                        rows={2}
                      />
                    </div>

                    <div className="form-group">
                      <label>Border Color</label>
                      <input
                        type="color"
                        value={customizations.overrideBorderColor || template.defaultBorderColor}
                        onChange={(e) => setCustomizations(prev => ({
                          ...prev,
                          overrideBorderColor: e.target.value,
                          overrideBorderConfig: createSimpleColorConfig(e.target.value)
                        }))}
                      />
                    </div>

                    {/* SVG Color Customization - Using BadgeIconUpload style */}
                    {template.defaultForegroundType === 'UPLOADED_ICON' && 
                     template.defaultForegroundColorConfig && 
                     template.defaultForegroundColorConfig.mappings ? (
                      <div className="svg-color-customization">
                        <label>Icon Colors</label>
                        {(() => {
                          // Convert template mappings to color slots format (like BadgeIconUpload)
                          const colorSlots = [];
                          Object.entries(template.defaultForegroundColorConfig.mappings).forEach(([elementPath, elementColors]) => {
                            if (elementColors.fill) {
                              colorSlots.push({
                                id: `${elementPath}-fill`,
                                label: `${elementPath} (fill)`,
                                originalColor: elementColors.fill.original,
                                currentColor: elementColors.fill.current,
                                elementPath: elementPath,
                                colorType: 'fill'
                              });
                            }
                            if (elementColors.stroke) {
                              colorSlots.push({
                                id: `${elementPath}-stroke`,
                                label: `${elementPath} (stroke)`,
                                originalColor: elementColors.stroke.original,
                                currentColor: elementColors.stroke.current,
                                elementPath: elementPath,
                                colorType: 'stroke'
                              });
                            }
                          });

                          // Group slots by original color, with special handling for unspecified colors
                          const colorGroups = {};
                          colorSlots.forEach(slot => {
                            // Group unspecified colors together under a special key
                            const groupKey = slot.originalColor === 'UNSPECIFIED' ? 'UNSPECIFIED_GROUP' : slot.originalColor;
                            if (!colorGroups[groupKey]) {
                              colorGroups[groupKey] = [];
                            }
                            colorGroups[groupKey].push(slot);
                          });

                          const handleGroupColorChange = (originalColor, newHex, newAlpha) => {
                            const newFormattedColor = formatHexWithAlpha(newHex, newAlpha);
                            const slotsToUpdate = colorGroups[originalColor];
                            
                            setCustomizations(prev => {
                              // Create a deep copy of the mappings to prevent reference issues
                              const newMappings = {};
                              
                              // Copy existing overrides if any
                              if (prev.overrideForegroundColorConfig?.mappings) {
                                Object.keys(prev.overrideForegroundColorConfig.mappings).forEach(path => {
                                  newMappings[path] = {};
                                  Object.keys(prev.overrideForegroundColorConfig.mappings[path]).forEach(type => {
                                    newMappings[path][type] = { 
                                      ...prev.overrideForegroundColorConfig.mappings[path][type] 
                                    };
                                  });
                                });
                              }
                              
                              // Update all slots in this group
                              slotsToUpdate.forEach(slot => {
                                if (!newMappings[slot.elementPath]) {
                                  newMappings[slot.elementPath] = {};
                                  // Copy from template if it exists
                                  if (template.defaultForegroundColorConfig.mappings[slot.elementPath]) {
                                    Object.keys(template.defaultForegroundColorConfig.mappings[slot.elementPath]).forEach(type => {
                                      newMappings[slot.elementPath][type] = { 
                                        ...template.defaultForegroundColorConfig.mappings[slot.elementPath][type] 
                                      };
                                    });
                                  }
                                }
                                
                                if (!newMappings[slot.elementPath][slot.colorType]) {
                                  newMappings[slot.elementPath][slot.colorType] = { 
                                    original: slot.originalColor,
                                    current: slot.currentColor
                                  };
                                }
                                
                                newMappings[slot.elementPath][slot.colorType].current = newFormattedColor;
                              });
                              
                              return {
                                ...prev,
                                overrideForegroundColorConfig: {
                                  type: 'element-path',
                                  version: 1,
                                  mappings: newMappings
                                },
                                overrideForegroundConfig: {
                                  type: 'element-path',
                                  version: 1,
                                  mappings: newMappings
                                }
                              };
                            });
                          };

                          const handleIndividualColorChange = (slotId, newHex, newAlpha) => {
                            const newFormattedColor = formatHexWithAlpha(newHex, newAlpha);
                            const slot = colorSlots.find(s => s.id === slotId);
                            if (!slot) return;
                            
                            setCustomizations(prev => {
                              // Create a deep copy of the mappings to prevent reference issues
                              const newMappings = {};
                              
                              // Copy existing overrides if any
                              if (prev.overrideForegroundColorConfig?.mappings) {
                                Object.keys(prev.overrideForegroundColorConfig.mappings).forEach(path => {
                                  newMappings[path] = {};
                                  Object.keys(prev.overrideForegroundColorConfig.mappings[path]).forEach(type => {
                                    newMappings[path][type] = { 
                                      ...prev.overrideForegroundColorConfig.mappings[path][type] 
                                    };
                                  });
                                });
                              }
                              
                              // Initialize element if it doesn't exist
                              if (!newMappings[slot.elementPath]) {
                                newMappings[slot.elementPath] = {};
                                // Copy from template if it exists
                                if (template.defaultForegroundColorConfig.mappings[slot.elementPath]) {
                                  Object.keys(template.defaultForegroundColorConfig.mappings[slot.elementPath]).forEach(type => {
                                    newMappings[slot.elementPath][type] = { 
                                      ...template.defaultForegroundColorConfig.mappings[slot.elementPath][type] 
                                    };
                                  });
                                }
                              }
                              
                              // Initialize color type if it doesn't exist
                              if (!newMappings[slot.elementPath][slot.colorType]) {
                                newMappings[slot.elementPath][slot.colorType] = { 
                                  original: slot.originalColor,
                                  current: slot.currentColor
                                };
                              }
                              
                              // Update only this specific slot
                              newMappings[slot.elementPath][slot.colorType].current = newFormattedColor;
                              
                              return {
                                ...prev,
                                overrideForegroundColorConfig: {
                                  type: 'element-path',
                                  version: 1,
                                  mappings: newMappings
                                },
                                overrideForegroundConfig: {
                                  type: 'element-path',
                                  version: 1,
                                  mappings: newMappings
                                }
                              };
                            });
                          };

                          const toggleSvgGroup = (color) => {
                            setSvgExpandedGroups(prev => ({
                              ...prev,
                              [color]: !prev[color]
                            }));
                          };

                          const handleResetGroup = (originalColor) => {
                            const slotsToReset = colorGroups[originalColor];
                            
                            setCustomizations(prev => {
                              // Create a deep copy of the mappings
                              const newMappings = {};
                              
                              // Copy existing overrides if any
                              if (prev.overrideForegroundColorConfig?.mappings) {
                                Object.keys(prev.overrideForegroundColorConfig.mappings).forEach(path => {
                                  newMappings[path] = {};
                                  Object.keys(prev.overrideForegroundColorConfig.mappings[path]).forEach(type => {
                                    newMappings[path][type] = { 
                                      ...prev.overrideForegroundColorConfig.mappings[path][type] 
                                    };
                                  });
                                });
                              }
                              
                              // Reset all slots in this group to their original colors
                              slotsToReset.forEach(slot => {
                                if (!newMappings[slot.elementPath]) {
                                  newMappings[slot.elementPath] = {};
                                }
                                
                                if (!newMappings[slot.elementPath][slot.colorType]) {
                                  newMappings[slot.elementPath][slot.colorType] = {
                                    original: slot.originalColor,
                                    current: slot.currentColor
                                  };
                                }
                                
                                // Reset to original color (handle unspecified colors)
                                const resetColor = slot.originalColor === 'UNSPECIFIED' ? '#000000FF' : slot.originalColor;
                                newMappings[slot.elementPath][slot.colorType].current = resetColor;
                              });
                              
                              return {
                                ...prev,
                                overrideForegroundColorConfig: {
                                  type: 'element-path',
                                  version: 1,
                                  mappings: newMappings
                                },
                                overrideForegroundConfig: {
                                  type: 'element-path',
                                  version: 1,
                                  mappings: newMappings
                                }
                              };
                            });
                          };

                          const handleResetIndividual = (slotId) => {
                            const slot = colorSlots.find(s => s.id === slotId);
                            if (!slot) return;
                            
                            setCustomizations(prev => {
                              // Create a deep copy of the mappings
                              const newMappings = {};
                              
                              // Copy existing overrides if any
                              if (prev.overrideForegroundColorConfig?.mappings) {
                                Object.keys(prev.overrideForegroundColorConfig.mappings).forEach(path => {
                                  newMappings[path] = {};
                                  Object.keys(prev.overrideForegroundColorConfig.mappings[path]).forEach(type => {
                                    newMappings[path][type] = { 
                                      ...prev.overrideForegroundColorConfig.mappings[path][type] 
                                    };
                                  });
                                });
                              }
                              
                              // Initialize element if it doesn't exist
                              if (!newMappings[slot.elementPath]) {
                                newMappings[slot.elementPath] = {};
                              }
                              
                              if (!newMappings[slot.elementPath][slot.colorType]) {
                                newMappings[slot.elementPath][slot.colorType] = {
                                  original: slot.originalColor,
                                  current: slot.currentColor
                                };
                              }
                              
                              // Reset to original color (handle unspecified colors)
                              const resetColor = slot.originalColor === 'UNSPECIFIED' ? '#000000FF' : slot.originalColor;
                              newMappings[slot.elementPath][slot.colorType].current = resetColor;
                              
                              return {
                                ...prev,
                                overrideForegroundColorConfig: {
                                  type: 'element-path',
                                  version: 1,
                                  mappings: newMappings
                                },
                                overrideForegroundConfig: {
                                  type: 'element-path',
                                  version: 1,
                                  mappings: newMappings
                                }
                              };
                            });
                          };

                          return (
                            <div className="svg-color-groups">
                              {Object.entries(colorGroups).map(([originalColor, slots]) => {
                                // Handle special unspecified group
                                const isUnspecifiedGroup = originalColor === 'UNSPECIFIED_GROUP';
                                const displayGroupName = isUnspecifiedGroup ? 'Unspecified (defaults to black)' : originalColor;
                                const groupDisplayColor = isUnspecifiedGroup ? '#000000FF' : originalColor;
                                
                                // Check if all slots in group have same current color
                                const allSameColor = slots.every(slot => {
                                  // Get current color from overrides or default
                                  const currentConfig = customizations.overrideForegroundColorConfig?.mappings || {};
                                  let currentColor = slot.currentColor;
                                  if (currentConfig[slot.elementPath] && currentConfig[slot.elementPath][slot.colorType]) {
                                    currentColor = currentConfig[slot.elementPath][slot.colorType].current;
                                  }
                                  return currentColor === (
                                    currentConfig[slots[0].elementPath] && currentConfig[slots[0].elementPath][slots[0].colorType] 
                                      ? currentConfig[slots[0].elementPath][slots[0].colorType].current 
                                      : slots[0].currentColor
                                  );
                                });
                                
                                // Get group current color
                                const firstSlot = slots[0];
                                const currentConfig = customizations.overrideForegroundColorConfig?.mappings || {};
                                let groupCurrentColor = firstSlot.currentColor;
                                if (currentConfig[firstSlot.elementPath] && currentConfig[firstSlot.elementPath][firstSlot.colorType]) {
                                  groupCurrentColor = currentConfig[firstSlot.elementPath][firstSlot.colorType].current;
                                }
                                if (!allSameColor) {
                                  groupCurrentColor = groupDisplayColor;
                                }
                                
                                const parsedCurrent = parseColorString(groupCurrentColor);
                                const currentHex = parsedCurrent.hex;
                                const currentAlpha = parsedCurrent.alpha;
                                
                                return (
                                  <div key={originalColor} className="color-group" style={{ marginBottom: '15px', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                      <button 
                                        type="button"
                                        onClick={() => toggleSvgGroup(originalColor)}
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
                                        title={svgExpandedGroups[originalColor] ? 'Collapse' : 'Expand'}
                                      >
                                        {svgExpandedGroups[originalColor] ? '−' : '+'}
                                      </button>
                                      <span style={{
                                        display: 'inline-block',
                                        width: '1.5em',
                                        height: '1.5em',
                                        backgroundColor: groupDisplayColor,
                                        border: '2px solid #ccc',
                                        borderRadius: '3px'
                                      }}></span>
                                      <label style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                        {displayGroupName} - {slots.length} element{slots.length > 1 ? 's' : ''}
                                      </label>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                      <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', minWidth: '80px' }}>
                                        Group Control:
                                      </div>
                                      <input 
                                        type="color" 
                                        value={allSameColor ? currentHex : '#000000'}
                                        onChange={(e) => handleGroupColorChange(originalColor, e.target.value, currentAlpha)}
                                        disabled={!allSameColor}
                                        style={{ 
                                          width: '50px', 
                                          height: '25px',
                                          padding: '0',
                                          border: 'none',
                                          borderRadius: '0',
                                          cursor: allSameColor ? 'pointer' : 'not-allowed',
                                          opacity: allSameColor ? 1 : 0.5
                                        }}
                                      />
                                      <input 
                                        type="range" 
                                        min="0" max="1" step="0.01" 
                                        value={allSameColor ? currentAlpha : 1}
                                        onChange={(e) => handleGroupColorChange(originalColor, currentHex, parseFloat(e.target.value))}
                                        disabled={!allSameColor}
                                        style={{ 
                                          width: '100px', 
                                          opacity: allSameColor ? 1 : 0.5,
                                          cursor: allSameColor ? 'pointer' : 'not-allowed'
                                        }}
                                      />
                                      <span style={{ 
                                        fontSize: '12px', 
                                        fontFamily: 'monospace',
                                        backgroundColor: '#fff', 
                                        padding: '4px 8px', 
                                        borderRadius: '3px', 
                                        border: '1px solid #ddd',
                                        minWidth: '100px'
                                      }}>
                                        {allSameColor ? groupCurrentColor : `Mixed colors - edit individually`}
                                      </span>
                                      <button 
                                        type="button" 
                                        onClick={() => handleResetGroup(originalColor)} 
                                        style={{
                                          padding: '4px 8px',
                                          fontSize: '11px',
                                          backgroundColor: '#dc3545',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '3px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Reset All
                                      </button>
                                    </div>
                                    
                                    {/* Individual slot controls */}
                                    {svgExpandedGroups[originalColor] && (
                                      <div style={{ paddingLeft: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: 'bold' }}>
                                          Individual Controls:
                                        </div>
                                        {slots.map((slot) => {
                                        // Get current color for this specific slot
                                        const currentConfig = customizations.overrideForegroundColorConfig?.mappings || {};
                                        let slotCurrentColor = slot.currentColor;
                                        if (currentConfig[slot.elementPath] && currentConfig[slot.elementPath][slot.colorType]) {
                                          slotCurrentColor = currentConfig[slot.elementPath][slot.colorType].current;
                                        }
                                        const slotParsed = parseColorString(slotCurrentColor);
                                        const slotHex = slotParsed.hex;
                                        const slotAlpha = slotParsed.alpha;
                                        
                                        return (
                                          <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '4px', backgroundColor: '#f9f9f9', borderRadius: '3px' }}>
                                            <input 
                                              type="color" 
                                              value={slotHex}
                                              onChange={(e) => handleIndividualColorChange(slot.id, e.target.value, slotAlpha)}
                                              style={{ 
                                                width: '50px', 
                                                height: '25px',
                                                padding: '0',
                                                border: 'none',
                                                borderRadius: '0',
                                                cursor: 'pointer'
                                              }}
                                            />
                                            <input 
                                              type="range" 
                                              min="0" max="1" step="0.01" 
                                              value={slotAlpha}
                                              onChange={(e) => handleIndividualColorChange(slot.id, slotHex, parseFloat(e.target.value))}
                                              style={{ width: '60px' }}
                                            />
                                            <span style={{ fontSize: '12px', color: '#666', minWidth: '100px' }}>
                                              {slot.label}
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace', backgroundColor: '#fff', padding: '2px 4px', borderRadius: '2px', border: '1px solid #ddd' }}>
                                              {slotCurrentColor}
                                            </span>
                                            <button 
                                              type="button" 
                                              onClick={() => handleResetIndividual(slot.id)} 
                                              style={{
                                                padding: '2px 6px',
                                                fontSize: '10px',
                                                backgroundColor: '#6c757d',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '2px',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              Reset
                                            </button>
                                          </div>
                                        );
                                      })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="form-group">
                        <label>Foreground Color</label>
                        <input
                          type="color"
                          value={customizations.overrideForegroundColor || template.defaultForegroundColor}
                          onChange={(e) => setCustomizations(prev => ({
                            ...prev,
                            overrideForegroundColor: e.target.value,
                            overrideForegroundConfig: createSimpleColorConfig(e.target.value)
                          }))}
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label>Shape</label>
                      <select
                        value={customizations.overrideOuterShape || template.defaultOuterShape}
                        onChange={(e) => setCustomizations(prev => ({
                          ...prev,
                          overrideOuterShape: e.target.value
                        }))}
                      >
                        <option value="CIRCLE">Circle</option>
                        <option value="SQUARE">Square</option>
                        <option value="STAR">Star</option>
                        <option value="HEART">Heart</option>
                        <option value="HEXAGON">Hexagon</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Personal Message</label>
                  <textarea
                    placeholder="Add a message for the recipient..."
                    value={customizations.message}
                    onChange={(e) => setCustomizations(prev => ({
                      ...prev,
                      message: e.target.value
                    }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className="step-navigation">
                <button
                  className="btn-secondary"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setStep(3)}
                  disabled={!allocation.hasAllocation}
                >
                  Review & Send
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="confirm-step">
              <h3>Step 3: Confirm Badge Giving</h3>
              
              <div className="confirmation-details">
                <div className="detail-row">
                  <span className="label">Recipient:</span>
                  <span className="value">
                    {selectedRecipient.avatar && (
                      <img src={selectedRecipient.avatar} alt="" className="mini-avatar" />
                    )}
                    {selectedRecipient.username}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="label">Badge:</span>
                  <span className="value">
                    {customizations.overrideBadgeName || template.defaultBadgeName}
                  </span>
                </div>

                {customizations.message && (
                  <div className="detail-row">
                    <span className="label">Message:</span>
                    <span className="value message">{customizations.message}</span>
                  </div>
                )}

                <div className="badge-preview-final">
                  <BadgeDisplay badge={getPreviewProps()} />
                </div>
              </div>

              <div className="step-navigation">
                <button
                  className="btn-secondary"
                  onClick={() => setStep(2)}
                  disabled={giving}
                >
                  Back
                </button>
                <button
                  className="btn-primary"
                  onClick={handleGiveBadge}
                  disabled={giving || !allocation.hasAllocation}
                >
                  {giving ? 'Sending...' : 'Send Badge'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BadgeGiveModal;