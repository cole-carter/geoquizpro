import React, { useState, useEffect } from 'react';
import { useGameEnhanced } from '../hooks/useGameEnhanced';
import WebMapTripleBuffer from './WebMapTripleBuffer';
import QuestionCard from './QuestionCard';
import GameStats from './GameStats';
import ResultsEnhanced from './ResultsEnhanced';
import analyticsService from '../services/analyticsService';
import './GameInterface.css';

const GameInterfaceEnhanced = ({ gameType = 'location', onBack }) => {
  const { gameState, actions, currentQuestion, progress, getGameStats } = useGameEnhanced(gameType, 10);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showMap, setShowMap] = useState(true);

  // Track page view and auto-start game
  useEffect(() => {
    analyticsService.trackPageView('game');
    // Auto-start the game immediately
    if (!gameState.isActive && !gameState.isLoading && !gameState.isComplete) {
      actions.startGame();
    }
  }, []);

  // Handle country click on map - now purely calls game engine
  const handleCountryClick = (country, feature) => {
    if (!gameState.isActive || !currentQuestion || gameState.showingFeedback) return;
    
    analyticsService.trackUserInteraction('country_selected', 'map', {
      country_id: country.cca3,
      country_name: country.name,
      game_type: gameType
    });
    
    if (gameType === 'location' || gameType === 'flag') {
      setSelectedCountry(country.cca3);
      const maxTime = gameType === 'location' ? 30 : 10;
      const timeSpent = maxTime - gameState.timeLeft;
      
      // Let the game engine handle all feedback logic
      actions.answerQuestion(country.cca3, timeSpent);
      
      // Clear visual selection after feedback
      setTimeout(() => {
        setSelectedCountry(null);
      }, 1500);
    }
  };

  // Handle option selection for multiple choice questions
  const handleAnswerSelect = (answer) => {
    if (gameState.showingFeedback) return;
    
    const maxTime = gameType === 'location' ? 30 : 10;
    const timeSpent = maxTime - gameState.timeLeft;
    
    analyticsService.trackUserInteraction('option_selected', 'question_card', {
      answer: answer,
      game_type: gameType
    });
    
    // Let the game engine handle all feedback logic
    actions.answerQuestion(answer, timeSpent);
  };

  // Handle back button
  const handleBack = () => {
    if (gameState.isActive) {
      actions.abandonGame();
    }
    
    analyticsService.trackUserInteraction('back_button', 'game_header');
    onBack();
  };

  const getGameTitle = () => {
    switch (gameType) {
      case 'location': return 'Find the Country';
      case 'capital': return 'Capital Quiz';
      case 'flag': return 'Flag Quiz';
      case 'population': return 'Population Quiz';
      default: return 'Geography Quiz';
    }
  };

  const getGameDescription = () => {
    switch (gameType) {
      case 'location': return 'Click on countries on the map to answer questions!';
      case 'capital': return 'Test your knowledge of world capitals!';
      case 'flag': return 'Identify countries by their flags!';
      case 'population': return 'Guess the population ranges of countries!';
      default: return 'Test your geography knowledge!';
    }
  };

  // Show results when game is complete
  if (gameState.isComplete) {
    return (
      <ResultsEnhanced 
        gameState={gameState} 
        gameType={gameType} 
        gameStats={getGameStats()}
        onPlayAgain={actions.startGame} 
        onBack={handleBack} 
      />
    );
  }

  // Show error state
  if (gameState.error) {
    return (
      <div className="game-interface">
        <div className="game-header">
          <button className="btn btn-secondary back-btn" onClick={handleBack}>
            ← Back
          </button>
          <h1 className="game-title">Error</h1>
        </div>
        
        <div className="game-error">
          <div className="card text-center">
            <h2 className="text-2xl mb-4">Unable to Load Game</h2>
            <p className="mb-6">{gameState.error}</p>
            <div className="error-actions">
              <button className="btn btn-primary" onClick={actions.startGame}>
                Try Again
              </button>
              <button className="btn btn-secondary" onClick={handleBack}>
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-interface">
      <div className="game-header">
        <button className="btn btn-secondary back-btn" onClick={handleBack}>
          ← Back
        </button>
        <h1 className="game-title">{getGameTitle()}</h1>
      </div>

      {!gameState.isActive ? (
        <div className="game-loading">
          <div className="card text-center">
            <h2 className="text-2xl mb-4">Loading {getGameTitle()}...</h2>
            <p className="mb-6">{getGameDescription()}</p>
            
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Preparing your quiz...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className={`game-active ${(gameType === 'capital' || gameType === 'population' || gameType === 'flag') ? 'centered-layout' : ''}`}>
          <div className="question-section">
            <QuestionCard
              question={currentQuestion}
              timeLeft={gameState.timeLeft}
              onAnswer={handleAnswerSelect}
              gameType={gameType}
              gameState={gameState} // Pass entire game state for feedback
            />
            
            {/* Toggle map visibility on mobile */}
            {gameType === 'location' && (
              <button 
                className="btn btn-secondary map-toggle"
                onClick={() => setShowMap(!showMap)}
              >
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            )}
          </div>
          
          {/* Map section */}
          {gameType === 'location' && showMap && (
            <div className="map-section">
              <WebMapTripleBuffer
                key="game-map" // Force new instance for game
                onCountryClick={handleCountryClick}
                selectedCountry={selectedCountry}
                interactive={!gameState.showingFeedback}
                gameState={gameState} // Pass entire game state for feedback
              />
            </div>
          )}
        </div>
      )}
      
      {/* Progress stats at bottom when game is active */}
      {gameState.isActive && (
        <div className="progress-stats">
          <GameStats 
            score={gameState.score}
            questionsAnswered={gameState.questionsAnswered}
            totalQuestions={10}
            timeLeft={gameState.timeLeft}
            streak={gameState.streak}
            gameType={gameType}
          />
        </div>
      )}
    </div>
  );
};

export default GameInterfaceEnhanced;