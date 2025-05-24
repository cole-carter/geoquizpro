// MapBox Usage Tracking and Protection Service
class UsageTracker {
  constructor() {
    this.storageKey = 'geoquizpro_mapbox_usage';
    this.dailyLimit = 1500; // Conservative limit (50k/month = ~1600/day)
    this.warningThreshold = 0.8; // Warn at 80%
    this.emergencyThreshold = 0.95; // Emergency fallback at 95%
  }

  // Initialize usage tracking
  initialize() {
    const today = this.getTodayKey();
    const usage = this.getUsage();
    
    // Reset if new day
    if (usage.date !== today) {
      this.resetDailyUsage();
    }
    
    return this.getUsageStatus();
  }

  // Track a map tile request
  trackRequest(type = 'tile') {
    const usage = this.getUsage();
    const today = this.getTodayKey();
    
    // Reset if new day
    if (usage.date !== today) {
      this.resetDailyUsage();
    }
    
    // Increment usage
    const updatedUsage = {
      ...usage,
      total: usage.total + 1,
      today: usage.today + 1,
      date: today,
      types: {
        ...usage.types,
        [type]: (usage.types[type] || 0) + 1
      },
      lastRequest: Date.now()
    };
    
    this.saveUsage(updatedUsage);
    
    // Check if we should block or warn
    const status = this.getUsageStatus();
    if (status.shouldBlock) {
      console.warn('🚨 MapBox usage limit reached! Switching to fallback.');
      this.logUsageAlert('BLOCKED', updatedUsage.today);
    } else if (status.shouldWarn) {
      console.warn('⚠️ MapBox usage approaching limit:', status);
      this.logUsageAlert('WARNING', updatedUsage.today);
    }
    
    return status;
  }

  // Get current usage status
  getUsageStatus() {
    const usage = this.getUsage();
    const todayUsage = usage.today;
    const percentage = todayUsage / this.dailyLimit;
    
    return {
      todayUsage,
      dailyLimit: this.dailyLimit,
      percentage: Math.round(percentage * 100),
      remainingRequests: Math.max(0, this.dailyLimit - todayUsage),
      shouldWarn: percentage >= this.warningThreshold,
      shouldBlock: percentage >= this.emergencyThreshold,
      status: this.getStatusText(percentage)
    };
  }

  // Check if MapBox should be used or fallback
  shouldUseMapBox() {
    const status = this.getUsageStatus();
    return !status.shouldBlock;
  }

  // Get usage data from localStorage
  getUsage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Error reading usage data:', err);
    }
    
    return this.getDefaultUsage();
  }

  // Save usage data to localStorage
  saveUsage(usage) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(usage));
    } catch (err) {
      console.warn('Error saving usage data:', err);
    }
  }

  // Reset daily usage counter
  resetDailyUsage() {
    const usage = this.getUsage();
    const resetUsage = {
      ...usage,
      today: 0,
      date: this.getTodayKey(),
      lastReset: Date.now()
    };
    this.saveUsage(resetUsage);
    console.log('📊 Daily MapBox usage reset');
  }

  // Get default usage structure
  getDefaultUsage() {
    return {
      total: 0,
      today: 0,
      date: this.getTodayKey(),
      types: {},
      created: Date.now(),
      lastRequest: null,
      lastReset: Date.now()
    };
  }

  // Get today's date key (YYYY-MM-DD)
  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  }

  // Get status text for UI
  getStatusText(percentage) {
    if (percentage >= 0.95) return 'BLOCKED';
    if (percentage >= 0.8) return 'WARNING';
    if (percentage >= 0.6) return 'HIGH';
    if (percentage >= 0.3) return 'MODERATE';
    return 'LOW';
  }

  // Log usage alerts
  logUsageAlert(level, todayUsage) {
    const alertData = {
      level,
      todayUsage,
      limit: this.dailyLimit,
      timestamp: new Date().toISOString(),
      percentage: Math.round((todayUsage / this.dailyLimit) * 100)
    };
    
    // Store alert in localStorage for dashboard
    try {
      const alerts = JSON.parse(localStorage.getItem('geoquizpro_usage_alerts') || '[]');
      alerts.push(alertData);
      
      // Keep only last 10 alerts
      if (alerts.length > 10) {
        alerts.splice(0, alerts.length - 10);
      }
      
      localStorage.setItem('geoquizpro_usage_alerts', JSON.stringify(alerts));
    } catch (err) {
      console.warn('Error storing usage alert:', err);
    }
  }

  // Get usage statistics for dashboard
  getStatistics() {
    const usage = this.getUsage();
    const status = this.getUsageStatus();
    
    try {
      const alerts = JSON.parse(localStorage.getItem('geoquizpro_usage_alerts') || '[]');
      
      return {
        current: status,
        historical: {
          totalRequests: usage.total,
          todayRequests: usage.today,
          averageDaily: this.calculateAverageDaily(usage),
          requestTypes: usage.types
        },
        alerts: alerts.slice(-5), // Last 5 alerts
        projections: {
          monthlyProjection: status.todayUsage * 30,
          daysUntilLimit: this.calculateDaysUntilLimit(usage)
        }
      };
    } catch (err) {
      console.warn('Error calculating statistics:', err);
      return { current: status, error: true };
    }
  }

  // Calculate average daily usage
  calculateAverageDaily(usage) {
    const daysSinceCreated = Math.max(1, 
      Math.floor((Date.now() - usage.created) / (1000 * 60 * 60 * 24))
    );
    return Math.round(usage.total / daysSinceCreated);
  }

  // Calculate days until monthly limit
  calculateDaysUntilLimit(usage) {
    const averageDaily = this.calculateAverageDaily(usage);
    if (averageDaily === 0) return Infinity;
    
    const monthlyLimit = 50000; // MapBox free tier
    const remainingMonthly = monthlyLimit - usage.total;
    return Math.floor(remainingMonthly / averageDaily);
  }

  // Force fallback mode (for emergencies)
  forceFallbackMode() {
    const usage = this.getUsage();
    usage.forceFallback = true;
    usage.fallbackActivated = Date.now();
    this.saveUsage(usage);
    console.log('🚨 Forced fallback mode activated');
  }

  // Clear fallback mode
  clearFallbackMode() {
    const usage = this.getUsage();
    delete usage.forceFallback;
    delete usage.fallbackActivated;
    this.saveUsage(usage);
    console.log('✅ Fallback mode cleared');
  }

  // Check if in forced fallback mode
  isForcedFallback() {
    const usage = this.getUsage();
    return Boolean(usage.forceFallback);
  }
}

// Create singleton instance
const usageTracker = new UsageTracker();

export default usageTracker;