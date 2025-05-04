import React from 'react';
import PropTypes from 'prop-types';
import { formatDistanceToNow } from 'date-fns';

/**
 * NotificationsPanel Component
 * Displays a list of user notifications with appropriate icons and actions
 * 
 * @param {Object} props - Component props
 * @param {Array} props.notifications - Array of notification objects
 * @param {Function} props.onAccept - Function to call when an invite is accepted
 * @param {Function} props.onDecline - Function to call when an invite is declined
 */
const NotificationsPanel = ({ notifications, onAccept, onDecline }) => {
  // Return appropriate icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'GUILD_INVITE':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        );
      case 'BADGE_RECEIVED':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        );
      case 'GUILD_JOIN':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        );
    }
  };

  // Format time (e.g., "2 hours ago")
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <div className="notifications-panel">
      <div className="section-title">Notifications</div>
      
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="empty-state">No notifications yet</div>
        ) : (
          notifications.map(notification => (
            <div key={notification.id} className="notification-item">
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="notification-content">
                <p>{notification.title}</p>
                <div className="notification-time">{formatTime(notification.createdAt)}</div>
                
                {notification.requiresAction && notification.type === 'GUILD_INVITE' && (
                  <div className="notification-actions">
                    <button 
                      className="action-button accept-button"
                      onClick={() => onAccept(notification)}
                    >
                      Accept
                    </button>
                    <button 
                      className="action-button decline-button"
                      onClick={() => onDecline(notification)}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

NotificationsPanel.propTypes = {
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      createdAt: PropTypes.string.isRequired,
      requiresAction: PropTypes.bool
    })
  ).isRequired,
  onAccept: PropTypes.func,
  onDecline: PropTypes.func
};

NotificationsPanel.defaultProps = {
  onAccept: () => console.log('Accept notification'),
  onDecline: () => console.log('Decline notification')
};

export default NotificationsPanel; 