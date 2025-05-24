# GeoQuiz

An interactive geography quiz Progressive Web App built with React. Test your knowledge of countries, capitals, flags, and populations through engaging satellite map-based quizzes with natural terrain visualization.

## Features

- **4 Game Modes:**
  - 🗺️ **Find the Country** - Click anywhere on satellite terrain maps to select countries
  - 🏛️ **Capital Quiz** - Test your knowledge of world capitals with centered card interface
  - 🏳️ **Flag Quiz** - Identify countries by their flags on satellite maps
  - 👥 **Population Quiz** - Guess population ranges with centered card interface

- **Advanced Map Technology:**
  - MapBox satellite imagery with country borders (Google Maps-style)
  - Triple-buffer system for seamless world wrapping without gaps
  - Click-anywhere detection with point-in-polygon algorithms
  - Invisible country boundaries for natural interaction
  - Automatic fallback to Esri World Imagery for reliability

- **Enhanced User Experience:**
  - Olive green background with beige headers for sophisticated design
  - Viewport-based scaling with no vertical scrolling (scaling doctrine)
  - 30-second timer per question for fast-paced gameplay
  - Score system based on speed and accuracy with streak tracking
  - Conditional centering for non-map game types

- **Data Integration:**
  - REST Countries API for live country data and flag images
  - Natural Earth GeoJSON for accurate country boundaries
  - Analytics service for user interaction tracking
  - Local storage for comprehensive game statistics

- **Performance & Design:**
  - Mobile-first responsive layout with viewport-based scaling
  - No vertical scrolling on any screen size
  - Touch-friendly interface optimized for all devices
  - Progressive loading with error handling and fallbacks

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MapBox API token (optional - falls back to demo token)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd geoquiz
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Set up MapBox token:
```bash
# Create .env file in root directory
echo "REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here" > .env
```

4. Start the development server:
```bash
npm start
```

5. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Project Structure

```
geoquiz/
├── public/                 # Static files
│   ├── index.html         # Main HTML template
│   └── manifest.json      # PWA manifest
├── src/
│   ├── components/        # React components
│   │   ├── HomePage.js    # Main landing page
│   │   ├── GameInterfaceEnhanced.js # Enhanced game management
│   │   ├── WebMapTripleBuffer.js # Advanced satellite map with triple buffering
│   │   ├── WebMapRobust.js # Robust Leaflet map implementation
│   │   ├── QuestionCard.js # Responsive question display
│   │   ├── GameStats.js   # Score/progress display
│   │   ├── ResultsEnhanced.js # Comprehensive end game results
│   │   └── ErrorBoundary.js # Error handling
│   ├── hooks/
│   │   └── useGameEnhanced.js # Advanced game logic with analytics
│   ├── services/
│   │   ├── dataService.js # API integration and data management
│   │   └── analyticsService.js # User interaction tracking
│   ├── utils/
│   │   └── storage.js     # Local storage utilities
│   ├── styles/           # CSS files with scaling doctrine
│   │   └── index.css     # Global styles with olive/beige theme
│   ├── App.js           # Main app component
│   └── index.js         # Entry point
├── SCALING_DOCTRINE.md  # Comprehensive scaling principles
├── package.json
└── README.md
```

## Game Modes

### Find the Country
Click anywhere on the satellite terrain map to select countries. Uses advanced point-in-polygon detection or finds the closest country if clicking in water/empty space. Points awarded based on speed and accuracy.

### Capital Quiz
Multiple choice questions about world capitals displayed in centered card format. No map interaction - focused on knowledge testing.

### Flag Quiz
Identify countries by their flag images displayed on satellite maps. Click anywhere on the terrain to make your selection.

### Population Quiz
Guess the population range of different countries from multiple choice options in centered card interface.

## Map Technology

### Triple-Buffer System
- Maintains three map instances (left, center, right) for seamless world wrapping
- Eliminates white gaps during panning across the International Date Line
- Smooth longitude transitions with throttled updates
- Continuous click zone coverage across all longitudes

### Smart Click Detection
- Point-in-polygon algorithms for precise country detection
- Fallback to closest country calculation for ocean/empty clicks
- Haversine distance formula for accurate geographic calculations
- Works with invisible country boundaries for natural interaction

### Satellite Imagery
- Primary: MapBox satellite-streets-v12 style (Google Maps quality)
- Fallback: Esri World Imagery for reliability
- Country borders visible without distracting city labels
- High-resolution satellite imagery with terrain features

## Scaling Doctrine

The application follows a strict "no vertical scrolling" principle:
- All content must fit within viewport height boundaries
- Viewport-based scaling using clamp(), calc(), and vh units
- Header/footer space calculations for accurate sizing
- Conditional layout adjustments based on game type
- Comprehensive documentation in SCALING_DOCTRINE.md

## Design System

### Color Scheme
- **Background**: Olive green gradient (#6b7a28 to #5a6622)
- **Headers/Footers**: Beige (#f0ebdc)
- **Cards**: Darker beige (#f0ebdc) with black text
- **Accents**: Olive green variations for consistency

### Typography & Spacing
- Responsive typography with clamp() functions
- Viewport-based spacing and padding
- Mobile-first responsive design
- Touch-friendly interactive elements

## API Integration

### External Services
- **REST Countries API**: Live country data, capitals, populations, flags
- **Natural Earth**: High-resolution country boundary GeoJSON
- **MapBox**: Satellite imagery and map tiles
- **Esri**: Fallback satellite imagery service

### Data Management
- Automatic data fetching and caching
- Error handling with graceful fallbacks
- Data validation and cleaning
- Coordinate system transformations

## Analytics & Tracking

### User Interactions
- Page view tracking
- Game start/completion events
- Country selection analytics
- Performance metrics (accuracy, speed, streaks)
- Error tracking and debugging

### Game Statistics
- Local storage for persistent data
- Score history and best performances
- Streak tracking and achievements
- Session-based analytics

## Browser Support

- Chrome/Chromium (recommended for best performance)
- Firefox (full support)
- Safari (iOS and macOS)
- Edge (modern versions)
- Mobile browsers optimized for touch interaction

## Performance Optimizations

- Lazy loading of map components
- Efficient React rendering with proper key management
- Throttled map update events (100ms intervals)
- Compressed satellite imagery with progressive loading
- Local caching of country data and GeoJSON

## Environment Variables

```bash
# Optional MapBox token for production
REACT_APP_MAPBOX_TOKEN=your_mapbox_token

# Environment detection
REACT_APP_ENV=production
```

## Deployment

### Recommended: Netlify
1. Connect GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variables in Netlify dashboard
5. Configure custom domain and SSL

### Alternative Hosting
- Vercel (similar to Netlify)
- AWS S3 + CloudFront
- Google Cloud Storage
- GitHub Pages (limited features)

## Contributing

1. Fork the repository
2. Create a feature branch following naming conventions
3. Follow the scaling doctrine for any UI changes
4. Test across multiple device sizes and browsers
5. Update relevant documentation
6. Submit a pull request with detailed description

## License

MIT License - see LICENSE file for details

## Acknowledgments

- **MapBox**: Satellite imagery and mapping services
- **Esri**: Fallback imagery and GIS services
- **REST Countries API**: Comprehensive country data
- **Natural Earth**: Public domain geographic data
- **Leaflet**: Open-source mapping library
- Country flag emojis from Unicode standard
- Inspired by modern geography education tools

## API Credits

Map tiles and data provided by:
- © MapBox © OpenStreetMap contributors
- © Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP
- REST Countries API for live country data
- Natural Earth for boundary data