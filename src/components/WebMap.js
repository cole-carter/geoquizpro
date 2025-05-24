import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import dataService from '../services/dataService';
import analyticsService from '../services/analyticsService';
import 'leaflet/dist/leaflet.css';
import './WebMap.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDE5LjQwMzYgMTkuNDAzNiAyNSAxMi41IDI1QzUuNTk2NDQgMjUgMCAxOS40MDM2IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiM0Mjg1RjQiLz4KPHBhdGggZD0iTTEyLjUgMzVMMTguNSAyNUg2LjVMMTIuNSAzNVoiIGZpbGw9IiM0Mjg1RjQiLz4KPC9zdmc+',
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDE5LjQwMzYgMTkuNDAzNiAyNSAxMi41IDI1QzUuNTk2NDQgMjUgMCAxOS40MDM2IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiM0Mjg1RjQiLz4KPHBhdGggZD0iTTEyLjUgMzVMMTguNSAyNUg2LjVMMTIuNSAzNVoiIGZpbGw9IiM0Mjg1RjQiLz4KPC9zdmc+',
  shadowUrl: null,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const WebMap = ({ 
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
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    initializeMap();
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    loadGeoData();
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && geoData) {
      updateCountryStyles();
    }
  }, [selectedCountry, highlightedCountry, geoData]);

  const initializeMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map with proper world wrapping
    const map = L.map(mapRef.current, {
      center: [20, 0], // Centered on the world
      zoom: 2,
      minZoom: 1,
      maxZoom: 18,
      worldCopyJump: true, // Enable infinite scrolling past dateline
      maxBounds: [[-90, -Infinity], [90, Infinity]], // Allow infinite horizontal scrolling
      zoomControl: false, // We'll add custom controls
    });

    // Add custom zoom control
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Add tile layer - using OpenStreetMap (free)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      noWrap: false, // Allow wrapping around the world
      bounds: [[-90, -180], [90, 180]]
    }).addTo(map);

    // Alternative tile layers you can use:
    // Cartodb Positron (clean, minimal)
    // L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    //   attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    //   noWrap: false
    // }).addTo(map);

    mapInstanceRef.current = map;

    // Add map event listeners
    map.on('click', handleMapClick);
    map.on('zoomend', handleZoomEnd);
    map.on('moveend', handleMoveEnd);
  };

  const loadGeoData = async () => {
    try {
      setIsLoading(true);
      const data = await dataService.initialize();
      setGeoData(data.geoJsonData);
      
      if (data.geoJsonData && mapInstanceRef.current) {
        addGeoJsonLayer(data.geoJsonData);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to load geographic data:', err);
      setError(err.message);
      analyticsService.trackError(err, { context: 'webmap_loading' });
    } finally {
      setIsLoading(false);
    }
  };

  const addGeoJsonLayer = (geoJsonData) => {
    if (!mapInstanceRef.current || !geoJsonData) return;

    // Remove existing layer if present
    if (geoJsonLayerRef.current) {
      mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
    }

    // Create GeoJSON layer
    const geoJsonLayer = L.geoJSON(geoJsonData, {
      style: getCountryStyle,
      onEachFeature: onEachFeature
    });

    geoJsonLayer.addTo(mapInstanceRef.current);
    geoJsonLayerRef.current = geoJsonLayer;
  };

  const getCountryStyle = (feature) => {
    const countryId = feature.id;
    
    // Base style
    let style = {
      fillColor: getCountryFill(feature),
      weight: 1,
      opacity: 1,
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

    // Don't highlight the target country (that would give away the answer!)
    // if (highlightedCountry === countryId) {
    //   style.fillColor = '#f59e0b';
    //   style.weight = 2;
    //   style.color = '#d97706';
    // }

    return style;
  };

  const getCountryFill = (feature) => {
    // Use pleasant colors for countries
    const colors = [
      '#10b981', // Emerald
      '#3b82f6', // Blue
      '#8b5cf6', // Violet
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#06b6d4', // Cyan
      '#84cc16', // Lime
      '#f97316', // Orange
    ];
    
    const hash = feature.id ? feature.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
    return colors[hash % colors.length];
  };

  const onEachFeature = (feature, layer) => {
    if (!interactive) return;

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
        
        // Show tooltip
        const countryName = feature.properties?.name || feature.id;
        layer.bindTooltip(countryName, {
          permanent: false,
          direction: 'auto'
        }).openTooltip();
      },
      mouseout: (e) => {
        if (selectedCountry !== feature.id) {
          geoJsonLayerRef.current.resetStyle(layer);
        }
        layer.closeTooltip();
      }
    });
  };

  const handleCountryClick = (e, feature) => {
    if (!onCountryClick) return;
    
    L.DomEvent.stopPropagation(e);
    
    const country = dataService.getCountryById(feature.id);
    if (country) {
      analyticsService.trackUserInteraction('country_click', 'webmap', {
        country_id: feature.id,
        country_name: country.name,
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
      
      onCountryClick(country, feature);
    }
  };

  const handleMapClick = (e) => {
    // Handle clicks on empty areas (water/ocean)
    analyticsService.trackUserInteraction('map_click', 'webmap', {
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      zoom: mapInstanceRef.current.getZoom()
    });
  };

  const handleZoomEnd = () => {
    const zoom = mapInstanceRef.current.getZoom();
    analyticsService.trackUserInteraction('map_zoom', 'webmap', {
      zoom_level: zoom
    });
  };

  const handleMoveEnd = () => {
    const center = mapInstanceRef.current.getCenter();
    const zoom = mapInstanceRef.current.getZoom();
    analyticsService.trackUserInteraction('map_pan', 'webmap', {
      lat: center.lat,
      lng: center.lng,
      zoom_level: zoom
    });
  };

  const updateCountryStyles = () => {
    if (!geoJsonLayerRef.current) return;
    
    geoJsonLayerRef.current.eachLayer((layer) => {
      const style = getCountryStyle(layer.feature);
      layer.setStyle(style);
    });
  };

  const centerOnCountry = (countryId) => {
    if (!mapInstanceRef.current || !geoJsonLayerRef.current) return;
    
    geoJsonLayerRef.current.eachLayer((layer) => {
      if (layer.feature.id === countryId) {
        const bounds = layer.getBounds();
        mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
      }
    });
  };

  if (error) {
    return (
      <div className="webmap-container error">
        <div className="error-message">
          <h3>Map Loading Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadGeoData}>
            Retry
          </button>
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
          </div>
        </div>
      )}
      
      {/* Map info overlay */}
      <div className="map-info-overlay">
        <div className="map-stats">
          {geoData && (
            <>
              <span>{geoData.features.length} countries</span>
              {interactive && <span> • Click to select</span>}
            </>
          )}
        </div>
      </div>
      
      {/* Map legend */}
      <div className="map-legend-overlay">
        <div className="legend-content">
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#10b981'}}></div>
            <span>Countries</span>
          </div>
          {selectedCountry && (
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#ef4444'}}></div>
              <span>Selected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebMap;