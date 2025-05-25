import React, { useEffect } from 'react';
import './QuestionCard.css';

const QuestionCard = ({ 
  question, 
  timeLeft, 
  onAnswer, 
  gameType, 
  questionNumber, 
  totalQuestions,
  gameState = null
}) => {
  if (!question) return null;

  // Remove focus from all buttons when question changes to prevent persistent blue outline
  useEffect(() => {
    const focusedElement = document.activeElement;
    if (focusedElement && focusedElement.classList.contains('option-btn')) {
      focusedElement.blur();
    }
  }, [question?.id, question?.question]); // Trigger when question changes

  const handleOptionClick = (option) => {
    if (gameState?.showingFeedback) return; // Disable during feedback
    onAnswer(option);
    // Also blur the clicked button to remove focus
    setTimeout(() => {
      if (document.activeElement && document.activeElement.classList.contains('option-btn')) {
        document.activeElement.blur();
      }
    }, 100);
  };

  const getTimeColor = () => {
    const maxTime = gameType === 'location' ? 30 : 10;
    const ratio = timeLeft / maxTime;
    if (ratio > 0.66) return '#059669';
    if (ratio > 0.33) return '#f59e0b';
    return '#ef4444';
  };

  const renderQuestionContent = () => {
    switch (gameType) {
      case 'location':
        return (
          <div className="location-question">
            {/* Desktop/Tablet Layout */}
            <div className="location-desktop">
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
            
            {/* Mobile Horizontal Strip Layout */}
            <div className="location-mobile">
              <div className="mobile-strip">
                <div className="country-section">
                  <div className="country-name-mobile">{question.country.name}</div>
                  <div className="instruction-mobile">Tap on map to find</div>
                </div>
                <div className="flag-section">
                  <img 
                    src={question.country.flag?.png || 'https://flagcdn.com/w320/unknown.png'} 
                    alt={`${question.country.name} flag`}
                    className="flag-image-mobile"
                    onError={(e) => { e.target.src = 'https://flagcdn.com/w320/unknown.png'; }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'flag':
        return (
          <div className="flag-question centered">
            <p className="instruction">Which country does this flag belong to?</p>
            <div className="flag-display">
              <img 
                src={question.country.flag?.png || 'https://flagcdn.com/w80/unknown.png'} 
                alt={`Flag to identify`}
                className="flag-image-large"
                onError={(e) => { e.target.src = 'https://flagcdn.com/w80/unknown.png'; }}
              />
            </div>
            <div className="options-grid">
              {question.options.map((option, index) => {
                let buttonClass = "option-btn";
                
                // Show feedback during answer feedback period
                if (gameState?.feedback) {
                  if (option === gameState.feedback.selectedAnswer) {
                    if (gameState.feedback.isCorrect) {
                      buttonClass += " correct-answer";
                    } else {
                      buttonClass += " incorrect-answer";
                    }
                  } else if (option === question.answer && !gameState.feedback.isCorrect) {
                    buttonClass += " correct-answer"; // Show correct answer when user was wrong
                  }
                  buttonClass += " disabled";
                }
                
                return (
                  <button
                    key={index}
                    className={buttonClass}
                    onClick={() => handleOptionClick(option)}
                    disabled={!!gameState?.showingFeedback}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
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
              {question.options.map((option, index) => {
                let buttonClass = "option-btn";
                
                // Show feedback during answer feedback period
                if (gameState?.feedback) {
                  if (option === gameState.feedback.selectedAnswer) {
                    if (gameState.feedback.isCorrect) {
                      buttonClass += " correct-answer";
                    } else {
                      buttonClass += " incorrect-answer";
                    }
                  } else if (option === question.answer && !gameState.feedback.isCorrect) {
                    buttonClass += " correct-answer"; // Show correct answer when user was wrong
                  }
                  buttonClass += " disabled";
                }
                
                return (
                  <button
                    key={index}
                    className={buttonClass}
                    onClick={() => handleOptionClick(option)}
                    disabled={!!gameState?.showingFeedback}
                  >
                    {option}
                  </button>
                );
              })}
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
              {question.options.map((option, index) => {
                let buttonClass = "option-btn";
                
                // Show feedback during answer feedback period
                if (gameState?.feedback) {
                  if (option === gameState.feedback.selectedAnswer) {
                    if (gameState.feedback.isCorrect) {
                      buttonClass += " correct-answer";
                    } else {
                      buttonClass += " incorrect-answer";
                    }
                  } else if (option === question.answer && !gameState.feedback.isCorrect) {
                    buttonClass += " correct-answer"; // Show correct answer when user was wrong
                  }
                  buttonClass += " disabled";
                }
                
                return (
                  <button
                    key={index}
                    className={buttonClass}
                    onClick={() => handleOptionClick(option)}
                    disabled={!!gameState?.showingFeedback}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        );
      
      default:
        return <p>{question.question}</p>;
    }
  };

  return (
    <div className={`question-card ${gameType === 'location' ? 'location-quiz' : ''}`}>
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
            width: `${(timeLeft / (gameType === 'location' ? 30 : 10)) * 100}%`,
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