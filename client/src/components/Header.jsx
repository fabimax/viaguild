import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import viaguildLogo from '../assets/viaguild.svg';

/**
 * Header component with navigation links and logo
 * Shows different options based on authentication state
 */
function Header() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { currentUser, logout, loading } = auth;
  
  /**
   * Handle user logout
   * Calls logout function and redirects to home page
   */
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Safely handle loading state
  if (loading) {
    return <header className="header"><div className="logo">Loading...</div></header>;
  }

  return (
    <header className="header">
      <div className="logo">
        <Link to="/" className="logo-link">
          <img src={viaguildLogo} alt="ViaGuild Logo" className="logo-image" />
          <span className="logo-text">ViaGuild</span>
        </Link>
      </div>
      <nav className="nav">
        <ul>
          {/* Search link is always visible */}
          <li><Link to="/search">Search</Link></li>
          
          {currentUser ? (
            <>
              <li><Link to="/profile">Profile</Link></li>
              <li><button onClick={handleLogout}>Logout</button></li>
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}

export default Header;