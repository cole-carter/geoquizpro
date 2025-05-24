const STORAGE_KEY = 'geoquiz_data';

export const saveGameStats = (stats) => {
  try {
    const existingData = getStoredData();
    const newData = {
      ...existingData,
      totalGames: (existingData.totalGames || 0) + 1,
      totalScore: (existingData.totalScore || 0) + stats.score,
      bestScore: Math.max(existingData.bestScore || 0, stats.score),
      bestStreak: Math.max(existingData.bestStreak || 0, stats.bestStreak),
      lastPlayed: new Date().toISOString(),
      gameHistory: [
        ...(existingData.gameHistory || []).slice(-9),
        {
          date: new Date().toISOString(),
          score: stats.score,
          questions: stats.questions,
          gameType: stats.gameType,
          streak: stats.bestStreak
        }
      ]
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    return newData;
  } catch (error) {
    console.error('Failed to save game stats:', error);
    return null;
  }
};

export const getStoredData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to load stored data:', error);
    return {};
  }
};

export const getGameStats = () => {
  const data = getStoredData();
  return {
    totalGames: data.totalGames || 0,
    totalScore: data.totalScore || 0,
    bestScore: data.bestScore || 0,
    bestStreak: data.bestStreak || 0,
    averageScore: data.totalGames > 0 ? Math.round(data.totalScore / data.totalGames) : 0,
    lastPlayed: data.lastPlayed || null,
    gameHistory: data.gameHistory || []
  };
};

export const clearGameData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear game data:', error);
    return false;
  }
};

export const getDailyChallenge = () => {
  const today = new Date().toDateString();
  const data = getStoredData();
  
  if (data.dailyChallenge && data.dailyChallenge.date === today) {
    return data.dailyChallenge;
  }
  
  return null;
};

export const saveDailyChallenge = (challenge) => {
  try {
    const existingData = getStoredData();
    const newData = {
      ...existingData,
      dailyChallenge: {
        ...challenge,
        date: new Date().toDateString()
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    return newData.dailyChallenge;
  } catch (error) {
    console.error('Failed to save daily challenge:', error);
    return null;
  }
};