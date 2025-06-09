import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BadgeNavigation from '../components/BadgeNavigation';
import BadgeDisplay from '../components/guilds/BadgeDisplay';
import BadgeIconUpload from '../components/BadgeIconUpload';
import BadgeBackgroundUpload from '../components/BadgeBackgroundUpload';
import SystemIconService from '../services/systemIcon.service';
import badgeService from '../services/badgeService';
import './BadgeBuilderPage.css';

// Enums matching the database schema
const BadgeShape = { CIRCLE: 'CIRCLE', SQUARE: 'SQUARE', STAR: 'STAR', HEXAGON: 'HEXAGON', HEART: 'HEART' };
const BackgroundContentType = { SOLID_COLOR: 'SOLID_COLOR', HOSTED_IMAGE: 'HOSTED_IMAGE' };
const ForegroundContentType = { TEXT: 'TEXT', SYSTEM_ICON: 'SYSTEM_ICON', UPLOADED_ICON: 'UPLOADED_ICON' };
const BadgeTier = { GOLD: 'GOLD', SILVER: 'SILVER', BRONZE: 'BRONZE' };

const BadgeTemplateCreatePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { currentUser: user, token } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Template properties
  const [template, setTemplate] = useState({
    templateSlug: '',
    defaultBadgeName: 'New Badge Template',
    defaultSubtitleText: 'Achievement Badge',
    defaultDisplayDescription: '',
    inherentTier: null,
    
    // Visual properties
    defaultOuterShape: BadgeShape.CIRCLE,
    defaultBorderColor: '#FFD700',
    defaultBackgroundType: BackgroundContentType.SOLID_COLOR,
    defaultBackgroundValue: '#4A97FC',
    defaultForegroundType: ForegroundContentType.SYSTEM_ICON,
    defaultForegroundValue: 'Shield',
    defaultForegroundColor: '#FFFFFF',
    defaultTextFont: 'Arial',
    defaultTextSize: 24,
    
    // Measure configuration
    definesMeasure: false,
    measureLabel: '',
    measureBest: null,
    measureWorst: null,
    measureNotes: '',
    measureIsNormalizable: false,
    higherIsBetter: null,
    measureBestLabel: '',
    measureWorstLabel: '',
    
    // Template behavior
    isModifiableByIssuer: false,
    allowsPushedInstanceUpdates: false,
    internalNotes: ''
  });

  const [displayableForegroundSvg, setDisplayableForegroundSvg] = useState(null);
  const [uploadedIconSvg, setUploadedIconSvg] = useState(null);
  const [iconSvgColorData, setIconSvgColorData] = useState(null);
  const [uploadedBackgroundUrl, setUploadedBackgroundUrl] = useState(null);
  
  const isOwnPage = user && user.username.toLowerCase() === username.toLowerCase();
  
  useEffect(() => {
    if (!isOwnPage || !user || !token) {
      navigate('/login');
      return;
    }
  }, [user, token, isOwnPage, navigate]);

  // Auto-generate slug from badge name
  useEffect(() => {
    if (template.defaultBadgeName && !template.templateSlug) {
      const slug = template.defaultBadgeName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setTemplate(prev => ({ ...prev, templateSlug: slug }));
    }
  }, [template.defaultBadgeName, template.templateSlug]);

  // Fetch system icon SVG for preview
  useEffect(() => {
    if (template.defaultForegroundType === ForegroundContentType.SYSTEM_ICON && template.defaultForegroundValue) {
      SystemIconService.getSystemIconSvg(template.defaultForegroundValue)
        .then(setDisplayableForegroundSvg)
        .catch(err => {
          console.error('Failed to fetch system icon:', err);
          setDisplayableForegroundSvg('<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z"/></svg>');
        });
    } else if (template.defaultForegroundType === ForegroundContentType.UPLOADED_ICON && uploadedIconSvg) {
      setDisplayableForegroundSvg(uploadedIconSvg);
    } else {
      setDisplayableForegroundSvg(null);
    }
  }, [template.defaultForegroundType, template.defaultForegroundValue, uploadedIconSvg]);

  // Reset foregroundColor to appropriate default when foregroundType changes
  useEffect(() => {
    const newType = template.defaultForegroundType;
    setTemplate(prev => {
      let newForegroundColor = prev.defaultForegroundColor;
      
      if (newType === ForegroundContentType.TEXT && prev.defaultForegroundColor === '#000000') {
        newForegroundColor = '#FFFFFF'; // White for text
      } else if (newType === ForegroundContentType.SYSTEM_ICON && prev.defaultForegroundColor === '#FFFFFF') {
        newForegroundColor = '#000000'; // Black for system icons
      } else if (newType === ForegroundContentType.UPLOADED_ICON && prev.defaultForegroundColor === '#FFFFFF') {
        newForegroundColor = '#000000'; // Black for uploaded icons (matches BadgeIconUpload fallback)
      }
      
      if (newForegroundColor !== prev.defaultForegroundColor) {
        return { ...prev, defaultForegroundColor: newForegroundColor };
      }
      return prev;
    });
  }, [template.defaultForegroundType]);

  // Reset foregroundValue to appropriate default when foregroundType changes
  useEffect(() => {
    const newType = template.defaultForegroundType;
    setTemplate(prev => {
      let newForegroundValue = prev.defaultForegroundValue;
      let changed = false;
      
      if (newType === ForegroundContentType.TEXT && 
          (prev.defaultForegroundValue?.startsWith('upload://') || 
           prev.defaultForegroundValue?.includes('<') || 
           (prev.defaultForegroundValue?.length > 20 && prev.defaultForegroundType !== ForegroundContentType.TEXT))) {
        newForegroundValue = '[text]'; // Default text placeholder
        changed = true;
      } else if (newType === ForegroundContentType.SYSTEM_ICON && 
                 (prev.defaultForegroundValue?.startsWith('upload://') || 
                  prev.defaultForegroundValue?.includes('<') || 
                  prev.defaultForegroundValue?.length < 2)) {
        newForegroundValue = 'Shield';
        changed = true;
      } else if (newType === ForegroundContentType.UPLOADED_ICON && 
                 prev.defaultForegroundValue?.startsWith('upload://')) {
        // Keep upload references when switching to UPLOADED_ICON
        changed = false;
      }
      
      if (changed) {
        return { ...prev, defaultForegroundValue: newForegroundValue };
      }
      return prev;
    });
  }, [template.defaultForegroundType, template.defaultBadgeName]);

  // Auto-set border color based on tier selection
  useEffect(() => {
    if (template.inherentTier) {
      let tierColor;
      switch (template.inherentTier) {
        case 'GOLD':
          tierColor = '#FFD700'; // Gold
          break;
        case 'SILVER':
          tierColor = '#C0C0C0'; // Silver
          break;
        case 'BRONZE':
          tierColor = '#CD7F32'; // Bronze
          break;
        default:
          return; // No tier, don't change border color
      }
      
      if (template.defaultBorderColor !== tierColor) {
        setTemplate(prev => ({ ...prev, defaultBorderColor: tierColor }));
      }
    }
  }, [template.inherentTier, template.defaultBorderColor]);

  const handleIconChange = (iconUrl, svgContent, actualUrl) => {
    setTemplate(prev => ({ ...prev, defaultForegroundValue: iconUrl }));
    if (svgContent) {
      setUploadedIconSvg(svgContent);
    } else if (actualUrl) {
      // For regular images, use the actual URL for display
      setUploadedIconSvg(actualUrl);
    } else {
      setUploadedIconSvg(null);
    }
  };

  const handleSvgDataChange = (svgContent, colorData) => {
    if (svgContent) {
      setUploadedIconSvg(svgContent);
    } else {
      setUploadedIconSvg(null);
    }
    setIconSvgColorData(colorData);
  };

  const handleBackgroundChange = (backgroundUrl, actualUrl) => {
    setTemplate(prev => ({ ...prev, defaultBackgroundValue: backgroundUrl }));
    if (actualUrl) {
      setUploadedBackgroundUrl(actualUrl);
    }
  };

  // Generate API payload for third-party integration
  const generateApiPayload = () => {
    const payload = {
      _comment: template.defaultForegroundValue?.startsWith('upload://') 
        ? "The defaultForegroundValue contains a reference to an uploaded file. This file has already been uploaded and can be used directly in your API call."
        : undefined,
      templateSlug: template.templateSlug,
      defaultBadgeName: template.defaultBadgeName,
      defaultSubtitleText: template.defaultSubtitleText,
      defaultDisplayDescription: template.defaultDisplayDescription,
      ownerType: 'USER',
      ownerId: user?.id || 'user_id',
      authoredByUserId: user?.id || 'user_id',
      
      // Visual properties
      defaultOuterShape: template.defaultOuterShape,
      defaultBorderColor: template.defaultBorderColor,
      defaultBackgroundType: template.defaultBackgroundType,
      defaultBackgroundValue: template.defaultBackgroundValue,
      defaultForegroundType: template.defaultForegroundType,
      defaultForegroundValue: template.defaultForegroundValue,  // Will show upload://assetId reference
      defaultForegroundColor: template.defaultForegroundColor,
      defaultTextFont: template.defaultTextFont,
      defaultTextSize: template.defaultTextSize,
      
      // Tier
      ...(template.inherentTier && { inherentTier: template.inherentTier }),
      
      // Measure configuration
      definesMeasure: template.definesMeasure,
      ...(template.definesMeasure && {
        measureLabel: template.measureLabel,
        measureBest: template.measureBest,
        measureWorst: template.measureWorst,
        measureNotes: template.measureNotes,
        measureIsNormalizable: template.measureIsNormalizable,
        higherIsBetter: template.higherIsBetter,
        measureBestLabel: template.measureBestLabel,
        measureWorstLabel: template.measureWorstLabel,
      }),
      
      // Template behavior
      isModifiableByIssuer: template.isModifiableByIssuer,
      allowsPushedInstanceUpdates: template.allowsPushedInstanceUpdates,
      internalNotes: template.internalNotes,
      
      // Foreground color configuration (if applicable)
      ...(iconSvgColorData && iconSvgColorData.elementColorMap && Object.keys(iconSvgColorData.elementColorMap).length > 0 && {
        defaultForegroundColorConfig: {
          type: 'element-path',
          version: 1,
          mappings: iconSvgColorData.elementColorMap
        }
      })
    };

    return payload;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(generateApiPayload(), null, 2));
      // TODO: Show success message
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(generateApiPayload(), null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = value;
    
    if (type === 'checkbox') {
      val = checked;
    } else if (type === 'number') {
      val = value === '' ? null : parseFloat(value);
    }
    
    setTemplate(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const templateData = {
        ...template,
        ownerType: 'USER',
        ownerId: user.id,
        authoredByUserId: user.id,
        // Include color config if applicable
        ...(iconSvgColorData && iconSvgColorData.elementColorMap && Object.keys(iconSvgColorData.elementColorMap).length > 0 && {
          defaultForegroundColorConfig: {
            type: 'element-path',
            version: 1,
            mappings: iconSvgColorData.elementColorMap
          }
        })
      };

      // If we have a transformed SVG, send the content instead of upload reference
      if (template.defaultForegroundType === 'UPLOADED_ICON' && 
          uploadedIconSvg && 
          uploadedIconSvg.trim().startsWith('<svg') &&
          iconSvgColorData && 
          iconSvgColorData.elementColorMap && 
          Object.keys(iconSvgColorData.elementColorMap).length > 0) {
        
        console.log('Sending transformed SVG content instead of upload reference');
        templateData.transformedForegroundSvgContent = uploadedIconSvg;
      }

      console.log('Creating badge template:', templateData);
      
      await badgeService.createBadgeTemplate(templateData);
      
      // Navigate to templates page on success
      navigate(`/users/${username}/badges/templates`);
    } catch (err) {
      console.error('Error creating badge template:', err);
      setError(err.message || 'Failed to create badge template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const badgePreviewProps = {
    name: template.defaultBadgeName,
    subtitle: template.defaultSubtitleText,
    shape: template.defaultOuterShape,
    borderColor: template.defaultBorderColor,
    backgroundType: template.defaultBackgroundType,
    backgroundValue: template.defaultBackgroundType === BackgroundContentType.HOSTED_IMAGE && uploadedBackgroundUrl
      ? uploadedBackgroundUrl  // Use actual URL for display
      : template.defaultBackgroundValue,
    foregroundType: template.defaultForegroundType === ForegroundContentType.UPLOADED_ICON && displayableForegroundSvg && displayableForegroundSvg.includes('<svg')
      ? ForegroundContentType.SYSTEM_ICON  // Treat SVG content as SYSTEM_ICON for display
      : template.defaultForegroundType,
    foregroundValue: (template.defaultForegroundType === ForegroundContentType.SYSTEM_ICON || 
                     template.defaultForegroundType === ForegroundContentType.UPLOADED_ICON) 
      ? displayableForegroundSvg 
      : template.defaultForegroundValue,
    foregroundColor: template.defaultForegroundType === ForegroundContentType.UPLOADED_ICON 
      ? '#000000' // Use black fallback color for uploaded icons (matches BadgeIconUpload default)
      : template.defaultForegroundColor,
    foregroundScale: 100
  };

  if (!isOwnPage) {
    return null;
  }

  return (
    <div className="badge-template-create-page">
      <div className="page-header">
        <h1>Create Badge Template</h1>
        <p>Design a reusable badge template for giving to others</p>
      </div>

      <BadgeNavigation />

      <div className="page-content">
        <form onSubmit={handleSubmit} className="template-form">
          <div className="builder-content-area">
            <div className="controls-panel">
              <h2>Template Properties</h2>
              
              {/* Basic Template Info */}
              <div className="control-section">
                <h3>Basic Information</h3>
                
                <div className="control-group">
                  <label htmlFor="defaultBadgeName">Badge Name:</label>
                  <input
                    type="text"
                    id="defaultBadgeName"
                    name="defaultBadgeName"
                    value={template.defaultBadgeName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="control-group">
                  <label htmlFor="templateSlug">Template Slug:</label>
                  <input
                    type="text"
                    id="templateSlug"
                    name="templateSlug"
                    value={template.templateSlug}
                    onChange={handleInputChange}
                    pattern="[a-z0-9-]+"
                    title="Only lowercase letters, numbers, and hyphens allowed"
                    required
                  />
                  <small>Unique identifier for this template (auto-generated from name if empty)</small>
                </div>

                <div className="control-group">
                  <label htmlFor="defaultSubtitleText">Subtitle:</label>
                  <input
                    type="text"
                    id="defaultSubtitleText"
                    name="defaultSubtitleText"
                    value={template.defaultSubtitleText}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="control-group">
                  <label htmlFor="defaultDisplayDescription">Description:</label>
                  <textarea
                    id="defaultDisplayDescription"
                    name="defaultDisplayDescription"
                    value={template.defaultDisplayDescription}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Describe what this badge represents..."
                  />
                </div>

                <div className="control-group">
                  <label htmlFor="inherentTier">Tier:</label>
                  <select
                    id="inherentTier"
                    name="inherentTier"
                    value={template.inherentTier || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">No Tier</option>
                    {Object.values(BadgeTier).map(tier => (
                      <option key={tier} value={tier}>{tier}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Visual Design */}
              <div className="control-section">
                <h3>Visual Design</h3>
                
                <div className="control-group">
                  <label htmlFor="defaultOuterShape">Shape:</label>
                  <select
                    id="defaultOuterShape"
                    name="defaultOuterShape"
                    value={template.defaultOuterShape}
                    onChange={handleInputChange}
                  >
                    {Object.values(BadgeShape).map(shape => (
                      <option key={shape} value={shape}>{shape}</option>
                    ))}
                  </select>
                </div>

                <div className="control-group">
                  <label htmlFor="defaultBorderColor">Border Color:</label>
                  <input
                    type="color"
                    id="defaultBorderColor"
                    name="defaultBorderColor"
                    value={template.defaultBorderColor}
                    onChange={handleInputChange}
                    disabled={!!template.inherentTier}
                  />
                  {template.inherentTier && (
                    <small>Border color is automatically set by the selected tier</small>
                  )}
                </div>

                <div className="control-group">
                  <label htmlFor="defaultBackgroundType">Background Type:</label>
                  <select
                    id="defaultBackgroundType"
                    name="defaultBackgroundType"
                    value={template.defaultBackgroundType}
                    onChange={handleInputChange}
                  >
                    {Object.values(BackgroundContentType).map(type => (
                      <option key={type} value={type}>{type.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="control-group">
                  <label htmlFor="defaultBackgroundValue">Background Value:</label>
                  {template.defaultBackgroundType === BackgroundContentType.SOLID_COLOR ? (
                    <input
                      type="color"
                      id="defaultBackgroundValue"
                      name="defaultBackgroundValue"
                      value={template.defaultBackgroundValue}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <BadgeBackgroundUpload
                      currentBackground={template.defaultBackgroundValue}
                      onBackgroundChange={handleBackgroundChange}
                      templateSlug={template.templateSlug}
                      isLoading={isSubmitting}
                    />
                  )}
                </div>

                <div className="control-group">
                  <label htmlFor="defaultForegroundType">Foreground Type:</label>
                  <select
                    id="defaultForegroundType"
                    name="defaultForegroundType"
                    value={template.defaultForegroundType}
                    onChange={handleInputChange}
                  >
                    {Object.values(ForegroundContentType).map(type => (
                      <option key={type} value={type}>{type.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="control-group">
                  <label htmlFor="defaultForegroundValue">Foreground Value:</label>
                  {template.defaultForegroundType === ForegroundContentType.TEXT ? (
                    <input
                      type="text"
                      id="defaultForegroundValue"
                      name="defaultForegroundValue"
                      value={template.defaultForegroundValue}
                      onChange={handleInputChange}
                      maxLength={20}
                    />
                  ) : template.defaultForegroundType === ForegroundContentType.SYSTEM_ICON ? (
                    <input
                      type="text"
                      id="defaultForegroundValue"
                      name="defaultForegroundValue"
                      value={template.defaultForegroundValue}
                      onChange={handleInputChange}
                      placeholder="Icon name (e.g., Shield, Star, Trophy)"
                    />
                  ) : template.defaultForegroundType === ForegroundContentType.UPLOADED_ICON ? (
                    <BadgeIconUpload
                      currentIcon={template.defaultForegroundValue}
                      onIconChange={handleIconChange}
                      onSvgDataChange={handleSvgDataChange}
                      templateSlug={template.templateSlug}
                      isLoading={isSubmitting}
                    />
                  ) : (
                    <input
                      type="url"
                      id="defaultForegroundValue"
                      name="defaultForegroundValue"
                      value={template.defaultForegroundValue}
                      onChange={handleInputChange}
                      placeholder="https://example.com/icon.svg"
                    />
                  )}
                </div>

                {/* Only show general foreground color if not using uploaded icon with custom color controls */}
                {!(template.defaultForegroundType === ForegroundContentType.UPLOADED_ICON && iconSvgColorData && iconSvgColorData.colorSlots && iconSvgColorData.colorSlots.length > 0) && (
                  <div className="control-group">
                    <label htmlFor="defaultForegroundColor">Foreground Color:</label>
                    <input
                      type="color"
                      id="defaultForegroundColor"
                      name="defaultForegroundColor"
                      value={template.defaultForegroundColor}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
              </div>

              {/* Measure Configuration */}
              <div className="control-section">
                <h3>Measure Configuration</h3>
                
                <div className="control-group checkbox-row">
                  <input
                    type="checkbox"
                    id="definesMeasure"
                    name="definesMeasure"
                    checked={template.definesMeasure}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="definesMeasure">
                    Enable measure tracking for this template
                  </label>
                </div>

                {template.definesMeasure && (
                  <>
                    <div className="control-group">
                      <label htmlFor="measureLabel">Measure Label:</label>
                      <input
                        type="text"
                        id="measureLabel"
                        name="measureLabel"
                        value={template.measureLabel}
                        onChange={handleInputChange}
                        placeholder="e.g., Score, Rank, Level"
                      />
                    </div>

                    <div className="control-group">
                      <label htmlFor="measureBest">Best Value:</label>
                      <input
                        type="number"
                        id="measureBest"
                        name="measureBest"
                        value={template.measureBest || ''}
                        onChange={handleInputChange}
                        step="any"
                      />
                    </div>

                    <div className="control-group">
                      <label htmlFor="measureWorst">Worst Value:</label>
                      <input
                        type="number"
                        id="measureWorst"
                        name="measureWorst"
                        value={template.measureWorst || ''}
                        onChange={handleInputChange}
                        step="any"
                      />
                    </div>

                    <div className="control-group">
                      <label>
                        <input
                          type="checkbox"
                          name="higherIsBetter"
                          checked={template.higherIsBetter || false}
                          onChange={handleInputChange}
                        />
                        Higher values are better
                      </label>
                    </div>
                  </>
                )}
              </div>

              {/* Template Behavior */}
              <div className="control-section">
                <h3>Template Behavior</h3>
                
                <div className="control-group checkbox-row">
                  <input
                    type="checkbox"
                    id="isModifiableByIssuer"
                    name="isModifiableByIssuer"
                    checked={template.isModifiableByIssuer}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="isModifiableByIssuer">
                    Allow template modifications (changes apply to existing badges)
                  </label>
                </div>

                <div className="control-group checkbox-row">
                  <input
                    type="checkbox"
                    id="allowsPushedInstanceUpdates"
                    name="allowsPushedInstanceUpdates"
                    checked={template.allowsPushedInstanceUpdates}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="allowsPushedInstanceUpdates">
                    Allow individual badge instance updates after awarding
                  </label>
                </div>

                <div className="control-group">
                  <label htmlFor="internalNotes">Internal Notes:</label>
                  <textarea
                    id="internalNotes"
                    name="internalNotes"
                    value={template.internalNotes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Private notes about this template..."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Creating...' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/users/${username}/badges/templates`)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="preview-panel">
              <h2>Live Preview</h2>
              <div className="badge-preview-area">
                <div className="badge-card preview-badge-card">
                  <div className="badge-card-visual">
                    <BadgeDisplay badge={badgePreviewProps} />
                  </div>
                  {template.defaultDisplayDescription && (
                    <div className="badge-card-content">
                      <p className="badge-card-description">{template.defaultDisplayDescription}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="preview-info">
                <h3>Template Details</h3>
                <p><strong>Slug:</strong> {template.templateSlug}</p>
                <p><strong>Tier:</strong> {template.inherentTier || 'None'}</p>
                <p><strong>Measure Tracking:</strong> {template.definesMeasure ? 'Enabled' : 'Disabled'}</p>
              </div>

              <div className="api-preview-section">
                <h3>Third-Party API Integration</h3>
                <p>Use this JSON to create this badge template via API:</p>
                
                <div className="code-block" style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginTop: '10px'
                }}>
                  <div className="code-header" style={{
                    background: '#f5f5f5',
                    padding: '8px 12px',
                    borderBottom: '1px solid #ddd',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '14px'
                  }}>
                    <span style={{ fontFamily: 'monospace', color: '#666' }}>
                      POST /api/badge-templates
                    </span>
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      style={{
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                  <pre style={{
                    margin: '0',
                    padding: '12px',
                    background: '#f9f9f9',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    overflow: 'auto',
                    maxHeight: '300px',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    <code>{JSON.stringify(generateApiPayload(), null, 2)}</code>
                  </pre>
                </div>

                <details style={{ marginTop: '10px' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '14px', color: '#666' }}>
                    Show example cURL command
                  </summary>
                  <pre style={{
                    background: '#f0f0f0',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    marginTop: '8px',
                    overflow: 'auto',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
{`curl -X POST http://localhost:3000/api/badge-templates \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '${JSON.stringify(generateApiPayload(), null, 2).replace(/'/g, "\\'")}'`}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        </form>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="error-dismiss">×</button>
        </div>
      )}
    </div>
  );
};

export default BadgeTemplateCreatePage;