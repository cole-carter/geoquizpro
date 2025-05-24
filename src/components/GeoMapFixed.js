import React, { useEffect, useRef, useState } from 'react';
import dataService from '../services/dataService';
import analyticsService from '../services/analyticsService';
import './GeoMap.css';

const GeoMapFixed = ({ 
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
  const [viewBox, setViewBox] = useState('-180 -90 360 180');
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading map data...');
      const data = await dataService.initialize();
      console.log('Data loaded:', data);
      
      if (!data.geoJsonData || !data.geoJsonData.features) {
        throw new Error('No geographic data available');
      }
      
      setGeoData(data.geoJsonData);
      
      // Use standard world coordinates with proper projection
      setViewBox('-180 -90 360 180');
      
      console.log(`Map loaded with ${data.geoJsonData.features.length} countries`);
      setError(null);
    } catch (err) {
      console.error('Failed to load map data:', err);
      setError(err.message);
      analyticsService.trackError(err, { context: 'map_loading' });
    } finally {
      setIsLoading(false);
    }
  };

  // Simple coordinate transformation for web mercator-like projection
  const projectCoordinate = ([lon, lat]) => {
    // Clamp latitude to avoid extreme values
    const clampedLat = Math.max(-85, Math.min(85, lat));
    
    // Simple equirectangular projection
    const x = lon;
    const y = -clampedLat; // Flip Y axis for SVG coordinate system
    
    return [x, y];
  };

  const coordinatesToPath = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return '';
    
    try {
      const pathCommands = coordinates.map((ring, ringIndex) => {
        if (!ring || ring.length === 0) return '';
        
        const commands = ring.map((coord, coordIndex) => {
          if (!coord || coord.length < 2) return '';
          
          const [x, y] = projectCoordinate(coord);
          
          // Validate coordinates
          if (!isFinite(x) || !isFinite(y)) return '';
          
          return coordIndex === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
        }).filter(cmd => cmd).join(' ');
        
        return commands ? commands + ' Z' : '';
      }).filter(cmd => cmd);
      
      return pathCommands.join(' ');
    } catch (error) {
      console.warn('Error processing coordinates:', error);
      return '';
    }
  };

  const geometryToPath = (geometry) => {
    if (!geometry || !geometry.coordinates) return '';
    
    try {
      switch (geometry.type) {
        case 'Polygon':
          return coordinatesToPath(geometry.coordinates);
        
        case 'MultiPolygon':
          return geometry.coordinates
            .map(polygon => coordinatesToPath(polygon))
            .filter(path => path)
            .join(' ');
        
        default:
          console.warn('Unsupported geometry type:', geometry.type);
          return '';
      }
    } catch (error) {
      console.warn('Error converting geometry to path:', error);
      return '';
    }
  };

  const handleCountryClick = (feature) => {
    if (!interactive || !onCountryClick) return;
    
    try {
      const country = dataService.getCountryById(feature.id);
      if (country) {
        analyticsService.trackUserInteraction('country_click', 'map', {
          country_id: feature.id,
          country_name: country.name
        });
        
        onCountryClick(country, feature);
      }
    } catch (error) {
      console.error('Error handling country click:', error);
      analyticsService.trackError(error, { context: 'country_click', country_id: feature.id });
    }
  };

  const getCountryFill = (feature) => {
    try {
      const countryId = feature.id;
      
      if (selectedCountry === countryId) return '#ef4444'; // Red for selected
      // Remove highlighting during quiz - don't show the answer!
      // if (highlightedCountry === countryId) return '#f59e0b'; // Orange for highlighted
      
      // Use different shades of green/blue for countries
      const colors = ['#a7f3d0', '#86efac', '#bfdbfe', '#93c5fd', '#fde68a', '#fcd34d'];
      const hash = feature.id ? feature.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
      return colors[hash % colors.length];
    } catch (error) {
      console.warn('Error getting country fill:', error);
      return '#a7f3d0';
    }
  };

  const getCountryStroke = (feature) => {
    try {
      const countryId = feature.id;
      
      if (selectedCountry === countryId || highlightedCountry === countryId) {
        return '#1f2937'; // Dark border for highlighted/selected
      }
      
      return '#ffffff'; // White border for normal state
    } catch (error) {
      return '#ffffff';
    }
  };

  const getStrokeWidth = (feature) => {
    try {
      const countryId = feature.id;
      
      if (selectedCountry === countryId) return '2';
      if (highlightedCountry === countryId) return '1.5';
      
      return '0.5';
    } catch (error) {
      return '0.5';
    }
  };

  // Zoom and pan handlers
  const handleWheel = (e) => {
    if (!interactive) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(5, transform.scale * delta));
    
    setTransform(prev => ({
      ...prev,
      scale: newScale
    }));
  };

  const handleDoubleClick = (e) => {
    if (!interactive) return;
    e.preventDefault();
    
    // Reset zoom
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // Error boundary component
  if (error) {
    return (
      <div className="geo-map error">
        <div className="error-message">
          <h3>Map Loading Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadMapData}>
            Retry
          </button>
          <details style={{ marginTop: '10px', fontSize: '12px' }}>
            <summary>Technical Details</summary>
            <pre>{error}</pre>
          </details>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="geo-map loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading world map...</p>
          <p style={{ fontSize: '12px', opacity: 0.7 }}>
            Fetching data from REST Countries and Natural Earth APIs...
          </p>
        </div>
      </div>
    );
  }

  if (!geoData || !geoData.features || geoData.features.length === 0) {
    return (
      <div className="geo-map error">
        <div className="error-message">
          <h3>No Map Data</h3>
          <p>Unable to load geographic data for the world map.</p>
          <button className="btn btn-primary" onClick={loadMapData}>
            Try Again
          </button>
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
        preserveAspectRatio="xMidYMid meet"
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="1" stdDeviation="1" floodOpacity="0.3"/>
          </filter>
          <filter id="highlight" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.5"/>
          </filter>
        </defs>
        
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Ocean background */}
          <rect 
            x="-180" 
            y="-90" 
            width="360" 
            height="180" 
            fill="#0ea5e9" 
            className="ocean"
          />
          
          {/* Graticule (grid lines) for reference */}
          <g className="graticule" stroke="#f0f0f0" strokeWidth="0.5" fill="none" opacity="0.5">
            {/* Longitude lines */}
            {[-120, -60, 0, 60, 120].map(lon => (
              <line key={`lon-${lon}`} x1={lon} y1="-90" x2={lon} y2="90" />
            ))}
            {/* Latitude lines */}
            {[-60, -30, 0, 30, 60].map(lat => (
              <line key={`lat-${lat}`} x1="-180" y1={-lat} x2="180" y2={-lat} />
            ))}
          </g>
          
          {/* Country paths */}
        {geoData.features.map((feature, index) => {
          try {
            const path = geometryToPath(feature.geometry);
            if (!path) return null;
            
            // Create unique key to avoid duplicate key issues
            const countryId = feature.id || `unknown-${index}`;
            const uniqueKey = `${countryId}-${index}`;
            const isHighlighted = highlightedCountry === countryId;
            const isSelected = selectedCountry === countryId;
            
            return (
              <g key={uniqueKey} className="country-group">
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
              </g>
            );
          } catch (error) {
            console.warn(`Error rendering country ${feature.id}:`, error);
            return null;
          }
        })}
        </g>
      </svg>
      
      {/* Zoom controls */}
      {interactive && (
        <div className="zoom-controls">
          <button 
            className="zoom-btn zoom-in"
            onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(5, prev.scale * 1.2) }))}
            title="Zoom In"
          >
            +
          </button>
          <button 
            className="zoom-btn zoom-out"
            onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(0.5, prev.scale * 0.8) }))}
            title="Zoom Out"
          >
            -
          </button>
          <button 
            className="zoom-btn zoom-reset"
            onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
            title="Reset Zoom"
          >
            ⌂
          </button>
        </div>
      )}
      
      {/* Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-color" style={{backgroundColor: '#a7f3d0'}}></div>
          <span>Countries</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{backgroundColor: '#0ea5e9'}}></div>
          <span>Ocean</span>
        </div>
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
        {interactive && <span> • Click to select</span>}
      </div>
    </div>
  );
};

export default GeoMapFixed;