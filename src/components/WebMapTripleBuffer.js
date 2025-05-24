import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import dataService from '../services/dataService';
import analyticsService from '../services/analyticsService';
import usageTracker from '../services/usageTracker';
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

const WebMapTripleBuffer = ({ 
  onCountryClick, 
  highlightedCountry, 
  selectedCountry, 
  interactive = true 
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoJsonLayersRef = useRef({
    left: null,
    center: null,
    right: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentLongitudeOffset, setCurrentLongitudeOffset] = useState(0);
  const geoJsonDataRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    Object.values(geoJsonLayersRef.current).forEach(layer => {
      if (layer && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.removeLayer(layer);
        } catch (err) {
          console.warn('Error removing GeoJSON layer:', err);
        }
      }
    });
    geoJsonLayersRef.current = { left: null, center: null, right: null };
    
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

  // Force map resize when interactive prop changes
  useEffect(() => {
    if (mapInstanceRef.current && interactive) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
        console.log('Triple buffer map resized after game start');
      }, 100);
    }
  }, [interactive]);

  const initializeMap = () => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      // Create map with triple-buffer world wrapping
      const map = L.map(mapContainerRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 10,
        worldCopyJump: false, // Disable default world jumping for custom handling
        maxBounds: [[-85, -Infinity], [85, Infinity]],
        zoomControl: false,
        attributionControl: true,
      });

      // Add custom zoom control
      L.control.zoom({
        position: 'topright'
      }).addTo(map);

      // Add MapBox satellite imagery with country borders
      const mapboxAccessToken = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'; // Default public token for testing
      
      // Initialize usage tracking
      const usageStatus = usageTracker.initialize();
      const shouldUseMapBox = usageTracker.shouldUseMapBox() && !usageTracker.isForcedFallback();
      
      console.log('📊 MapBox Usage Status:', usageStatus);
      
      let tileLayer;
      
      if (shouldUseMapBox) {
        try {
          // Track MapBox usage
          usageTracker.trackRequest('satellite');
          
          // MapBox Pure Satellite (no labels, clean imagery)
          tileLayer = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}@2x?access_token=' + mapboxAccessToken, {
            attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>',
            noWrap: false,
            continuousWorld: true,
            maxZoom: 10,
            tileSize: 512,
            zoomOffset: -1,
            id: 'mapbox.satellite',
          });

          tileLayer.addTo(map);
          
          console.log('✅ Using MapBox satellite imagery');
          
        } catch (err) {
          console.warn('MapBox failed, falling back to Esri:', err);
          shouldUseMapBox = false;
        }
      }
      
      if (!shouldUseMapBox) {
        try {
          // Fallback to Esri World Imagery (free, no API limits)
          tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            noWrap: false,
            continuousWorld: true,
            maxZoom: 10,
          });
          
          tileLayer.addTo(map);
          console.log('🔄 Using Esri fallback imagery (usage protection active)');
          
        } catch (err) {
          console.error('Both MapBox and Esri failed:', err);
          setError('Failed to load map imagery');
        }
      }

      // Add click listener for anywhere on the map
      map.on('click', (e) => {
        handleMapClick(e);
      });

      // Add move event listeners for smooth buffer management
      map.on('move', () => {
        handleMapMove();
      });
      
      map.on('moveend', () => {
        handleMapMove();
      });

      map.on('zoomend', () => {
        try {
          const zoom = map.getZoom();
          analyticsService.trackUserInteraction('map_zoom', 'webmap_triple_buffer', { zoom_level: zoom });
        } catch (err) {
          console.warn('Error in zoom event:', err);
        }
      });

      // Wait for map to be ready
      map.whenReady(() => {
        mapInstanceRef.current = map;
        setMapReady(true);
        console.log('Triple buffer map initialized successfully');
      });

    } catch (err) {
      console.error('Failed to initialize triple buffer map:', err);
      setError(`Map initialization failed: ${err.message}`);
      analyticsService.trackError(err, { context: 'triple_buffer_map_initialization' });
    }
  };

  const handleMapMove = () => {
    if (!mapInstanceRef.current || !geoJsonDataRef.current) return;

    try {
      const now = Date.now();
      // Throttle updates to every 100ms for performance
      if (now - lastUpdateTimeRef.current < 100) return;
      lastUpdateTimeRef.current = now;

      const center = mapInstanceRef.current.getCenter();
      const newLongitudeOffset = Math.floor((center.lng + 180) / 360) * 360;
      
      // Update when crossing 180 degree boundaries for smoother experience
      if (Math.abs(newLongitudeOffset - currentLongitudeOffset) >= 180) {
        setCurrentLongitudeOffset(newLongitudeOffset);
        updateTripleBuffer(newLongitudeOffset);
      }

      analyticsService.trackUserInteraction('map_pan', 'webmap_triple_buffer', {
        lat: center.lat,
        lng: center.lng,
        longitude_offset: newLongitudeOffset
      });
    } catch (err) {
      console.warn('Error in move event:', err);
    }
  };

  const loadGeoData = async () => {
    if (!mapInstanceRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading geographic data for triple buffer...');
      const data = await dataService.initialize();
      
      if (!data.geoJsonData || !data.geoJsonData.features) {
        throw new Error('No geographic data available');
      }

      console.log(`Loaded ${data.geoJsonData.features.length} countries for triple buffer`);
      
      // Validate and clean GeoJSON data
      const cleanGeoJson = validateAndCleanGeoJson(data.geoJsonData);
      
      if (cleanGeoJson.features.length === 0) {
        throw new Error('No valid geographic features found');
      }

      geoJsonDataRef.current = cleanGeoJson;
      initializeTripleBuffer();
      
    } catch (err) {
      console.error('Failed to load geographic data:', err);
      setError(err.message);
      analyticsService.trackError(err, { context: 'triple_buffer_geojson_loading' });
    } finally {
      setIsLoading(false);
    }
  };

  const validateAndCleanGeoJson = (geoJsonData) => {
    const validFeatures = [];
    
    geoJsonData.features.forEach((feature, index) => {
      try {
        if (!feature || !feature.geometry || !feature.properties) {
          console.warn(`Feature ${index} missing required properties`);
          return;
        }

        if (!feature.geometry.coordinates || !Array.isArray(feature.geometry.coordinates)) {
          console.warn(`Feature ${index} has invalid coordinates`);
          return;
        }

        const isValidCoordinates = validateCoordinates(feature.geometry.coordinates);
        if (!isValidCoordinates) {
          console.warn(`Feature ${index} has coordinates out of range`);
          return;
        }

        if (!feature.id && feature.properties) {
          feature.id = feature.properties.iso_a3 || feature.properties.ISO_A3 || `country_${index}`;
        }

        validFeatures.push(feature);
      } catch (err) {
        console.warn(`Error validating feature ${index}:`, err);
      }
    });

    console.log(`Validated ${validFeatures.length}/${geoJsonData.features.length} features for triple buffer`);
    
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

  const initializeTripleBuffer = () => {
    if (!mapInstanceRef.current || !geoJsonDataRef.current) return;

    try {
      // Clear existing layers
      Object.values(geoJsonLayersRef.current).forEach(layer => {
        if (layer && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(layer);
        }
      });

      // Create three copies of the world: left (-360), center (0), right (+360)
      const offsets = [-360, 0, 360];
      const layerNames = ['left', 'center', 'right'];

      layerNames.forEach((name, index) => {
        const offset = offsets[index];
        const offsetGeoJson = createOffsetGeoJson(geoJsonDataRef.current, offset);
        
        const layer = L.geoJSON(offsetGeoJson, {
          style: getCountryStyle,
          onEachFeature: (feature, layer) => {
            try {
              onEachFeature(feature, layer);
            } catch (err) {
              console.warn(`Error setting up feature ${feature.id} in ${name} layer:`, err);
            }
          }
        });

        layer.addTo(mapInstanceRef.current);
        geoJsonLayersRef.current[name] = layer;
      });

      console.log('Triple buffer initialized with three world copies');

    } catch (err) {
      console.error('Failed to initialize triple buffer:', err);
      setError(`Failed to create triple buffer: ${err.message}`);
      analyticsService.trackError(err, { context: 'triple_buffer_initialization' });
    }
  };

  const updateTripleBuffer = (newLongitudeOffset) => {
    if (!mapInstanceRef.current || !geoJsonDataRef.current) return;

    try {
      console.log(`Updating triple buffer for longitude offset: ${newLongitudeOffset}`);
      
      // Determine which direction we moved
      const direction = newLongitudeOffset > currentLongitudeOffset ? 'east' : 'west';
      
      if (direction === 'east') {
        // Moving east: left becomes center, center becomes right, create new left
        const oldLeft = geoJsonLayersRef.current.left;
        if (oldLeft) mapInstanceRef.current.removeLayer(oldLeft);
        
        geoJsonLayersRef.current.left = geoJsonLayersRef.current.center;
        geoJsonLayersRef.current.center = geoJsonLayersRef.current.right;
        
        // Create new right layer
        const rightOffset = newLongitudeOffset + 360;
        const rightGeoJson = createOffsetGeoJson(geoJsonDataRef.current, rightOffset);
        const rightLayer = L.geoJSON(rightGeoJson, {
          style: getCountryStyle,
          onEachFeature: (feature, layer) => {
            try {
              onEachFeature(feature, layer);
            } catch (err) {
              console.warn(`Error setting up feature ${feature.id} in new right layer:`, err);
            }
          }
        });
        
        rightLayer.addTo(mapInstanceRef.current);
        geoJsonLayersRef.current.right = rightLayer;
        
      } else {
        // Moving west: right becomes center, center becomes left, create new right
        const oldRight = geoJsonLayersRef.current.right;
        if (oldRight) mapInstanceRef.current.removeLayer(oldRight);
        
        geoJsonLayersRef.current.right = geoJsonLayersRef.current.center;
        geoJsonLayersRef.current.center = geoJsonLayersRef.current.left;
        
        // Create new left layer
        const leftOffset = newLongitudeOffset - 360;
        const leftGeoJson = createOffsetGeoJson(geoJsonDataRef.current, leftOffset);
        const leftLayer = L.geoJSON(leftGeoJson, {
          style: getCountryStyle,
          onEachFeature: (feature, layer) => {
            try {
              onEachFeature(feature, layer);
            } catch (err) {
              console.warn(`Error setting up feature ${feature.id} in new left layer:`, err);
            }
          }
        });
        
        leftLayer.addTo(mapInstanceRef.current);
        geoJsonLayersRef.current.left = leftLayer;
      }
      
      console.log(`Triple buffer updated for ${direction}ward movement`);
      
    } catch (err) {
      console.error('Failed to update triple buffer:', err);
    }
  };

  const createOffsetGeoJson = (originalGeoJson, longitudeOffset) => {
    const offsetFeatures = originalGeoJson.features.map(feature => {
      const offsetFeature = JSON.parse(JSON.stringify(feature)); // Deep clone
      
      // Recursively offset all coordinates
      const offsetCoordinates = (coords) => {
        if (Array.isArray(coords[0])) {
          return coords.map(offsetCoordinates);
        } else {
          // This is a [lng, lat] pair
          return [coords[0] + longitudeOffset, coords[1]];
        }
      };
      
      if (offsetFeature.geometry && offsetFeature.geometry.coordinates) {
        offsetFeature.geometry.coordinates = offsetCoordinates(offsetFeature.geometry.coordinates);
      }
      
      // Add offset info to feature ID to avoid conflicts
      offsetFeature.id = `${feature.id}_offset_${longitudeOffset}`;
      offsetFeature.originalId = feature.id;
      
      return offsetFeature;
    });
    
    return {
      type: 'FeatureCollection',
      features: offsetFeatures
    };
  };

  const getCountryStyle = (feature) => {
    try {
      const countryId = feature.originalId || feature.id;
      
      // Base style - invisible borders for natural clicking
      let style = {
        fillColor: 'transparent',
        weight: 0,
        opacity: 0,
        color: 'transparent',
        fillOpacity: 0,
      };

      // Only highlight selected country to show feedback
      if (selectedCountry === countryId) {
        style.fillColor = '#ef4444';
        style.weight = 2;
        style.color = '#dc2626';
        style.fillOpacity = 0.6;
        style.opacity = 1;
      }

      return style;
    } catch (err) {
      console.warn(`Error styling country ${feature.id}:`, err);
      return {
        fillColor: 'transparent',
        weight: 0,
        opacity: 0,
        color: 'transparent',
        fillOpacity: 0,
      };
    }
  };

  const getCountryFill = (feature) => {
    const colors = [
      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', 
      '#ef4444', '#06b6d4', '#84cc16', '#f97316'
    ];
    
    const originalId = feature.originalId || feature.id;
    const hash = originalId ? 
      originalId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 
      Math.floor(Math.random() * colors.length);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const onEachFeature = (feature, layer) => {
    // No individual feature event handlers needed - using global map click
    return;
  };

  const handleMapClick = (e) => {
    if (!onCountryClick || !interactive) return;
    
    try {
      const clickPoint = [e.latlng.lng, e.latlng.lat];
      let foundCountry = null;
      let foundFeature = null;
      
      // Check all layers for point-in-polygon
      Object.values(geoJsonLayersRef.current).forEach(layerGroup => {
        if (!layerGroup || foundCountry) return;
        
        layerGroup.eachLayer((layer) => {
          if (foundCountry) return;
          
          const feature = layer.feature;
          if (!feature || !feature.geometry) return;
          
          // Use Leaflet's built-in point-in-polygon test
          if (layer.getBounds && layer.getBounds().contains(e.latlng)) {
            // More precise check using the actual geometry
            const isInside = isPointInPolygon(clickPoint, feature.geometry);
            if (isInside) {
              const originalId = feature.originalId || feature.id;
              const country = dataService.getCountryById(originalId);
              if (country) {
                foundCountry = country;
                foundFeature = feature;
              }
            }
          }
        });
      });
      
      // If no direct hit, find closest country
      if (!foundCountry) {
        foundCountry = findClosestCountry(clickPoint);
      }
      
      if (foundCountry) {
        analyticsService.trackUserInteraction('map_click', 'webmap_triple_buffer', {
          country_id: foundCountry.cca3,
          country_name: foundCountry.name,
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          was_direct_hit: !!foundFeature
        });
        
        onCountryClick(foundCountry, foundFeature);
      }
    } catch (err) {
      console.warn('Error handling map click:', err);
    }
  };

  // Point-in-polygon test for geographic coordinates
  const isPointInPolygon = (point, geometry) => {
    try {
      if (geometry.type === 'Polygon') {
        return pointInPolygon(point, geometry.coordinates[0]);
      } else if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some(polygon => 
          pointInPolygon(point, polygon[0])
        );
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  // Ray casting algorithm for point-in-polygon
  const pointInPolygon = (point, polygon) => {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  // Find closest country if click missed all polygons
  const findClosestCountry = (clickPoint) => {
    try {
      const countries = dataService.getAllCountries();
      let closest = null;
      let minDistance = Infinity;
      
      countries.forEach(country => {
        if (country.latlng && country.latlng.length >= 2) {
          const distance = calculateDistance(
            clickPoint[1], clickPoint[0], // lat, lng
            country.latlng[0], country.latlng[1] // country lat, lng
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            closest = country;
          }
        }
      });
      
      return closest;
    } catch (err) {
      console.warn('Error finding closest country:', err);
      return null;
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const updateCountryStyles = () => {
    if (!Object.values(geoJsonLayersRef.current).some(layer => layer)) return;
    
    try {
      Object.values(geoJsonLayersRef.current).forEach(layerGroup => {
        if (layerGroup) {
          layerGroup.eachLayer((layer) => {
            const style = getCountryStyle(layer.feature);
            layer.setStyle(style);
          });
        }
      });
    } catch (err) {
      console.warn('Error updating country styles in triple buffer:', err);
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
        ref={mapContainerRef} 
        className="leaflet-map"
        style={{ width: '100%', height: '100%' }}
      />
      
      {isLoading && (
        <div className="map-loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading triple-buffer world map...</p>
            <p style={{fontSize: '12px', opacity: 0.7}}>
              Initializing seamless world wrapping with continuous click zones...
            </p>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default WebMapTripleBuffer;