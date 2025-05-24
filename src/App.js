import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import GameInterfaceEnhanced from './components/GameInterfaceEnhanced';
import ErrorBoundary from './components/ErrorBoundary';
import analyticsService from './services/analyticsService';
import './components/ErrorBoundary.css';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [currentGameType, setCurrentGameType] = useState(null);

  useEffect(() => {
    // Initialize analytics on app start
    console.log('GeoQuiz App initialized');
    console.log('Session ID:', analyticsService.sessionId);
    
    // Track app launch
    analyticsService.track('app_launched', {
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }, []);

  const handleStartGame = (gameType) => {
    setCurrentGameType(gameType);
    setCurrentView('game');
    
    analyticsService.trackUserInteraction('game_selected', 'home_page', {
      game_type: gameType
    });
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setCurrentGameType(null);
    
    analyticsService.trackPageView('home');
  };

  // Handle app errors
  const handleError = (error, errorInfo) => {
    analyticsService.trackError(error, {
      context: 'app_level',
      error_info: errorInfo
    });
  };

  // Add global error boundary
  useEffect(() => {
    const handleGlobalError = (event) => {
      analyticsService.trackError(event.error, {
        context: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    const handleUnhandledRejection = (event) => {
      analyticsService.trackError(event.reason, {
        context: 'unhandled_promise_rejection'
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ErrorBoundary name="App">
      <div className="App">
        {currentView === 'home' && (
          <ErrorBoundary name="HomePage">
            <HomePage onStartGame={handleStartGame} />
          </ErrorBoundary>
        )}
        
        {currentView === 'game' && (
          <ErrorBoundary name="GameInterface">
            <GameInterfaceEnhanced 
              gameType={currentGameType} 
              onBack={handleBackToHome}
            />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;