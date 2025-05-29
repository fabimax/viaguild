import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import GuildCard from './GuildCard.jsx';

/**
 * Guild Carousel Component
 * Displays user's guilds in a horizontally scrollable carousel
 */
const GuildCarousel = ({ guilds, onSetPrimary }) => {
  const carouselRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Check if scrolling controls should be visible
  useEffect(() => {
    const checkScrollPosition = () => {
      const container = carouselRef.current;
      if (!container) return;
      
      setShowLeftArrow(container.scrollLeft > 0);
      setShowRightArrow(
        container.scrollLeft < 
        container.scrollWidth - container.clientWidth - 10
      );
    };

    const container = carouselRef.current;
    if (container) {
      checkScrollPosition();
      container.addEventListener('scroll', checkScrollPosition);
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, [guilds]);

  // Scroll handler functions
  const scrollLeft = () => {
    const container = carouselRef.current;
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = carouselRef.current;
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Your Guilds</h2>
        <div className="flex items-center gap-4">
          <Link 
            to="/guilds/create" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            Create Guild
          </Link>
          <Link 
            to="/guilds" 
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            View All
          </Link>
        </div>
      </div>
      
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <button 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md"
          onClick={scrollLeft}
          aria-label="Scroll left"
        >
          <i className="fas fa-chevron-left text-gray-600"></i>
        </button>
      )}
      
      {/* Right scroll arrow */}
      {showRightArrow && (
        <button 
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md"
          onClick={scrollRight}
          aria-label="Scroll right"
        >
          <i className="fas fa-chevron-right text-gray-600"></i>
        </button>
      )}
      
      {/* Scrollable container */}
      <div 
        ref={carouselRef}
        className="carousel-container flex overflow-x-auto gap-4 pb-4 -mx-2 px-2 hide-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {guilds.length > 0 ? (
          <>
            {guilds.map(guild => (
              <div key={guild.id} className="flex-shrink-0 w-64">
                <GuildCard guild={guild} onSetPrimary={onSetPrimary} />
              </div>
            ))}
            
            {/* Create Guild Card */}
            <div className="flex-shrink-0 w-64">
              <div className="bg-white rounded-lg shadow-md overflow-hidden h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors">
                <div className="bg-indigo-100 rounded-full p-4 mb-4">
                  <i className="fas fa-plus text-2xl text-indigo-600"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 text-center mb-2">Create Guild</h3>
                <p className="text-gray-600 text-center text-sm mb-4">
                  Start your own community or team
                </p>
                <Link 
                  to="/guilds/create" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded w-full text-center"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md w-full">
            <div className="bg-indigo-100 rounded-full p-4 mb-4">
              <i className="fas fa-users text-2xl text-indigo-600"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 text-center mb-2">No Guilds Yet</h3>
            <p className="text-gray-600 text-center mb-4">
              You aren't a member of any guilds. Create your first guild or join an existing one.
            </p>
            <div className="flex gap-3">
              <Link 
                to="/guilds/create" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded text-center"
              >
                Create Guild
              </Link>
              <Link 
                to="/guilds/search" 
                className="bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 py-2 px-4 rounded text-center"
              >
                Find Guilds
              </Link>
            </div>
          </div>
        )}
      </div>
      
      {/* Add custom CSS for hiding scrollbar */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

GuildCarousel.propTypes = {
  guilds: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired
    })
  ).isRequired,
  onSetPrimary: PropTypes.func
};

export default GuildCarousel; 