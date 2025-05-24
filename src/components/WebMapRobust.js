import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import dataService from '../services/dataService';
import analyticsService from '../services/analyticsService';
import 'leaflet/dist/leaflet.css';
import './WebMap.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDE5LjQwMzYgMTkuNDAzNiAyNSAxMi41IDI1QzUuNTk2NDQgMjUgMCAxOS40MDM2IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiM0Mjg1RjQiLz4KPHBhdGggZD0iTTEyLjUgMzVMMTguNSAyNUg2LjVMMTIuNSAzNVoiIGZpbGw9IiM0Mjg1RjQiLz4KPC9zdmc+',
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDE5LjQwMzYgMTkuNDAzNiAyNSAxMi41IDI1QzUuNTk2NDQgMjUgMCAxOS40MDM2IDAgMTIuNUMwIDUuNTY0NCAwIDEyLjUgMFoiIGZpbGw9IiM0Mjg1RjQiLz4KPHBhdGggZD0iTTEyLjUgMzVMMTguNSAyNUg2LjVMMTIuNSAzNVoiIGZpbGw9IiM0Mjg1RjQiLz4KPC9zdmc+',
  shadowUrl: null,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const WebMapRobust = ({ 
  onCountryClick, 
  highlightedCountry, 
  selectedCountry, 
  interactive = true 
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (geoJsonLayerRef.current && mapInstanceRef.current) {
      try {
        mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
        geoJsonLayerRef.current = null;
      } catch (err) {
        console.warn('Error removing GeoJSON layer:', err);
      }
    }
    
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      } catch (err) {
        console.warn('Error removing map:', err);
      }
    }
  }, []);

  useEffect(() => {
    initializeMap();
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (mapReady) {
      loadGeoData();
    }
  }, [mapReady]);

  useEffect(() => {
    updateCountryStyles();
  }, [selectedCountry, highlightedCountry]);

  // Force map resize when interactive prop changes (game starts)
  useEffect(() => {
    if (mapInstanceRef.current && interactive) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
        console.log('Map resized after game start');
      }, 100);
    }
  }, [interactive]);

  const initializeMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      // Create map with robust world wrapping configuration
      const map = L.map(mapRef.current, {
        center: [20, 0], // Center on equator, Prime Meridian
        zoom: 2,
        minZoom: 2,
        maxZoom: 10, // Limit max zoom to avoid loading issues
        worldCopyJump: true, // Enable seamless world wrapping
        maxBounds: [[-85, -Infinity], [85, Infinity]], // Limit latitude, infinite longitude
        zoomControl: false,
        attributionControl: true,
      });

      // Add custom zoom control in top-right
      L.control.zoom({
        position: 'topright'
      }).addTo(map);

      // Add clean tile layer without city names - using CartoDB Positron
      const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
        noWrap: false,
        continuousWorld: true,
        worldCopyJump: true,
        maxZoom: 10,
        tileSize: 256,
        zoomOffset: 0,
      });

      tileLayer.addTo(map);

      // Add event listeners with error handling
      map.on('zoomend', () => {
        try {
          const zoom = map.getZoom();
          analyticsService.trackUserInteraction('map_zoom', 'webmap_robust', { zoom_level: zoom });
        } catch (err) {
          console.warn('Error in zoom event:', err);
        }
      });

      map.on('moveend', () => {
        try {
          const center = map.getCenter();
          analyticsService.trackUserInteraction('map_pan', 'webmap_robust', {
            lat: center.lat,
            lng: center.lng
          });
        } catch (err) {
          console.warn('Error in move event:', err);
        }
      });

      // Wait for map to be ready
      map.whenReady(() => {
        mapInstanceRef.current = map;
        setMapReady(true);
        console.log('Map initialized successfully');
      });

    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError(`Map initialization failed: ${err.message}`);
      analyticsService.trackError(err, { context: 'map_initialization' });
    }
  };

  const loadGeoData = async () => {
    if (!mapInstanceRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading geographic data...');
      const data = await dataService.initialize();
      
      if (!data.geoJsonData || !data.geoJsonData.features) {
        throw new Error('No geographic data available');
      }

      console.log(`Loaded ${data.geoJsonData.features.length} countries`);
      
      // Validate and clean GeoJSON data
      const cleanGeoJson = validateAndCleanGeoJson(data.geoJsonData);
      
      if (cleanGeoJson.features.length === 0) {
        throw new Error('No valid geographic features found');
      }

      addGeoJsonLayer(cleanGeoJson);
      
    } catch (err) {
      console.error('Failed to load geographic data:', err);
      setError(err.message);
      analyticsService.trackError(err, { context: 'geojson_loading' });
    } finally {
      setIsLoading(false);
    }
  };

  const validateAndCleanGeoJson = (geoJsonData) => {
    const validFeatures = [];
    
    geoJsonData.features.forEach((feature, index) => {
      try {
        // Validate basic structure
        if (!feature || !feature.geometry || !feature.properties) {
          console.warn(`Feature ${index} missing required properties`);
          return;
        }

        // Validate geometry
        if (!feature.geometry.coordinates || !Array.isArray(feature.geometry.coordinates)) {
          console.warn(`Feature ${index} has invalid coordinates`);
          return;
        }

        // Validate coordinate ranges
        const isValidCoordinates = validateCoordinates(feature.geometry.coordinates);
        if (!isValidCoordinates) {
          console.warn(`Feature ${index} has coordinates out of range`);
          return;
        }

        // Ensure feature has ID
        if (!feature.id && feature.properties) {
          feature.id = feature.properties.iso_a3 || feature.properties.ISO_A3 || `country_${index}`;
        }

        validFeatures.push(feature);
      } catch (err) {
        console.warn(`Error validating feature ${index}:`, err);
      }
    });

    console.log(`Validated ${validFeatures.length}/${geoJsonData.features.length} features`);
    
    return {
      type: 'FeatureCollection',
      features: validFeatures
    };
  };

  const validateCoordinates = (coordinates) => {
    const checkCoordinate = (coord) => {
      if (!Array.isArray(coord) || coord.length < 2) return false;
      const [lng, lat] = coord;
      return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
    };

    const validateArray = (arr) => {
      if (!Array.isArray(arr)) return false;
      
      if (arr.length === 2 && typeof arr[0] === 'number') {
        return checkCoordinate(arr);
      }
      
      return arr.every(item => validateArray(item));
    };

    return validateArray(coordinates);
  };

  const addGeoJsonLayer = (geoJsonData) => {
    if (!mapInstanceRef.current) return;

    try {
      // Remove existing layer if present
      if (geoJsonLayerRef.current) {
        mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
      }

      // Create GeoJSON layer with error handling
      const geoJsonLayer = L.geoJSON(geoJsonData, {
        style: getCountryStyle,
        onEachFeature: (feature, layer) => {
          try {
            onEachFeature(feature, layer);
          } catch (err) {
            console.warn(`Error setting up feature ${feature.id}:`, err);
          }
        }
      });

      geoJsonLayer.addTo(mapInstanceRef.current);
      geoJsonLayerRef.current = geoJsonLayer;

      console.log('GeoJSON layer added successfully');

    } catch (err) {
      console.error('Failed to add GeoJSON layer:', err);
      setError(`Failed to add country boundaries: ${err.message}`);
      analyticsService.trackError(err, { context: 'geojson_layer_creation' });
    }
  };

  const getCountryStyle = (feature) => {
    try {
      const countryId = feature.id;
      
      // Base style
      let style = {
        fillColor: getCountryFill(feature),
        weight: 1,
        opacity: 0.8,
        color: '#ffffff',
        fillOpacity: 0.7,
      };

      // Highlight selected country
      if (selectedCountry === countryId) {
        style.fillColor = '#ef4444';
        style.weight = 3;
        style.color = '#dc2626';
        style.fillOpacity = 0.9;
      }

      return style;
    } catch (err) {
      console.warn(`Error styling country ${feature.id}:`, err);
      return {
        fillColor: '#94a3b8',
        weight: 1,
        opacity: 0.8,
        color: '#ffffff',
        fillOpacity: 0.7,
      };
    }
  };

  const getCountryFill = (feature) => {
    const colors = [
      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', 
      '#ef4444', '#06b6d4', '#84cc16', '#f97316'
    ];
    
    const hash = feature.id ? 
      feature.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 
      Math.floor(Math.random() * colors.length);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const onEachFeature = (feature, layer) => {
    if (!interactive) return;

    const countryName = feature.properties?.name || 
                       feature.properties?.NAME || 
                       feature.id || 
                       'Unknown Country';

    layer.on({
      click: (e) => handleCountryClick(e, feature),
      mouseover: (e) => {
        if (selectedCountry !== feature.id) {
          layer.setStyle({
            weight: 2,
            color: '#666',
            fillOpacity: 0.9
          });
        }
        
        // Removed tooltip to avoid giving away answers
      },
      mouseout: (e) => {
        if (selectedCountry !== feature.id && geoJsonLayerRef.current) {
          try {
            geoJsonLayerRef.current.resetStyle(layer);
          } catch (err) {
            console.warn('Error resetting layer style:', err);
          }
        }
        layer.closeTooltip();
      }
    });
  };

  const handleCountryClick = (e, feature) => {
    if (!onCountryClick) return;
    
    try {
      L.DomEvent.stopPropagation(e);
      
      const country = dataService.getCountryById(feature.id);
      if (country) {
        analyticsService.trackUserInteraction('country_click', 'webmap_robust', {
          country_id: feature.id,
          country_name: country.name,
          lat: e.latlng.lat,
          lng: e.latlng.lng
        });
        
        onCountryClick(country, feature);
      }
    } catch (err) {
      console.warn('Error handling country click:', err);
    }
  };

  const updateCountryStyles = () => {
    if (!geoJsonLayerRef.current) return;
    
    try {
      geoJsonLayerRef.current.eachLayer((layer) => {
        const style = getCountryStyle(layer.feature);
        layer.setStyle(style);
      });
    } catch (err) {
      console.warn('Error updating country styles:', err);
    }
  };

  if (error) {
    return (
      <div className="webmap-container error">
        <div className="error-message">
          <h3>🗺️ Map Error</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={loadGeoData}>
              Retry Loading
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="webmap-container">
      <div 
        ref={mapRef} 
        className="leaflet-map"
        style={{ width: '100%', height: '100%' }}
      />
      
      {isLoading && (
        <div className="map-loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading world map...</p>
            <p style={{fontSize: '12px', opacity: 0.7}}>
              Loading country boundaries and map tiles...
            </p>
          </div>
        </div>
      )}
      
      {/* Map info overlay */}
      <div className="map-info-overlay">
        <div className="map-stats">
          <span>🌍 Interactive World Map</span>
          {interactive && <span> • Click countries to select</span>}
        </div>
      </div>
    </div>
  );
};

export default WebMapRobust;