import React, { useState } from 'react';
import { useGame } from '../hooks/useGame';
import WorldMap from './WorldMap';
import QuestionCard from './QuestionCard';
import GameStats from './GameStats';
import Results from './Results';
import './GameInterface.css';

const GameInterface = ({ gameType = 'location', onBack }) => {
  const { gameState, startGame, answerQuestion, resetGame, currentQuestion, progress } = useGame(gameType, 10);
  const [selectedCountry, setSelectedCountry] = useState(null);

  const handleCountryClick = (country) => {
    if (!gameState.isActive || !currentQuestion) return;
    
    if (gameType === 'location') {
      setSelectedCountry(country.id);
      const timeSpent = 30 - gameState.timeLeft;
      answerQuestion(country.id, timeSpent);
      
      setTimeout(() => {
        setSelectedCountry(null);
      }, 1500);
    }
  };

  const handleAnswerSelect = (answer) => {
    const timeSpent = 30 - gameState.timeLeft;
    answerQuestion(answer, timeSpent);
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

  if (gameState.isComplete) {
    return <Results gameState={gameState} gameType={gameType} onPlayAgain={startGame} onBack={onBack} />;
  }

  return (
    <div className="game-interface">
      <div className="game-header">
        <button className="btn btn-secondary back-btn" onClick={onBack}>
          ← Back
        </button>
        <h1 className="game-title">{getGameTitle()}</h1>
        <GameStats 
          score={gameState.score}
          streak={gameState.streak}
          progress={progress}
        />
      </div>

      {!gameState.isActive ? (
        <div className="game-start">
          <div className="card text-center">
            <h2 className="text-2xl mb-4">Ready to start?</h2>
            <p className="mb-6">
              {gameType === 'location' && 'Click on countries on the map to answer questions!'}
              {gameType === 'capital' && 'Test your knowledge of world capitals!'}
              {gameType === 'flag' && 'Identify countries by their flags!'}
              {gameType === 'population' && 'Guess the population ranges of countries!'}
            </p>
            <button className="btn btn-primary" onClick={startGame}>
              Start Game
            </button>
          </div>
          <WorldMap showLabels={true} />
        </div>
      ) : (
        <div className="game-active">
          <div className="question-section">
            <QuestionCard
              question={currentQuestion}
              timeLeft={gameState.timeLeft}
              onAnswer={handleAnswerSelect}
              gameType={gameType}
              questionNumber={gameState.currentQuestion + 1}
              totalQuestions={gameState.questions.length}
            />
          </div>
          
          {(gameType === 'location' || gameType === 'flag') && (
            <div className="map-section">
              <WorldMap
                onCountryClick={handleCountryClick}
                highlightedCountry={currentQuestion?.country?.id}
                selectedCountry={selectedCountry}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameInterface;