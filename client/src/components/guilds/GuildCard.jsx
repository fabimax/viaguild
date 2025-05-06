import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * Guild Card Component
 * Displays a guild in a card format
 */
const GuildCard = ({ guild, onSetPrimary }) => {
  const {
    id,
    name,
    description,
    avatar,
    memberCount,
    role,
    isPrimary,
    isOpen
  } = guild;

  // Format member count with K for thousands
  const formatMemberCount = (count) => {
    return count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count;
  };

  // Determine the background color based on the role
  const getColorClass = () => {
    switch (role) {
      case 'OWNER':
        return 'bg-indigo-600';
      case 'ADMIN':
        return 'bg-blue-600';
      default:
        return 'bg-teal-600';
    }
  };
  
  // Get first letter for avatar fallback
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden h-full flex flex-col">
      {/* Guild Banner */}
      <div className={`p-4 text-white ${getColorClass()} relative h-24`}>
        {isPrimary && (
          <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full absolute top-2 right-2">
            Primary
          </span>
        )}
        {isOpen && (
          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full absolute top-2 left-2">
            Open
          </span>
        )}
      </div>
      
      {/* Guild Avatar */}
      <div className="flex justify-center -mt-10">
        <div className="w-20 h-20 rounded-full bg-gray-300 border-4 border-white flex items-center justify-center text-2xl font-bold">
          {avatar ? (
            <img 
              src={avatar} 
              alt={`${name} avatar`} 
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitial(name)
          )}
        </div>
      </div>
      
      {/* Guild Content */}
      <div className="p-4 flex-grow">
        <h3 className="text-xl font-semibold text-gray-800 text-center mb-2">{name}</h3>
        
        <div className="flex justify-center items-center gap-2 mb-3">
          <span className="text-gray-500 text-sm">
            <i className="fas fa-users mr-1"></i> {formatMemberCount(memberCount)}
          </span>
          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
          <span className="text-gray-500 text-sm capitalize">
            {role.toLowerCase()}
          </span>
        </div>
        
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
          {description}
        </p>
        
        <div className="mt-auto pt-2 flex flex-col gap-2">
          <Link 
            to={`/guilds/${id}`} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded text-center"
          >
            View Guild
          </Link>
          
          {!isPrimary && onSetPrimary && (
            <button
              onClick={() => onSetPrimary(id)}
              className="w-full bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 py-2 px-4 rounded text-center"
            >
              Set as Primary
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

GuildCard.propTypes = {
  guild: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    avatar: PropTypes.string,
    memberCount: PropTypes.number.isRequired,
    role: PropTypes.string.isRequired,
    isPrimary: PropTypes.bool.isRequired,
    isOpen: PropTypes.bool.isRequired
  }).isRequired,
  onSetPrimary: PropTypes.func
};

export default GuildCard; 