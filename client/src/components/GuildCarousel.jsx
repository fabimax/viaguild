import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import GuildCard from './GuildCard';

/**
 * Guild Carousel Component
 * Displays horizontally scrollable list of guilds with navigation controls
 * 
 * @param {Object} props - Component props
 * @param {Array} props.guilds - Array of guild objects to display
 * @param {Function} props.onCreateGuild - Function to call when create guild is clicked
 */
const GuildCarousel = ({ guilds, onCreateGuild }) => {
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Update button states based on scroll position
  const updateScrollButtons = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10); // 10px buffer
    }
  };

  // Scroll carousel left or right
  const scroll = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 220 + 16; // card width + gap
      const currentScroll = carouselRef.current.scrollLeft;
      
      carouselRef.current.scrollTo({
        left: direction === 'left' 
          ? currentScroll - scrollAmount 
          : currentScroll + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Check scroll buttons on mount, resize, and scroll
  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      updateScrollButtons();
      carousel.addEventListener('scroll', updateScrollButtons);
      window.addEventListener('resize', updateScrollButtons);
      
      return () => {
        carousel.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
      };
    }
  }, []);

  // Also update buttons when guilds data changes
  useEffect(() => {
    updateScrollButtons();
  }, [guilds]);

  return (
    <>
      <div className="section-header">
        <h2 className="section-title">Your Guilds</h2>
        <div className="section-actions">
          <button 
            className="create-button"
            onClick={onCreateGuild}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Guild
          </button>
          <Link to="/guilds" className="view-all">View All</Link>
        </div>
      </div>

      <div className="guild-carousel" ref={carouselRef}>
        {guilds.map(guild => (
          <GuildCard key={guild.id} guild={guild} />
        ))}
        
        <div className="create-guild-card" onClick={onCreateGuild}>
          <div className="create-guild-icon">+</div>
          <div>Create New Guild</div>
        </div>
      </div>

      <div className="carousel-controls">
        <button 
          className="carousel-control" 
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button 
          className="carousel-control" 
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </>
  );
};

GuildCarousel.propTypes = {
  guilds: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      avatarInitial: PropTypes.string,
      bannerColor: PropTypes.string,
      memberCount: PropTypes.number,
      userRole: PropTypes.string,
      isPrimary: PropTypes.bool
    })
  ).isRequired,
  onCreateGuild: PropTypes.func
};

GuildCarousel.defaultProps = {
  onCreateGuild: () => console.log('Create guild clicked')
};

export default GuildCarousel; 