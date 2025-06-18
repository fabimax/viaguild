import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BadgeNavigation from '../components/BadgeNavigation';
import BadgeDisplay from '../components/guilds/BadgeDisplay';
import BadgeIconUpload from '../components/BadgeIconUpload';
import BadgeBackgroundUpload from '../components/BadgeBackgroundUpload';
import SvgColorCustomization from '../components/SvgColorCustomization';
import SystemIconService from '../services/systemIcon.service';
import badgeService from '../services/badgeService';
import { 
  createSimpleColorConfig,
  createHostedAssetConfig,
  createElementPathConfig 
} from '../utils/colorConfig';
import { applySvgColorTransform } from '../utils/svgColorTransform';
import { buildElementColorMap } from '../utils/svgColorAnalysis';
import './BadgeBuilderPage.css';

// Enums for UI state management only
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
    customSlug: false, // Track if user manually set the slug
    defaultSubtitleText: 'Achievement Badge',
    defaultDisplayDescription: '',
    inherentTier: null,
    
    // Visual properties (UI state only - converted to configs on submit)
    defaultOuterShape: BadgeShape.CIRCLE,
    defaultBorderColor: '#FFD700',
    defaultBackgroundType: BackgroundContentType.SOLID_COLOR,
    defaultBackgroundValue: '#4A97FC',
    defaultForegroundType: ForegroundContentType.SYSTEM_ICON,
    defaultForegroundValue: 'Shield',
    defaultForegroundColor: '#FFFFFF',
    
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

  // Metadata field definitions
  const [metadataFields, setMetadataFields] = useState([]);

  const [displayableForegroundSvg, setDisplayableForegroundSvg] = useState(null);
  const [uploadedIconSvg, setUploadedIconSvg] = useState(null);
  const [iconSvgColorData, setIconSvgColorData] = useState(null);
  const [systemIconColorData, setSystemIconColorData] = useState(null);
  const [systemIconName, setSystemIconName] = useState(null); // Store the original icon name
  const [uploadedBackgroundUrl, setUploadedBackgroundUrl] = useState(null);
  const [slugWasIncremented, setSlugWasIncremented] = useState(false);
  const [existingTemplateSlugs, setExistingTemplateSlugs] = useState([]);
  
  const isOwnPage = user && user.username.toLowerCase() === username.toLowerCase();
  
  useEffect(() => {
    if (!isOwnPage || !user || !token) {
      navigate('/login');
      return;
    }
  }, [user, token, isOwnPage, navigate]);

  // Fetch existing template slugs once when component loads
  useEffect(() => {
    if (isOwnPage && user && token) {
      const fetchExistingSlugs = async () => {
        try {
          const response = await fetch(`/api/users/${username}/badge-templates`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const slugs = data.data.map(t => t.templateSlug);
            setExistingTemplateSlugs(slugs);
          }
        } catch (error) {
          console.error('Error fetching existing template slugs:', error);
          // Continue without slug checking if this fails
        }
      };
      
      fetchExistingSlugs();
    }
  }, [isOwnPage, user, token, username]);

  // Auto-generate slug from badge name with instant local duplicate checking
  useEffect(() => {
    if (template.defaultBadgeName && !template.customSlug) {
      const baseSlug = generateTemplateSlug(template.defaultBadgeName);
      
      if (!baseSlug) {
        setTemplate(prev => ({ ...prev, templateSlug: '' }));
        setSlugWasIncremented(false);
        return;
      }

      // Find unique slug with auto-increment (instant - no API call)
      let uniqueSlug = baseSlug;
      let counter = 1;
      let wasIncremented = false;
      
      while (existingTemplateSlugs.includes(uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
        wasIncremented = true;
        
        // Safety check
        if (counter > 999) break;
      }
      
      setTemplate(prev => ({ ...prev, templateSlug: uniqueSlug }));
      setSlugWasIncremented(wasIncremented);
    }
  }, [template.defaultBadgeName, template.customSlug, existingTemplateSlugs]);

  // Helper to set custom slug
  const setCustomSlug = (customSlug) => {
    setTemplate(prev => ({ ...prev, templateSlug: customSlug, customSlug: true }));
  };

  // Fetch system icon SVG for preview
  useEffect(() => {
    if (template.defaultForegroundType === ForegroundContentType.SYSTEM_ICON && 
        template.defaultForegroundValue && 
        !template.defaultForegroundValue.startsWith('upload://')) {
      // Store the original icon name
      setSystemIconName(template.defaultForegroundValue);
      
      SystemIconService.getSystemIconSvg(template.defaultForegroundValue)
        .then(svgContent => {
          // Analyze system icon for color customization
          const colorMapResult = buildElementColorMap(svgContent);
          if (colorMapResult && colorMapResult.elementColorMap) {
            setSystemIconColorData({
              elementColorMap: colorMapResult.elementColorMap,
              gradientDefinitions: colorMapResult.gradientDefinitions || {}
            });
            // Set initial displayable SVG (will be updated with transformations below)
            setDisplayableForegroundSvg(svgContent);
          } else {
            setSystemIconColorData(null);
            setDisplayableForegroundSvg(svgContent);
          }
        })
        .catch(err => {
          console.error('Failed to fetch system icon:', err);
          setDisplayableForegroundSvg('<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z"/></svg>');
          setSystemIconColorData(null);
        });
    } else {
      // Clear system icon data when switching away from system icons
      setSystemIconColorData(null);
      setSystemIconName(null);
      if (template.defaultForegroundType !== ForegroundContentType.SYSTEM_ICON) {
        setDisplayableForegroundSvg(null);
      }
    }
    
    if (template.defaultForegroundType === ForegroundContentType.UPLOADED_ICON && uploadedIconSvg) {
      // Apply color transformations if we have color data
      if (iconSvgColorData && iconSvgColorData.elementColorMap) {
        const transformedSvg = applySvgColorTransform(uploadedIconSvg, {
          type: 'element-path',
          version: 1,
          mappings: iconSvgColorData.elementColorMap
        });
        setDisplayableForegroundSvg(transformedSvg);
      } else {
        setDisplayableForegroundSvg(uploadedIconSvg);
      }
    } else {
      setDisplayableForegroundSvg(null);
    }
  }, [template.defaultForegroundType, template.defaultForegroundValue, uploadedIconSvg, iconSvgColorData]);

  // Apply system icon color transformations when color data changes
  useEffect(() => {
    if (template.defaultForegroundType === ForegroundContentType.SYSTEM_ICON && 
        systemIconName && 
        systemIconColorData && 
        systemIconColorData.elementColorMap) {
      // Re-fetch the original SVG using the stored icon name and apply transformations
      SystemIconService.getSystemIconSvg(systemIconName)
        .then(originalSvg => {
          const transformedSvg = applySvgColorTransform(originalSvg, {
            type: 'element-path',
            version: 1,
            mappings: systemIconColorData.elementColorMap
          });
          setDisplayableForegroundSvg(transformedSvg);
        })
        .catch(err => {
          console.error('Failed to apply system icon color transformations:', err);
        });
    }
  }, [template.defaultForegroundType, systemIconName, systemIconColorData]);

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

    // Clear state when switching between icon types
    if (newType === ForegroundContentType.TEXT) {
      setDisplayableForegroundSvg(null);
      setIconSvgColorData(null);
      setSystemIconColorData(null);
      setSystemIconName(null);
    } else if (newType === ForegroundContentType.SYSTEM_ICON) {
      // When switching to system icon, clear uploaded icon state
      setIconSvgColorData(null);
      setUploadedIconSvg(null);
    } else if (newType === ForegroundContentType.UPLOADED_ICON) {
      // When switching to uploaded icon, clear system icon state
      setSystemIconColorData(null);
      setSystemIconName(null);
    }
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
    
    // Debug: Check what color data we're receiving
    if (colorData?.elementColorMap) {
      Object.entries(colorData.elementColorMap).forEach(([path, colors]) => {
        if (colors.fill?.original === 'UNSPECIFIED') {
          console.log(`Preview will use UNSPECIFIED fill at ${path}, current:`, colors.fill.current);
        }
      });
    }
  };

  const handleBackgroundChange = (backgroundUrl, actualUrl) => {
    setTemplate(prev => ({ ...prev, defaultBackgroundValue: backgroundUrl }));
    if (actualUrl) {
      setUploadedBackgroundUrl(actualUrl);
    }
  };

  // Helper to generate the full foreground config object
  const buildForegroundConfig = () => {
    switch (template.defaultForegroundType) {
      case ForegroundContentType.TEXT:
        return {
          type: 'text',
          version: 1,
          value: template.defaultForegroundValue,
          color: template.defaultForegroundColor,
        };
      case ForegroundContentType.SYSTEM_ICON:
        // Use advanced color mapping if available, otherwise simple color
        if (systemIconColorData && systemIconColorData.elementColorMap) {
          return createElementPathConfig(
            template.defaultForegroundValue, // The icon name
            systemIconColorData.elementColorMap
          );
        } else {
          return {
            type: 'system-icon',
            version: 1,
            value: template.defaultForegroundValue, // The icon name
            color: template.defaultForegroundColor,
          };
        }
      case ForegroundContentType.UPLOADED_ICON:
        if (template.defaultForegroundValue?.startsWith('upload://')) {
          if (iconSvgColorData && iconSvgColorData.elementColorMap && Object.keys(iconSvgColorData.elementColorMap).length > 0) {
            return {
              type: 'customizable-svg',
              version: 1,
              url: template.defaultForegroundValue,
              colorMappings: iconSvgColorData.elementColorMap,
            };
          } else {
            return createHostedAssetConfig(template.defaultForegroundValue);
          }
        }
        return createHostedAssetConfig(uploadedBackgroundUrl || template.defaultForegroundValue);

      default:
        // Fallback to system icon config if type is unclear
        return {
          type: 'system-icon',
          version: 1,
          value: template.defaultForegroundValue || 'Shield',
          color: template.defaultForegroundColor,
        };
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
      
      // Config objects only (legacy fields removed)
      defaultBorderConfig: createSimpleColorConfig(template.defaultBorderColor),
      defaultBackgroundConfig: template.defaultBackgroundType === BackgroundContentType.HOSTED_IMAGE
        ? createHostedAssetConfig(template.defaultBackgroundValue)
        : createSimpleColorConfig(template.defaultBackgroundValue),
      defaultForegroundConfig: buildForegroundConfig(),
      
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
      
      // Legacy foreground color configuration (for backward compatibility during transition)
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
    const textToCopy = JSON.stringify(generateApiPayload(), null, 2);
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      // TODO: Show success message
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Modern fallback without execCommand
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        // Use the Clipboard API as a fallback
        const successful = document.execCommand('copy');
        if (!successful) {
          console.error('Fallback copy failed');
        }
      } catch (error) {
        console.error('Fallback copy error:', error);
      }
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

  // Generate field key from label
  const generateFieldKey = (label) => {
    return label
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ')     // Normalize spaces
      .trim()
      .split(' ')
      .filter(word => word.length > 0)
      .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  };

  // Generate template slug from badge name
  const generateTemplateSlug = (badgeName) => {
    return badgeName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove chars that aren't letters, numbers, spaces, or hyphens
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
      .trim();
  };

  // Metadata field management
  const addMetadataField = () => {
    const newField = {
      id: Date.now().toString(), // Temporary ID for frontend
      fieldKeyForInstanceData: '',
      label: '',
      prefix: '',
      suffix: '',
      displayOrder: metadataFields.length,
      customKey: false // Track if user manually set the key
    };
    setMetadataFields(prev => [...prev, newField]);
  };

  const updateMetadataField = (id, field, value) => {
    setMetadataFields(prev => prev.map(f => {
      if (f.id !== id) return f;
      
      const updated = { ...f, [field]: value };
      
      // Auto-generate key from label if not manually customized
      if (field === 'label' && !f.customKey) {
        updated.fieldKeyForInstanceData = generateFieldKey(value);
      }
      
      return updated;
    }));
  };

  const setCustomFieldKey = (id, customKey) => {
    setMetadataFields(prev => prev.map(f => 
      f.id === id ? { ...f, fieldKeyForInstanceData: customKey, customKey: true } : f
    ));
  };

  // Check for duplicate field keys
  const getDuplicateKeys = () => {
    const keys = metadataFields
      .filter(f => f.fieldKeyForInstanceData)
      .map(f => f.fieldKeyForInstanceData);
    return keys.filter((key, index) => keys.indexOf(key) !== index);
  };

  const removeMetadataField = (id) => {
    setMetadataFields(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate metadata field keys
    const duplicateKeys = getDuplicateKeys();
    if (duplicateKeys.length > 0) {
      setError(`Duplicate field keys detected: ${duplicateKeys.join(', ')}. Each field key must be unique.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const templateData = {
        // Only send fields that exist in the database schema
        templateSlug: template.templateSlug,
        defaultBadgeName: template.defaultBadgeName,
        defaultSubtitleText: template.defaultSubtitleText,
        defaultDisplayDescription: template.defaultDisplayDescription,
        defaultOuterShape: template.defaultOuterShape,
        inherentTier: template.inherentTier,
        definesMeasure: template.definesMeasure,
        measureLabel: template.measureLabel,
        measureBest: template.measureBest,
        measureWorst: template.measureWorst,
        measureNotes: template.measureNotes,
        measureIsNormalizable: template.measureIsNormalizable,
        higherIsBetter: template.higherIsBetter,
        measureBestLabel: template.measureBestLabel,
        measureWorstLabel: template.measureWorstLabel,
        allowsPushedInstanceUpdates: template.allowsPushedInstanceUpdates,
        internalNotes: template.internalNotes,
        
        ownerType: 'USER',
        ownerId: user.id,
        authoredByUserId: user.id,
        
        // New unified config objects
        defaultBorderConfig: createSimpleColorConfig(template.defaultBorderColor),
        defaultBackgroundConfig: template.defaultBackgroundType === BackgroundContentType.HOSTED_IMAGE
          ? createHostedAssetConfig(template.defaultBackgroundValue)
          : createSimpleColorConfig(template.defaultBackgroundValue),
        defaultForegroundConfig: buildForegroundConfig(),
        
        
        // Include metadata field definitions (with validation)
        metadataFieldDefinitions: metadataFields
          .filter(f => f.fieldKeyForInstanceData && f.label)
          .map(f => ({
            fieldKeyForInstanceData: f.fieldKeyForInstanceData,
            label: f.label,
            prefix: f.prefix || null,
            suffix: f.suffix || null,
            displayOrder: f.displayOrder
          }))
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
    
    // For rendering - Let BadgeDisplay handle SVG fetching
    foregroundType: template.defaultForegroundType,
    foregroundValue: template.defaultForegroundType === ForegroundContentType.UPLOADED_ICON
      ? (displayableForegroundSvg || template.defaultForegroundValue) // Use transformed SVG if available, otherwise upload reference
      : systemIconName || template.defaultForegroundValue, // Always use the original icon name for system icons
    
    // Config objects for preview
    borderConfig: createSimpleColorConfig(template.defaultBorderColor),
    backgroundConfig: template.defaultBackgroundType === BackgroundContentType.HOSTED_IMAGE
      ? createHostedAssetConfig(uploadedBackgroundUrl || template.defaultBackgroundValue)
      : createSimpleColorConfig(template.defaultBackgroundValue),
    foregroundConfig: (
      (iconSvgColorData && iconSvgColorData.elementColorMap && Object.keys(iconSvgColorData.elementColorMap).length > 0)
        ? createElementPathConfig(iconSvgColorData.elementColorMap)
        : (systemIconColorData && systemIconColorData.elementColorMap && Object.keys(systemIconColorData.elementColorMap).length > 0)
          ? createElementPathConfig(systemIconColorData.elementColorMap) 
          : createSimpleColorConfig(template.defaultForegroundType === ForegroundContentType.UPLOADED_ICON 
              ? '#000000' 
              : template.defaultForegroundColor)
    ),
    
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
                  <label>Template Slug:</label>
                  <div style={{ marginTop: '5px' }}>
                    <code style={{ 
                      background: '#f8f9fa', 
                      padding: '4px 8px', 
                      borderRadius: '3px',
                      border: '1px solid #e9ecef',
                      fontSize: '14px'
                    }}>
                      {template.templateSlug || (template.defaultBadgeName ? generateTemplateSlug(template.defaultBadgeName) : 'enter-badge-name')}
                    </code>
                    {slugWasIncremented && !template.customSlug && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#ffc107' }}>
                        ⚠️ (duplicate found; number appended)
                      </span>
                    )}
                    {template.defaultBadgeName && !template.customSlug && (
                      <button
                        type="button"
                        onClick={() => {
                          const customSlug = prompt('Enter custom template slug:', template.templateSlug || generateTemplateSlug(template.defaultBadgeName));
                          if (customSlug && customSlug.trim() && customSlug.match(/^[a-z0-9-]+$/)) {
                            setCustomSlug(customSlug.trim());
                            setSlugWasIncremented(false); // Reset increment flag when manually set
                          } else if (customSlug !== null) {
                            alert('Template slug must contain only lowercase letters, numbers, and hyphens');
                          }
                        }}
                        style={{
                          marginLeft: '8px',
                          padding: '2px 6px',
                          fontSize: '11px',
                          background: '#f8f9fa',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          color: '#495057'
                        }}
                      >
                        ⚙️ edit
                      </button>
                    )}
                    {template.customSlug && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#28a745' }}>
                        ✓ custom
                      </span>
                    )}
                  </div>
                  <small style={{ color: '#6c757d', fontSize: '12px' }}>
                    Unique identifier for this template (used in URLs)
                  </small>
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

                {/* Only show simple foreground color picker for TEXT type */}
                {template.defaultForegroundType === ForegroundContentType.TEXT && (
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
                
                {/* System Icon Color Customization */}
                {template.defaultForegroundType === ForegroundContentType.SYSTEM_ICON && systemIconColorData && systemIconColorData.elementColorMap && Object.keys(systemIconColorData.elementColorMap).length > 0 && (
                  <SvgColorCustomization
                    title="System Icon Color Customization"
                    elementColorMap={systemIconColorData.elementColorMap}
                    gradientDefinitions={systemIconColorData.gradientDefinitions || {}}
                    onColorChange={(updatedColorMap) => {
                      setSystemIconColorData(prev => ({
                        ...prev,
                        elementColorMap: updatedColorMap,
                        lastUpdated: Date.now() // Force re-render
                      }));
                    }}
                  />
                )}
              </div>

              {/* Advanced Settings - Collapsible Section */}
              <details className="control-section" style={{ marginTop: '30px' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  marginBottom: '20px',
                  outline: 'none',
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '6px',
                  userSelect: 'none'
                }}>
                  ⚙️ Advanced Settings
                </summary>
                
                {/* Measure Configuration */}
                <div className="control-section" style={{ marginTop: '20px' }}>
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
                      <small>How this metric will be labeled when displayed</small>
                    </div>

                    <div className="control-group">
                      <label htmlFor="higherIsBetter">Value Direction:</label>
                      <select
                        id="higherIsBetter"
                        name="higherIsBetter"
                        value={template.higherIsBetter === null ? '' : template.higherIsBetter.toString()}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : e.target.value === 'true';
                          setTemplate(prev => ({ ...prev, higherIsBetter: value }));
                        }}
                      >
                        <option value="">Not specified</option>
                        <option value="true">Higher values are better</option>
                        <option value="false">Lower values are better</option>
                      </select>
                      <small>Whether higher or lower values represent better performance</small>
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
                        placeholder="e.g., 100 (for scores), 1 (for ranks)"
                      />
                      <small>The best possible value for this measure</small>
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
                        placeholder="e.g., 0 (for scores), 100 (for ranks)"
                      />
                      <small>The worst possible value for this measure</small>
                    </div>

                    <div className="control-group">
                      <label htmlFor="measureBestLabel">Best Value Label:</label>
                      <input
                        type="text"
                        id="measureBestLabel"
                        name="measureBestLabel"
                        value={template.measureBestLabel}
                        onChange={handleInputChange}
                        placeholder="e.g., Perfect Score, Top Rank"
                      />
                      <small>How the best value is described</small>
                    </div>

                    <div className="control-group">
                      <label htmlFor="measureWorstLabel">Worst Value Label:</label>
                      <input
                        type="text"
                        id="measureWorstLabel"
                        name="measureWorstLabel"
                        value={template.measureWorstLabel}
                        onChange={handleInputChange}
                        placeholder="e.g., No Score, Lowest Rank"
                      />
                      <small>How the worst value is described</small>
                    </div>

                    <div className="control-group">
                      <label>
                        <input
                          type="checkbox"
                          name="measureIsNormalizable"
                          checked={template.measureIsNormalizable || false}
                          onChange={handleInputChange}
                        />
                        Values can be normalized (0-1 scale)
                      </label>
                      <small>Whether this measure can be converted to a 0-1 scale for comparisons</small>
                    </div>

                    <div className="control-group">
                      <label htmlFor="measureNotes">Measure Notes:</label>
                      <textarea
                        id="measureNotes"
                        name="measureNotes"
                        value={template.measureNotes}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Explain how this measure is calculated or what it represents..."
                      />
                      <small>Technical notes about how this measure works</small>
                    </div>
                  </>
                )}
              </div>

              {/* Template Behavior */}
              <div className="control-section">
                <h3>Template Behavior</h3>
                
                {/* Hidden: We're not using template propagation for now */}
                {/* <div className="control-group checkbox-row">
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
                </div> */}

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

              {/* Metadata Fields */}
              <div className="control-section">
                <h3>Metadata Fields</h3>
                <p>Define additional information that can be collected when giving this badge.</p>
                
                {getDuplicateKeys().length > 0 && (
                  <div style={{
                    background: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '4px',
                    padding: '10px',
                    marginBottom: '15px',
                    color: '#856404'
                  }}>
                    <strong>⚠️ Warning:</strong> Duplicate field keys detected: {getDuplicateKeys().join(', ')}
                    <br />
                    <small>Each field key must be unique within this template.</small>
                  </div>
                )}
                
                {metadataFields.map(field => (
                  <div key={field.id} className="metadata-field-item" style={{
                    border: '1px solid #ddd',
                    padding: '15px',
                    marginBottom: '10px',
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: '0', fontSize: '16px' }}>Metadata Field</h4>
                      <button
                        type="button"
                        onClick={() => removeMetadataField(field.id)}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '5px 10px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="control-group">
                      <label>Field Label:</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateMetadataField(field.id, 'label', e.target.value)}
                        placeholder="e.g., Date Achieved, Player Score"
                      />
                      <small>What users will see when giving this badge</small>
                      {field.label && (
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                          Generated key: <code>{field.fieldKeyForInstanceData || generateFieldKey(field.label)}</code>
                          {!field.customKey && (
                            <button
                              type="button"
                              onClick={() => {
                                const customKey = prompt('Enter custom field key:', field.fieldKeyForInstanceData || generateFieldKey(field.label));
                                if (customKey && customKey.trim() && customKey.match(/^[a-zA-Z][a-zA-Z0-9_]*$/)) {
                                  setCustomFieldKey(field.id, customKey.trim());
                                } else if (customKey !== null) {
                                  alert('Field key must start with a letter and contain only letters, numbers, and underscores');
                                }
                              }}
                              style={{
                                marginLeft: '8px',
                                padding: '2px 6px',
                                fontSize: '11px',
                                background: '#f8f9fa',
                                border: '1px solid #ccc',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                color: '#495057'
                              }}
                            >
                              ⚙️ edit
                            </button>
                          )}
                          {field.customKey && (
                            <span style={{ marginLeft: '8px', fontSize: '11px', color: '#28a745' }}>
                              (custom)
                            </span>
                          )}
                        </small>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div className="control-group" style={{ flex: 1 }}>
                        <label>Prefix (optional):</label>
                        <input
                          type="text"
                          value={field.prefix}
                          onChange={(e) => updateMetadataField(field.id, 'prefix', e.target.value)}
                          placeholder="e.g., $, #"
                        />
                      </div>
                      
                      <div className="control-group" style={{ flex: 1 }}>
                        <label>Suffix (optional):</label>
                        <input
                          type="text"
                          value={field.suffix}
                          onChange={(e) => updateMetadataField(field.id, 'suffix', e.target.value)}
                          placeholder="e.g., points, %"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addMetadataField}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginTop: '10px'
                  }}
                >
                  + Add Metadata Field
                </button>
              </div>
              
              </details>

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
              
              {/* Template Details - commented out as redundant with form content
              <div className="preview-info">
                <h3>Template Details</h3>
                <p><strong>Slug:</strong> {template.templateSlug}</p>
                <p><strong>Tier:</strong> {template.inherentTier || 'None'}</p>
                <p><strong>Measure Tracking:</strong> {template.definesMeasure ? 'Enabled' : 'Disabled'}</p>
              </div>
              */}

              <details className="api-preview-section" style={{ marginTop: '20px' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  outline: 'none'
                }}>
                  🔌 API Integration (Advanced)
                </summary>
                <div style={{ marginTop: '15px' }}>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                    Use this JSON to create badge templates programmatically:
                  </p>
                
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
              </details>
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