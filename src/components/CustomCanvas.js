import React, { useRef, useEffect, useState, useCallback } from 'react';
import dataService from '../services/dataService';
import analyticsService from '../services/analyticsService';
import './CustomCanvas.css';

const CustomCanvas = ({ 
  onCountryClick, 
  highlightedCountry, 
  selectedCountry, 
  interactive = true 
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [geoData, setGeoData] = useState(null);
  
  // Map state
  const [mapState, setMapState] = useState({
    centerX: 0, // Longitude center
    centerY: 0, // Latitude center
    zoom: 2,
    canvasWidth: 0,
    canvasHeight: 0
  });
  
  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [countryPaths, setCountryPaths] = useState(new Map());

  // Initialize canvas and load data
  useEffect(() => {
    const initializeCanvas = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load geographic data
        const data = await dataService.initialize();
        if (!data.geoJsonData || !data.geoJsonData.features) {
          throw new Error('No geographic data available');
        }
        
        setGeoData(data.geoJsonData);
        setupCanvas();
        
      } catch (err) {
        console.error('Failed to initialize canvas:', err);
        setError(err.message);
        analyticsService.trackError(err, { context: 'canvas_initialization' });
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeCanvas();
  }, []);

  // Setup canvas dimensions
  const setupCanvas = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const rect = container.getBoundingClientRect();
    
    const width = rect.width;
    const height = rect.height;
    
    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    setMapState(prev => ({
      ...prev,
      canvasWidth: width,
      canvasHeight: height
    }));
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setupCanvas();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  // Draw the map
  useEffect(() => {
    if (geoData && mapState.canvasWidth > 0) {
      drawMap();
    }
  }, [geoData, mapState, selectedCountry, highlightedCountry]);

  // Coordinate conversion functions
  const lonLatToPixel = (lon, lat) => {
    const { centerX, centerY, zoom, canvasWidth, canvasHeight } = mapState;
    
    // Mercator projection with infinite horizontal wrapping
    const scale = Math.pow(2, zoom) * 100;
    
    // Handle longitude wrapping
    let deltaLon = lon - centerX;
    while (deltaLon > 180) deltaLon -= 360;
    while (deltaLon < -180) deltaLon += 360;
    
    const x = canvasWidth / 2 + deltaLon * scale / 180;
    
    // Mercator latitude projection
    const latRad = lat * Math.PI / 180;
    const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const centerLatRad = centerY * Math.PI / 180;
    const centerMercY = Math.log(Math.tan(Math.PI / 4 + centerLatRad / 2));
    
    const y = canvasHeight / 2 - (mercY - centerMercY) * scale;
    
    return { x, y };
  };

  const pixelToLonLat = (x, y) => {
    const { centerX, centerY, zoom, canvasWidth, canvasHeight } = mapState;
    const scale = Math.pow(2, zoom) * 100;
    
    const lon = centerX + (x - canvasWidth / 2) * 180 / scale;
    
    const centerLatRad = centerY * Math.PI / 180;
    const centerMercY = Math.log(Math.tan(Math.PI / 4 + centerLatRad / 2));
    const mercY = centerMercY + (canvasHeight / 2 - y) / scale;
    const lat = (Math.atan(Math.exp(mercY)) - Math.PI / 4) * 2 * 180 / Math.PI;
    
    return { lon, lat };
  };

  // Draw map on canvas
  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas || !geoData) return;
    
    const ctx = canvas.getContext('2d');
    const { canvasWidth, canvasHeight } = mapState;
    
    // Clear canvas with ocean color
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#3b82f6'; // Ocean blue
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    const paths = new Map();
    
    // Draw countries
    geoData.features.forEach((feature, index) => {
      try {
        const countryId = feature.id || feature.properties?.iso_a3 || `country_${index}`;
        const path = new Path2D();
        
        drawFeature(ctx, feature, path);
        paths.set(countryId, { path, feature });
        
        // Fill country
        ctx.fillStyle = getCountryColor(feature, countryId);
        ctx.fill(path);
        
        // Draw border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.stroke(path);
        
      } catch (err) {
        console.warn(`Error drawing feature ${index}:`, err);
      }
    });
    
    setCountryPaths(paths);
  };

  // Draw individual feature (country)
  const drawFeature = (ctx, feature, path) => {
    const { coordinates } = feature.geometry;
    
    if (feature.geometry.type === 'Polygon') {
      drawPolygon(coordinates, path);
    } else if (feature.geometry.type === 'MultiPolygon') {
      coordinates.forEach(polygon => drawPolygon(polygon, path));
    }
  };

  // Draw polygon
  const drawPolygon = (rings, path) => {
    rings.forEach((ring, ringIndex) => {
      if (ring.length < 3) return;
      
      let firstPoint = true;
      ring.forEach(coord => {
        if (!coord || coord.length < 2) return;
        
        const [lon, lat] = coord;
        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return;
        
        const { x, y } = lonLatToPixel(lon, lat);
        
        if (firstPoint) {
          path.moveTo(x, y);
          firstPoint = false;
        } else {
          path.lineTo(x, y);
        }
      });
      
      if (!firstPoint) {
        path.closePath();
      }
    });
  };

  // Get country color
  const getCountryColor = (feature, countryId) => {
    // Selected country
    if (selectedCountry === countryId) {
      return '#ef4444'; // Red
    }
    
    // Highlighted country
    if (highlightedCountry === countryId) {
      return '#fbbf24'; // Yellow
    }
    
    // Regular country color based on hash
    const colors = [
      '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', 
      '#84cc16', '#f97316', '#6366f1', '#ec4899'
    ];
    
    const hash = countryId ? 
      countryId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 
      Math.floor(Math.random() * colors.length);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Mouse event handlers
  const handleMouseDown = (e) => {
    if (!interactive) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setLastMousePos({ x, y });
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging) {
      // Pan the map
      const deltaX = x - lastMousePos.x;
      const deltaY = y - lastMousePos.y;
      
      const { zoom } = mapState;
      const scale = Math.pow(2, zoom) * 100;
      
      const deltaLon = -deltaX * 180 / scale;
      const deltaLat = deltaY * 180 / scale; // Simplified for small movements
      
      setMapState(prev => ({
        ...prev,
        centerX: prev.centerX + deltaLon,
        centerY: Math.max(-85, Math.min(85, prev.centerY + deltaLat)) // Clamp latitude
      }));
      
      setLastMousePos({ x, y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e) => {
    if (!interactive || !onCountryClick || isDragging) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check which country was clicked
    const ctx = canvasRef.current.getContext('2d');
    
    for (const [countryId, { path, feature }] of countryPaths) {
      if (ctx.isPointInPath(path, x, y)) {
        const country = dataService.getCountryById(countryId);
        if (country) {
          const { lon, lat } = pixelToLonLat(x, y);
          
          analyticsService.trackUserInteraction('country_click', 'custom_canvas', {
            country_id: countryId,
            country_name: country.name,
            lat,
            lng: lon
          });
          
          onCountryClick(country, feature);
        }
        break;
      }
    }
  };

  // Zoom handlers
  const handleWheel = (e) => {
    if (!interactive) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.5 : 0.5;
    
    setMapState(prev => ({
      ...prev,
      zoom: Math.max(1, Math.min(8, prev.zoom + delta))
    }));
    
    analyticsService.trackUserInteraction('map_zoom', 'custom_canvas', { 
      zoom_level: mapState.zoom + delta 
    });
  };

  const zoomIn = () => {
    setMapState(prev => ({
      ...prev,
      zoom: Math.min(8, prev.zoom + 1)
    }));
  };

  const zoomOut = () => {
    setMapState(prev => ({
      ...prev,
      zoom: Math.max(1, prev.zoom - 1)
    }));
  };

  const resetView = () => {
    setMapState(prev => ({
      ...prev,
      centerX: 0,
      centerY: 0,
      zoom: 2
    }));
  };

  if (error) {
    return (
      <div className="canvas-container error">
        <div className="error-message">
          <h3>🗺️ Map Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="canvas-container"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="world-canvas"
      />
      
      {isLoading && (
        <div className="canvas-loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading world map...</p>
          </div>
        </div>
      )}
      
      {/* Map controls */}
      <div className="map-controls">
        <button className="zoom-btn" onClick={zoomIn} title="Zoom In">+</button>
        <button className="zoom-btn" onClick={zoomOut} title="Zoom Out">−</button>
        <button className="zoom-btn reset-btn" onClick={resetView} title="Reset View">⌂</button>
      </div>
      
      {/* Map info */}
      <div className="map-info">
        <span>🌍 Custom World Map</span>
        {interactive && <span> • Click & drag to pan, scroll to zoom</span>}
      </div>
    </div>
  );
};

export default CustomCanvas;