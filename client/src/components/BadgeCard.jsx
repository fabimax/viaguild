import React, { useState, useEffect } from 'react';
import BadgeDisplay from './guilds/BadgeDisplay';
import systemIconService from '../services/systemIcon.service';
import { applySvgColorTransform, isSvgContent } from '../utils/svgColorTransform';
import { useAuth } from '../contexts/AuthContext';
import badgeService from '../services/badgeService';

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
  const { token } = useAuth();
  const [resolvedBadge, setResolvedBadge] = useState(null);
  
  useEffect(() => {
    const resolveBadgeUrls = async () => {
      // Handle both direct config (legacy) and displayProps structure
      const foregroundConfig = badge.foregroundConfig || badge.displayProps?.foregroundConfig;
      let resolvedFgConfig = foregroundConfig;

      // If the foreground is an uploaded icon, resolve its URL
      if (
        foregroundConfig &&
        (foregroundConfig.type === 'static-image-asset' || foregroundConfig.type === 'customizable-svg') &&
        foregroundConfig.url &&
        foregroundConfig.url.startsWith('upload://')
      ) {
        try {
          const assetId = foregroundConfig.url.replace('upload://', '');
          const realUrl = await badgeService.getAssetUrl(assetId);
          
          if (realUrl) {
            resolvedFgConfig = { ...foregroundConfig, url: realUrl };
          } else {
            // Asset doesn't exist, remove the URL to prevent broken display
            resolvedFgConfig = { ...foregroundConfig, url: null };
          }
        } catch (error) {
          console.warn('Failed to resolve asset URL:', error);
          // Asset resolution failed, remove the URL to prevent broken display
          resolvedFgConfig = { ...foregroundConfig, url: null };
        }
      }

      // Update the resolved badge with the proper structure
      if (badge.displayProps) {
        setResolvedBadge({
          ...badge,
          displayProps: {
            ...badge.displayProps,
            foregroundConfig: resolvedFgConfig
          }
        });
      } else {
        setResolvedBadge({
          ...badge,
          foregroundConfig: resolvedFgConfig
        });
      }
    };

    resolveBadgeUrls();
  }, [badge]);

  // Format metadata for display
  const formatMetadata = () => {
    if (!badge.metadata || badge.metadata.length === 0) {
      return null;
    }
    
    return badge.metadata.map((meta, index) => (
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
    if (badge.measureValue === null || badge.measureValue === undefined) {
      return null;
    }

    return (
      <div className="badge-measure">
        <span className="badge-measure-label">
          {badge.measureLabel || 'Score'}:
        </span>
        <span className="badge-measure-value">
          {badge.measureValue}
        </span>
        {badge.measureBest && (
          <span className="badge-measure-range">
            / {badge.measureBest}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`badge-card ${className}`}>
      <div className="badge-card-visual">
        {resolvedBadge ? (
          <BadgeDisplay badge={resolvedBadge.displayProps} />
        ) : (
          <div className="badge-loading" style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span>Loading...</span>
          </div>
        )}
        
        {badge.tier && (
          <div className={`badge-tier badge-tier-${badge.tier.toLowerCase()}`}>
            {badge.tier}
          </div>
        )}
      </div>

      <div className="badge-card-content">
        <h3 className="badge-card-title">{badge.name}</h3>
        
        {badge.subtitle && (
          <p className="badge-card-subtitle">{badge.subtitle}</p>
        )}
        
        {badge.description && (
          <p className="badge-card-description">{badge.description}</p>
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
          
          {!isInCase && (
            <button 
              onClick={() => onDelete?.(badge.id)}
              className="btn btn-danger btn-sm"
              title="Delete Badge Permanently"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BadgeCard;