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
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDE5LjQwMzYgMTkuNDAzNiAyNSAxMi41IDI1QzUuNTk2NDQgMjUgMCAxOS40MDM2IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiM0Mjg1RjQiLz4KPHBhdGggZD0iTTEyLjUgMzVMMTguNSAyNUg2LjVMMTIuNSAzNVoiIGZpbGw9IiM0Mjg1RjQiLz4KPC9zdmc+',
  shadowUrl: null,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const WebMapTripleBuffer = ({ 
  onCountryClick, 
  highlightedCountry, 
  selectedCountry, 
  interactive = true,
  gameState = null
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  
  // Multi-layer architecture references
  const layerSystemRef = useRef({
    // Border layer (bottom) - always visible country outlines
    borderLayers: {
      leftmost: null, left: null, center: null, right: null, rightmost: null
    },
    // Hover layer (middle) - interactive selection feedback
    hoverLayers: {
      leftmost: null, left: null, center: null, right: null, rightmost: null
    },
    // Validation layer (top) - game feedback (green/red)
    validationLayers: {
      green: { leftmost: null, left: null, center: null, right: null, rightmost: null },
      red: { leftmost: null, left: null, center: null, right: null, rightmost: null }
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentLongitudeOffset, setCurrentLongitudeOffset] = useState(0);
  const geoJsonDataRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const [mapProvider, setMapProvider] = useState('esri');
  const [hoveredCountry, setHoveredCountry] = useState(null);

  // Layer cleanup function (doesn't remove map)
  const cleanupLayers = useCallback(() => {
    const allLayers = [
      ...Object.values(layerSystemRef.current.borderLayers),
      ...Object.values(layerSystemRef.current.hoverLayers),
      ...Object.values(layerSystemRef.current.validationLayers.green),
      ...Object.values(layerSystemRef.current.validationLayers.red)
    ];
    
    allLayers.forEach(layer => {
      if (layer && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.removeLayer(layer);
        } catch (err) {
          console.warn('Error removing layer:', err);
        }
      }
    });
    
    // Reset layer references
    layerSystemRef.current = {
      borderLayers: { leftmost: null, left: null, center: null, right: null, rightmost: null },
      hoverLayers: { leftmost: null, left: null, center: null, right: null, rightmost: null },
      validationLayers: {
        green: { leftmost: null, left: null, center: null, right: null, rightmost: null },
        red: { leftmost: null, left: null, center: null, right: null, rightmost: null }
      }
    };
  }, []);

  // Complete cleanup function (removes map too)
  const cleanup = useCallback(() => {
    cleanupLayers();
    
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      } catch (err) {
        console.warn('Error removing map:', err);
      }
    }
  }, [cleanupLayers]);

  useEffect(() => {
    initializeMap();
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (mapReady) {
      loadGeoData();
    }
  }, [mapReady]);

  // Update hover layer when hoveredCountry changes
  useEffect(() => {
    updateHoverLayer();
  }, [hoveredCountry]);

  // Update validation layer when game feedback changes
  useEffect(() => {
    updateValidationLayer();
  }, [gameState?.feedback, gameState?.showingFeedback]);

  // Force map resize when interactive prop changes
  useEffect(() => {
    if (mapInstanceRef.current && interactive) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
        console.log('Multi-layer map resized after game start');
      }, 100);
    }
  }, [interactive]);

  const initializeMap = () => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      // Create map with world wrapping
      const map = L.map(mapContainerRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 10,
        worldCopyJump: false,
        maxBounds: [[-85, -Infinity], [85, Infinity]],
        zoomControl: false,
        attributionControl: true,
      });

      // Add custom zoom control
      L.control.zoom({
        position: 'topright'
      }).addTo(map);

      // Map provider setup
      const USE_MAPBOX = false;
      const mapboxAccessToken = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
      
      let shouldUseMapBox = false;
      if (USE_MAPBOX) {
        const usageStatus = usageTracker.initialize();
        shouldUseMapBox = usageTracker.shouldUseMapBox() && !usageTracker.isForcedFallback();
        console.log('📊 MapBox Usage Status:', usageStatus);
      } else {
        console.log('🔒 MapBox disabled for viral protection - using Esri + custom borders');
      }
      
      let tileLayer;
      
      if (shouldUseMapBox) {
        try {
          usageTracker.trackRequest('satellite');
          
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
          setMapProvider('mapbox');
          console.log('✅ Using MapBox satellite imagery');
          
        } catch (err) {
          console.warn('MapBox failed, falling back to Esri:', err);
          shouldUseMapBox = false;
        }
      }
      
      if (!shouldUseMapBox) {
        try {
          tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            noWrap: false,
            continuousWorld: true,
            maxZoom: 10,
          });
          
          tileLayer.addTo(map);
          setMapProvider('esri');
          console.log('🔄 Using Esri satellite imagery with multi-layer borders');
          
        } catch (err) {
          console.error('Both MapBox and Esri failed:', err);
          setError('Failed to load map imagery');
        }
      }

      // Add click listener for country detection
      map.on('click', (e) => {
        handleMapClick(e);
      });

      // Add move event listeners for buffer management
      map.on('move', handleMapMove);
      map.on('moveend', handleMapMove);

      map.on('zoomend', () => {
        try {
          const zoom = map.getZoom();
          analyticsService.trackUserInteraction('map_zoom', 'webmap_multi_layer', { zoom_level: zoom });
        } catch (err) {
          console.warn('Error in zoom event:', err);
        }
      });

      // Map ready
      map.whenReady(() => {
        mapInstanceRef.current = map;
        setMapReady(true);
        console.log('Multi-layer map initialized successfully');
      });

    } catch (err) {
      console.error('Failed to initialize multi-layer map:', err);
      setError(`Map initialization failed: ${err.message}`);
      analyticsService.trackError(err, { context: 'multi_layer_map_initialization' });
    }
  };

  const handleMapMove = () => {
    if (!mapInstanceRef.current || !geoJsonDataRef.current) return;

    try {
      const now = Date.now();
      if (now - lastUpdateTimeRef.current < 200) return;
      lastUpdateTimeRef.current = now;

      const center = mapInstanceRef.current.getCenter();
      const currentLng = center.lng;
      
      const distanceFromCenter = Math.abs(currentLng - currentLongitudeOffset);
      
      if (distanceFromCenter > 120) {
        const newCenterOffset = Math.round(currentLng / 360) * 360;
        console.log(`Recentering multi-layer system: ${currentLongitudeOffset}° → ${newCenterOffset}°`);
        setCurrentLongitudeOffset(newCenterOffset);
        updateAllLayers(newCenterOffset);
      }

      analyticsService.trackUserInteraction('map_pan', 'webmap_multi_layer', {
        lat: center.lat,
        lng: currentLng,
        center_offset: currentLongitudeOffset
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
      
      console.log('Loading geographic data for multi-layer system...');
      const data = await dataService.initialize();
      
      if (!data.geoJsonData || !data.geoJsonData.features) {
        throw new Error('No geographic data available');
      }

      console.log(`Loaded ${data.geoJsonData.features.length} countries for multi-layer system`);
      
      const cleanGeoJson = validateAndCleanGeoJson(data.geoJsonData);
      
      if (cleanGeoJson.features.length === 0) {
        throw new Error('No valid geographic features found');
      }

      geoJsonDataRef.current = cleanGeoJson;
      initializeAllLayers();
      
    } catch (err) {
      console.error('Failed to load geographic data:', err);
      setError(err.message);
      analyticsService.trackError(err, { context: 'multi_layer_geojson_loading' });
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

    console.log(`Validated ${validFeatures.length}/${geoJsonData.features.length} features for multi-layer system`);
    
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

  const initializeAllLayers = () => {
    if (!mapInstanceRef.current || !geoJsonDataRef.current) return;

    try {
      console.log('Initializing multi-layer system...');
      
      // Clear existing layers only (keep map)
      cleanupLayers();

      const centerOffset = currentLongitudeOffset;
      const offsets = [
        centerOffset - 720,  // leftmost
        centerOffset - 360,  // left  
        centerOffset,        // center
        centerOffset + 360,  // right
        centerOffset + 720   // rightmost
      ];
      const layerNames = ['leftmost', 'left', 'center', 'right', 'rightmost'];

      layerNames.forEach((name, index) => {
        const offset = offsets[index];
        const offsetGeoJson = createOffsetGeoJson(geoJsonDataRef.current, offset);
        
        // Layer 1: Border layer (bottom) - Always visible borders
        const borderLayer = L.geoJSON(offsetGeoJson, {
          style: getBorderStyle,
          onEachFeature: (feature, layer) => setupBorderFeature(feature, layer)
        });

        // Layer 2: Hover layer (middle) - Interactive hover feedback
        const hoverLayer = L.geoJSON(offsetGeoJson, {
          style: () => getInvisibleStyle(), // Start invisible
          onEachFeature: (feature, layer) => setupHoverFeature(feature, layer)
        });

        // Layer 3a: Validation layer - Green (correct answers)
        const validationGreenLayer = L.geoJSON(offsetGeoJson, {
          style: () => getValidationStyle('green'),
          interactive: false // No interaction on validation layer
        });

        // Layer 3b: Validation layer - Red (incorrect answers)
        const validationRedLayer = L.geoJSON(offsetGeoJson, {
          style: () => getValidationStyle('red'),
          interactive: false // No interaction on validation layer
        });

        // Add layers to map with proper z-index ordering
        borderLayer.addTo(mapInstanceRef.current);
        hoverLayer.addTo(mapInstanceRef.current);
        validationGreenLayer.addTo(mapInstanceRef.current);
        validationRedLayer.addTo(mapInstanceRef.current);

        // Set z-index to ensure proper layering
        if (borderLayer.getPane) {
          borderLayer.options.pane = 'overlayPane'; // z-index 400
        }
        if (hoverLayer.getPane) {
          hoverLayer.options.pane = 'markerPane'; // z-index 600
        }
        if (validationGreenLayer.getPane) {
          validationGreenLayer.options.pane = 'popupPane'; // z-index 700
        }
        if (validationRedLayer.getPane) {
          validationRedLayer.options.pane = 'popupPane'; // z-index 700
        }

        // Store layer references
        layerSystemRef.current.borderLayers[name] = borderLayer;
        layerSystemRef.current.hoverLayers[name] = hoverLayer;
        layerSystemRef.current.validationLayers.green[name] = validationGreenLayer;
        layerSystemRef.current.validationLayers.red[name] = validationRedLayer;
        
        console.log(`Created multi-layer system for ${name} (offset ${offset}°)`);
      });

      // Initially hide validation layers
      hideValidationLayers();

      console.log('Multi-layer system initialized - 1800° coverage with 3-layer architecture');

    } catch (err) {
      console.error('Failed to initialize multi-layer system:', err);
      setError(`Failed to create multi-layer system: ${err.message}`);
      analyticsService.trackError(err, { context: 'multi_layer_initialization' });
    }
  };

  const updateAllLayers = (centerOffset) => {
    if (!mapInstanceRef.current || !geoJsonDataRef.current) return;

    try {
      console.log(`Rebuilding multi-layer system with center at ${centerOffset}°`);
      
      // Clean up layers and reinitialize
      cleanupLayers();
      initializeAllLayers();
      
    } catch (err) {
      console.error('Failed to update multi-layer system:', err);
    }
  };

  const createOffsetGeoJson = (originalGeoJson, longitudeOffset) => {
    const offsetFeatures = originalGeoJson.features.map(feature => {
      const offsetFeature = JSON.parse(JSON.stringify(feature));
      
      const offsetCoordinates = (coords) => {
        if (Array.isArray(coords[0])) {
          return coords.map(offsetCoordinates);
        } else {
          return [coords[0] + longitudeOffset, coords[1]];
        }
      };
      
      if (offsetFeature.geometry && offsetFeature.geometry.coordinates) {
        offsetFeature.geometry.coordinates = offsetCoordinates(offsetFeature.geometry.coordinates);
      }
      
      offsetFeature.id = `${feature.id}_offset_${longitudeOffset}`;
      offsetFeature.originalId = feature.id;
      
      return offsetFeature;
    });
    
    return {
      type: 'FeatureCollection',
      features: offsetFeatures
    };
  };

  // Layer 1: Border styles (always visible)
  const getBorderStyle = (feature) => {
    if (mapProvider === 'esri') {
      return {
        fillColor: 'transparent',
        weight: 2,
        opacity: 0.6,
        color: '#ffff00',
        fillOpacity: 0,
        dashArray: '4,4',
      };
    } else {
      return {
        fillColor: 'transparent',
        weight: 0,
        opacity: 0,
        color: 'transparent',
        fillOpacity: 0,
      };
    }
  };

  // Layer 2: Hover styles (interactive)
  const getHoverStyle = () => ({
    fillColor: '#3b82f6',
    weight: 2,
    opacity: 0.8,
    color: '#2563eb',
    fillOpacity: 0.2,
    dashArray: null,
  });

  // Layer 3: Validation styles (feedback)
  const getValidationStyle = (type) => {
    if (type === 'green') {
      return {
        fillColor: '#4caf50',
        color: '#2e7d32',
        fillOpacity: 0.6,
        weight: 3,
        opacity: 1.0,
        dashArray: null,
      };
    } else if (type === 'red') {
      return {
        fillColor: '#ef4444',
        color: '#dc2626',
        fillOpacity: 0.6,
        weight: 3,
        opacity: 1.0,
        dashArray: null,
      };
    }
  };

  const getInvisibleStyle = () => ({
    fillColor: 'transparent',
    weight: 0,
    opacity: 0,
    color: 'transparent',
    fillOpacity: 0,
  });

  // Border layer feature setup (no hover events)
  const setupBorderFeature = (feature, layer) => {
    // Border layer is purely visual - no interactions
  };

  // Hover layer feature setup (handles mouse interactions)
  const setupHoverFeature = (feature, layer) => {
    if (!interactive) return;

    const originalId = feature.originalId || feature.id;

    layer.on({
      mouseover: (e) => {
        if (gameState?.showingFeedback || !interactive) return;
        setHoveredCountry(originalId);
      },
      mouseout: (e) => {
        if (gameState?.showingFeedback || !interactive) return;
        setHoveredCountry(null);
      }
    });
  };

  // Update hover layer visibility
  const updateHoverLayer = () => {
    if (!hoveredCountry) {
      // Hide all hover layers
      Object.values(layerSystemRef.current.hoverLayers).forEach(layerGroup => {
        if (layerGroup) {
          layerGroup.eachLayer((layer) => {
            layer.setStyle(getInvisibleStyle());
          });
        }
      });
      return;
    }

    // Show hover for specific country
    Object.values(layerSystemRef.current.hoverLayers).forEach(layerGroup => {
      if (layerGroup) {
        layerGroup.eachLayer((layer) => {
          const feature = layer.feature;
          const originalId = feature.originalId || feature.id;
          
          if (originalId === hoveredCountry) {
            layer.setStyle(getHoverStyle());
          } else {
            layer.setStyle(getInvisibleStyle());
          }
        });
      }
    });
  };

  // Update validation layer visibility
  const updateValidationLayer = () => {
    if (!gameState?.showingFeedback || !gameState?.feedback) {
      hideValidationLayers();
      return;
    }

    const feedback = gameState.feedback;
    
    // Show green for correct answer (always shown)
    showValidationForCountry(feedback.correctAnswerCountryId, 'green');
    
    // Show red for incorrect user answer (only if wrong)
    if (!feedback.isCorrect && feedback.userAnswerCountryId) {
      showValidationForCountry(feedback.userAnswerCountryId, 'red');
    }
  };

  const showValidationForCountry = (countryId, type) => {
    const layers = type === 'green' 
      ? layerSystemRef.current.validationLayers.green 
      : layerSystemRef.current.validationLayers.red;

    Object.values(layers).forEach(layerGroup => {
      if (layerGroup) {
        layerGroup.eachLayer((layer) => {
          const feature = layer.feature;
          const originalId = feature.originalId || feature.id;
          
          if (originalId === countryId) {
            layer.setStyle(getValidationStyle(type));
          } else {
            layer.setStyle(getInvisibleStyle());
          }
        });
      }
    });
  };

  const hideValidationLayers = () => {
    const allValidationLayers = [
      ...Object.values(layerSystemRef.current.validationLayers.green),
      ...Object.values(layerSystemRef.current.validationLayers.red)
    ];

    allValidationLayers.forEach(layerGroup => {
      if (layerGroup) {
        layerGroup.eachLayer((layer) => {
          layer.setStyle(getInvisibleStyle());
        });
      }
    });
  };

  const handleMapClick = (e) => {
    if (!onCountryClick || !interactive || gameState?.showingFeedback) return;
    
    try {
      const clickPoint = [e.latlng.lng, e.latlng.lat];
      let foundCountry = null;
      let foundFeature = null;
      
      // Check border layers for point-in-polygon (these have the interaction logic)
      Object.values(layerSystemRef.current.borderLayers).forEach(layerGroup => {
        if (!layerGroup || foundCountry) return;
        
        layerGroup.eachLayer((layer) => {
          if (foundCountry) return;
          
          const feature = layer.feature;
          if (!feature || !feature.geometry) return;
          
          if (layer.getBounds && layer.getBounds().contains(e.latlng)) {
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
      
      if (!foundCountry) {
        foundCountry = findClosestCountry(clickPoint);
      }
      
      if (foundCountry) {
        analyticsService.trackUserInteraction('map_click', 'webmap_multi_layer', {
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

  // Point-in-polygon test
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

  const findClosestCountry = (clickPoint) => {
    try {
      const countries = dataService.getAllCountries();
      let closest = null;
      let minDistance = Infinity;
      
      countries.forEach(country => {
        if (country.latlng && country.latlng.length >= 2) {
          const distance = calculateDistance(
            clickPoint[1], clickPoint[0],
            country.latlng[0], country.latlng[1]
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

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
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
            <p>Loading multi-layer world map...</p>
            <p style={{fontSize: '12px', opacity: 0.7}}>
              Initializing 3-layer architecture: borders, hover, and validation...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebMapTripleBuffer;