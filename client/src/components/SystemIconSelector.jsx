import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import SystemIconService from '../services/systemIcon.service';
import SvgPreview from './SvgPreview';

const SystemIconSelector = ({ 
  selectedIcon, 
  onIconSelect, 
  selectedIconSvg,
  colorData
}) => {
  const [availableIcons, setAvailableIcons] = useState([]);
  const [iconSvgs, setIconSvgs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all available system icons
  useEffect(() => {
    const fetchIcons = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch list of all available system icons
        const response = await fetch('/api/system-icons');
        if (!response.ok) {
          throw new Error('Failed to fetch system icons');
        }
        
        const data = await response.json();
        const icons = data.data || [];
        setAvailableIcons(icons);
        
        // Helper function to sanitize SVG for proper sizing
        const sanitizeSvg = (svgContent) => {
          if (!svgContent) return null;
          
          // Remove explicit width and height attributes that interfere with container sizing
          // Keep viewBox for proper scaling
          return svgContent
            .replace(/\s+width\s*=\s*["'][^"']*["']/gi, '')
            .replace(/\s+height\s*=\s*["'][^"']*["']/gi, '')
            .trim();
        };

        // Fetch SVG content for each icon
        const svgPromises = icons.map(async (icon) => {
          try {
            const svgContent = await SystemIconService.getSystemIconSvg(icon.name);
            const sanitizedSvg = sanitizeSvg(svgContent);
            return { name: icon.name, svg: sanitizedSvg };
          } catch (err) {
            console.error(`Failed to fetch SVG for ${icon.name}:`, err);
            return { name: icon.name, svg: null };
          }
        });
        
        const svgResults = await Promise.all(svgPromises);
        const svgMap = {};
        svgResults.forEach(({ name, svg }) => {
          if (svg) {
            svgMap[name] = svg;
          }
        });
        setIconSvgs(svgMap);
        
      } catch (err) {
        console.error('Error fetching system icons:', err);
        setError('Failed to load system icons');
        
        // Fallback to hardcoded list based on seed data
        setAvailableIcons([
          { name: 'Shield', category: 'Symbols' },
          { name: 'Heart Suit', category: 'Symbols' },
          { name: 'Filled Heart', category: 'Symbols' },
          { name: 'Glowing Star', category: 'Symbols' },
          { name: 'Simple Star', category: 'Symbols' },
          { name: 'Crossed Swords', category: 'Symbols' },
          { name: 'Ribbon Award', category: 'Awards' },
          { name: 'Checkmark Seal', category: 'Verification' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchIcons();
  }, []);

  // Filter icons based on search term
  const filteredIcons = availableIcons.filter(icon =>
    icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (icon.description && icon.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (icon.tags && icon.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleIconClick = (iconName) => {
    onIconSelect(iconName);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  if (loading) {
    return (
      <div className="system-icon-selector">
        <div className="loading-state" style={{ padding: '20px', textAlign: 'center' }}>
          <p>Loading system icons...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="system-icon-selector">
        <div className="error-state" style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>
          <p>{error}</p>
          <p>Using fallback icon list</p>
        </div>
      </div>
    );
  }

  return (
    <div className="system-icon-selector">
      {/* Search Box */}
      <div className="search-container" style={{ marginBottom: '15px' }}>
        <input
          type="text"
          placeholder="🔍 Search icons..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Main Content Container */}
      <div className="selector-content">
        {/* Icon Preview (Left on desktop, bottom on mobile) */}
        <div className="icon-preview" style={{
          flex: '0 0 220px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '15px',
          border: '1px solid #e9ecef',
          borderRadius: '4px',
          backgroundColor: '#f8f9fa'
        }}>
          <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#495057' }}>
            Selected Preview:
          </h4>
          
          {selectedIcon && selectedIconSvg ? (
            <div style={{ textAlign: 'center' }}>
              <SvgPreview 
                svgContent={selectedIconSvg}
                colorData={colorData}
                size={80}
                alt={`${selectedIcon} icon preview`}
                style={{
                  border: '2px solid #dee2e6',
                  marginBottom: '10px'
                }}
              />
              <p style={{ 
                margin: 0, 
                fontSize: '12px', 
                color: '#6c757d',
                fontWeight: '500' 
              }}>
                {selectedIcon}
              </p>
            </div>
          ) : (
            <SvgPreview 
              svgContent={null}
              colorData={colorData}
              size={80}
              placeholder="No Icon Selected"
              style={{
                border: '2px dashed #dee2e6',
                marginBottom: '10px'
              }}
            />
          )}
        </div>

        {/* Icon Grid (Right on desktop, top on mobile) */}
        <div className="icon-grid-container" style={{ flex: '1' }}>
          <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#495057' }}>
            Available Icons: ({filteredIcons.length})
          </h4>
          
          <div 
            className="icon-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
              gap: '8px',
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '10px',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              backgroundColor: 'white'
            }}
          >
            {filteredIcons.map((icon) => (
              <div
                key={icon.name}
                className="icon-item"
                onClick={() => handleIconClick(icon.name)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 4px',
                  border: selectedIcon === icon.name ? '2px solid #007bff' : '1px solid #e9ecef',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: selectedIcon === icon.name ? '#e7f3ff' : 'white',
                  transition: 'all 0.2s ease',
                  minHeight: '60px',
                  ':hover': {
                    backgroundColor: '#f8f9fa',
                    borderColor: '#007bff'
                  }
                }}
                onMouseEnter={(e) => {
                  if (selectedIcon !== icon.name) {
                    e.target.style.backgroundColor = '#f8f9fa';
                    e.target.style.borderColor = '#007bff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedIcon !== icon.name) {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.borderColor = '#e9ecef';
                  }
                }}
              >
                {/* Icon SVG or placeholder */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '4px',
                  fontSize: '16px'
                }}>
                  {iconSvgs[icon.name] ? (
                    <div 
                      style={{ 
                        width: '28px', 
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}
                      dangerouslySetInnerHTML={{ __html: iconSvgs[icon.name] }} 
                    />
                  ) : (
                    <span style={{ color: '#6c757d' }}>⏳</span>
                  )}
                </div>
                
                <span style={{
                  fontSize: '10px',
                  textAlign: 'center',
                  color: '#6c757d',
                  lineHeight: '1.2',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {icon.name}
                </span>
              </div>
            ))}
          </div>

          {filteredIcons.length === 0 && searchTerm && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: '#6c757d',
              fontStyle: 'italic'
            }}>
              No icons found matching "{searchTerm}"
            </div>
          )}
        </div>
      </div>

      {/* CSS Styles */}
      <style>{`
        .selector-content {
          display: flex;
          gap: 20px;
        }
        
        .system-icon-selector svg {
          width: 100% !important;
          height: 100% !important;
          max-width: 100%;
          max-height: 100%;
        }
        
        @media (max-width: 768px) {
          .selector-content {
            flex-direction: column !important;
          }
          
          .icon-preview {
            order: 2;
            flex: none !important;
            margin-top: 20px;
          }
          
          .icon-grid-container {
            order: 1;
          }
          
          .icon-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
};

SystemIconSelector.propTypes = {
  selectedIcon: PropTypes.string,
  onIconSelect: PropTypes.func.isRequired,
  selectedIconSvg: PropTypes.string,
  colorData: PropTypes.shape({
    elementColorMap: PropTypes.object,
    colorSlots: PropTypes.array,
    gradientDefinitions: PropTypes.object
  })
};

SystemIconSelector.defaultProps = {
  selectedIcon: null,
  selectedIconSvg: null,
  colorData: null
};

export default SystemIconSelector;