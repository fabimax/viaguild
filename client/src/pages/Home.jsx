import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Home page component
 * Landing page with different CTAs based on authentication state
 */
function Home() {
  const { currentUser } = useAuth();

  return (
    <div className="home-container">
      <h1>Welcome to ViaGuild</h1>
      <p>Create and join Guilds across Bluesky and Twitter</p>
      
      {currentUser ? (
        <div className="cta">
          <p>You're logged in as {currentUser.email}.</p>
          <Link to="/profile" className="btn btn-primary">
            Go to your Profile
          </Link>
        </div>
      ) : (
        <div className="cta">
          <p>Create an account to get started:</p>
          <div className="cta-buttons">
            <Link to="/register" className="btn btn-primary">
              Register
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;