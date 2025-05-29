import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import GuildService from '../services/guild.service';
import './GuildProfilePage.css'; // Import the CSS file
import BadgeDisplay from '../components/guilds/BadgeDisplay'; // Import BadgeDisplay

const GuildProfilePage = () => {
  const { identifier } = useParams(); // Get identifier from URL (e.g., /guilds/some-guild-name)
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGuildProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await GuildService.getGuildPublicProfile(identifier);
        setGuild(data);
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
            <h1 className="guild-display-name">{guild.displayName || guild.name}</h1>
            {guild.name && guild.displayName && guild.name.toLowerCase() !== guild.displayName.toLowerCase() && (
              <p className="guild-name-tag">@{guild.name}</p>
            )}
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

    </div>
  );
};

export default GuildProfilePage; 