import React, { useState, useMemo } from 'react';
import BadgeCard from './BadgeCard';

/**
 * Badge inventory component - displays all badges not currently in the badge case
 * @param {Object} props - Component props
 * @param {Array} props.badges - Array of all received badges
 * @param {Array} props.caseBadgeIds - Array of badge IDs currently in the case
 * @param {Function} props.onAddToCase - Callback when adding badge to case
 * @param {Function} props.onDelete - Callback when deleting badge
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 */
const BadgeInventory = ({
  badges = [],
  caseBadgeIds = [],
  onAddToCase,
  onDelete,
  loading = false,
  error = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Filter badges that are not in the case
  const inventoryBadges = useMemo(() => {
    const caseIds = new Set(caseBadgeIds);
    return badges.filter(badge => !caseIds.has(badge.id));
  }, [badges, caseBadgeIds]);

  // Apply search, filter, and sort
  const filteredAndSortedBadges = useMemo(() => {
    let filtered = inventoryBadges;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(badge => 
        badge.displayProps.name.toLowerCase().includes(search) ||
        badge.displayProps.description?.toLowerCase().includes(search) ||
        badge.templateSlug.toLowerCase().includes(search)
      );
    }

    // Apply tier filter
    if (filterTier) {
      filtered = filtered.filter(badge => 
        badge.displayProps.tier === filterTier.toUpperCase()
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.assignedAt) - new Date(b.assignedAt));
        break;
      case 'name':
        filtered.sort((a, b) => a.displayProps.name.localeCompare(b.displayProps.name));
        break;
      case 'tier':
        const tierOrder = { 'GOLD': 3, 'SILVER': 2, 'BRONZE': 1 };
        filtered.sort((a, b) => {
          const tierA = tierOrder[a.displayProps.tier] || 0;
          const tierB = tierOrder[b.displayProps.tier] || 0;
          return tierB - tierA;
        });
        break;
      default:
        break;
    }

    return filtered;
  }, [inventoryBadges, searchTerm, filterTier, sortBy]);

  // Get unique tiers for filter dropdown
  const availableTiers = useMemo(() => {
    const tiers = new Set();
    inventoryBadges.forEach(badge => {
      if (badge.displayProps.tier) {
        tiers.add(badge.displayProps.tier);
      }
    });
    return Array.from(tiers).sort();
  }, [inventoryBadges]);

  if (loading) {
    return (
      <div className="badge-inventory">
        <div className="badge-inventory-header">
          <h2>Badge Inventory</h2>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading badges...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="badge-inventory">
        <div className="badge-inventory-header">
          <h2>Badge Inventory</h2>
        </div>
        <div className="error-state">
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="badge-inventory">
      <div className="badge-inventory-header">
        <h2>Badge Inventory</h2>
        <p className="badge-inventory-subtitle">
          {inventoryBadges.length} badge{inventoryBadges.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {inventoryBadges.length > 0 && (
        <div className="badge-inventory-controls">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search badges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-controls">
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="filter-select"
            >
              <option value="">All Tiers</option>
              {availableTiers.map(tier => (
                <option key={tier} value={tier}>
                  {tier.charAt(0) + tier.slice(1).toLowerCase()}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
              <option value="tier">Tier (Gold first)</option>
            </select>
          </div>
        </div>
      )}

      <div className="badge-inventory-content">
        {filteredAndSortedBadges.length === 0 ? (
          <div className="empty-state">
            {inventoryBadges.length === 0 ? (
              <div className="no-badges">
                <h3>No badges in inventory</h3>
                <p>All your badges are currently displayed in your badge case, or you haven't received any badges yet.</p>
              </div>
            ) : (
              <div className="no-results">
                <h3>No badges match your search</h3>
                <p>Try adjusting your search terms or filters.</p>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterTier('');
                  }}
                  className="btn btn-secondary"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="badge-grid">
            {filteredAndSortedBadges.map(badge => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                showActions={true}
                onAddToCase={onAddToCase}
                onDelete={onDelete}
                isInCase={false}
                className="inventory-badge-card"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgeInventory;