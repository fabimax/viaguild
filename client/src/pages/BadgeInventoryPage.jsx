import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BadgeNavigation from '../components/BadgeNavigation';
import BadgeInventory from '../components/BadgeInventory';
import badgeService from '../services/badgeService';

const BadgeInventoryPage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { currentUser: user, token } = useAuth();
  
  const [badges, setBadges] = useState([]);
  const [badgeCase, setBadgeCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isOwnPage = user && user.username.toLowerCase() === username.toLowerCase();
  
  useEffect(() => {
    if (!isOwnPage) {
      navigate(`/users/${username}/badges/badgecase`);
      return;
    }
    
    if (!user || !token) {
      navigate('/login');
      return;
    }
    
    fetchBadgeData();
  }, [username, token, isOwnPage]);

  const fetchBadgeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
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

  const handleAddToCase = async (badgeInstanceId) => {
    try {
      await badgeService.addBadgeToCase(username, badgeInstanceId);
      await fetchBadgeData();
    } catch (err) {
      console.error('Error adding badge to case:', err);
      setError(err.message);
    }
  };

  const handleDeleteBadge = async (badgeInstanceId) => {
    if (!confirm('Are you sure you want to delete this badge permanently? This action cannot be undone.')) {
      return;
    }

    try {
      await badgeService.deleteBadgePermanently(username, badgeInstanceId);
      await fetchBadgeData();
    } catch (err) {
      console.error('Error deleting badge:', err);
      setError(err.message);
    }
  };

  const caseBadgeIds = badgeCase?.badges.map(item => item.id) || [];

  if (!isOwnPage) {
    return null;
  }

  return (
    <div className="badge-inventory-page">
      <div className="page-header">
        <h1>Badge Inventory</h1>
        <p>All your received badges - manage and organize your collection</p>
      </div>

      <BadgeNavigation />

      <div className="page-content">
        <BadgeInventory
          badges={badges}
          caseBadgeIds={caseBadgeIds}
          onAddToCase={handleAddToCase}
          onDelete={handleDeleteBadge}
          loading={loading}
          error={error}
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

export default BadgeInventoryPage;