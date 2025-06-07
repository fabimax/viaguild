import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BadgeCase from '../components/BadgeCase';
import BadgeInventory from '../components/BadgeInventory';
import badgeService from '../services/badgeService';

/**
 * Badge management page - main page for managing user badges and badge case
 */
const BadgeManagementPage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { currentUser: user, token } = useAuth();
  
  const [activeTab, setActiveTab] = useState('case');
  const [badges, setBadges] = useState([]);
  const [badgeCase, setBadgeCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if this is the current user's own badge management page
  const isOwnPage = user && user.username.toLowerCase() === username.toLowerCase();
  
  // Debug logging
  console.log('BadgeManagementPage Debug:', { 
    user, 
    token: !!token, 
    username, 
    userUsername: user?.username,
    isOwnPage 
  });
  
  // Redirect to new badge case structure
  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    
    if (!isOwnPage) {
      // Redirect to user's own badge case page
      navigate(`/users/${user.username}/badges/badgecase`);
      return;
    } else {
      // Redirect own page to badge case
      navigate(`/users/${username}/badges/badgecase`);
      return;
    }
  }, [user, token, isOwnPage, navigate, username]);

  // Fetch user badges and badge case
  useEffect(() => {
    if (!isOwnPage || !token) return;
    
    fetchBadgeData();
  }, [username, token, isOwnPage]);

  const fetchBadgeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all received badges and badge case in parallel
      const [badgesData, caseData] = await Promise.all([
        badgeService.getUserReceivedBadges(username),
        badgeService.getUserBadgeCase(username)
      ]);

      setBadges(badgesData);
      setBadgeCase(caseData);
    } catch (err) {
      console.error('Error fetching badge data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add badge to case
  const handleAddToCase = async (badgeInstanceId) => {
    try {
      await badgeService.addBadgeToCase(username, badgeInstanceId);
      // Refresh badge data
      await fetchBadgeData();
    } catch (err) {
      console.error('Error adding badge to case:', err);
      setError(err.message);
    }
  };

  // Remove badge from case
  const handleRemoveFromCase = async (badgeInstanceId) => {
    try {
      await badgeService.removeBadgeFromCase(username, badgeInstanceId);
      // Refresh badge data
      await fetchBadgeData();
    } catch (err) {
      console.error('Error removing badge from case:', err);
      setError(err.message);
    }
  };

  // Reorder badges in case
  const handleReorderBadges = async (orderData) => {
    try {
      await badgeService.reorderBadgeCase(username, orderData);
      // Refresh badge data
      await fetchBadgeData();
    } catch (err) {
      console.error('Error reordering badges:', err);
      setError(err.message);
    }
  };

  // Toggle badge case visibility
  const handleToggleVisibility = async (isPublic) => {
    try {
      await badgeService.toggleBadgeCaseVisibility(username, isPublic);
      // Update local state
      setBadgeCase(prev => ({ ...prev, isPublic }));
    } catch (err) {
      console.error('Error toggling visibility:', err);
      setError(err.message);
    }
  };

  // Delete badge permanently
  const handleDeleteBadge = async (badgeInstanceId) => {
    if (!confirm('Are you sure you want to delete this badge permanently? This action cannot be undone.')) {
      return;
    }

    try {
      await badgeService.deleteBadgePermanently(username, badgeInstanceId);
      // Refresh badge data
      await fetchBadgeData();
    } catch (err) {
      console.error('Error deleting badge:', err);
      setError(err.message);
    }
  };

  // Get badge IDs currently in the case
  const caseBadgeIds = badgeCase?.badges.map(item => item.id) || [];

  if (!user || !isOwnPage) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="badge-management-page">
      <div className="page-header">
        <h1>Manage Your Badges</h1>
        <p>Organize your badge collection and showcase your achievements</p>
      </div>

      <div className="badge-management-tabs">
        <button
          className={`tab-button ${activeTab === 'case' ? 'active' : ''}`}
          onClick={() => setActiveTab('case')}
        >
          Badge Case
          {badgeCase && (
            <span className="tab-count">({badgeCase.badges?.length || 0})</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
          <span className="tab-count">
            ({badges.length - caseBadgeIds.length})
          </span>
        </button>
      </div>

      <div className="badge-management-content">
        {activeTab === 'case' && (
          <BadgeCase
            badgeCase={badgeCase}
            onRemoveFromCase={handleRemoveFromCase}
            onReorderBadges={handleReorderBadges}
            onToggleVisibility={handleToggleVisibility}
            onDelete={handleDeleteBadge}
            loading={loading}
            error={error}
            isOwnCase={true}
          />
        )}

        {activeTab === 'inventory' && (
          <BadgeInventory
            badges={badges}
            caseBadgeIds={caseBadgeIds}
            onAddToCase={handleAddToCase}
            onDelete={handleDeleteBadge}
            loading={loading}
            error={error}
          />
        )}
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="error-dismiss">
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default BadgeManagementPage;