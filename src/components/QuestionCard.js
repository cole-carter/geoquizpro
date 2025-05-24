import React from 'react';
import './QuestionCard.css';

const QuestionCard = ({ 
  question, 
  timeLeft, 
  onAnswer, 
  gameType, 
  questionNumber, 
  totalQuestions 
}) => {
  if (!question) return null;

  const handleOptionClick = (option) => {
    onAnswer(option);
  };

  const getTimeColor = () => {
    if (timeLeft > 20) return '#059669';
    if (timeLeft > 10) return '#f59e0b';
    return '#ef4444';
  };

  const renderQuestionContent = () => {
    switch (gameType) {
      case 'location':
        return (
          <div className="location-question">
            <p className="instruction">Click on the map to find:</p>
            <h3 className="country-name">{question.country.name}</h3>
            <div className="country-info">
              <img 
                src={question.country.flag?.png || 'https://flagcdn.com/w320/unknown.png'} 
                alt={`${question.country.name} flag`}
                className="flag-image-large"
                onError={(e) => { e.target.src = 'https://flagcdn.com/w320/unknown.png'; }}
              />
              <span className="region">{question.country.region}</span>
            </div>
          </div>
        );
      
      case 'flag':
        return (
          <div className="flag-question">
            <p className="instruction">Which country does this flag belong to?</p>
            <div className="flag-display">
              <img 
                src={question.country.flag?.png || 'https://flagcdn.com/w80/unknown.png'} 
                alt={`Flag to identify`}
                className="flag-image-large"
                onError={(e) => { e.target.src = 'https://flagcdn.com/w80/unknown.png'; }}
              />
            </div>
            <p className="sub-instruction">Click on the country on the map</p>
          </div>
        );
      
      case 'capital':
        return (
          <div className="capital-question centered">
            <p className="instruction">{question.question}</p>
            <div className="country-info">
              <img 
                src={question.country.flag?.png || 'https://flagcdn.com/w320/unknown.png'} 
                alt={`${question.country.name} flag`}
                className="flag-image-large"
                onError={(e) => { e.target.src = 'https://flagcdn.com/w320/unknown.png'; }}
              />
              <span className="region">{question.country.region}</span>
            </div>
            <div className="options-grid">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  className="option-btn"
                  onClick={() => handleOptionClick(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
      
      case 'population':
        return (
          <div className="population-question centered">
            <p className="instruction">{question.question}</p>
            <div className="country-info">
              <img 
                src={question.country.flag?.png || 'https://flagcdn.com/w320/unknown.png'} 
                alt={`${question.country.name} flag`}
                className="flag-image-large"
                onError={(e) => { e.target.src = 'https://flagcdn.com/w320/unknown.png'; }}
              />
              <span className="region">{question.country.region}</span>
            </div>
            <div className="options-grid">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  className="option-btn"
                  onClick={() => handleOptionClick(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
      
      default:
        return <p>{question.question}</p>;
    }
  };

  return (
    <div className="question-card">
      <div className="question-header">
        <div className="question-counter">
          Question {questionNumber} of {totalQuestions}
        </div>
        <div className="timer" style={{ color: getTimeColor() }}>
          <span className="timer-icon">⏱️</span>
          {timeLeft}s
        </div>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ 
            width: `${(timeLeft / 30) * 100}%`,
            backgroundColor: getTimeColor()
          }}
        />
      </div>

      <div className="question-content">
        {renderQuestionContent()}
      </div>
    </div>
  );
};

export default QuestionCard;