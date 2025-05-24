import React, { useState, useEffect } from 'react';
import dataService from '../services/dataService';
import analyticsService from '../services/analyticsService';
import apiService from '../services/apiService';
import mapColorService from '../services/mapColorService';
import './DebugPanel.css';

const DebugPanel = ({ onClose }) => {
  const [debugData, setDebugData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDebugData();
  }, []);

  const loadDebugData = async () => {
    setIsLoading(true);
    try {
      const data = {
        dataService: dataService.getDebugInfo(),
        analytics: analyticsService.getAnalyticsSummary(),
        apiCache: apiService.getCacheStatus(),
        colorStats: mapColorService.getColorStats(),
        storedEvents: analyticsService.getStoredEvents(),
        performance: {
          memory: navigator.memory ? {
            used: Math.round(navigator.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(navigator.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(navigator.memory.jsHeapSizeLimit / 1024 / 1024)
          } : null,
          connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
          } : null
        }
      };
      setDebugData(data);
    } catch (error) {
      console.error('Failed to load debug data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceReload = async () => {
    setIsLoading(true);
    try {
      await dataService.forceReload();
      loadDebugData();
    } catch (error) {
      console.error('Failed to force reload:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = () => {
    apiService.clearCache();
    loadDebugData();
  };

  const handleClearAnalytics = () => {
    analyticsService.clearStoredEvents();
    loadDebugData();
  };

  const handleRegenerateColors = async () => {
    if (debugData?.dataService?.geoJsonFeatures > 0) {
      const data = await dataService.initialize();
      mapColorService.regenerateColors(data.geoJsonData);
      loadDebugData();
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="debug-panel">
        <div className="debug-header">
          <h3>Debug Panel</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="debug-loading">Loading debug data...</div>
      </div>
    );
  }

  if (!debugData) {
    return (
      <div className="debug-panel">
        <div className="debug-header">
          <h3>Debug Panel</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="debug-error">Failed to load debug data</div>
      </div>
    );
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>Debug Panel</h3>
        <div className="debug-actions">
          <button className="btn btn-sm" onClick={loadDebugData}>
            🔄 Refresh
          </button>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
      </div>

      <div className="debug-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          Data
        </button>
        <button 
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button 
          className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
      </div>

      <div className="debug-content">
        {activeTab === 'overview' && (
          <div className="debug-section">
            <h4>System Overview</h4>
            <div className="debug-grid">
              <div className="debug-card">
                <h5>Data Service</h5>
                <p>Loaded: {debugData.dataService.isLoaded ? '✅' : '❌'}</p>
                <p>Countries: {debugData.dataService.countriesCount}</p>
                <p>GeoJSON Features: {debugData.dataService.geoJsonFeatures}</p>
              </div>
              
              <div className="debug-card">
                <h5>Analytics</h5>
                <p>Session: {debugData.analytics.session_id.slice(0, 8)}...</p>
                <p>Events Queued: {debugData.analytics.events_in_queue}</p>
                <p>Events Stored: {debugData.analytics.events_stored_locally}</p>
              </div>
              
              <div className="debug-card">
                <h5>Map Colors</h5>
                <p>Countries Colored: {debugData.colorStats.totalCountries}</p>
                <div className="color-distribution">
                  {Object.entries(debugData.colorStats.colorDistribution).map(([color, count]) => (
                    <div key={color} className="color-item">
                      <div className="color-swatch" style={{backgroundColor: color}}></div>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="debug-section">
            <h4>Data Management</h4>
            
            <div className="debug-actions-section">
              <button className="btn btn-primary" onClick={handleForceReload}>
                🔄 Force Reload All Data
              </button>
              <button className="btn btn-secondary" onClick={handleClearCache}>
                🗑️ Clear API Cache
              </button>
              <button className="btn btn-secondary" onClick={handleRegenerateColors}>
                🎨 Regenerate Colors
              </button>
            </div>

            <h5>Cache Status</h5>
            <div className="cache-status">
              {Object.entries(debugData.apiCache).map(([key, status]) => (
                <div key={key} className="cache-item">
                  <strong>{key}:</strong>
                  {status.exists ? (
                    <span className={status.expired ? 'expired' : 'valid'}>
                      {status.expired ? '⚠️ Expired' : '✅ Valid'} 
                      ({status.age}min old, {formatBytes(status.size)})
                    </span>
                  ) : (
                    <span className="missing">❌ Missing</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="debug-section">
            <h4>Analytics</h4>
            
            <div className="debug-actions-section">
              <button className="btn btn-secondary" onClick={handleClearAnalytics}>
                🗑️ Clear Stored Events
              </button>
            </div>

            <div className="analytics-summary">
              <h5>Event Summary</h5>
              <div className="event-types">
                {Object.entries(debugData.analytics.event_types).map(([type, count]) => (
                  <div key={type} className="event-type">
                    <span className="event-name">{type}</span>
                    <span className="event-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <h5>Recent Events</h5>
            <div className="events-list">
              {debugData.storedEvents.slice(-10).reverse().map((event, index) => (
                <div key={index} className="event-item">
                  <div className="event-header">
                    <span className="event-type">{event.event}</span>
                    <span className="event-time">
                      {formatTimestamp(event.properties.timestamp)}
                    </span>
                  </div>
                  <pre className="event-details">
                    {JSON.stringify(event.properties, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="debug-section">
            <h4>Performance Metrics</h4>
            
            {debugData.performance.memory && (
              <div className="performance-card">
                <h5>Memory Usage</h5>
                <p>Used: {debugData.performance.memory.used} MB</p>
                <p>Total: {debugData.performance.memory.total} MB</p>
                <p>Limit: {debugData.performance.memory.limit} MB</p>
                <div className="memory-bar">
                  <div 
                    className="memory-used"
                    style={{
                      width: `${(debugData.performance.memory.used / debugData.performance.memory.limit) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            )}

            {debugData.performance.connection && (
              <div className="performance-card">
                <h5>Network Connection</h5>
                <p>Type: {debugData.performance.connection.effectiveType}</p>
                <p>Downlink: {debugData.performance.connection.downlink} Mbps</p>
                <p>RTT: {debugData.performance.connection.rtt} ms</p>
              </div>
            )}

            <div className="performance-card">
              <h5>Browser Info</h5>
              <p>User Agent: {navigator.userAgent}</p>
              <p>Language: {navigator.language}</p>
              <p>Platform: {navigator.platform}</p>
              <p>Cookies Enabled: {navigator.cookieEnabled ? 'Yes' : 'No'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;