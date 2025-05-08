import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  Users, 
  Settings, 
  Star, 
  Mail,
  FileText,
  Search,
  Bell,
  Edit,
  User,
  LogOut,
  X,
  MoreHorizontal,
  UserPlus,
  ExternalLink,
  MessageSquare,
  Briefcase,
  Network,
  Upload,
  Link
} from 'lucide-react';

// Main App Component
const GuildOverview = () => {
  // State hooks
  const [activeTab, setActiveTab] = useState(0); // For description, relationships, contacts tabs
  const [membersExpanded, setMembersExpanded] = useState(false);
  const [badgesExpanded, setBadgesExpanded] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [memberActionOpen, setMemberActionOpen] = useState(null);
  
  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteTabActive, setInviteTabActive] = useState('direct'); // 'direct' or 'link'
  const [editGuildModalOpen, setEditGuildModalOpen] = useState(false);
  const [editDescriptionModalOpen, setEditDescriptionModalOpen] = useState(false);
  const [editContactsModalOpen, setEditContactsModalOpen] = useState(false);
  const [showAddContactDropdown, setShowAddContactDropdown] = useState(false);
  
  // Form states for Edit Guild modal
  const [guildNameInput, setGuildNameInput] = useState('Design Masters');
  const [avatarPreview, setAvatarPreview] = useState(null);
  
  // Toggle dropdown without affecting other dropdowns
  const toggleDropdown = (setter, state, id = null) => {
    // If providing an id, toggle based on matching that id
    if (id !== null) {
      setter(state === id ? null : id);
    } else {
      setter(!state);
    }
    
    // Close other dropdowns
    if (setter !== setUserMenuOpen) setUserMenuOpen(false);
    if (setter !== setNotificationsOpen) setNotificationsOpen(false);
    if (setter !== setMemberActionOpen) setMemberActionOpen(null);
  };
  
  // Close all dropdowns when clicking outside
  const handleOutsideClick = (e) => {
    if (!e.target.closest('.dropdown')) {
      setUserMenuOpen(false);
      setNotificationsOpen(false);
      setMemberActionOpen(null);
    }
  };
  
  // Member data
  const members = [
    { id: 1, name: 'Jane Smith', initials: 'JS', color: '#4f46e5', role: 'Owner' },
    { id: 2, name: 'Alex Johnson', initials: 'AJ', color: '#8b5cf6', role: 'Admin' },
    { id: 3, name: 'Sarah Thompson', initials: 'ST', color: '#ec4899', role: 'Admin' },
    { id: 4, name: 'Michael Parker', initials: 'MP', color: '#0ea5e9', role: 'Member' },
    { id: 5, name: 'Emma Lewis', initials: 'EL', color: '#f97316', role: 'Member' },
  ];
  
  // Badge data - expanded with more badges
  const badges = [
    { id: 1, name: 'Design Excellence', count: 42, color: '#f59e0b', shape: 'circle', giverInitial: 'T' },
    { id: 2, name: 'Mentor\'s Star', count: 27, color: '#94a3b8', shape: 'star', giverInitial: 'G' },
    { id: 3, name: 'Community Contributor', count: 35, color: '#b45309', shape: 'heart', giverInitial: 'A' },
    { id: 4, name: 'Innovative Concept', count: 19, color: '#14b8a6', shape: 'hexagon', giverInitial: 'S' },
    { id: 5, name: 'Challenge Winner', count: 23, color: '#8b5cf6', shape: 'circle', giverInitial: 'J' },
    { id: 6, name: 'UI Master', count: 17, color: '#14b8a6', shape: 'star', giverInitial: 'L' },
    { id: 7, name: 'Supportive Critic', count: 31, color: '#ec4899', shape: 'heart', giverInitial: 'P' },
    { id: 8, name: 'Resource Contributor', count: 12, color: '#0ea5e9', shape: 'hexagon', giverInitial: 'M' },
    { id: 9, name: 'Design Trend Setter', count: 9, color: '#f97316', shape: 'circle', giverInitial: 'K' },
    { id: 10, name: 'Outstanding Feedback', count: 21, color: '#f43f5e', shape: 'star', giverInitial: 'R' },
    // Additional badges to show when expanded
    { id: 11, name: 'Visual Storyteller', count: 14, color: '#84cc16', shape: 'hexagon', giverInitial: 'B' },
    { id: 12, name: 'Code Artisan', count: 8, color: '#3b82f6', shape: 'star', giverInitial: 'C' },
    { id: 13, name: 'Design Pioneer', count: 15, color: '#a78bfa', shape: 'circle', giverInitial: 'D' },
    { id: 14, name: 'Pattern Creator', count: 11, color: '#f97316', shape: 'heart', giverInitial: 'E' },
    { id: 15, name: 'Accessibility Advocate', count: 26, color: '#06b6d4', shape: 'hexagon', giverInitial: 'F' }
  ];

  // Number of badges to show in collapsed state
  const collapsedBadgeCount = 10;
  
  // Relationship data
  const relationships = [
    { id: 1, name: 'UI Innovators', initials: 'UI', color: '#8b5cf6', type: 'partner' },
    { id: 2, name: 'Creative Pros', initials: 'CP', color: '#ec4899', type: 'parent' },
    { id: 3, name: 'Design Thinking', initials: 'DT', color: '#0ea5e9', type: 'child' },
    { id: 4, name: 'Frontend Artists', initials: 'FA', color: '#f97316', type: 'cluster' },
    { id: 5, name: 'UX Research Lab', initials: 'UX', color: '#f43f5e', type: 'rival' },
    { id: 6, name: 'Illustration Club', initials: 'IC', color: '#14b8a6', type: 'cluster' },
    { id: 7, name: 'Icon Designers', initials: 'ID', color: '#eab308', type: 'child' },
    { id: 8, name: 'Typography Union', initials: 'TU', color: '#a855f7', type: 'partner' }
  ];
  
  // Render relationship type label
  const renderRelationshipType = (type) => {
    const types = {
      partner: { class: 'relationship-partner', label: 'Partner' },
      parent: { class: 'relationship-parent', label: 'Parent' },
      child: { class: 'relationship-child', label: 'Child' },
      cluster: { class: 'relationship-cluster', label: 'Cluster' },
      rival: { class: 'relationship-rival', label: 'Rival' }
    };
    
    return (
      <div className={`relationship-type ${types[type].class}`}>
        {types[type].label}
      </div>
    );
  };
  
  // Render the role style
  const getRoleClass = (role) => {
    switch(role) {
      case 'Owner': return 'role-owner';
      case 'Admin': return 'role-admin';
      default: return 'role-member';
    }
  };
  
  // Tab titles for the guild info section
  const infoTabs = ["Description", "Relationships", "Contacts"];
  
  // Handle file input for avatar upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Badge shape rendering
  const renderBadgeShape = (badge) => {
    switch(badge.shape) {
      case 'circle':
        return (
          <>
            <div className="badge-circle-border" style={{ backgroundColor: badge.color }}></div>
            <div className="badge-circle-inner">
              <img src={`/api/placeholder/80/80`} alt={`${badge.name} badge`} />
            </div>
          </>
        );
      case 'star':
        return (
          <>
            <div className="badge-star-border" style={{ backgroundColor: badge.color }}></div>
            <div className="badge-star-inner">
              <img src={`/api/placeholder/80/80`} alt={`${badge.name} badge`} />
            </div>
          </>
        );
      case 'heart':
        return (
          <>
            <div className="badge-heart-border" style={{ backgroundColor: badge.color }}></div>
            <div className="badge-heart-inner">
              <img src={`/api/placeholder/80/80`} alt={`${badge.name} badge`} />
            </div>
          </>
        );
      case 'hexagon':
        return (
          <>
            <div className="badge-hexagon-border" style={{ backgroundColor: badge.color }}></div>
            <div className="badge-hexagon-inner">
              <img src={`/api/placeholder/80/80`} alt={`${badge.name} badge`} />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="guild-overview" onClick={handleOutsideClick}>
      {/* Header */}
      <header>
        <div className="logo">ViaGuild</div>
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search users or guilds..." />
        </div>
        <div className="user-menu">
          <div className="notifications dropdown">
            <div className="dropdown-toggle" onClick={() => toggleDropdown(setNotificationsOpen, notificationsOpen)}>
              <Bell size={24} />
              <div className="notification-badge">3</div>
            </div>
            {notificationsOpen && (
              <div className="dropdown-menu active">
                <div className="dropdown-item">
                  <div style={{ color: '#4f46e5' }}>
                    <Users size={16} />
                  </div>
                  <div>
                    <div><strong>Writers Club</strong> invited you</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>2 hours ago</div>
                  </div>
                </div>
                <div className="dropdown-item">
                  <div style={{ color: '#f59e0b' }}>
                    <Star size={16} />
                  </div>
                  <div>
                    <div>You received a <strong>Gold Badge</strong></div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Yesterday</div>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item" style={{ justifyContent: 'center' }}>
                  <a href="#" style={{ color: '#4f46e5', textDecoration: 'none' }}>View all notifications</a>
                </div>
              </div>
            )}
          </div>
          <div className="avatar dropdown">
            <div className="dropdown-toggle" onClick={() => toggleDropdown(setUserMenuOpen, userMenuOpen)}>JS</div>
            {userMenuOpen && (
              <div className="dropdown-menu active">
                <div className="dropdown-item">
                  <User size={16} />
                  <span>Profile</span>
                </div>
                <div className="dropdown-item">
                  <Briefcase size={16} />
                  <span>My Guilds</span>
                </div>
                <div className="dropdown-item">
                  <Settings size={16} />
                  <span>Settings</span>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item">
                  <LogOut size={16} />
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <div className="container">
        <div className="page-header">
          <div>
            <div className="breadcrumb">
              <a href="/dashboard">Dashboard</a>
              <ChevronRight size={16} />
              <a href="/guilds">Guilds</a>
              <ChevronRight size={16} />
              <span>Design Masters</span>
            </div>
            <h1 className="page-title">Design Masters Management</h1>
          </div>
        </div>
        
        <div className="management-grid">
          {/* Sidebar Navigation */}
          <div className="sidebar">
            <h2 className="sidebar-title">Guild Management</h2>
            <ul className="sidebar-menu">
              <li className="sidebar-menu-item">
                <a href="#" className="sidebar-menu-link active">
                  <Briefcase size={18} />
                  Overview
                </a>
              </li>
              <li className="sidebar-menu-item">
                <a href="#" className="sidebar-menu-link">
                  <Users size={18} />
                  Members
                </a>
              </li>
              <li className="sidebar-menu-item">
                <a href="#" className="sidebar-menu-link">
                  <Network size={18} />
                  Relationships
                </a>
              </li>
              <li className="sidebar-menu-item">
                <a href="#" className="sidebar-menu-link">
                  <Mail size={18} />
                  Invitations
                </a>
              </li>
              <li className="sidebar-menu-item">
                <a href="#" className="sidebar-menu-link">
                  <Star size={18} />
                  Badges
                </a>
              </li>
              <li className="sidebar-menu-item">
                <a href="#" className="sidebar-menu-link">
                  <Settings size={18} />
                  Settings
                </a>
              </li>
            </ul>
          </div>
          
          {/* Main Content */}
          <div className="content">
            {/* Guild Profile Card */}
            <div className="card">
              <div className="guild-profile-header">
                <div className="guild-avatar-large">D</div>
                <div className="guild-info">
                  <h2 className="guild-name">Design Masters</h2>
                  <div className="guild-meta">
                    <div className="guild-meta-item">
                      <Users size={18} />
                      125 members
                    </div>
                    <div className="guild-meta-item">
                      <FileText size={18} />
                      Created Jan 15, 2025
                    </div>
                  </div>
                  <div className="guild-actions">
                    <button 
                      className="button button-secondary button-small"
                      onClick={() => setEditGuildModalOpen(true)}
                    >
                      <Edit size={18} />
                      Edit Guild
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Tabbed Interface for Description, Relationships, Contacts */}
              <div className="guild-tabs">
                <div className="tab-header">
                  {infoTabs.map((tab, index) => (
                    <div 
                      key={index}
                      className={`tab ${activeTab === index ? 'active-tab' : ''}`}
                      onClick={() => setActiveTab(index)}
                    >
                      {tab}
                    </div>
                  ))}
                </div>
                
                {/* Description Tab */}
                <div className={`tab-content ${activeTab === 0 ? 'active-tab-content' : ''}`}>
                  <div className="guild-description">
                    <p>Design Masters is a collaborative community for designers of all disciplines. We focus on sharing knowledge, critique, and growth opportunities for UI/UX designers, graphic artists, illustrators, and more. Our members range from beginners looking to learn to seasoned professionals willing to mentor and share their expertise.</p>
                    <p style={{ marginTop: '0.75rem' }}>We regularly organize challenges, portfolio reviews, and skill-sharing sessions to help our members improve their craft and stay up-to-date with industry trends.</p>
                    <div className="action-row">
                      <button className="pill-button" onClick={() => setEditDescriptionModalOpen(true)}>
                        <Edit size={16} />
                        Edit Description
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Relationships Tab */}
                <div className={`tab-content ${activeTab === 1 ? 'active-tab-content' : ''}`}>
                  <div className="section-header">
                    <h3 className="section-subtitle">Guild Relationships</h3>
                    <div>
                      <a href="#" className="section-link">
                        <span>Manage All</span>
                        <ChevronRight size={16} />
                      </a>
                    </div>
                  </div>
                  <div className="relationship-grid">
                    {relationships.map(relationship => (
                      <div className="relationship-card" key={relationship.id}>
                        <div className="small-guild-avatar" style={{ backgroundColor: relationship.color }}>
                          {relationship.initials}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '0.95rem' }}>{relationship.name}</h3>
                          {renderRelationshipType(relationship.type)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Contacts Tab */}
                <div className={`tab-content ${activeTab === 2 ? 'active-tab-content' : ''}`}>
                  <div className="contact-grid">
                    <div className="contact-item">
                      <div className="contact-icon contact-discord">
                        <MessageSquare size={20} />
                      </div>
                      <div className="contact-details">
                        <div className="contact-label">Discord</div>
                        <div className="contact-value">
                          <a href="#" target="_blank">discord.gg/designmasters</a>
                        </div>
                      </div>
                    </div>
                    
                    <div className="contact-item">
                      <div className="contact-icon contact-twitter">
                        <MessageSquare size={20} />
                      </div>
                      <div className="contact-details">
                        <div className="contact-label">Twitter</div>
                        <div className="contact-value">
                          <a href="#" target="_blank">@DesignMasters</a>
                        </div>
                      </div>
                    </div>
                    
                    <div className="contact-item">
                      <div className="contact-icon contact-website">
                        <ExternalLink size={20} />
                      </div>
                      <div className="contact-details">
                        <div className="contact-label">Website</div>
                        <div className="contact-value">
                          <a href="#" target="_blank">designmasters.community</a>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="action-row">
                    <button className="pill-button" onClick={() => setEditContactsModalOpen(true)}>
                      <Edit size={16} />
                      Edit Contacts
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Badge Showcase Section (moved before Members) */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Badge Showcase</h2>
                <div>
                  <a href="#" className="section-link">
                    <span>Manage All</span>
                    <ChevronRight size={16} />
                  </a>
                </div>
              </div>
              
              <div style={{ overflow: 'hidden', transition: 'max-height 0.3s ease-in-out' }}>
                <div className="badge-grid">
                  {badges.slice(0, badgesExpanded ? badges.length : collapsedBadgeCount).map(badge => (
                    <div key={badge.id} className="badge-item">
                      <div className="badge-display">
                        {renderBadgeShape(badge)}
                        {badge.giverInitial && (
                          <div className="badge-giver-avatar">
                            {badge.giverInitial}
                          </div>
                        )}
                      </div>
                      <h3 className="badge-title">{badge.name}</h3>
                      <div className="badge-count">{badge.count} received</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="show-more" onClick={() => setBadgesExpanded(!badgesExpanded)}>
                {badgesExpanded ? 'Show Less' : 'Show All Badges'}
              </div>
              
              <div className="action-row">
                <button className="pill-button">
                  <Edit size={16} />
                  Edit Showcase
                </button>
              </div>
            </div>
            
            {/* Members Section (now after badges) */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Members</h2>
                <div>
                  <a href="#" className="section-link">
                    <span>Manage All</span>
                    <ChevronRight size={16} />
                  </a>
                </div>
              </div>
              
              <div className="accordion-header" onClick={() => setMembersExpanded(!membersExpanded)}>
                <div className="accordion-title">
                  <Users size={20} />
                  <span>Guild Members</span>
                  <span className="section-tag">125 total</span>
                </div>
                {membersExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              
              <div className={`accordion-content ${membersExpanded ? 'expanded' : ''}`}>
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => (
                      <tr key={member.id}>
                        <td>
                          <div className="table-user">
                            <div className="avatar" style={{ backgroundColor: member.color }}>{member.initials}</div>
                            <div>{member.name}</div>
                          </div>
                        </td>
                        <td className="member-role-cell">
                          <div className={`member-role ${getRoleClass(member.role)}`}>{member.role}</div>
                        </td>
                        <td>
                          <div className="dropdown">
                            <button 
                              className="pill-button dropdown-toggle" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDropdown(setMemberActionOpen, memberActionOpen, member.id);
                              }}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {memberActionOpen === member.id && (
                              <div className="dropdown-menu active">
                                <div className="dropdown-item">
                                  <Edit size={14} />
                                  <span>Change Role</span>
                                </div>
                                <div className="dropdown-item">
                                  <Star size={14} />
                                  <span>Give Badge</span>
                                </div>
                                <div className="dropdown-divider"></div>
                                <div className="dropdown-item" style={{ color: 'var(--danger)' }}>
                                  <X size={14} />
                                  <span>Kick</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="action-row">
                <button className="pill-button" onClick={() => setInviteModalOpen(true)}>
                  <UserPlus size={16} />
                  Invite Member
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Guild Modal */}
      {editGuildModalOpen && (
        <div className="modal-backdrop active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Edit Guild</h3>
              <button className="modal-close" onClick={() => setEditGuildModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label" htmlFor="guild-name">Guild Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  id="guild-name" 
                  value={guildNameInput}
                  onChange={(e) => setGuildNameInput(e.target.value)}
                  placeholder="Enter guild name" 
                />
                <div className="form-hint">Guild names must be unique across ViaGuild</div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Guild Avatar</label>
                <div className="avatar-upload-container">
                  <div className="avatar-preview">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" />
                    ) : (
                      <div className="guild-avatar-preview">D</div>
                    )}
                  </div>
                  <div className="avatar-upload-button">
                    <label htmlFor="avatar-upload" className="button button-secondary">
                      <Upload size={16} />
                      Upload Image
                    </label>
                    <input 
                      type="file" 
                      id="avatar-upload" 
                      accept="image/*" 
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }} 
                    />
                    <div className="form-hint">
                      Recommended: Square image, at least 200x200px (PNG, JPG)
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="button button-secondary" onClick={() => setEditGuildModalOpen(false)}>Cancel</button>
              <button className="button button-primary" onClick={() => setEditGuildModalOpen(false)}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Invite Member Modal with Tabbed Interface */}
      {inviteModalOpen && (
        <div className="modal-backdrop active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Invite New Member</h3>
              <button className="modal-close" onClick={() => setInviteModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {/* Tab navigation */}
              <div className="pill-tabs">
                <div 
                  className={`pill-tab ${inviteTabActive === 'direct' ? 'active' : ''}`} 
                  onClick={() => setInviteTabActive('direct')}
                >
                  <User size={16} />
                  Direct Invite
                </div>
                <div 
                  className={`pill-tab ${inviteTabActive === 'link' ? 'active' : ''}`}
                  onClick={() => setInviteTabActive('link')}
                >
                  <Link size={16} />
                  Invite Link
                </div>
              </div>
              
              {/* Direct Invite Tab Content */}
              {inviteTabActive === 'direct' && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="invite-type">Platform</label>
                    <select className="form-input" id="invite-type">
                      <option value="viaguild">ViaGuild Username</option>
                      <option value="twitter">Twitter Handle</option>
                      <option value="bluesky">Bluesky Handle</option>
                      <option value="discord">Discord Handle</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="invite-value">Username/Handle</label>
                    <input type="text" className="form-input" id="invite-value" placeholder="Enter username or handle" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="invite-role-direct">Role</label>
                    <select className="form-input" id="invite-role-direct">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="invite-message">Invitation Message (Optional)</label>
                    <textarea className="form-textarea" id="invite-message" rows="3" placeholder="Add a personal message to your invitation..."></textarea>
                  </div>
                </>
              )}
              
              {/* Invite Link Tab Content */}
              {inviteTabActive === 'link' && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="invite-role-link">Role</label>
                    <select className="form-input" id="invite-role-link">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="invite-expiration">Expiration</label>
                      <select className="form-input" id="invite-expiration">
                        <option value="30min">30 minutes</option>
                        <option value="1hour">1 hour</option>
                        <option value="6hours">6 hours</option>
                        <option value="12hours">12 hours</option>
                        <option value="24hours">24 hours</option>
                        <option value="1week" selected>1 week</option>
                        <option value="30days">30 days</option>
                        <option value="never">Never expires</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="invite-uses">Max Uses</label>
                      <select className="form-input" id="invite-uses">
                        <option value="1" selected>1 use only</option>
                        <option value="5">5 uses</option>
                        <option value="10">10 uses</option>
                        <option value="25">25 uses</option>
                        <option value="50">50 uses</option>
                        <option value="100">100 uses</option>
                        <option value="unlimited">Unlimited</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Generated Link</label>
                    <div className="generated-link-container">
                      <input
                        type="text"
                        className="form-input"
                        readOnly
                        value="https://viaguild.com/join/..." // Placeholder, would be generated
                        placeholder="Link will appear here after generation"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="button button-secondary" onClick={() => setInviteModalOpen(false)}>Cancel</button>
              {inviteTabActive === 'direct' ? (
                <button className="button button-primary">Send Invitation</button>
              ) : (
                <button className="button button-primary">Generate Link</button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Description Modal */}
      {editDescriptionModalOpen && (
        <div className="modal-backdrop active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Edit Guild Description</h3>
              <button className="modal-close" onClick={() => setEditDescriptionModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label" htmlFor="guild-description">Description</label>
                <textarea 
                  className="form-textarea" 
                  id="guild-description" 
                  rows="6"
                  defaultValue="Design Masters is a collaborative community for designers of all disciplines. We focus on sharing knowledge, critique, and growth opportunities for UI/UX designers, graphic artists, illustrators, and more. Our members range from beginners looking to learn to seasoned professionals willing to mentor and share their expertise.

We regularly organize challenges, portfolio reviews, and skill-sharing sessions to help our members improve their craft and stay up-to-date with industry trends."
                ></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Description Tips</label>
                <ul style={{ paddingLeft: '1rem', fontSize: '0.875rem', color: 'var(--secondary)' }}>
                  <li>Keep it clear and concise, under 1000 characters</li>
                  <li>Explain the purpose and activities of your guild</li>
                  <li>Mention what type of members you welcome</li>
                  <li>Consider adding what makes your guild unique</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="button button-secondary" onClick={() => setEditDescriptionModalOpen(false)}>Cancel</button>
              <button className="button button-primary" onClick={() => setEditDescriptionModalOpen(false)}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Contacts Modal */}
      {editContactsModalOpen && (
        <div className="modal-backdrop active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Edit Guild Contacts</h3>
              <button className="modal-close" onClick={() => setEditContactsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label" htmlFor="discord-contact">Discord Invite Link</label>
                <input type="text" className="form-input" id="discord-contact" defaultValue="discord.gg/designmasters" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="twitter-contact">Twitter/X Handle</label>
                <input type="text" className="form-input" id="twitter-contact" defaultValue="@DesignMasters" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="website-contact">Website URL</label>
                <input type="text" className="form-input" id="website-contact" defaultValue="designmasters.community" />
              </div>
              <div className="form-group">
                <button className="pill-button" onClick={() => setShowAddContactDropdown(!showAddContactDropdown)}>
                  {showAddContactDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  Add Contact Type
                </button>
                {showAddContactDropdown && (
                  <div className="contact-type-dropdown">
                    <div className="contact-type-item">Website</div>
                    <div className="contact-type-item">Email</div>
                    <div className="contact-type-item">Discord</div>
                    <div className="contact-type-item">Twitter</div>
                    <div className="contact-type-item">Bluesky</div>
                    <div className="contact-type-item">Twitch</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="button button-secondary" onClick={() => setEditContactsModalOpen(false)}>Cancel</button>
              <button className="button button-primary" onClick={() => setEditContactsModalOpen(false)}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS Styles */}
      <style jsx>{`
        /* CSS Variables */
        :root {
          --primary: #4f46e5;
          --primary-light: #818cf8;
          --primary-lighter: #c7d2fe;
          --secondary: #64748b;
          --dark: #1e293b;
          --light: #f8fafc;
          --light-gray: #e2e8f0;
          --gold: #f59e0b;
          --silver: #94a3b8;
          --bronze: #b45309;
          --danger: #ef4444;
          --success: #10b981;
        }

        /* Global styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }

        body {
          background-color: #f8fafc;
          color: var(--dark);
        }

        /* Header styles */
        header {
          background-color: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1rem;
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          font-weight: 700;
          font-size: 1.5rem;
          color: var(--primary);
        }

        .search-bar {
          background-color: var(--light-gray);
          border-radius: 9999px;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          width: 400px;
        }

        .search-bar input {
          background: transparent;
          border: none;
          outline: none;
          width: 100%;
          margin-left: 0.5rem;
        }

        .user-menu {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .notifications {
          position: relative;
          cursor: pointer;
        }

        .notification-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background-color: var(--danger);
          color: white;
          border-radius: 9999px;
          font-size: 0.75rem;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          background-color: var(--primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          cursor: pointer;
          position: relative;
        }

        /* Container and layout */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 1.875rem;
          font-weight: 700;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--secondary);
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .breadcrumb a {
          color: var(--primary);
          text-decoration: none;
        }

        .management-grid {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 2rem;
        }

        /* Sidebar styles */
        .sidebar {
          background-color: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          height: fit-content;
        }

        .sidebar-title {
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--light-gray);
        }

        .sidebar-menu {
          list-style: none;
        }

        .sidebar-menu-item {
          margin-bottom: 0.5rem;
        }

        .sidebar-menu-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: 0.375rem;
          color: var(--dark);
          text-decoration: none;
          transition: all 0.2s;
        }

        .sidebar-menu-link.active {
          background-color: var(--primary);
          color: white;
        }

        .sidebar-menu-link:hover:not(.active) {
          background-color: var(--light-gray);
        }

        /* Card styles */
        .card {
          background-color: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .section-subtitle {
          font-size: 1.125rem;
          font-weight: 600;
        }

        /* Guild profile styles */
        .guild-profile-header {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .guild-avatar-large {
          width: 120px;
          height: 120px;
          border-radius: 0.5rem; /* Square with rounded corners */
          background-color: var(--primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 3rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .guild-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .guild-name {
          font-size: 1.875rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .guild-meta {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.75rem;
          color: var(--secondary);
        }

        .guild-meta-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .guild-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        /* Avatar preview in Edit Guild modal */
        .avatar-upload-container {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        .avatar-preview {
          width: 100px;
          height: 100px;
          border-radius: 0.5rem;
          overflow: hidden;
          background-color: var(--light-gray);
        }

        .avatar-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .guild-avatar-preview {
          width: 100%;
          height: 100%;
          background-color: var(--primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 2.5rem;
        }

        .avatar-upload-button {
          flex: 1;
        }

        /* Tab interface */
        .guild-tabs {
          margin-top: 1.5rem;
        }

        .tab-header {
          display: flex;
          border-bottom: 1px solid var(--light-gray);
          margin-bottom: 1.5rem;
        }

        .tab {
          padding: 0.75rem 1.25rem;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: border-color 0.2s, color 0.2s;
          color: var(--secondary);
        }

        .tab.active-tab {
          border-bottom-color: var(--primary);
          color: var(--primary);
        }

        .tab-content {
          display: none;
        }

        .tab-content.active-tab-content {
          display: block;
          animation: fadeIn 0.3s ease-in-out;
        }

        /* Pill tabs for invite modal */
        .pill-tabs {
          display: flex;
          background-color: var(--light-gray);
          border-radius: 9999px;
          padding: 0.25rem;
          margin-bottom: 1.5rem;
        }

        .pill-tab {
          flex: 1;
          text-align: center;
          padding: 0.75rem 1rem;
          border-radius: 9999px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .pill-tab.active {
          background-color: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          color: var(--primary);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Guild description */
        .guild-description p {
          line-height: 1.5;
        }

        /* Button styles */
        .button {
          padding: 0.75rem 1.5rem;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: none;
        }

        .button-primary {
          background-color: var(--primary);
          color: white;
        }

        .button-primary:hover {
          background-color: var(--primary-light);
          transform: translateY(-2px);
        }

        .button-secondary {
          background-color: var(--light-gray);
          color: var(--dark);
        }

        .button-secondary:hover {
          background-color: #cbd5e1;
          transform: translateY(-2px);
        }

        .button-small {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }

        .action-row {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }

        .pill-button {
          background-color: var(--light-gray);
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--dark);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .pill-button:hover {
          background-color: var(--primary-lighter);
          color: var(--primary);
        }

        .section-link {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--primary);
          text-decoration: none;
          font-weight: 500;
          margin-left: auto;
          font-size: 0.875rem;
        }

        .section-link:hover {
          text-decoration: underline;
        }

        /* Accordion style */
        .accordion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid var(--light-gray);
          cursor: pointer;
        }

        .accordion-title {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--dark);
        }

        .accordion-content {
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          transition: opacity 0s;
        }

        .accordion-content.expanded {
          max-height: 2000px;
          opacity: 1;
          padding-top: 1.5rem;
        }

        .section-tag {
          display: inline-flex;
          align-items: center;
          background-color: var(--light-gray);
          color: var(--secondary);
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          margin-left: 0.5rem;
        }

        /* Generated link container */
        .generated-link-container {
          position: relative;
        }

        .generated-link-container input {
          padding-right: 40px;
        }

        .generated-link-container .copy-button {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--secondary);
        }

        .generated-link-container .copy-button:hover {
          color: var(--primary);
        }

        /* Form hint */
        .form-hint {
          font-size: 0.75rem;
          color: var(--secondary);
          margin-top: 0.375rem;
        }

        /* Members table */
        .members-table {
          width: 100%;
          border-collapse: collapse;
        }

        .members-table th {
          text-align: left;
          padding: 1rem;
          font-weight: 500;
          color: var(--secondary);
          border-bottom: 1px solid var(--light-gray);
        }

        .members-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--light-gray);
        }

        .members-table tr:last-child td {
          border-bottom: none;
        }

        .table-user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .member-role {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .role-owner {
          color: var(--gold);
        }

        .role-admin {
          color: var(--primary);
        }

        .role-member {
          color: var(--secondary);
        }

        /* Badge showcase */
        .badge-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1.5rem;
          margin-bottom: 1rem;
        }

        .badge-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .badge-display {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto;
        }

        .badge-giver-avatar {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background-color: var(--light);
          color: var(--dark);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 600;
          border: 1px solid var(--light-gray);
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .badge-title {
          font-weight: 500;
          margin-top: 0.5rem;
          font-size: 0.875rem;
        }

        .badge-count {
          font-size: 0.75rem;
          color: var(--secondary);
        }

        .badge-circle-border {
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: var(--gold);
          border-radius: 50%;
        }

        .badge-circle-inner {
          position: absolute;
          width: calc(100% - 8px);
          height: calc(100% - 8px);
          top: 4px;
          left: 4px;
          background-color: white;
          border-radius: 50%;
          overflow: hidden;
        }

        .badge-star-border {
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: var(--silver);
          -webkit-mask-size: 100% 100%;
          mask-size: 100% 100%;
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50,0 L63,38 L100,38 L69,59 L82,95 L50,73 L18,95 L31,59 L0,38 L37,38 Z' /%3E%3C/svg%3E");
          mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50,0 L63,38 L100,38 L69,59 L82,95 L50,73 L18,95 L31,59 L0,38 L37,38 Z' /%3E%3C/svg%3E");
        }

        .badge-star-inner {
          position: absolute;
          width: calc(100% - 8px);
          height: calc(100% - 8px);
          top: 4px;
          left: 4px;
          background-color: white;
          -webkit-mask-size: 100% 100%;
          mask-size: 100% 100%;
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50,0 L63,38 L100,38 L69,59 L82,95 L50,73 L18,95 L31,59 L0,38 L37,38 Z' /%3E%3C/svg%3E");
          mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50,0 L63,38 L100,38 L69,59 L82,95 L50,73 L18,95 L31,59 L0,38 L37,38 Z' /%3E%3C/svg%3E");
          overflow: hidden;
        }

        .badge-heart-border {
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: var(--bronze);
          -webkit-mask-size: 100% 100%;
          mask-size: 100% 100%;
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50,90 C45,85 20,65 10,45 C0,25 10,5 30,5 C40,5 45,10 50,15 C55,10 60,5 70,5 C90,5 100,25 90,45 C80,65 55,85 50,90 Z' /%3E%3C/svg%3E");
          mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50,90 C45,85 20,65 10,45 C0,25 10,5 30,5 C40,5 45,10 50,15 C55,10 60,5 70,5 C90,5 100,25 90,45 C80,65 55,85 50,90 Z' /%3E%3C/svg%3E");
        }

        .badge-heart-inner {
          position: absolute;
          width: calc(100% - 8px);
          height: calc(100% - 8px);
          top: 4px;
          left: 4px;
          background-color: white;
          -webkit-mask-size: 100% 100%;
          mask-size: 100% 100%;
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50,90 C45,85 20,65 10,45 C0,25 10,5 30,5 C40,5 45,10 50,15 C55,10 60,5 70,5 C90,5 100,25 90,45 C80,65 55,85 50,90 Z' /%3E%3C/svg%3E");
          mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50,90 C45,85 20,65 10,45 C0,25 10,5 30,5 C40,5 45,10 50,15 C55,10 60,5 70,5 C90,5 100,25 90,45 C80,65 55,85 50,90 Z' /%3E%3C/svg%3E");
          overflow: hidden;
        }

        .badge-hexagon-border {
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: #14b8a6;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }

        .badge-hexagon-inner {
          position: absolute;
          width: calc(100% - 8px);
          height: calc(100% - 8px);
          top: 4px;
          left: 4px;
          background-color: white;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          overflow: hidden;
        }

        .show-more {
          text-align: center;
          padding: 0.75rem;
          background-color: var(--light);
          border-radius: 0.375rem;
          margin-top: 1rem;
          cursor: pointer;
          font-weight: 500;
          color: var(--primary);
        }

        .show-more:hover {
          background-color: var(--primary-lighter);
        }

        /* Relationships */
        .relationship-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .relationship-card {
          border: 1px solid var(--light-gray);
          border-radius: 0.375rem;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s;
        }

        .relationship-card:hover {
          border-color: var(--primary-light);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }

        .small-guild-avatar {
          width: 36px;
          height: 36px;
          border-radius: 0.375rem; /* Square with rounded corners */
          background-color: var(--primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .relationship-type {
          margin-top: 0.25rem;
          display: inline-block;
          font-size: 0.75rem;
          background-color: var(--light-gray);
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-weight: 500;
        }

        .relationship-cluster {
          background-color: #dbeafe;
          color: #1e40af;
        }

        .relationship-parent {
          background-color: #d1fae5;
          color: #065f46;
        }

        .relationship-child {
          background-color: #fef3c7;
          color: #92400e;
        }

        .relationship-rival {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        .relationship-partner {
          background-color: #e0e7ff;
          color: #4338ca;
        }

        /* Contacts */
        .contact-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background-color: var(--light);
          padding: 0.75rem;
          border-radius: 0.375rem;
          transition: all 0.2s;
        }

        .contact-item:hover {
          background-color: var(--primary-lighter);
          transform: translateY(-2px);
        }

        .contact-icon {
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          background-color: var(--light-gray);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .contact-discord {
          background-color: #5865F2;
          color: white;
        }

        .contact-twitter {
          background-color: #1DA1F2;
          color: white;
        }

        .contact-website {
          background-color: var(--primary);
          color: white;
        }

        .contact-details {
          display: flex;
          flex-direction: column;
        }

        .contact-label {
          font-size: 0.75rem;
          color: var(--secondary);
        }

        .contact-value {
          font-weight: 500;
        }

        .contact-value a {
          color: var(--dark);
          text-decoration: none;
        }

        .contact-value a:hover {
          color: var(--primary);
          text-decoration: underline;
        }

        .contact-type-dropdown {
          background-color: white;
          border-radius: 0.375rem;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          margin-top: 0.5rem;
          overflow: hidden;
          border: 1px solid var(--light-gray);
        }

        .contact-type-item {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .contact-type-item:hover {
          background-color: var(--primary-lighter);
          color: var(--primary);
        }

        /* Dropdown Menu */
        .dropdown {
          position: relative;
          display: inline-block;
        }

        .dropdown-toggle {
          cursor: pointer;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          width: 180px;
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
          z-index: 10;
          display: none;
          overflow: hidden;
        }

        .dropdown-menu.active {
          display: block;
          animation: fadeIn 0.2s ease-in-out;
        }

        .dropdown-item {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .dropdown-item:hover {
          background-color: var(--light);
        }

        .dropdown-divider {
          border-top: 1px solid var(--light-gray);
          margin: 0.25rem 0;
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 50;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }

        .modal-backdrop.active {
          opacity: 1;
          pointer-events: auto;
        }

        .modal {
          background-color: white;
          border-radius: 0.5rem;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          transform: translateY(20px);
          transition: transform 0.3s;
        }

        .modal-backdrop.active .modal {
          transform: translateY(0);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--light-gray);
        }

        .modal-title {
          font-weight: 600;
          font-size: 1.25rem;
        }

        .modal-close {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--secondary);
        }

        .modal-close:hover {
          color: var(--dark);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          border-top: 1px solid var(--light-gray);
        }

        /* Form styles */
        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-row {
          display: flex;
          gap: 1rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--light-gray);
          border-radius: 0.375rem;
          font-size: 1rem;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary-light);
          box-shadow: 0 0 0 3px var(--primary-lighter);
        }

        .form-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--light-gray);
          border-radius: 0.375rem;
          font-size: 1rem;
          min-height: 100px;
          resize: vertical;
        }

        .form-textarea:focus {
          outline: none;
          border-color: var(--primary-light);
          box-shadow: 0 0 0 3px var(--primary-lighter);
        }

        /* Media queries */
        @media screen and (max-width: 1024px) {
          .badge-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .relationship-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .contact-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media screen and (max-width: 768px) {
          .management-grid {
            grid-template-columns: 1fr;
          }
          
          .sidebar {
            margin-bottom: 2rem;
          }
          
          .guild-profile-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .guild-actions {
            justify-content: center;
          }
          
          .guild-meta {
            justify-content: center;
            flex-wrap: wrap;
          }
          
          .badge-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .relationship-grid {
            grid-template-columns: 1fr;
          }
          
          .contact-grid {
            grid-template-columns: 1fr;
          }
          
          .search-bar {
            display: none;
          }

          .form-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default GuildOverview;