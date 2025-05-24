import { v4 as uuidv4 } from 'uuid';

class AnalyticsService {
  constructor() {
    this.sessionId = uuidv4();
    this.userId = this.getOrCreateUserId();
    this.events = [];
    this.isEnabled = true;
    this.maxBatchSize = 50;
    this.flushInterval = 30000; // 30 seconds
    this.endpoints = {
      // Using a simple logging endpoint for now - can be replaced with Moesif or other service
      logs: '/api/analytics' // This would be your backend endpoint
    };
    
    this.startBatchFlush();
    this.trackPageView();
  }

  getOrCreateUserId() {
    let userId = localStorage.getItem('geoquiz_user_id');
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('geoquiz_user_id', userId);
    }
    return userId;
  }

  track(eventName, properties = {}) {
    if (!this.isEnabled) return;

    const event = {
      event: eventName,
      properties: {
        ...properties,
        timestamp: Date.now(),
        session_id: this.sessionId,
        user_id: this.userId,
        url: window.location.href,
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language
      },
      id: uuidv4()
    };

    this.events.push(event);
    
    // Log to console for development
    console.log('Analytics Event:', event);
    
    // Store in localStorage as backup
    this.storeEventLocally(event);
    
    // Flush if batch is full
    if (this.events.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  // Game-specific tracking methods
  trackGameStarted(gameType) {
    this.track('game_started', {
      game_type: gameType,
      start_time: Date.now()
    });
  }

  trackQuestionAnswered(gameType, questionData) {
    this.track('question_answered', {
      game_type: gameType,
      country_id: questionData.countryId,
      country_name: questionData.countryName,
      correct: questionData.correct,
      time_spent: questionData.timeSpent,
      score_earned: questionData.scoreEarned,
      streak: questionData.streak,
      question_type: questionData.questionType,
      user_answer: questionData.userAnswer,
      correct_answer: questionData.correctAnswer
    });
  }

  trackGameCompleted(gameData) {
    this.track('game_completed', {
      game_type: gameData.gameType,
      final_score: gameData.finalScore,
      questions_correct: gameData.questionsCorrect,
      total_questions: gameData.totalQuestions,
      accuracy: gameData.accuracy,
      game_duration: gameData.gameDuration,
      best_streak: gameData.bestStreak,
      average_time_per_question: gameData.averageTimePerQuestion
    });
  }

  trackGameAbandoned(gameType, questionsAnswered, totalQuestions) {
    this.track('game_abandoned', {
      game_type: gameType,
      questions_answered: questionsAnswered,
      total_questions: totalQuestions,
      completion_rate: (questionsAnswered / totalQuestions) * 100
    });
  }

  trackError(error, context = {}) {
    this.track('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      context: context
    });
  }

  trackApiCall(endpoint, success, responseTime, errorMessage = null) {
    this.track('api_call', {
      endpoint: endpoint,
      success: success,
      response_time: responseTime,
      error_message: errorMessage
    });
  }

  trackPageView(page = null) {
    this.track('page_view', {
      page: page || this.getCurrentPage(),
      referrer: document.referrer
    });
  }

  trackUserInteraction(action, element, additionalData = {}) {
    this.track('user_interaction', {
      action: action,
      element: element,
      ...additionalData
    });
  }

  getCurrentPage() {
    const path = window.location.pathname;
    if (path === '/' || path === '/home') return 'home';
    if (path.includes('/game')) return 'game';
    return path;
  }

  storeEventLocally(event) {
    try {
      const stored = JSON.parse(localStorage.getItem('geoquiz_analytics_backup') || '[]');
      stored.push(event);
      
      // Keep only last 100 events to prevent localStorage bloat
      const trimmed = stored.slice(-100);
      localStorage.setItem('geoquiz_analytics_backup', JSON.stringify(trimmed));
    } catch (error) {
      console.warn('Failed to store analytics event locally:', error);
    }
  }

  async flush() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      // In a real implementation, you would send to your analytics service
      // For now, we'll just log and simulate sending
      console.log('Flushing analytics events:', eventsToSend);
      
      // Simulate API call
      await this.sendToAnalyticsService(eventsToSend);
      
      console.log(`Successfully sent ${eventsToSend.length} analytics events`);
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      
      // Put events back in queue for retry
      this.events.unshift(...eventsToSend);
      
      // Store failed events locally as backup
      eventsToSend.forEach(event => this.storeEventLocally(event));
    }
  }

  async sendToAnalyticsService(events) {
    // This is where you would integrate with your actual analytics service
    // For example, with Moesif:
    
    // return fetch(this.endpoints.logs, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'X-Moesif-Application-Id': 'your-app-id'
    //   },
    //   body: JSON.stringify(events)
    // });

    // For now, simulate a successful API call
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  startBatchFlush() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  // Method to retrieve stored events for debugging
  getStoredEvents() {
    try {
      return JSON.parse(localStorage.getItem('geoquiz_analytics_backup') || '[]');
    } catch (error) {
      console.warn('Failed to retrieve stored events:', error);
      return [];
    }
  }

  // Method to clear stored events
  clearStoredEvents() {
    try {
      localStorage.removeItem('geoquiz_analytics_backup');
      console.log('Cleared stored analytics events');
    } catch (error) {
      console.warn('Failed to clear stored events:', error);
    }
  }

  // Enable/disable analytics
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('geoquiz_analytics_enabled', enabled.toString());
  }

  // Get analytics summary for debugging
  getAnalyticsSummary() {
    const stored = this.getStoredEvents();
    const summary = {};
    
    stored.forEach(event => {
      const eventType = event.event;
      if (!summary[eventType]) {
        summary[eventType] = 0;
      }
      summary[eventType]++;
    });
    
    return {
      session_id: this.sessionId,
      user_id: this.userId,
      events_in_queue: this.events.length,
      events_stored_locally: stored.length,
      event_types: summary,
      enabled: this.isEnabled
    };
  }
}

// Export singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;