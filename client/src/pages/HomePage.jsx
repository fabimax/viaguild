import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import GuildCarousel from '../components/guilds/GuildCarousel';
import guildService from '../services/guild.service';

/**
 * HomePage Component
 * Main dashboard page for authenticated users
 */
const HomePage = () => {
  const [userGuilds, setUserGuilds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Fetch user's guilds when component mounts
    const fetchUserGuilds = async () => {
      setIsLoading(true);
      try {
        const guilds = await guildService.getUserGuilds();
        setUserGuilds(guilds);
        setError(null);
      } catch (err) {
        console.error('Error fetching guilds:', err);
        setError('Failed to load your guilds. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserGuilds();
  }, []);
  
  const handleSetPrimaryGuild = async (guildId) => {
    try {
      await guildService.setPrimaryGuild(guildId);
      
      // Update guilds in state to reflect the change
      setUserGuilds(prevGuilds => 
        prevGuilds.map(guild => ({
          ...guild,
          isPrimary: guild.id === guildId
        }))
      );
    } catch (err) {
      console.error('Error setting primary guild:', err);
      // You could show a toast notification here
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h1>
        <p className="text-gray-600">Here's what's happening in your guilds today.</p>
      </div>
      
      {/* Guilds Section */}
      <section className="mb-12">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded" role="alert">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : (
          <GuildCarousel 
            guilds={userGuilds} 
            onSetPrimary={handleSetPrimaryGuild} 
          />
        )}
      </section>
      
      {/* Profile Links */}
      <div className="flex justify-center mb-12">
        <div className="flex gap-4">
          <Link 
            to="/profile" 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
          >
            <i className="fas fa-user text-indigo-600"></i>
            <span>View My Profile</span>
          </Link>
          <Link 
            to="/profile/edit" 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
          >
            <i className="fas fa-edit text-indigo-600"></i>
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>
      
      {/* Other sections will be added later, like Badge Section and Trophy Case */}
      <section className="mb-12">
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Badge System Coming Soon</h2>
          <p className="text-gray-600 mb-4">
            The badge system is currently under development. Soon you'll be able to give
            and receive badges to recognize contributions and achievements.
          </p>
          <div className="flex justify-center gap-4">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="w-16 h-16 rounded-full bg-yellow-100 border-2 border-yellow-500 flex items-center justify-center mx-auto mb-2">
                <i className="fas fa-star text-yellow-500 text-xl"></i>
              </div>
              <p className="text-sm text-gray-700">Gold Badges</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-400 flex items-center justify-center mx-auto mb-2">
                <i className="fas fa-award text-gray-500 text-xl"></i>
              </div>
              <p className="text-sm text-gray-700">Silver Badges</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="w-16 h-16 rounded-full bg-orange-50 border-2 border-orange-600 flex items-center justify-center mx-auto mb-2">
                <i className="fas fa-medal text-orange-600 text-xl"></i>
              </div>
              <p className="text-sm text-gray-700">Bronze Badges</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage; 