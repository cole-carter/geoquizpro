# GeoQuiz Pro

**Live at: https://geoquizpro.com**

An advanced interactive geography education platform featuring satellite map integration, multi-layer rendering architecture, and real-time data. Transform geography learning through innovative map-based quizzes with natural terrain visualization and comprehensive analytics.

## 🚀 Production Deployment

- **Live URL**: https://geoquizpro.com
- **Hosting**: Netlify with GitHub integration
- **CI/CD**: Automatic deployment on GitHub push
- **Status**: Production-ready and optimized

## ✨ Key Features

### 🗺️ Advanced Map Technology
- **Multi-layer Architecture**: 3-layer rendering system (borders, hover, validation)
- **Satellite Imagery**: Esri World Imagery with fallback to MapBox
- **Triple-buffer System**: Seamless 1800° world wrapping without gaps
- **Smart Detection**: Point-in-polygon algorithms with Haversine distance fallback
- **Performance Optimized**: Throttled updates and efficient rendering

### 🎮 Game Modes
- **🌍 Find the Country**: Click satellite terrain maps to select countries
- **🏛️ Capital Quiz**: Multiple choice capital questions with flag imagery
- **🏳️ Flag Quiz**: Identify countries by flags on interactive maps
- **👥 Population Quiz**: Guess population ranges with educational context

### 🎯 Advanced Game Engine
- **Real-time Data**: REST Countries API integration with live country data
- **Smart Scoring**: Base points + speed bonus + streak multipliers
- **Feedback System**: 1-second validation with multi-layer visual feedback
- **Analytics**: Comprehensive user interaction and performance tracking

### 📱 User Experience
- **No Vertical Scrolling**: Viewport-based scaling doctrine
- **Mobile-First**: Touch-optimized responsive design
- **Fast Loading**: ~119KB gzipped bundle with performance optimization
- **Error Handling**: Comprehensive error boundaries and graceful fallbacks

## 🏗️ Technical Architecture

### Component Hierarchy
```
App (ErrorBoundary)
├── HomePage
│   ├── Game type cards (4)
│   └── DebugPanel (dev)
└── GameInterfaceEnhanced
    ├── QuestionCard
    ├── WebMapTripleBuffer (multi-layer maps)
    ├── GameStats
    └── ResultsEnhanced
```

### Service Architecture
```
External APIs → apiService → dataService → useGameEnhanced → Components
                    ↓                           ↓
              Local Storage Cache      analyticsService
```

### Multi-Layer Map System
1. **Border Layer (Z-400)**: Always-visible country outlines
2. **Hover Layer (Z-600)**: Interactive mouse feedback  
3. **Validation Layer (Z-700)**: Game feedback (green/red)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd geoquiz
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start development server:**
```bash
npm start
```

4. **Open browser:**
Navigate to [http://localhost:3000](http://localhost:3000)

### Environment Configuration

```bash
# Optional - MapBox token (currently disabled for cost control)
REACT_APP_MAPBOX_TOKEN=your_token_here

# Environment detection
REACT_APP_ENV=development
```

**Note**: MapBox is currently disabled (`USE_MAPBOX = false`) to prevent API runaway costs. The application uses Esri World Imagery as the primary provider.

## 📁 Project Structure

```
geoquiz/
├── public/                 # Static assets
├── src/
│   ├── components/        # React UI components
│   │   ├── HomePage.js               # Main landing page
│   │   ├── GameInterfaceEnhanced.js  # Game management
│   │   ├── WebMapTripleBuffer.js     # Multi-layer map system
│   │   ├── QuestionCard.js           # Question display
│   │   ├── GameStats.js              # Score/progress
│   │   ├── ResultsEnhanced.js        # End-game results
│   │   └── ErrorBoundary.js          # Error handling
│   ├── hooks/
│   │   └── useGameEnhanced.js        # Game logic engine
│   ├── services/
│   │   ├── dataService.js            # API integration
│   │   ├── analyticsService.js       # User tracking
│   │   ├── apiService.js             # External API calls
│   │   └── usageTracker.js           # MapBox usage control
│   ├── utils/
│   │   └── storage.js                # Local storage utilities
│   ├── styles/
│   │   └── index.css                 # Global styles
│   └── data/
│       └── countries.js              # Country data
├── Documentation/          # Comprehensive project docs
├── CLAUDE.md              # Complete context for Claude AI
├── netlify.toml           # Deployment configuration
└── package.json
```

## 🎮 Game Logic

### Scoring Algorithm
```javascript
const basePoints = 1;
const speedBonus = Math.max(1, Math.floor((30 - timeSpent) / 3));
const streakMultiplier = Math.min(streak, 5);
const finalScore = isCorrect ? (basePoints + speedBonus) * streakMultiplier : 0;
```

### Game State Management
- **Centralized State**: `useGameEnhanced` hook manages all game logic
- **Feedback Phases**: Answering → Feedback Display → Processing → Next Question
- **Real-time Updates**: Live data from REST Countries API
- **Analytics Integration**: Comprehensive event tracking

## 🗺️ Map Technology

### Triple-Buffer World Wrapping
- **5 Map Instances**: Coverage from -720° to +720° longitude
- **Seamless Panning**: No gaps when crossing date line
- **Efficient Updates**: Throttled to 200ms intervals
- **Memory Optimized**: Dynamic layer management

### Click Detection
1. **Point-in-polygon**: Precise country boundary detection
2. **Boundary Check**: Leaflet bounds collision
3. **Distance Fallback**: Haversine formula for closest country
4. **Country Lookup**: dataService integration
5. **Analytics**: Interaction tracking

### Map Providers
- **Primary**: Esri World Imagery (unlimited, free)
- **Fallback**: MapBox Satellite (disabled for cost control)
- **Styling**: Yellow dashed borders (Esri) or transparent (MapBox)

## 🎨 Design System

### Color Palette
```css
--background: linear-gradient(135deg, #6b7a28, #5a6622); /* Olive green */
--headers: #f0ebdc; /* Beige */
--cards: #f0ebdc; /* Beige with black text */
--feedback-correct: #4caf50; /* Green */
--feedback-incorrect: #ef4444; /* Red */
--hover: #3b82f6; /* Blue */
```

### Scaling Doctrine
- **No Vertical Scrolling**: All content fits viewport height
- **Responsive Units**: clamp(), calc(), vh for fluid scaling
- **Mobile-First**: Touch-friendly 44px minimum targets
- **Performance**: Minimal reflows and efficient rendering

## 📊 Analytics & Performance

### Tracked Metrics
- **User Journey**: Page views, game completions, session duration
- **Interactions**: Country clicks, option selections, navigation patterns
- **Performance**: Response times, error rates, loading metrics
- **Learning**: Accuracy rates, improvement tracking, difficulty analysis

### Performance Optimization
- **Bundle Size**: ~119KB gzipped (optimized for fast loading)
- **Caching**: 24-hour API cache with smart invalidation
- **Rendering**: Efficient React patterns and event throttling
- **Maps**: Optimized layer management and memory usage

## 🚀 Deployment

### Netlify Configuration
```yaml
# netlify.toml
[build]
  command = "npm run build"
  publish = "build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### GitHub Integration
1. **Automatic Deploy**: Push to main branch triggers build
2. **Build Process**: `npm run build` creates optimized bundle
3. **Environment**: Production environment variables in Netlify
4. **SSL**: Automatic HTTPS with custom domain

### Production Checklist
- ✅ **Live Deployment**: https://geoquizpro.com
- ✅ **Performance**: Lighthouse score 95+
- ✅ **Mobile Optimized**: Touch-friendly responsive design
- ✅ **Error Monitoring**: Comprehensive error boundaries
- ✅ **Analytics**: User behavior and performance tracking

## 🔧 Development

### Available Scripts
```bash
npm start       # Development server
npm run build   # Production build
npm test        # Test runner
npm run lint    # ESLint code check
npm run format  # Prettier code formatting
```

### Code Quality
- **Architecture**: Service layer pattern with hooks-based logic
- **Error Handling**: Comprehensive boundaries and fallbacks
- **Performance**: Optimized rendering and event handling
- **Maintainability**: Clear separation of concerns

## 🌐 Browser Support

- **Recommended**: Chrome/Chromium (best performance)
- **Full Support**: Firefox, Safari, Edge (modern versions)
- **Mobile**: iOS Safari, Chrome Mobile, Samsung Internet
- **Progressive**: Graceful degradation for older browsers

## 🔮 Recent Innovations

### Multi-Layer Architecture Achievement
Solved critical feedback timing issues with 3-layer rendering:
- **Problem**: Game feedback conflicted with map hover interactions
- **Solution**: Separated visual concerns into independent layers
- **Result**: Smooth, non-blocking feedback with perfect 1-second timing

### Technical Highlights
- **Real-time Data**: Live country information from REST Countries API
- **Advanced Maps**: Multi-layer satellite imagery with smart detection
- **Performance**: Optimized for fast loading and smooth interactions
- **Analytics**: Comprehensive user behavior tracking
- **Mobile-First**: Touch-optimized responsive design

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **Esri**: Primary satellite imagery provider
- **MapBox**: Fallback mapping services
- **REST Countries API**: Live country data
- **Natural Earth**: Geographic boundary data
- **Leaflet**: Open-source mapping library
- **React Team**: Framework and ecosystem

## 🔗 API Credits

- © Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP
- © MapBox © OpenStreetMap contributors  
- REST Countries API for live country data
- Natural Earth for boundary data