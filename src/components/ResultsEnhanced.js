import React, { useEffect } from 'react';
import { saveGameStats } from '../utils/storage';
import analyticsService from '../services/analyticsService';
import dataService from '../services/dataService';
import './Results.css';

const ResultsEnhanced = ({ gameState, gameType, gameStats, onPlayAgain, onBack }) => {
  const correctAnswers = gameState.answers.filter(a => a.correct).length;
  const totalQuestions = gameState.questions.length;
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
  
  const getPerformanceMessage = () => {
    if (accuracy >= 90) return { message: "Outstanding! 🏆", class: "excellent" };
    if (accuracy >= 75) return { message: "Great job! 🎉", class: "great" };
    if (accuracy >= 60) return { message: "Good work! 👍", class: "good" };
    if (accuracy >= 40) return { message: "Keep practicing! 📚", class: "okay" };
    return { message: "Don't give up! 💪", class: "practice" };
  };

  const performance = getPerformanceMessage();

  useEffect(() => {
    // Track page view
    analyticsService.trackPageView('results');
    
    // Save game stats
    saveGameStats({
      score: gameState.score,
      questions: totalQuestions,
      correct: correctAnswers,
      accuracy,
      bestStreak: gameState.bestStreak,
      gameType,
      gameId: gameState.gameId,
      duration: gameStats.totalTime
    });
  }, [gameState.score, totalQuestions, correctAnswers, accuracy, gameState.bestStreak, gameType, gameState.gameId, gameStats.totalTime]);

  const getGameTypeName = () => {
    switch (gameType) {
      case 'location': return 'Location Quiz';
      case 'capital': return 'Capital Quiz';
      case 'flag': return 'Flag Quiz';
      case 'population': return 'Population Quiz';
      default: return 'Geography Quiz';
    }
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.round(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const handlePlayAgain = () => {
    analyticsService.trackUserInteraction('play_again', 'results');
    onPlayAgain();
  };

  const handleBackToMenu = () => {
    analyticsService.trackUserInteraction('back_to_menu', 'results');
    onBack();
  };

  const getDisplayAnswer = (answer, gameType) => {
    if (!answer) return 'No answer';
    
    // For location and flag games, convert ISO country codes to country names
    if (gameType === 'location' || gameType === 'flag') {
      const country = dataService.getCountryById(answer);
      return country ? country.name : answer;
    }
    
    // For other game types, return as-is
    return answer;
  };

  const getScoreColor = () => {
    if (accuracy >= 90) return '#10b981'; // Green
    if (accuracy >= 75) return '#3b82f6'; // Blue
    if (accuracy >= 60) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div className="results-container">
      <div className="results-card">
        <div className={`performance-badge ${performance.class}`}>
          {performance.message}
        </div>
        
        
        <div className="score-display">
          <div className="main-score">
            <span className="score-number" style={{ color: getScoreColor() }}>
              {gameState.score}
            </span>
            <span className="score-label">Points</span>
          </div>
        </div>
        
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-number">{correctAnswers}/{totalQuestions}</div>
            <div className="stat-label">Correct</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">{accuracy}%</div>
            <div className="stat-label">Accuracy</div>
          </div>
        </div>
        
        <div className="question-review">
          <h3>Question Review</h3>
          <div className="review-list">
            {gameState.questions.map((question, index) => {
              const answer = gameState.answers[index];
              const isCorrect = answer?.correct;
              
              return (
                <div key={index} className={`review-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="review-icon">
                    {isCorrect ? '✅' : '❌'}
                  </div>
                  <div className="review-content">
                    <div className="review-question">
                      <span className="question-flag">{question.country.flag?.emoji || '🏳️'}</span>
                      <span className="question-text">
                        {gameType === 'location' && `Find ${question.country.name}`}
                        {gameType === 'capital' && `Capital of ${question.country.name}`}
                        {gameType === 'flag' && `Flag of ${question.country.name}`}
                        {gameType === 'population' && `Population of ${question.country.name}`}
                      </span>
                    </div>
                    <div className="review-answer">
                      {isCorrect ? (
                        <span className="correct-answer">Correct!</span>
                      ) : (
                        <span className="wrong-answer">
                          <div>Your answer: {getDisplayAnswer(answer?.answer, gameType)}</div>
                          <div>Correct: {getDisplayAnswer(question.answer, gameType)}</div>
                        </span>
                      )}
                    </div>
                    {question.scoreEarned > 0 && (
                      <div className="review-score">+{question.scoreEarned} points</div>
                    )}
                  </div>
                  <div className="review-meta">
                    <div className="review-time">
                      {answer?.timeSpent || 30}s
                    </div>
                    {question.country.region && (
                      <div className="review-region">
                        {question.country.region}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="results-actions">
          <button className="btn btn-primary" onClick={handlePlayAgain}>
            Play Again
          </button>
          <button className="btn btn-secondary" onClick={handleBackToMenu}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsEnhanced;