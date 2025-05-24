# GeoQuiz Scaling Doctrine

## Core Principles

### 1. Viewport-Based Scaling Priority
- **ALWAYS** use `clamp()` functions for responsive sizing instead of fixed pixel values
- **NEVER** implement vertical scrolling solutions as first priority - scale content to fit viewport height instead
- **PRESERVE** horizontal map scrolling/panning functionality 
- **ACCOUNT FOR HEADERS/FOOTERS** in viewport calculations using `calc(100vh - [header+footer]px)`
- Use `min()` and `max()` functions for intelligent maximum/minimum constraints
- Use `vh` units for height-based scaling to eliminate vertical overflow

### 2. Conditional Layout System
- **MAP GAMES** (location, flag): Side-by-side layout with map interaction
- **NON-MAP GAMES** (capital, population): Centered card layout without map
- **RESPONSIVE CENTERING**: Use `.centered-layout` class for capital/population quizzes
- **FLEXBOX PRIORITY**: Use flexbox for adaptive layouts over fixed positioning

### 3. Triple-Buffer Map Scaling
- **SEAMLESS WORLD WRAPPING**: Maintain three map instances for continuous interaction
- **THROTTLED UPDATES**: 100ms throttling for smooth panning performance
- **CLICK-ANYWHERE DETECTION**: Point-in-polygon algorithms work at all zoom levels
- **SATELLITE IMAGERY**: Scale MapBox tiles with responsive tile sizes (512px with zoomOffset: -1)

## Advanced Scaling Techniques

### 4. Fluid Typography
```css
/* ✅ GOOD - Scalable text with olive theme */
font-size: clamp(1.5rem, 4vw, 2.5rem);
color: #000; /* Black text on beige cards */

/* ❌ BAD - Fixed font size */
font-size: 28px;
```

### 5. Adaptive Spacing with Olive/Beige Theme
```css
/* ✅ GOOD - Viewport-proportional spacing */
padding: clamp(12px, 1.5vh, 20px);
margin: clamp(8px, 1vh, 16px);
background: #f0ebdc; /* Beige cards */

/* ❌ BAD - Fixed spacing */
padding: 32px;
margin: 24px;
```

### 6. Intelligent Container Sizing
```css
/* ✅ GOOD - Full viewport utilization */
height: calc(100vh - 120px); /* Account for header + footer */
max-width: min(95vw, 1200px);
overflow: hidden; /* No vertical scrolling */

/* ❌ BAD - Fixed containers */
height: 600px;
max-width: 800px;
```

## Implementation Standards

### Container Architecture
- **GAME INTERFACE**: `height: 100vh; overflow: hidden` for main container
- **RESULTS CARDS**: `height: calc(100vh - 120px)` with flexbox column layout
- **QUESTION CARDS**: Responsive padding using `clamp(12px, 1.5vh, 20px)`
- **MAP SECTIONS**: Fixed height calculations for consistent scaling
- **HEADERS/FOOTERS**: Fixed `60px` height for reliable calculations

### Color System Integration
```css
/* Olive Green Background Gradient */
background: linear-gradient(135deg, #6b7a28 0%, #5a6622 100%);

/* Beige Headers and Cards */
background: #f0ebdc;
color: #000;

/* Country Selection Feedback */
fill: #ef4444; /* Red highlight for selected countries */
opacity: 0.6; /* Semi-transparent for natural appearance */
```

### Map Technology Scaling
- **TRIPLE BUFFER**: Three GeoJSON layers with longitude offsets (-360, 0, +360)
- **INVISIBLE BORDERS**: `fillOpacity: 0` for natural terrain interaction
- **RESPONSIVE TILES**: `tileSize: 512, zoomOffset: -1` for high-DPI displays
- **CLICK DETECTION**: Ray-casting algorithms scale to all zoom levels
- **FALLBACK SYSTEM**: Automatic Esri fallback maintains scaling consistency

### Interactive Elements
- **BUTTON SCALING**: `padding: clamp(6px, 1vh, 10px) clamp(12px, 2vh, 20px)`
- **TOUCH TARGETS**: Minimum `44px` tap targets on mobile
- **COUNTRY HIGHLIGHTING**: Semi-transparent red overlay preserves satellite visibility
- **PERFORMANCE BADGES**: `font-size: clamp(14px, 2vh, 16px)` with olive gradients

## Anti-Patterns

### ❌ Never Do:
1. **Fixed pixel widths** for main content areas
2. **Vertical scrolling for primary content** (all game content must fit in viewport)
3. **Fixed font sizes** for user-facing text
4. **Break map panning/scrolling** functionality
5. **Use `100vh` without header/footer calculations**
6. **Ignore triple-buffer boundaries** during map updates
7. **Overlay city labels** on satellite imagery
8. **Use bright colors** that conflict with olive/beige theme

### ✅ Always Do:
1. **Test across all game types** (location, capital, flag, population)
2. **Verify centered layouts** for capital/population quizzes
3. **Ensure map functionality** remains intact for location/flag games
4. **Calculate available space**: `calc(100vh - 60px - 60px)` for content
5. **Use olive/beige color scheme** consistently
6. **Implement click-anywhere detection** for natural map interaction
7. **Maintain satellite imagery quality** at all zoom levels
8. **Test triple-buffer transitions** across International Date Line

## Testing Requirements

### Pre-Deployment Checklist:
- [ ] **All game types scale properly** (location, capital, flag, population)
- [ ] **NO VERTICAL SCROLLING** on any game mode or results screen
- [ ] **Map panning works** smoothly across world boundaries
- [ ] **Centered layouts** work for capital/population quizzes
- [ ] **Triple-buffer system** eliminates white gaps during panning
- [ ] **Click-anywhere detection** works in all map areas
- [ ] **Satellite imagery loads** with proper fallback to Esri
- [ ] **Color scheme consistency** (olive background, beige cards)
- [ ] **Mobile touch interaction** works naturally
- [ ] **Performance remains smooth** during rapid map movement

### Device Testing Matrix:
- **Mobile**: 320px-768px width, portrait and landscape
- **Tablet**: 768px-1024px width, both orientations  
- **Desktop**: 1024px-1920px width, standard aspect ratios
- **Ultrawide**: 2560px+ width, verify horizontal scaling
- **Vertical screens**: Test height constraints on tall mobile devices

## Component Architecture

### Enhanced Components Following Doctrine:
- **`WebMapTripleBuffer.js`**: Advanced satellite map with seamless world wrapping
- **`GameInterfaceEnhanced.js`**: Conditional layout system for different game types
- **`ResultsEnhanced.js`**: Compact results without vertical scrolling
- **`useGameEnhanced.js`**: Analytics-aware game logic
- **`dataService.js`**: REST Countries API integration with caching
- **`analyticsService.js`**: User interaction tracking

### CSS Files with Scaling Implementation:
- **`/src/styles/index.css`**: Global olive/beige theme and base scaling
- **`/src/components/HomePage.css`**: Game selection cards with viewport scaling
- **`/src/components/Results.css`**: Compact results layout with flexbox
- **`/src/components/QuestionCard.css`**: Responsive question interface
- **`/src/components/GameInterface.css`**: Header/footer space calculations
- **`/src/components/WebMap.css`**: Map container responsive design

## Advanced Features Integration

### MapBox API Integration:
- **Environment Variable**: `REACT_APP_MAPBOX_TOKEN` for production
- **Fallback Strategy**: Automatic Esri World Imagery fallback
- **Tile Optimization**: `satellite-streets-v12` style for borders without excessive labels
- **Attribution**: Proper credit display for all map data sources

### Analytics Integration:
- **Page View Tracking**: All major user interactions logged
- **Performance Metrics**: Game completion rates and accuracy tracking
- **Error Handling**: Map loading failures and API timeouts
- **User Journey**: Complete quiz flow analytics

### API Data Sources:
- **REST Countries API**: Live country data, flags, capitals, populations
- **Natural Earth GeoJSON**: High-resolution country boundary data
- **MapBox Tiles**: Primary satellite imagery and country borders
- **Esri World Imagery**: Reliable fallback satellite service

## Maintenance Guidelines

### When Adding New Features:
1. **Follow conditional layout patterns** for different game types
2. **Test triple-buffer functionality** if modifying map components
3. **Maintain olive/beige color consistency** in all new UI elements
4. **Implement click-anywhere detection** for any new map interactions
5. **Use viewport-based scaling** for all new responsive elements
6. **Document any new clamp() calculations** with rationale comments
7. **Test across all supported browsers** and device sizes
8. **Verify no vertical scrolling** is introduced

### Performance Monitoring:
- **Map Tile Loading**: Monitor MapBox API usage and fallback frequency
- **Click Detection**: Ensure point-in-polygon algorithms remain efficient
- **Triple Buffer Updates**: Watch for excessive layer creation/destruction
- **Memory Usage**: Monitor GeoJSON layer memory consumption
- **Network Requests**: Optimize REST Countries API calls

## Version History

- **v2.0.0**: Triple-buffer satellite maps with click-anywhere detection
- **v1.5.0**: Conditional centering for capital/population quizzes
- **v1.4.0**: Olive/beige theme implementation
- **v1.3.0**: Viewport-based scaling elimination of vertical scrolling
- **v1.2.0**: REST Countries API integration
- **v1.1.0**: Initial scaling doctrine implementation
- **v1.0.0**: Basic responsive design

Last Updated: Current Session  
Compliance Level: **Critical Priority** - Zero Tolerance for Vertical Scrolling  
Architecture Status: **Production Ready** with Advanced Map Technology