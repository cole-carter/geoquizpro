# GeoQuiz Pro - Claude Memory & Context Document

## Project Overview

**GeoQuiz Pro** is a sophisticated, production-ready geography education platform deployed at **https://geoquizpro.com**. The application features advanced satellite map integration, multi-layer rendering architecture, and comprehensive analytics tracking. It transforms geography learning through interactive satellite terrain maps and real-time data integration.

## 🚀 Live Deployment

- **Production URL**: https://geoquizpro.com
- **Deployment**: Netlify connected to GitHub
- **CI/CD**: Push to GitHub → Automatic deployment
- **Status**: Fully operational and optimized

## 🏗️ Architecture Overview

### Core Technology Stack
- **Frontend**: React 19.1.0 with hooks-based architecture
- **Maps**: Leaflet.js with multi-layer rendering system
- **Styling**: Custom CSS with viewport-based scaling doctrine
- **Build**: Create React App with production optimizations
- **Deployment**: Netlify with GitHub integration

### Multi-Layer Map Architecture (Key Innovation)
The application uses a sophisticated **3-layer rendering system** that solved complex feedback timing issues:

#### Layer 1: Border Layer (Z-index 400)
- **Purpose**: Always-visible country outlines
- **Style**: Yellow dashed borders (Esri) or transparent (MapBox)
- **Behavior**: Static visual reference

#### Layer 2: Hover Layer (Z-index 600) 
- **Purpose**: Interactive mouse feedback
- **Style**: Blue highlighting on mouseover
- **Behavior**: Responds to mouse events, independent of game state

#### Layer 3: Validation Layer (Z-index 700)
- **Purpose**: Game feedback (correct/incorrect)
- **Variants**: Green sublayer (correct) + Red sublayer (incorrect)
- **Timing**: 1-second display controlled by game engine
- **Behavior**: Non-interactive, pure visual feedback

### Map Provider Strategy
```javascript
// Current configuration for viral protection
const USE_MAPBOX = false; // Disabled to prevent API runaway
// Primary: Esri World Imagery (unlimited, free)
// Fallback: MapBox (if enabled with usage tracking)
```

## 🎮 Game Logic & Flow

### Game Types
1. **Location Quiz**: Click satellite maps to find countries
2. **Capital Quiz**: Multiple choice questions with flag imagery
3. **Flag Quiz**: Identify countries by flags on satellite maps  
4. **Population Quiz**: Guess population ranges with multiple choice

### Game Engine (`useGameEnhanced`)
- **State Management**: Centralized game state with feedback phases
- **Question Generation**: Dynamic from REST Countries API
- **Timer System**: 30-second countdown with visual progress
- **Scoring Algorithm**: Base points + speed bonus + streak multipliers
- **Feedback System**: 1-second validation with multi-layer visualization

### Game Flow Sequence
```
HomePage → Game Selection → Loading → Question Phase → Feedback Phase → Repeat → Results
    ↓                                      ↓               ↓
Analytics Tracking              Timer + Scoring    Multi-layer Feedback
```

## 🔧 Component Architecture

### Component Hierarchy
```
App (ErrorBoundary wrapper)
├── HomePage
│   ├── Game type cards (4)
│   └── DebugPanel (development)
└── GameInterfaceEnhanced
    ├── QuestionCard (question display + options)
    ├── WebMapTripleBuffer (advanced map with 3-layer system)
    ├── GameStats (score, timer, progress)
    └── ResultsEnhanced (comprehensive end-game analysis)
```

### Data Flow Pattern
```
External APIs → apiService → dataService → useGameEnhanced → Components
                    ↓                           ↓
              Local Storage Cache      analyticsService
```

## 🛠️ Services Architecture

### dataService (Singleton)
- **API Integration**: REST Countries API + Natural Earth GeoJSON
- **Caching**: 24-hour cache with expiry management
- **Data Processing**: Country lookup, validation, coordinate transformation
- **Error Handling**: Graceful fallbacks and retry logic

### analyticsService (Singleton)  
- **Tracking**: All user interactions and game events
- **Performance**: Batched event processing
- **Storage**: Local backup with session management
- **Metrics**: Score tracking, timing analysis, error monitoring

### apiService (Singleton)
- **External APIs**: Fetches from REST Countries and GeoJSON sources
- **Cache Management**: Efficient storage and retrieval
- **Error Recovery**: Retry logic and fallback strategies

## 🗺️ Map Implementation Details

### Triple-Buffer World Wrapping
- **Coverage**: 1800° longitude with 5 map instances (-720°, -360°, 0°, +360°, +720°)
- **Seamless**: No gaps during world edge crossing
- **Performance**: Throttled updates (200ms) for smooth panning
- **Detection**: Point-in-polygon with Haversine distance fallback

### Click Detection Algorithm
```javascript
// Advanced geographic detection
1. Point-in-polygon test on all visible layers
2. Boundary collision detection
3. Closest country calculation (Haversine formula)
4. Country lookup from dataService
5. Analytics tracking with interaction data
```

### Map Styling Strategy
- **Esri Mode**: Yellow dashed country borders for visibility
- **MapBox Mode**: Invisible borders (imagery has natural borders)
- **Feedback**: Multi-layer system prevents timing conflicts

## 📱 User Experience Design

### Scaling Doctrine (Critical)
- **No Vertical Scrolling**: All content fits viewport height
- **Viewport-Based**: Uses clamp(), calc(), vh units for responsive scaling
- **Mobile-First**: Touch-optimized interactions
- **Performance**: Efficient rendering and minimal reflows

### Design System
```css
/* Color palette */
--background: linear-gradient(135deg, #6b7a28, #5a6622); /* Olive green */
--headers: #f0ebdc; /* Beige */
--cards: #f0ebdc; /* Beige with black text */
--accents: olive green variations
```

### Interaction Patterns
- **Immediate Feedback**: Visual response within 16ms
- **1-Second Validation**: Game feedback timing for learning reinforcement
- **Progressive Disclosure**: Content appears as needed
- **Error Boundaries**: Graceful error handling throughout

## 🔄 State Management

### Game State Structure
```javascript
const gameState = {
  // Core game properties
  isActive: boolean,
  currentQuestion: number,
  questions: Array,
  score: number,
  streak: number,
  
  // Feedback system (multi-layer architecture solution)
  showingFeedback: boolean,
  feedback: {
    isCorrect: boolean,
    userAnswer: string,
    correctAnswer: string,
    userAnswerCountryId: string,
    correctAnswerCountryId: string,
    selectedAnswer: string // for multiple choice games
  },
  pendingAnswer: object // for processing after feedback
}
```

### State Transitions
```
Answering → Feedback Display → Processing → Next Question
     ↓             ↓              ↓           ↓
Update UI    Show validation  Update score  Reset state
```

## 🚀 Performance Optimizations

### Bundle Optimization
- **Size**: ~119KB gzipped (optimized for fast loading)
- **Code Splitting**: Components loaded as needed
- **Tree Shaking**: Unused code eliminated
- **Image Optimization**: Efficient flag loading

### Runtime Performance
- **Map Updates**: Throttled to 200ms intervals
- **React Optimization**: Proper key management, memo usage
- **Event Handling**: Debounced user interactions
- **Memory Management**: Cleanup functions prevent leaks

### Caching Strategy
- **API Data**: 24-hour cache with smart invalidation
- **Map Tiles**: Browser cache leveraged
- **Country Data**: Persistent local storage
- **Analytics**: Batched transmission

## 🔒 Production Configuration

### Environment Variables
```bash
# Deployment
REACT_APP_ENV=production

# Map providers (MapBox disabled for cost control)
REACT_APP_MAPBOX_TOKEN=(disabled for viral protection)
USE_MAPBOX=false # Hard-coded to prevent API runaway
```

### Deployment Setup
```yaml
# Netlify configuration
Build command: npm run build
Publish directory: build
Node version: 18.x
Deploy on: GitHub push to main branch
```

### Error Handling
- **ErrorBoundary**: Catches React component errors
- **Service Fallbacks**: API failures handled gracefully
- **User Feedback**: Clear error messages and recovery options
- **Analytics**: Error tracking for monitoring

## 📊 Analytics & Monitoring

### Tracked Events
- **User Journey**: Page views, game starts, completions
- **Interactions**: Country clicks, option selections, navigation
- **Performance**: Response times, error rates, session duration
- **Learning**: Accuracy rates, question difficulty, improvement tracking

### Data Storage
- **Local First**: All data stored locally for privacy
- **Session Management**: Comprehensive session tracking
- **Statistics**: Best scores, averages, progress tracking
- **Backup**: Analytics service maintains event log

## 🧪 Testing & Quality

### Code Quality
- **Architecture**: Service layer pattern, hooks-based logic
- **Error Handling**: Comprehensive error boundaries and fallbacks
- **Performance**: Optimized rendering and event handling
- **Maintainability**: Clear separation of concerns

### Browser Support
- **Primary**: Chrome/Chromium (best performance)
- **Full Support**: Firefox, Safari, Edge
- **Mobile**: iOS Safari, Chrome Mobile, Samsung Internet
- **Progressive Enhancement**: Graceful degradation for older browsers

## 🔮 Technical Achievements

### Multi-Layer Architecture Innovation
The recent implementation of the 3-layer map system solved critical timing issues:
- **Problem**: Game feedback conflicted with map hover interactions
- **Solution**: Separated concerns into independent visual layers
- **Result**: Smooth, non-blocking feedback with perfect timing

### Key Innovations
1. **Feedback State Management**: Game engine controls all timing
2. **Visual Layer Separation**: Each interaction type has dedicated layer
3. **Performance**: Efficient updates without full re-renders
4. **User Experience**: Immediate feedback without blocking

### Production Readiness
- ✅ **Deployed**: Live at geoquizpro.com
- ✅ **Optimized**: Production build with performance tuning
- ✅ **Monitored**: Analytics and error tracking
- ✅ **Scalable**: Efficient architecture for growth
- ✅ **Maintainable**: Clean code with comprehensive documentation

## 🎯 Current Status & Capabilities

### Fully Operational Features
- **Real-time Data**: REST Countries API integration
- **Advanced Maps**: Multi-layer satellite map system
- **Comprehensive Analytics**: User behavior tracking
- **Mobile Optimized**: Touch-friendly responsive design
- **Production Ready**: Deployed and monitoring

### Recent Achievements
- **Multi-layer Architecture**: Solved feedback timing issues
- **Esri Integration**: Reliable map provider without API costs
- **Performance Optimization**: Fast loading and smooth interactions
- **User Experience**: No vertical scrolling, perfect mobile support

This document represents the current state of GeoQuiz Pro as a sophisticated, production-ready geography education platform with innovative technical solutions and comprehensive user experience design.