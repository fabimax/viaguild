import React, { useState, useEffect } from 'react';
import BadgeDisplay from './guilds/BadgeDisplay';
import systemIconService from '../services/systemIcon.service';

/**
 * Individual badge card component that renders a badge with metadata
 * @param {Object} props - Component props
 * @param {Object} props.badge - Badge instance data with displayProps
 * @param {boolean} props.showActions - Whether to show management actions
 * @param {Function} props.onAddToCase - Callback when adding badge to case
 * @param {Function} props.onRemoveFromCase - Callback when removing badge from case
 * @param {Function} props.onDelete - Callback when deleting badge
 * @param {boolean} props.isInCase - Whether badge is currently in the case
 * @param {string} props.className - Additional CSS classes
 */
const BadgeCard = ({
  badge,
  showActions = false,
  onAddToCase,
  onRemoveFromCase,
  onDelete,
  isInCase = false,
  className = ''
}) => {
  const { displayProps } = badge;
  const [badgePropsForDisplay, setBadgePropsForDisplay] = useState(null);
  
  // Prepare badge props for BadgeDisplay component
  useEffect(() => {
    const prepareBadgeProps = async () => {
      const props = {
        name: displayProps.name,
        subtitle: displayProps.subtitle,
        shape: displayProps.shape,
        borderColor: displayProps.borderColor,
        backgroundType: displayProps.backgroundType,
        backgroundValue: displayProps.backgroundValue,
        foregroundType: displayProps.foregroundType,
        foregroundValue: displayProps.foregroundValue,
        foregroundColor: displayProps.foregroundColor,
        foregroundScale: 100
      };
      
      // If it's a system icon, load the SVG content
      if (displayProps.foregroundType === 'SYSTEM_ICON' && displayProps.foregroundValue) {
        try {
          const svg = await systemIconService.getSystemIconSvg(displayProps.foregroundValue);
          // Replace currentColor with the specified foreground color
          const coloredSvg = svg.replace(/currentColor/g, displayProps.foregroundColor || '#000000');
          props.foregroundValue = coloredSvg;
        } catch (err) {
          console.error('Failed to load system icon:', err);
          props.foregroundValue = null;
        }
      }
      
      setBadgePropsForDisplay(props);
    };
    
    prepareBadgeProps();
  }, [displayProps]);
  

  // Format metadata for display
  const formatMetadata = () => {
    if (!displayProps.metadata || displayProps.metadata.length === 0) {
      return null;
    }
    
    return displayProps.metadata.map((meta, index) => (
      <div key={meta.key || index} className="badge-metadata-item">
        <span className="badge-metadata-label">{meta.label}</span>
        <span className="badge-metadata-value">
          {meta.prefix || ''}{meta.value}{meta.suffix || ''}
        </span>
      </div>
    ));
  };

  // Format measure value if present
  const formatMeasure = () => {
    if (displayProps.measureValue === null || displayProps.measureValue === undefined) {
      return null;
    }

    return (
      <div className="badge-measure">
        <span className="badge-measure-label">
          {displayProps.measureLabel || 'Score'}:
        </span>
        <span className="badge-measure-value">
          {displayProps.measureValue}
        </span>
        {displayProps.measureBest && (
          <span className="badge-measure-range">
            / {displayProps.measureBest}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`badge-card ${className}`}>
      <div className="badge-card-visual">
        {badgePropsForDisplay ? (
          <BadgeDisplay badge={badgePropsForDisplay} />
        ) : (
          <div className="badge-loading" style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span>Loading...</span>
          </div>
        )}
        
        {displayProps.tier && (
          <div className={`badge-tier badge-tier-${displayProps.tier.toLowerCase()}`}>
            {displayProps.tier}
          </div>
        )}
      </div>

      <div className="badge-card-content">
        <h3 className="badge-card-title">{displayProps.name}</h3>
        
        {displayProps.subtitle && (
          <p className="badge-card-subtitle">{displayProps.subtitle}</p>
        )}
        
        {displayProps.description && (
          <p className="badge-card-description">{displayProps.description}</p>
        )}

        {formatMeasure()}
        
        <div className="badge-metadata">
          {formatMetadata()}
        </div>

        <div className="badge-card-info">
          <small className="badge-awarded-date">
            Awarded: {badge.assignedAt ? new Date(badge.assignedAt).toLocaleDateString() : 'Unknown'}
          </small>
          
          {badge.message && (
            <p className="badge-message">"{badge.message}"</p>
          )}
        </div>
      </div>

      {showActions && (
        <div className="badge-card-actions">
          {!isInCase ? (
            <button 
              onClick={() => onAddToCase?.(badge.id)}
              className="btn btn-primary btn-sm"
              title="Add to Badge Case"
            >
              Add to Case
            </button>
          ) : (
            <button 
              onClick={() => onRemoveFromCase?.(badge.id)}
              className="btn btn-secondary btn-sm"
              title="Remove from Badge Case"
            >
              Remove from Case
            </button>
          )}
          
          <button 
            onClick={() => onDelete?.(badge.id)}
            className="btn btn-danger btn-sm"
            title="Delete Badge Permanently"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default BadgeCard;