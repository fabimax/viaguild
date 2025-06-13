import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BadgeNavigation from '../components/BadgeNavigation';
import BadgeDisplay from '../components/guilds/BadgeDisplay';
import BadgeCard from '../components/BadgeCard';
import BadgeGiveModal from '../components/BadgeGiveModal';
import badgeService from '../services/badgeService';

const BadgeTemplatesPage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { currentUser: user, token } = useAuth();
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    archived: false,
    tier: '',
    search: ''
  });
  const [giveModalOpen, setGiveModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  const isOwnPage = user && user.username.toLowerCase() === username.toLowerCase();
  
  useEffect(() => {
    if (!isOwnPage || !user || !token) {
      navigate('/login');
      return;
    }
    
    fetchTemplates();
  }, [user, token, isOwnPage, navigate]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const templatesData = await badgeService.getUserBadgeTemplates(username);
      
      // Add a usage count placeholder (would need a separate API endpoint for actual counts)
      const templatesWithUsage = templatesData.map(template => ({
        ...template,
        usageCount: 0 // TODO: Fetch actual usage count from API
      }));
      
      setTemplates(templatesWithUsage);
    } catch (err) {
      console.error('Error fetching badge templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveTemplate = async (templateId) => {
    try {
      const template = templates.find(t => t.id === templateId);
      await badgeService.updateBadgeTemplate(templateId, {
        isArchived: !template.isArchived
      });
      await fetchTemplates();
    } catch (err) {
      console.error('Error archiving template:', err);
      setError(err.message);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      await badgeService.deleteBadgeTemplate(templateId);
      await fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err.message);
    }
  };

  const handleDuplicateTemplate = async (templateId) => {
    try {
      // TODO: Implement API call to duplicate template
      console.log('Duplicating template:', templateId);
      await fetchTemplates();
    } catch (err) {
      console.error('Error duplicating template:', err);
      setError(err.message);
    }
  };

  const handleGiveBadge = (template) => {
    setSelectedTemplate(template);
    setGiveModalOpen(true);
  };

  const handleModalClose = () => {
    setGiveModalOpen(false);
    setSelectedTemplate(null);
  };

  const handleBadgeGiven = () => {
    // Optionally refresh templates to update usage count
    fetchTemplates();
  };

  const filteredTemplates = templates.filter(template => {
    if (filters.archived !== template.isArchived) return false;
    if (filters.tier && template.inherentTier !== filters.tier) return false;
    if (filters.search && !template.defaultBadgeName.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  // Format template for BadgeCard component
  const formatTemplateForCard = (template) => ({
    id: template.id,
    displayProps: {
      name: template.defaultBadgeName,
      subtitle: template.defaultSubtitleText,
      description: template.defaultDisplayDescription,
      shape: template.defaultOuterShape,
      borderColor: template.defaultBorderColor,
      backgroundType: template.defaultBackgroundType,
      backgroundValue: template.defaultBackgroundValue,
      foregroundType: template.defaultForegroundType,
      foregroundValue: template.defaultForegroundValue,
      foregroundColor: template.defaultForegroundColor,
      foregroundColorConfig: template.defaultForegroundColorConfig, // Include color config
      tier: template.inherentTier,
      measureLabel: template.measureLabel,
      metadata: []
    }
  });

  if (!isOwnPage) {
    return null;
  }

  return (
    <div className="badge-templates-page">
      <div className="page-header">
        <h1>Badge Templates</h1>
        <p>Manage your badge templates and track their usage</p>
        <Link 
          to={`/users/${username}/badges/create`}
          className="btn-primary"
        >
          Create New Template
        </Link>
      </div>

      <BadgeNavigation />

      <div className="page-content">
        {/* Filters */}
        <div className="templates-filters">
          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={filters.archived}
                onChange={(e) => setFilters(prev => ({ ...prev, archived: e.target.checked }))}
              />
              Show Archived
            </label>
          </div>
          
          <div className="filter-group">
            <select
              value={filters.tier}
              onChange={(e) => setFilters(prev => ({ ...prev, tier: e.target.value }))}
            >
              <option value="">All Tiers</option>
              <option value="GOLD">Gold</option>
              <option value="SILVER">Silver</option>
              <option value="BRONZE">Bronze</option>
            </select>
          </div>
          
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search templates..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="loading">Loading templates...</div>
        ) : error ? (
          <div className="error">Error: {error}</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="empty-state">
            <h3>No templates found</h3>
            <p>
              {templates.length === 0 
                ? "You haven't created any badge templates yet."
                : "No templates match your current filters."
              }
            </p>
            {templates.length === 0 && (
              <Link 
                to={`/users/${username}/badges/create`}
                className="btn-primary"
              >
                Create Your First Template
              </Link>
            )}
          </div>
        ) : (
          <div className="templates-grid">
            {filteredTemplates.map(template => (
              <div key={template.id} className="template-card">
                <BadgeCard
                  badge={formatTemplateForCard(template)}
                  showActions={false}
                  className="template-badge-card"
                />
                
                <div className="template-info">
                  <div className="template-meta">
                    <span className="template-usage">
                      Used {template.usageCount} times
                    </span>
                    {template.definesMeasure && (
                      <span className="template-measure">
                        Tracks: {template.measureLabel}
                      </span>
                    )}
                  </div>
                  
                  <div className="template-slug">
                    Slug: <code>{template.templateSlug}</code>
                  </div>
                </div>
                
                <div className="template-actions">
                  <button 
                    onClick={() => handleGiveBadge(template)}
                    className="btn-primary btn-small"
                  >
                    Give Badge
                  </button>
                  
                  <div className="template-menu">
                    <button className="btn-secondary btn-small">
                      Actions ▼
                    </button>
                    <div className="template-menu-dropdown">
                      <button onClick={() => navigate(`/users/${username}/badges/create?edit=${template.id}`)}>
                        Edit
                      </button>
                      <button onClick={() => handleDuplicateTemplate(template.id)}>
                        Duplicate
                      </button>
                      <button onClick={() => navigate(`/users/${username}/badges/templates/${template.id}/instances`)}>
                        View Instances
                      </button>
                      <hr />
                      <button 
                        onClick={() => handleArchiveTemplate(template.id)}
                        className={template.isArchived ? 'restore' : 'archive'}
                      >
                        {template.isArchived ? 'Restore' : 'Archive'}
                      </button>
                      {template.usageCount === 0 && (
                        <button 
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="delete"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="error-dismiss">×</button>
        </div>
      )}

      {/* Badge Give Modal */}
      {giveModalOpen && selectedTemplate && (
        <BadgeGiveModal
          isOpen={giveModalOpen}
          onClose={handleModalClose}
          template={selectedTemplate}
          onSuccess={handleBadgeGiven}
        />
      )}
    </div>
  );
};

export default BadgeTemplatesPage;