import React from 'react';
import './GameStats.css';

const GameStats = ({ score, streak, progress }) => {
  return (
    <div className="game-stats">
      <div className="stat-item">
        <span className="stat-label">Score</span>
        <span className="stat-value">{score}</span>
      </div>
      
      <div className="stat-item">
        <span className="stat-label">Streak</span>
        <span className="stat-value streak-value">
          {streak > 0 && '🔥'} {streak}
        </span>
      </div>
      
      <div className="stat-item">
        <span className="stat-label">Progress</span>
        <div className="progress-container">
          <div 
            className="progress-bar-mini"
            style={{ width: `${progress}%` }}
          />
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
};

export default GameStats;