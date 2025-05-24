import React, { useEffect, useRef, useState } from 'react';
import dataService from '../services/dataService';
import analyticsService from '../services/analyticsService';
import './GeoMap.css';

const GeoMap = ({ 
  onCountryClick, 
  highlightedCountry, 
  selectedCountry, 
  showLabels = false,
  interactive = true
}) => {
  const svgRef = useRef(null);
  const [geoData, setGeoData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewBox, setViewBox] = useState('0 0 800 400');

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    try {
      setIsLoading(true);
      const data = await dataService.initialize();
      setGeoData(data.geoJsonData);
      
      if (data.geoJsonData) {
        const bbox = calculateBoundingBox(data.geoJsonData);
        setViewBox(`${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to load map data:', err);
      setError(err.message);
      analyticsService.trackError(err, { context: 'map_loading' });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBoundingBox = (geoJsonData) => {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    geoJsonData.features.forEach(feature => {
      const bbox = getFeatureBounds(feature.geometry);
      minX = Math.min(minX, bbox.minX);
      minY = Math.min(minY, bbox.minY);
      maxX = Math.max(maxX, bbox.maxX);
      maxY = Math.max(maxY, bbox.maxY);
    });

    // Add padding
    const padding = 10;
    return {
      minX: minX - padding,
      minY: minY - padding,
      width: (maxX - minX) + (padding * 2),
      height: (maxY - minY) + (padding * 2)
    };
  };

  const getFeatureBounds = (geometry) => {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    const processCoordinates = (coords) => {
      if (Array.isArray(coords[0])) {
        coords.forEach(processCoordinates);
      } else {
        const [x, y] = coords;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    };

    if (geometry.type === 'Polygon') {
      geometry.coordinates.forEach(processCoordinates);
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon => {
        polygon.forEach(processCoordinates);
      });
    }

    return { minX, minY, maxX, maxY };
  };

  const coordinatesToPath = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return '';
    
    const pathCommands = coordinates.map((ring, ringIndex) => {
      if (!ring || ring.length === 0) return '';
      
      const commands = ring.map((coord, coordIndex) => {
        const [x, y] = coord;
        return coordIndex === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      }).join(' ');
      
      return commands + ' Z';
    });
    
    return pathCommands.join(' ');
  };

  const geometryToPath = (geometry) => {
    if (!geometry) return '';
    
    switch (geometry.type) {
      case 'Polygon':
        return coordinatesToPath(geometry.coordinates);
      
      case 'MultiPolygon':
        return geometry.coordinates
          .map(polygon => coordinatesToPath(polygon))
          .join(' ');
      
      default:
        return '';
    }
  };

  const handleCountryClick = (feature) => {
    if (!interactive || !onCountryClick) return;
    
    const country = dataService.getCountryById(feature.id);
    if (country) {
      analyticsService.trackUserInteraction('country_click', 'map', {
        country_id: feature.id,
        country_name: country.name
      });
      
      onCountryClick(country, feature);
    }
  };

  const getCountryFill = (feature) => {
    const countryId = feature.id;
    
    if (selectedCountry === countryId) return '#ef4444'; // Red for selected
    if (highlightedCountry === countryId) return '#f59e0b'; // Orange for highlighted
    
    // Use assigned color from the color service
    return feature.properties?.color || '#94a3b8'; // Default gray
  };

  const getCountryStroke = (feature) => {
    const countryId = feature.id;
    
    if (selectedCountry === countryId || highlightedCountry === countryId) {
      return '#1f2937'; // Dark border for highlighted/selected
    }
    
    return '#ffffff'; // White border for normal state
  };

  const getStrokeWidth = (feature) => {
    const countryId = feature.id;
    
    if (selectedCountry === countryId) return '2';
    if (highlightedCountry === countryId) return '1.5';
    
    return '0.5';
  };

  if (isLoading) {
    return (
      <div className="geo-map loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading world map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="geo-map error">
        <div className="error-message">
          <h3>Failed to load map</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadMapData}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!geoData || !geoData.features) {
    return (
      <div className="geo-map error">
        <div className="error-message">
          <h3>No map data available</h3>
          <p>Unable to display the world map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="geo-map">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="map-svg"
        role="img"
        aria-label="Interactive world map"
      >
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="1" stdDeviation="1" floodOpacity="0.3"/>
          </filter>
          <filter id="highlight" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.5"/>
          </filter>
        </defs>
        
        {/* Ocean background */}
        <rect 
          width="100%" 
          height="100%" 
          fill="#e0f2fe" 
          className="ocean"
        />
        
        {/* Country paths */}
        {geoData.features.map(feature => {
          const path = geometryToPath(feature.geometry);
          if (!path) return null;
          
          const countryId = feature.id;
          const isHighlighted = highlightedCountry === countryId;
          const isSelected = selectedCountry === countryId;
          
          return (
            <g key={countryId} className="country-group">
              <path
                d={path}
                fill={getCountryFill(feature)}
                stroke={getCountryStroke(feature)}
                strokeWidth={getStrokeWidth(feature)}
                className={`country-path ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleCountryClick(feature)}
                onMouseEnter={(e) => {
                  if (interactive) {
                    e.target.style.filter = 'url(#shadow)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (interactive) {
                    e.target.style.filter = 'none';
                  }
                }}
                style={{
                  cursor: interactive ? 'pointer' : 'default',
                  transition: 'all 0.2s ease'
                }}
                aria-label={`${feature.properties?.name || countryId}`}
              />
              
              {/* Country labels */}
              {showLabels && feature.properties?.name && (
                <text
                  x={0} // You'd calculate the centroid here
                  y={0}
                  textAnchor="middle"
                  className="country-label"
                  fontSize="2"
                  fill="#1f2937"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  {feature.properties.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-color" style={{backgroundColor: '#94a3b8'}}></div>
          <span>Country</span>
        </div>
        {highlightedCountry && (
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#f59e0b'}}></div>
            <span>Target</span>
          </div>
        )}
        {selectedCountry && (
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#ef4444'}}></div>
            <span>Selected</span>
          </div>
        )}
      </div>
      
      {/* Map info */}
      <div className="map-info">
        <span>{geoData.features.length} countries loaded</span>
      </div>
    </div>
  );
};

export default GeoMap;