import React from 'react';
import { countries } from '../data/countries';
import './WorldMap.css';

const WorldMap = ({ onCountryClick, highlightedCountry, selectedCountry, showLabels = false }) => {
  const handleCountryClick = (country) => {
    if (onCountryClick) {
      onCountryClick(country);
    }
  };

  const getCountryFill = (country) => {
    if (selectedCountry === country.id) return '#ef4444';
    if (highlightedCountry === country.id) return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <div className="world-map">
      <svg 
        viewBox="0 0 900 500" 
        className="map-svg"
        role="img"
        aria-label="Interactive world map"
      >
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3"/>
          </filter>
        </defs>
        
        <rect width="900" height="500" fill="#e0f2fe" className="ocean"/>
        
        {countries.map(country => (
          <g key={country.id} className="country-group">
            {country.paths.map((path, index) => (
              <path
                key={`${country.id}-${index}`}
                d={path}
                fill={getCountryFill(country)}
                stroke="#ffffff"
                strokeWidth="1"
                className="country-path"
                onClick={() => handleCountryClick(country)}
                onMouseEnter={(e) => {
                  e.target.style.filter = 'url(#shadow)';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.filter = 'none';
                  e.target.style.transform = 'scale(1)';
                }}
                style={{
                  cursor: onCountryClick ? 'pointer' : 'default',
                  transition: 'all 0.2s ease'
                }}
                aria-label={`${country.name} - ${country.capital}`}
              />
            ))}
            
            {showLabels && (
              <text
                x={country.coords.x}
                y={country.coords.y}
                textAnchor="middle"
                className="country-label"
                fontSize="10"
                fill="#1f2937"
                fontWeight="600"
                pointerEvents="none"
              >
                {country.name}
              </text>
            )}
          </g>
        ))}
        
        <text x="450" y="30" textAnchor="middle" className="map-title" fontSize="16" fontWeight="bold" fill="#1f2937">
          World Map
        </text>
      </svg>
      
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-color" style={{backgroundColor: '#3b82f6'}}></div>
          <span>Country</span>
        </div>
        {highlightedCountry && (
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#f59e0b'}}></div>
            <span>Highlighted</span>
          </div>
        )}
        {selectedCountry && (
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#ef4444'}}></div>
            <span>Selected</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldMap;