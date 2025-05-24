import { useState, useEffect, useCallback } from 'react';
import { getRandomCountries, getPopulationRange } from '../data/countries';

export const useGame = (gameType = 'location', questionCount = 10) => {
  const [gameState, setGameState] = useState({
    questions: [],
    currentQuestion: 0,
    score: 0,
    timeLeft: 30,
    isActive: false,
    isComplete: false,
    answers: [],
    streak: 0,
    bestStreak: 0
  });

  const generateQuestions = useCallback(() => {
    const countries = getRandomCountries(questionCount);
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
            answer: country.id
          };
        
        case 'capital':
          return {
            ...baseQuestion,
            question: `What is the capital of ${country.name}?`,
            answer: country.capital,
            options: generateCapitalOptions(country.capital)
          };
        
        case 'flag':
          return {
            ...baseQuestion,
            question: `Which country does this flag belong to?`,
            flag: country.flag,
            answer: country.name,
            options: generateCountryOptions(country.name)
          };
        
        case 'population':
          return {
            ...baseQuestion,
            question: `What is the population range of ${country.name}?`,
            answer: getPopulationRange(country.population),
            options: ['Under 10M', '10M - 50M', '50M - 100M', '100M - 500M', 'Over 500M']
          };
        
        default:
          return baseQuestion;
      }
    });
    
    return questions;
  }, [gameType, questionCount]);

  const generateCapitalOptions = (correctCapital) => {
    const allCapitals = ['Washington D.C.', 'Ottawa', 'Mexico City', 'Brasília', 'Buenos Aires', 
                        'London', 'Paris', 'Berlin', 'Rome', 'Madrid', 'Moscow', 'Beijing', 
                        'New Delhi', 'Tokyo', 'Canberra', 'Cairo', 'Cape Town', 'Abuja', 'Nairobi', 'Ankara'];
    const options = [correctCapital];
    const otherCapitals = allCapitals.filter(cap => cap !== correctCapital);
    
    while (options.length < 4) {
      const randomCapital = otherCapitals[Math.floor(Math.random() * otherCapitals.length)];
      if (!options.includes(randomCapital)) {
        options.push(randomCapital);
      }
    }
    
    return options.sort(() => Math.random() - 0.5);
  };

  const generateCountryOptions = (correctCountry) => {
    const allCountries = ['United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 
                         'United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 'Russia', 
                         'China', 'India', 'Japan', 'Australia', 'Egypt', 'South Africa', 
                         'Nigeria', 'Kenya', 'Turkey'];
    const options = [correctCountry];
    const otherCountries = allCountries.filter(country => country !== correctCountry);
    
    while (options.length < 4) {
      const randomCountry = otherCountries[Math.floor(Math.random() * otherCountries.length)];
      if (!options.includes(randomCountry)) {
        options.push(randomCountry);
      }
    }
    
    return options.sort(() => Math.random() - 0.5);
  };

  const startGame = useCallback(() => {
    const questions = generateQuestions();
    setGameState({
      questions,
      currentQuestion: 0,
      score: 0,
      timeLeft: 30,
      isActive: true,
      isComplete: false,
      answers: [],
      streak: 0,
      bestStreak: 0
    });
  }, [generateQuestions]);

  const answerQuestion = useCallback((answer, timeSpent = 0) => {
    setGameState(prev => {
      const currentQ = prev.questions[prev.currentQuestion];
      const isCorrect = answer === currentQ.answer;
      const newScore = isCorrect ? prev.score + Math.max(1, Math.floor((30 - timeSpent) / 3)) : prev.score;
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const newBestStreak = Math.max(prev.bestStreak, newStreak);
      
      const updatedQuestions = [...prev.questions];
      updatedQuestions[prev.currentQuestion] = {
        ...currentQ,
        answered: true,
        correct: isCorrect,
        timeSpent,
        userAnswer: answer
      };

      const newAnswers = [...prev.answers, {
        questionId: prev.currentQuestion,
        answer,
        correct: isCorrect,
        timeSpent
      }];

      const nextQuestion = prev.currentQuestion + 1;
      const isComplete = nextQuestion >= prev.questions.length;

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
        timeLeft: isComplete ? 0 : 30
      };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      currentQuestion: prev.currentQuestion + 1,
      timeLeft: 30
    }));
  }, []);

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
      bestStreak: 0
    });
  }, []);

  useEffect(() => {
    let timer;
    if (gameState.isActive && gameState.timeLeft > 0) {
      timer = setInterval(() => {
        setGameState(prev => {
          const newTimeLeft = prev.timeLeft - 1;
          if (newTimeLeft <= 0) {
            return prev;
          }
          return { ...prev, timeLeft: newTimeLeft };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.isActive, gameState.timeLeft]);

  useEffect(() => {
    if (gameState.isActive && gameState.timeLeft <= 0) {
      answerQuestion(null, 30);
    }
  }, [gameState.timeLeft, gameState.isActive, answerQuestion]);

  return {
    gameState,
    startGame,
    answerQuestion,
    nextQuestion,
    resetGame,
    currentQuestion: gameState.questions[gameState.currentQuestion] || null,
    progress: gameState.questions.length > 0 ? 
      ((gameState.currentQuestion) / gameState.questions.length) * 100 : 0
  };
};