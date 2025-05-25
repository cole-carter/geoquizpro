import { useState, useEffect, useCallback } from 'react';
import dataService from '../services/dataService';
import analyticsService from '../services/analyticsService';

export const useGameEnhanced = (gameType = 'location', questionCount = 10) => {
  const [gameState, setGameState] = useState({
    questions: [],
    currentQuestion: 0,
    score: 0,
    timeLeft: 30,
    isActive: false,
    isComplete: false,
    answers: [],
    streak: 0,
    bestStreak: 0,
    gameId: null,
    startTime: null,
    // Feedback system state
    showingFeedback: false,
    feedback: null // {isCorrect, userAnswer, correctAnswer, userAnswerCountryId, correctAnswerCountryId}
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Ensure data is loaded
      await dataService.initialize();
      
      // Get random countries with population filter for better gameplay
      const countries = dataService.getRandomCountries(questionCount);
      
      if (countries.length === 0) {
        throw new Error('No countries available for quiz');
      }

      const questions = countries.map((country, index) => {
        const baseQuestion = {
          id: index,
          country,
          type: gameType,
          answered: false,
          correct: false,
          timeSpent: 0
        };

        switch (gameType) {
          case 'location':
            return {
              ...baseQuestion,
              question: `Where is ${country.name}?`,
              answer: country.cca3,
              instructions: 'Click on the country on the map'
            };
          
          case 'capital':
            return {
              ...baseQuestion,
              question: `What is the capital of ${country.name}?`,
              answer: country.capital,
              options: generateCapitalOptions(country.capital),
              instructions: 'Select the correct capital city'
            };
          
          case 'flag':
            return {
              ...baseQuestion,
              question: `Which country does this flag belong to?`,
              flag: country.flag,
              answer: country.name,
              options: generateFlagOptions(country.name),
              instructions: 'Select the correct country'
            };
          
          case 'population':
            return {
              ...baseQuestion,
              question: `What is the population range of ${country.name}?`,
              answer: dataService.getPopulationRange(country.population),
              options: getPopulationRangeOptions(),
              instructions: 'Select the correct population range'
            };
          
          default:
            return baseQuestion;
        }
      });
      
      return questions;
    } catch (err) {
      console.error('Failed to generate questions:', err);
      setError(err.message);
      analyticsService.trackError(err, { context: 'question_generation', gameType });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [gameType, questionCount]);

  const generateCapitalOptions = (correctCapital) => {
    // Get ALL countries from data service
    const allCountries = dataService.getAllCountries();
    const options = [correctCapital];
    const otherCapitals = allCountries
      .filter(country => country.capital !== correctCapital)
      .map(country => country.capital)
      .filter(capital => capital && capital !== 'Unknown' && capital !== '');
    
    // Add 7 random other capitals from ALL countries (8 total options)
    while (options.length < 8 && otherCapitals.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherCapitals.length);
      const randomCapital = otherCapitals.splice(randomIndex, 1)[0];
      if (!options.includes(randomCapital)) {
        options.push(randomCapital);
      }
    }
    
    // Shuffle options
    return options.sort(() => Math.random() - 0.5);
  };

  const generateFlagOptions = (correctCountry) => {
    // Get ALL countries from data service
    const allCountries = dataService.getAllCountries();
    const options = [correctCountry];
    const otherCountries = allCountries
      .filter(country => country.name !== correctCountry)
      .map(country => country.name)
      .filter(name => name && name !== 'Unknown' && name !== '');
    
    // Add 7 random other country names (8 total options)
    while (options.length < 8 && otherCountries.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherCountries.length);
      const randomCountry = otherCountries.splice(randomIndex, 1)[0];
      if (!options.includes(randomCountry)) {
        options.push(randomCountry);
      }
    }
    
    // Shuffle options
    return options.sort(() => Math.random() - 0.5);
  };

  const getPopulationRangeOptions = () => {
    return [
      'Under 1M',
      '1M - 10M', 
      '10M - 50M',
      '50M - 100M',
      '100M - 500M',
      'Over 500M'
    ];
  };

  const getCountryCodeByName = (countryName) => {
    // Helper function to convert country name back to country code for map highlighting
    const allCountries = dataService.getAllCountries();
    const country = allCountries.find(c => c.name === countryName);
    return country ? country.cca3 : null;
  };

  const startGame = useCallback(async () => {
    try {
      setError(null);
      const questions = await generateQuestions();
      const gameId = `${gameType}_${Date.now()}`;
      
      // Set timer based on game type
      const timerDuration = gameType === 'location' ? 30 : 10; // Location: 30s, Multiple choice: 10s
      
      setGameState({
        questions,
        currentQuestion: 0,
        score: 0,
        timeLeft: timerDuration,
        isActive: true,
        isComplete: false,
        answers: [],
        streak: 0,
        bestStreak: 0,
        gameId,
        startTime: Date.now()
      });

      // Track game start
      analyticsService.trackGameStarted(gameType);
      
    } catch (err) {
      setError(err.message);
    }
  }, [generateQuestions, gameType]);

  // New feedback-aware answer processing
  const answerQuestion = useCallback((answer, timeSpent = 0) => {
    setGameState(prev => {
      // Don't allow answering during feedback or if not active
      if (prev.showingFeedback || !prev.isActive) return prev;
      
      const currentQ = prev.questions[prev.currentQuestion];
      const isCorrect = answer === currentQ.answer;
      
      // Create feedback data for highlighting
      let userAnswerCountryId = null;
      let correctAnswerCountryId = null;
      
      if (gameType === 'location') {
        // Location quiz: answer is already country code
        userAnswerCountryId = answer;
        correctAnswerCountryId = currentQ.answer;
      } else if (gameType === 'flag') {
        // Flag quiz: convert country name back to country code for map highlighting
        userAnswerCountryId = getCountryCodeByName(answer);
        correctAnswerCountryId = currentQ.country.cca3;
      }
      
      const feedback = {
        isCorrect,
        userAnswer: answer,
        correctAnswer: currentQ.answer,
        userAnswerCountryId,
        correctAnswerCountryId,
        selectedAnswer: gameType === 'capital' || gameType === 'population' || gameType === 'flag' ? answer : null
      };
      
      console.log('Game engine feedback:', {
        isCorrect,
        userAnswer: answer,
        correctAnswer: currentQ.answer,
        questionIndex: prev.currentQuestion,
        gameType
      });
      
      // Start feedback phase - don't advance game yet
      return {
        ...prev,
        showingFeedback: true,
        feedback,
        // Store answer data for when feedback completes
        pendingAnswer: {
          answer,
          timeSpent,
          isCorrect,
          currentQ
        }
      };
    });
    
    // Auto-advance after feedback delay (0.75 seconds)
    setTimeout(() => {
      setGameState(prev => {
        if (!prev.showingFeedback || !prev.pendingAnswer) return prev;
        
        const { answer, timeSpent, isCorrect, currentQ } = prev.pendingAnswer;
        
        // Calculate score with time bonus (no base points, no streak bonus)
        let scoreEarned = 0;
        if (isCorrect) {
          if (gameType === 'location') {
            // Location quiz: 5-second cliffs, 6 possible scores (500-1000)
            if (timeSpent <= 5) scoreEarned = 1000;
            else if (timeSpent <= 10) scoreEarned = 900;
            else if (timeSpent <= 15) scoreEarned = 800;
            else if (timeSpent <= 20) scoreEarned = 700;
            else if (timeSpent <= 25) scoreEarned = 600;
            else scoreEarned = 500; // 25+ seconds
          } else {
            // Multiple choice quizzes: 10-second timer with 2-second cliffs
            if (timeSpent <= 2) scoreEarned = 1000;
            else if (timeSpent <= 4) scoreEarned = 900;
            else if (timeSpent <= 6) scoreEarned = 800;
            else if (timeSpent <= 8) scoreEarned = 700;
            else if (timeSpent < 10) scoreEarned = 600;
            else scoreEarned = 0; // 10+ seconds or timeout
          }
        }
        
        const newScore = prev.score + scoreEarned;
        const newStreak = isCorrect ? prev.streak + 1 : 0;
        const newBestStreak = Math.max(prev.bestStreak, newStreak);
        
        // Update question
        const updatedQuestions = [...prev.questions];
        updatedQuestions[prev.currentQuestion] = {
          ...currentQ,
          answered: true,
          correct: isCorrect,
          timeSpent,
          userAnswer: answer,
          scoreEarned
        };

        // Record answer
        const newAnswer = {
          questionId: prev.currentQuestion,
          answer,
          correct: isCorrect,
          timeSpent,
          scoreEarned
        };
        const newAnswers = [...prev.answers, newAnswer];

        // Track the answer
        analyticsService.trackQuestionAnswered(gameType, {
          countryId: currentQ.country.cca3,
          countryName: currentQ.country.name,
          correct: isCorrect,
          timeSpent,
          scoreEarned,
          streak: newStreak,
          questionType: currentQ.type,
          userAnswer: answer,
          correctAnswer: currentQ.answer
        });

        // Check if game is complete
        const nextQuestion = prev.currentQuestion + 1;
        const isComplete = nextQuestion >= prev.questions.length;

        // Track game completion
        if (isComplete) {
          const gameDuration = Date.now() - prev.startTime;
          const questionsCorrect = newAnswers.filter(a => a.correct).length;
          const accuracy = (questionsCorrect / prev.questions.length) * 100;
          const averageTimePerQuestion = gameDuration / prev.questions.length;
          
          analyticsService.trackGameCompleted({
            gameType,
            finalScore: newScore,
            questionsCorrect,
            totalQuestions: prev.questions.length,
            accuracy,
            gameDuration,
            bestStreak: newBestStreak,
            averageTimePerQuestion
          });
        }

        return {
          ...prev,
          questions: updatedQuestions,
          currentQuestion: nextQuestion,
          score: newScore,
          answers: newAnswers,
          streak: newStreak,
          bestStreak: newBestStreak,
          isComplete,
          isActive: !isComplete,
          timeLeft: isComplete ? 0 : (gameType === 'location' ? 30 : 10),
          // Clear feedback state
          showingFeedback: false,
          feedback: null,
          pendingAnswer: null
        };
      });
    }, 750); // 0.75 second feedback delay
  }, [gameType]);

  const abandonGame = useCallback(() => {
    if (gameState.isActive && !gameState.isComplete) {
      analyticsService.trackGameAbandoned(
        gameType,
        gameState.answers.length,
        gameState.questions.length
      );
    }
    
    setGameState(prev => ({
      ...prev,
      isActive: false
    }));
  }, [gameState.isActive, gameState.isComplete, gameState.answers.length, gameState.questions.length, gameType]);

  const resetGame = useCallback(() => {
    setGameState({
      questions: [],
      currentQuestion: 0,
      score: 0,
      timeLeft: 30,
      isActive: false,
      isComplete: false,
      answers: [],
      streak: 0,
      bestStreak: 0,
      gameId: null,
      startTime: null,
      showingFeedback: false,
      feedback: null,
      pendingAnswer: null
    });
    setError(null);
  }, []);

  // Timer effect
  useEffect(() => {
    let timer;
    if (gameState.isActive && gameState.timeLeft > 0) {
      timer = setInterval(() => {
        setGameState(prev => {
          const newTimeLeft = prev.timeLeft - 1;
          return { ...prev, timeLeft: newTimeLeft };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.isActive, gameState.timeLeft]);

  // Auto-answer when time runs out
  useEffect(() => {
    if (gameState.isActive && gameState.timeLeft <= 0) {
      const maxTime = gameType === 'location' ? 30 : 10;
      answerQuestion(null, maxTime); // null answer with maximum time for game type
    }
  }, [gameState.timeLeft, gameState.isActive, answerQuestion, gameType]);

  // Get current question with enhanced data
  const getCurrentQuestion = () => {
    const question = gameState.questions[gameState.currentQuestion];
    if (!question) return null;

    return {
      ...question,
      progress: ((gameState.currentQuestion + 1) / gameState.questions.length) * 100,
      questionNumber: gameState.currentQuestion + 1,
      totalQuestions: gameState.questions.length
    };
  };

  return {
    gameState: {
      ...gameState,
      isLoading,
      error
    },
    actions: {
      startGame,
      answerQuestion,
      abandonGame,
      resetGame
    },
    currentQuestion: getCurrentQuestion(),
    progress: gameState.questions.length > 0 ? 
      ((gameState.currentQuestion) / gameState.questions.length) * 100 : 0,
    
    // Additional utilities
    getGameStats: () => ({
      accuracy: gameState.answers.length > 0 ? 
        (gameState.answers.filter(a => a.correct).length / gameState.answers.length) * 100 : 0,
      averageTime: gameState.answers.length > 0 ?
        gameState.answers.reduce((sum, a) => sum + a.timeSpent, 0) / gameState.answers.length : 0,
      totalTime: gameState.startTime ? Date.now() - gameState.startTime : 0
    })
  };
};