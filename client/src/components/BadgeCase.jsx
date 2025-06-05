import React, { useState } from 'react';
import BadgeCard from './BadgeCard';

/**
 * Badge case component - displays and manages the user's public badge showcase
 * @param {Object} props - Component props
 * @param {Object} props.badgeCase - Badge case object with badges array
 * @param {Function} props.onRemoveFromCase - Callback when removing badge from case
 * @param {Function} props.onReorderBadges - Callback when reordering badges
 * @param {Function} props.onToggleVisibility - Callback when toggling case visibility
 * @param {Function} props.onDelete - Callback when deleting badge
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 * @param {boolean} props.isOwnCase - Whether this is the current user's own badge case
 */
const BadgeCase = ({
  badgeCase,
  onRemoveFromCase,
  onReorderBadges,
  onToggleVisibility,
  onDelete,
  loading = false,
  error = null,
  isOwnCase = false
}) => {
  const [draggedBadge, setDraggedBadge] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Handle drag start
  const handleDragStart = (e, badge, index) => {
    if (!isOwnCase) return;
    
    setDraggedBadge({ badge, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  // Handle drag over
  const handleDragOver = (e, index) => {
    if (!isOwnCase || !draggedBadge) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  // Handle drop
  const handleDrop = (e, dropIndex) => {
    if (!isOwnCase || !draggedBadge) return;
    
    e.preventDefault();
    setDragOverIndex(null);
    
    const { index: dragIndex } = draggedBadge;
    
    if (dragIndex === dropIndex) {
      setDraggedBadge(null);
      return;
    }

    // Create new order array
    const badges = [...badgeCase.badges];
    const [draggedItem] = badges.splice(dragIndex, 1);
    badges.splice(dropIndex, 0, draggedItem);
    
    // Update display orders
    const reorderedBadges = badges.map((badge, index) => ({
      badgeInstanceId: badge.id,
      displayOrder: index + 1
    }));
    
    onReorderBadges?.(reorderedBadges);
    setDraggedBadge(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedBadge(null);
    setDragOverIndex(null);
  };

  if (loading) {
    return (
      <div className="badge-case">
        <div className="badge-case-header">
          <h2>Badge Case</h2>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading badge case...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="badge-case">
        <div className="badge-case-header">
          <h2>Badge Case</h2>
        </div>
        <div className="error-state">
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  const badges = badgeCase?.badges || [];

  return (
    <div className="badge-case">
      <div className="badge-case-header">
        <div className="badge-case-title">
          <h2>{badgeCase?.title || 'Badge Case'}</h2>
          {isOwnCase && (
            <div className="visibility-toggle">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={badgeCase?.isPublic || false}
                  onChange={(e) => onToggleVisibility?.(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
              <span className="visibility-label">
                {badgeCase?.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
          )}
        </div>
        
        <p className="badge-case-subtitle">
          {badges.length} badge{badges.length !== 1 ? 's' : ''} on display
        </p>
        
        {isOwnCase && badges.length > 1 && (
          <p className="drag-hint">
            <small>💡 Drag and drop badges to reorder them</small>
          </p>
        )}
      </div>

      <div className="badge-case-content">
        {badges.length === 0 ? (
          <div className="empty-badge-case">
            <div className="empty-case-icon">🏆</div>
            <h3>
              {isOwnCase ? 'Your badge case is empty' : 'No badges on display'}
            </h3>
            <p>
              {isOwnCase 
                ? 'Add badges from your inventory to showcase your achievements!'
                : 'This user hasn\'t added any badges to their public display yet.'
              }
            </p>
          </div>
        ) : (
          <div className="badge-case-grid">
            {badges.map((badge, index) => (
              <div
                key={badge.id}
                className={`badge-case-slot ${
                  dragOverIndex === index ? 'drag-over' : ''
                } ${draggedBadge?.index === index ? 'dragging' : ''}`}
                draggable={isOwnCase}
                onDragStart={(e) => handleDragStart(e, badge, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onDragLeave={() => setDragOverIndex(null)}
              >
                <BadgeCard
                  badge={badge}
                  showActions={isOwnCase}
                  onRemoveFromCase={onRemoveFromCase}
                  onDelete={onDelete}
                  isInCase={true}
                  className="case-badge-card"
                />
                
                {isOwnCase && (
                  <div className="badge-case-controls">
                    <span className="badge-position">#{index + 1}</span>
                    <button
                      onClick={() => onRemoveFromCase?.(badge.id)}
                      className="remove-badge-btn"
                      title="Remove from case"
                      aria-label="Remove badge from case"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isOwnCase && !badgeCase?.isPublic && (
        <div className="privacy-notice">
          <p>
            <strong>Private:</strong> Your badge case is currently private. 
            Only you can see these badges. Toggle the switch above to make it public.
          </p>
        </div>
      )}
    </div>
  );
};

export default BadgeCase;