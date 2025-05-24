import React, { useEffect } from 'react';
import { saveGameStats } from '../utils/storage';
import './Results.css';

const Results = ({ gameState, gameType, onPlayAgain, onBack }) => {
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
    saveGameStats({
      score: gameState.score,
      questions: totalQuestions,
      correct: correctAnswers,
      accuracy,
      bestStreak: gameState.bestStreak,
      gameType
    });
  }, [gameState.score, totalQuestions, correctAnswers, accuracy, gameState.bestStreak, gameType]);

  const getGameTypeName = () => {
    switch (gameType) {
      case 'location': return 'Location Quiz';
      case 'capital': return 'Capital Quiz';
      case 'flag': return 'Flag Quiz';
      case 'population': return 'Population Quiz';
      default: return 'Geography Quiz';
    }
  };

  return (
    <div className="results-container">
      <div className="results-card">
        <div className={`performance-badge ${performance.class}`}>
          {performance.message}
        </div>
        
        <h2 className="results-title">{getGameTypeName()} Complete!</h2>
        
        <div className="score-display">
          <div className="main-score">
            <span className="score-number">{gameState.score}</span>
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
          <div className="stat-box">
            <div className="stat-number">{gameState.bestStreak}</div>
            <div className="stat-label">Best Streak</div>
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
                      {gameType === 'location' && `Find ${question.country.name}`}
                      {gameType === 'capital' && `Capital of ${question.country.name}`}
                      {gameType === 'flag' && `Flag of ${question.country.name}`}
                      {gameType === 'population' && `Population of ${question.country.name}`}
                    </div>
                    <div className="review-answer">
                      {isCorrect ? 'Correct!' : `Answer: ${question.answer}`}
                    </div>
                  </div>
                  <div className="review-time">
                    {answer?.timeSpent || 30}s
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="results-actions">
          <button className="btn btn-primary" onClick={onPlayAgain}>
            Play Again
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default Results;