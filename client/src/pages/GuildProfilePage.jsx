import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Edit, X } from 'lucide-react';
import GuildService from '../services/guild.service';
import AvatarUpload from '../components/AvatarUpload';
import './GuildProfilePage.css'; // Import the CSS file
import BadgeDisplay from '../components/guilds/BadgeDisplay'; // Import BadgeDisplay

const GuildProfilePage = () => {
  const { identifier } = useParams(); // Get identifier from URL (e.g., /guilds/some-guild-name)
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Permission and edit states
  const [permissions, setPermissions] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form data
  const [editForm, setEditForm] = useState({
    name: '',
    displayName: '',
    description: '',
    avatar: null
  });

  useEffect(() => {
    const fetchGuildProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch guild profile
        const guildData = await GuildService.getGuildPublicProfile(identifier);
        console.log('Guild data received:', guildData);
        setGuild(guildData);
        
        // Try to fetch permissions if user is authenticated
        const token = localStorage.getItem('token');
        console.log('Auth token exists:', !!token);
        console.log('Guild ID:', guildData.id);
        
        if (token && guildData.id) {
          try {
            console.log('Fetching permissions for guild:', guildData.id);
            const userPermissions = await GuildService.getMyGuildPermissions(guildData.id);
            console.log('User permissions received:', userPermissions);
            setPermissions(userPermissions);
            const hasEditPermission = userPermissions.permissions.includes('GUILD_EDIT_DETAILS');
            console.log('Has GUILD_EDIT_DETAILS permission:', hasEditPermission);
            setCanEdit(hasEditPermission);
          } catch (permError) {
            // User might not be a member of this guild, which is fine
            console.log('User permissions error:', permError);
            console.error('Permission fetch error:', permError.message);
          }
        } else {
          console.log('Cannot fetch permissions - missing token or guild ID');
        }
        
        // Initialize edit form with current guild data
        setEditForm({
          name: guildData.name || '',
          displayName: guildData.displayName || '',
          description: guildData.description || '',
          avatar: guildData.avatar
        });
        
      } catch (err) {
        console.error('Failed to fetch guild profile:', err);
        setError(err.message || 'Failed to fetch guild profile. Guild may not exist or another error occurred.');
      } finally {
        setLoading(false);
      }
    };

    if (identifier) {
      fetchGuildProfile();
    }
  }, [identifier]);

  // Handle opening edit modal
  const handleEditOpen = () => {
    setEditForm({
      name: guild.name || '',
      displayName: guild.displayName || '',
      description: guild.description || '',
      avatar: guild.avatar
    });
    setEditModalOpen(true);
  };

  // Handle closing edit modal
  const handleEditClose = () => {
    setEditModalOpen(false);
    setEditForm({
      name: guild.name || '',
      displayName: guild.displayName || '',
      description: guild.description || '',
      avatar: guild.avatar
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle avatar change
  const handleAvatarChange = (newAvatarUrl) => {
    setEditForm(prev => ({
      ...prev,
      avatar: newAvatarUrl
    }));
  };

  // Handle saving changes
  const handleSave = async () => {
    if (!guild?.id) {
      console.error('No guild ID available for update');
      return;
    }
    
    console.log('Saving guild changes:', editForm);
    setSaving(true);
    
    try {
      const updatedGuild = await GuildService.updateGuild(guild.id, editForm);
      console.log('Guild updated successfully:', updatedGuild);
      setGuild(updatedGuild);
      setEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update guild:', err);
      setError(err.message || 'Failed to update guild');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="guild-profile-page text-center">Loading guild profile...</div>; // Added text-center for basic centering
  }

  if (error) {
    // Basic error styling, can be enhanced with a specific error class
    return <div className="guild-profile-page text-center" style={{ color: 'red' }}>Error: {error}</div>;
  }

  if (!guild) {
    return <div className="guild-profile-page text-center">Guild not found.</div>;
  }

  // Debug logging
  console.log('Render - canEdit:', canEdit);
  console.log('Render - permissions:', permissions);
  console.log('Render - guild:', guild);

  return (
    <div className="guild-profile-page">
      <div className="guild-info-card">
        <div className="guild-header">
          {guild.avatar ? (
            <img 
              src={guild.avatar} 
              alt={`${guild.displayName || guild.name}'s avatar`} 
              className="guild-avatar-large"
            />
          ) : (
             <div className="guild-avatar-placeholder-large">
              {guild.displayName ? guild.displayName.charAt(0).toUpperCase() : (guild.name ? guild.name.charAt(0).toUpperCase() : '?')}
            </div>
          )}
          <div className="guild-details">
            <div className="guild-header-top">
              <div>
                <h1 className="guild-display-name">{guild.displayName || guild.name}</h1>
                {guild.name && guild.displayName && guild.name.toLowerCase() !== guild.displayName.toLowerCase() && (
                  <p className="guild-name-tag">@{guild.name}</p>
                )}
              </div>
              {canEdit && (
                <button 
                  className="edit-guild-button"
                  onClick={handleEditOpen}
                  title="Edit Guild"
                >
                  <Edit size={20} />
                  Edit Guild
                </button>
              )}
            </div>
            <p className="guild-description">{guild.description || 'No description available.'}</p>
          </div>
        </div>
      </div>

      {/* Members List Section */}
      {guild.members && guild.members.length > 0 && (
        <div className="members-section">
          <h2>Members ({guild.memberCount || guild.members.length})</h2>
          <div className="members-table-container">
            <table className="members-table">
              <thead>
                <tr>
                  <th className="avatar-column">{/* Avatar */}</th>
                  <th>User</th>
                  <th>Highest Role</th>
                  <th>Rank</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {guild.members.map((member) => (
                  <tr key={member.user.id}>
                    <td>
                      {member.user.avatar ? (
                        <img 
                          src={member.user.avatar} 
                          alt={`${member.user.displayName || member.user.username}'s avatar`} 
                          className="member-avatar"
                        />
                      ) : (
                        <div className="member-avatar-placeholder">
                          {(member.user.displayName || member.user.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="member-user-info">
                        <div className="username">{member.user.displayName || member.user.username}</div>
                        {member.user.displayName && member.user.username && member.user.displayName.toLowerCase() !== member.user.username.toLowerCase() && (
                           <div className="actual-username">@{member.user.username}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      {member.highestRole && (
                        <span 
                          className="role-badge"
                          style={{
                            backgroundColor: member.highestRole.color || '#A0AEC0', // Default gray if no color
                          }}
                        >
                          {member.highestRole.name}
                        </span>
                      )}
                    </td>
                    <td>{member.rank}</td>
                    <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {guild.members && guild.members.length === 0 && (
        <div className="no-members-message">
          <p>This guild has no members yet.</p>
        </div>
      )}

      {/* Badge Case Section */}
      {guild.badgeCase && guild.badgeCase.badges && guild.badgeCase.isPublic && (
        <div className="badge-case-section">
          <h2>{guild.badgeCase.title || 'Badge Case'}</h2>
          {guild.badgeCase.badges.length > 0 ? (
            <div className="badge-case-grid">
              {guild.badgeCase.badges.map(badgeItem => (
                <BadgeDisplay key={badgeItem.instanceId} badge={badgeItem} />
              ))}
            </div>
          ) : (
            <div className="no-badges-message">
              <p>This guild hasn't displayed any badges yet.</p>
            </div>
          )}
        </div>
      )}
      {guild.badgeCase && !guild.badgeCase.isPublic && (
        <div className="badge-case-section no-badges-message">
            <p>This guild's badge case is private.</p>
        </div>
      )}
      {!guild.badgeCase && (
         <div className="badge-case-section no-badges-message">
            <p>This guild does not have a badge case.</p>
        </div>
      )}

      {/* Edit Guild Modal */}
      {editModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Guild</h2>
              <button 
                className="modal-close"
                onClick={handleEditClose}
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="guild-name">Guild Name</label>
                <input
                  type="text"
                  id="guild-name"
                  name="name"
                  value={editForm.name}
                  onChange={handleInputChange}
                  placeholder="Enter guild name"
                  className="form-input"
                />
                <small className="form-hint">Guild names must be unique across ViaGuild</small>
              </div>

              <div className="form-group">
                <label htmlFor="guild-display-name">Display Name</label>
                <input
                  type="text"
                  id="guild-display-name"
                  name="displayName"
                  value={editForm.displayName}
                  onChange={handleInputChange}
                  placeholder="Enter display name"
                  className="form-input"
                />
                <small className="form-hint">This is how your guild appears to others</small>
              </div>

              <div className="form-group">
                <label htmlFor="guild-description">Description</label>
                <textarea
                  id="guild-description"
                  name="description"
                  value={editForm.description}
                  onChange={handleInputChange}
                  placeholder="Describe your guild..."
                  rows="4"
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label>Guild Avatar</label>
                <AvatarUpload
                  currentAvatar={editForm.avatar}
                  onAvatarChange={handleAvatarChange}
                  uploadType="guild"
                  guildId={guild?.id}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="button button-secondary"
                onClick={handleEditClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="button button-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GuildProfilePage; 