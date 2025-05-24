import React, { useState } from 'react';
import { getGameStats } from '../utils/storage';
import DebugPanel from './DebugPanel';
import analyticsService from '../services/analyticsService';
import './HomePage.css';

const HomePage = ({ onStartGame }) => {
  const stats = getGameStats();
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const gameTypes = [
    {
      id: 'location',
      title: 'Find the Country',
      description: 'Click on countries on the interactive map',
      icon: '🗺️'
    },
    {
      id: 'capital',
      title: 'Capital Quiz',
      description: 'Test your knowledge of world capitals',
      icon: '🏛️'
    },
    {
      id: 'flag',
      title: 'Flag Quiz',
      description: 'Identify countries by their flags',
      icon: '🏳️'
    },
    {
      id: 'population',
      title: 'Population Quiz',
      description: 'Guess population ranges of countries',
      icon: '👥'
    }
  ];

  const handleDebugToggle = () => {
    setShowDebugPanel(!showDebugPanel);
    analyticsService.trackUserInteraction('debug_panel_toggled', 'homepage');
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'Hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="homepage">
      {/* Header */}
      <header className="app-header">
        <button 
          className="hamburger-menu"
          onClick={() => setShowMenu(!showMenu)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        
        <div className="header-logo">
          <span className="header-icon">🌍</span>
          <span className="header-title">GeoQuiz</span>
        </div>
      </header>

      {/* Hamburger Menu */}
      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="menu-content" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <h3>Menu</h3>
              <button className="menu-close" onClick={() => setShowMenu(false)}>×</button>
            </div>
            
            {stats.totalGames > 0 && (
              <div className="menu-section">
                <h4>Your Progress</h4>
                <div className="menu-stats">
                  <div className="menu-stat">
                    <span className="stat-value">{stats.totalGames}</span>
                    <span className="stat-label">🎯 Games</span>
                  </div>
                  <div className="menu-stat">
                    <span className="stat-value">{stats.bestScore}</span>
                    <span className="stat-label">⭐ Best Score</span>
                  </div>
                  <div className="menu-stat">
                    <span className="stat-value">{stats.averageScore}</span>
                    <span className="stat-label">📊 Average</span>
                  </div>
                  <div className="menu-stat">
                    <span className="stat-value">{stats.bestStreak}</span>
                    <span className="stat-label">🔥 Best Streak</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="menu-section">
              <button 
                className="menu-item debug-item"
                onClick={handleDebugToggle}
              >
                🔧 Debug Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        <div className="game-grid">
          {gameTypes.map(game => (
            <div key={game.id} className="game-card" onClick={() => onStartGame(game.id)}>
              <div className="game-icon">{game.icon}</div>
              <h3 className="game-title">{game.title}</h3>
              <p className="game-description">{game.description}</p>
            </div>
          ))}
        </div>
      </main>
      
      {showDebugPanel && (
        <DebugPanel onClose={() => setShowDebugPanel(false)} />
      )}
    </div>
  );
};

export default HomePage;