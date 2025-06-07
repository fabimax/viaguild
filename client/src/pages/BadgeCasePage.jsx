import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BadgeNavigation from '../components/BadgeNavigation';
import BadgeCase from '../components/BadgeCase';
import badgeService from '../services/badgeService';

const BadgeCasePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { currentUser: user, token } = useAuth();
  
  const [badgeCase, setBadgeCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isOwnPage = user && user.username.toLowerCase() === username.toLowerCase();
  
  useEffect(() => {
    if (isOwnPage && (!user || !token)) {
      navigate('/login');
      return;
    }
    
    fetchBadgeCase();
  }, [username, token, isOwnPage]);

  const fetchBadgeCase = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const caseData = await badgeService.getUserBadgeCase(username);
      setBadgeCase(caseData);
    } catch (err) {
      console.error('Error fetching badge case:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromCase = async (badgeInstanceId) => {
    try {
      await badgeService.removeBadgeFromCase(username, badgeInstanceId);
      await fetchBadgeCase();
    } catch (err) {
      console.error('Error removing badge from case:', err);
      setError(err.message);
    }
  };

  const handleReorderBadges = async (orderData) => {
    try {
      await badgeService.reorderBadgeCase(username, orderData);
      await fetchBadgeCase();
    } catch (err) {
      console.error('Error reordering badges:', err);
      setError(err.message);
    }
  };

  const handleToggleVisibility = async (isPublic) => {
    try {
      await badgeService.toggleBadgeCaseVisibility(username, isPublic);
      setBadgeCase(prev => ({ ...prev, isPublic }));
    } catch (err) {
      console.error('Error toggling visibility:', err);
      setError(err.message);
    }
  };

  const handleDeleteBadge = async (badgeInstanceId) => {
    if (!confirm('Are you sure you want to delete this badge permanently? This action cannot be undone.')) {
      return;
    }

    try {
      await badgeService.deleteBadgePermanently(username, badgeInstanceId);
      await fetchBadgeCase();
    } catch (err) {
      console.error('Error deleting badge:', err);
      setError(err.message);
    }
  };

  return (
    <div className="badge-case-page">
      <div className="page-header">
        <h1>{isOwnPage ? 'Your' : `${username}'s`} Badge Case</h1>
        <p>Showcase of achievements and recognition</p>
      </div>

      <BadgeNavigation />

      <div className="page-content">
        <BadgeCase
          badgeCase={badgeCase}
          onRemoveFromCase={isOwnPage ? handleRemoveFromCase : undefined}
          onReorderBadges={isOwnPage ? handleReorderBadges : undefined}
          onToggleVisibility={isOwnPage ? handleToggleVisibility : undefined}
          onDelete={isOwnPage ? handleDeleteBadge : undefined}
          loading={loading}
          error={error}
          isOwnCase={isOwnPage}
        />
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

export default BadgeCasePage;