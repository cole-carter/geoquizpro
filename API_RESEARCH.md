# GeoQuiz API Research & Integration Plan

## 🌍 Geographic Data APIs

### 1. **Natural Earth GeoJSON** (Primary Choice)
- **URL**: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson`
- **Format**: GeoJSON FeatureCollection
- **Identification**: ISO_A2, ISO_A3, NAME, NAME_LONG
- **Features**: 
  - Precise country boundaries for click detection
  - Multiple resolutions (110m, 50m, 10m)
  - Comprehensive metadata
  - Public domain license

**Sample Structure**:
```json
{
  "type": "Feature",
  "properties": {
    "ISO_A2": "US",
    "ISO_A3": "USA", 
    "NAME": "United States of America",
    "POP_EST": 328239523,
    "CONTINENT": "North America"
  },
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": [...]
  }
}
```

### 2. **REST Countries API** (Country Data)
- **URL**: `https://restcountries.com/v3.1/all`
- **Format**: JSON Array
- **Rate Limit**: No API key required, reasonable limits
- **Features**:
  - Comprehensive country data
  - Multiple identification codes
  - Population, capitals, flags
  - Real-time data

**Sample Structure**:
```json
{
  "name": {
    "common": "United States",
    "official": "United States of America"
  },
  "cca2": "US",
  "cca3": "USA",
  "population": 331900000,
  "capital": ["Washington, D.C."],
  "flags": {
    "png": "https://flagcdn.com/w320/us.png",
    "svg": "https://flagcdn.com/us.svg"
  },
  "region": "Americas",
  "subregion": "North America"
}
```

## 🎨 Map Styling Strategy

### Color Palette for 4-Color Map
- **Light Red**: `#fecaca` (Red 200)
- **Light Orange**: `#fed7aa` (Orange 200) 
- **Light Blue**: `#bfdbfe` (Blue 200)
- **Light Green**: `#bbf7d0` (Green 200)

### Implementation
- Use graph coloring algorithm to ensure adjacent countries have different colors
- Store color assignments in local storage for consistency
- Rotate colors based on country hash for distribution

## 📊 Analytics & Logging

### Moesif Free Tier
- **URL**: `https://www.moesif.com/`
- **Features**: 
  - 100K events/month free
  - Real-time analytics
  - User behavior tracking
  - Custom event logging

### Events to Track
```javascript
// Game Events
{
  event: 'game_started',
  game_type: 'location|capital|flag|population',
  timestamp: Date.now(),
  session_id: uuid(),
  user_agent: navigator.userAgent
}

{
  event: 'question_answered', 
  game_type: 'location',
  country: 'USA',
  correct: true,
  time_spent: 12.5,
  score_earned: 5
}

{
  event: 'game_completed',
  final_score: 45,
  questions_correct: 8,
  total_questions: 10,
  game_duration: 180
}
```

## 🔄 Data Integration Strategy

### 1. Data Fetching
- Fetch GeoJSON on app load (cache in IndexedDB)
- Fetch REST Countries data on app load (cache in IndexedDB)
- Update data daily with cache invalidation
- Graceful fallback to local data if APIs fail

### 2. Data Matching
- Primary key: ISO_A3 codes (most reliable)
- Fallback: ISO_A2 codes
- Name matching as last resort
- Handle edge cases (disputed territories, dependencies)

### 3. Performance Optimization
- Load GeoJSON progressively (simplified → detailed)
- Use Web Workers for data processing
- Implement efficient country lookup (spatial indexing)
- Compress cached data

## 🛠 Implementation Plan

### Phase 1: Data Layer (Week 1)
1. Create API service modules
2. Implement data fetching with caching
3. Build data matching/normalization
4. Add error handling and fallbacks

### Phase 2: Map Enhancement (Week 1)
1. Replace SVG map with GeoJSON rendering
2. Implement 4-color algorithm
3. Add precise click detection
4. Optimize for mobile performance

### Phase 3: Analytics Integration (Week 1)
1. Set up Moesif account
2. Implement event tracking
3. Add user session management
4. Create analytics dashboard

### Phase 4: Testing & Optimization (Week 1)
1. Cross-browser testing
2. Performance optimization
3. Error handling improvements
4. User acceptance testing

## 📦 New Dependencies

```json
{
  "dependencies": {
    "uuid": "^9.0.0",
    "moesif-browser-js": "^1.8.5"
  }
}
```

## 🎯 Success Metrics

- **Data Accuracy**: 99%+ correct country matching
- **Performance**: <2s initial load, <500ms interactions
- **Analytics**: 100% event capture rate
- **User Experience**: Smooth interactions on mobile/desktop
- **Reliability**: <1% API failure rate with graceful fallbacks

This comprehensive plan will transform GeoQuiz into a production-ready application with real geographic data, professional analytics, and enhanced user experience.