import React from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BadgeNavigation = () => {
  const { username } = useParams();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  const isOwnPage = currentUser && currentUser.username.toLowerCase() === username.toLowerCase();
  
  const navItems = [
    { path: `/users/${username}/badges/badgecase`, label: 'Badge Case', key: 'badgecase' },
    { path: `/users/${username}/badges/inventory`, label: 'Inventory', key: 'inventory' },
    ...(isOwnPage ? [
      { path: `/users/${username}/badges/create`, label: 'Create', key: 'create' },
      { path: `/users/${username}/badges/templates`, label: 'Templates', key: 'templates' },
      { path: `/users/${username}/badges/give`, label: 'Give', key: 'give' },
      { path: `/users/${username}/badges/given`, label: 'Given', key: 'given' }
    ] : [])
  ];

  const getActiveKey = () => {
    const path = location.pathname;
    if (path.includes('/badgecase')) return 'badgecase';
    if (path.includes('/inventory')) return 'inventory';
    if (path.includes('/create')) return 'create';
    if (path.includes('/templates')) return 'templates';
    if (path.includes('/give')) return 'give';
    if (path.includes('/given')) return 'given';
    return 'badgecase';
  };

  const activeKey = getActiveKey();

  return (
    <nav className="badge-navigation">
      <div className="badge-nav-tabs">
        {navItems.map(item => (
          <Link
            key={item.key}
            to={item.path}
            className={`badge-nav-tab ${activeKey === item.key ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default BadgeNavigation;