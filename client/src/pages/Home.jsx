import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import mockData from '../data/mockData';

// Import components
import GuildCarousel from '../components/GuildCarousel';
import ProfileLinks from '../components/ProfileLinks';
import BadgeSection from '../components/BadgeSection';
import TrophyCase from '../components/TrophyCase';
import NotificationsPanel from '../components/NotificationsPanel';

// Import styles
import '../styles/home.css';

/**
 * Home page component
 * Landing page with different content based on authentication state
 */
function Home() {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const { currentUser, loading: authLoading } = auth;
  
  // Simulate API call to fetch data
  useEffect(() => {
    // In a real implementation, this would be replaced with API calls
    const fetchData = async () => {
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use mock data
        setData(mockData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Safely handle auth loading state
  if (authLoading) {
    return <div className="loading">Loading authentication...</div>;
  }

  // Handle guild creation
  const handleCreateGuild = () => {
    console.log('Create guild clicked');
    // In a real implementation, this would navigate to a create guild page or open a modal
  };

  // Handle trophy case edit
  const handleEditTrophyCase = () => {
    console.log('Edit trophy case clicked');
    // In a real implementation, this would open a modal to select displayed badges
  };

  // Handle notification accept/decline
  const handleAcceptNotification = (notification) => {
    console.log('Accept notification:', notification);
    // In a real implementation, this would call an API to accept the invitation
  };

  const handleDeclineNotification = (notification) => {
    console.log('Decline notification:', notification);
    // In a real implementation, this would call an API to decline the invitation
  };

  // Loading state
  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  // Content for non-authenticated users
  if (!currentUser) {
    return (
      <div className="home-container">
        <h1>Welcome to ViaGuild</h1>
        <p>Create and join Guilds across Bluesky and Twitter</p>
        
        <div className="cta">
          <p>Create an account to get started:</p>
          <div className="cta-buttons">
            <Link to="/register" className="create-button">
              Register
            </Link>
            <Link to="/login" className="profile-link">
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Content for authenticated users
  return (
    <div className="home-container">
      <div className="welcome-section">
        <h1>Welcome back, {data && data.user ? data.user.displayName.split(' ')[0] : 'User'}!</h1>
      </div>

      {/* Guild Carousel */}
      {data && data.guilds && (
        <GuildCarousel 
          guilds={data.guilds} 
          onCreateGuild={handleCreateGuild} 
        />
      )}

      {/* Profile Links */}
      <ProfileLinks />

      {/* Badge Section */}
      {data && (
        <BadgeSection 
          receivedBadges={data.receivedBadges || []} 
          availableBadges={data.availableBadges || []} 
        />
      )}

      {/* Trophy Case */}
      {data && data.trophyCase && (
        <TrophyCase 
          badges={data.trophyCase} 
          onEdit={handleEditTrophyCase} 
        />
      )}

      {/* Notifications Panel */}
      {data && data.notifications && (
        <NotificationsPanel 
          notifications={data.notifications}
          onAccept={handleAcceptNotification}
          onDecline={handleDeclineNotification}
        />
      )}
    </div>
  );
}

export default Home;