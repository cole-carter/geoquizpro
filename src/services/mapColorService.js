class MapColorService {
  constructor() {
    this.colors = [
      '#fecaca', // Light red
      '#fed7aa', // Light orange  
      '#bfdbfe', // Light blue
      '#bbf7d0'  // Light green
    ];
    
    this.colorAssignments = new Map();
    this.adjacencyCache = new Map();
    this.loadSavedColors();
  }

  // Assign colors to countries using a greedy graph coloring algorithm
  assignColors(geoJsonData) {
    if (!geoJsonData?.features) return this.colorAssignments;

    // Build adjacency graph
    const adjacencyMap = this.buildAdjacencyMap(geoJsonData);
    
    // Sort countries by number of neighbors (descending) for better coloring
    const sortedCountries = geoJsonData.features
      .map(feature => ({
        id: feature.id,
        neighbors: adjacencyMap.get(feature.id) || new Set()
      }))
      .sort((a, b) => b.neighbors.size - a.neighbors.size);

    // Assign colors using greedy algorithm
    for (const country of sortedCountries) {
      if (!this.colorAssignments.has(country.id)) {
        const availableColor = this.findAvailableColor(country.id, country.neighbors);
        this.colorAssignments.set(country.id, availableColor);
      }
    }

    // Save assignments for consistency
    this.saveColors();
    
    return this.colorAssignments;
  }

  buildAdjacencyMap(geoJsonData) {
    const adjacencyMap = new Map();
    
    // Initialize map
    geoJsonData.features.forEach(feature => {
      adjacencyMap.set(feature.id, new Set());
    });

    // Find adjacent countries by checking shared borders
    for (let i = 0; i < geoJsonData.features.length; i++) {
      for (let j = i + 1; j < geoJsonData.features.length; j++) {
        const feature1 = geoJsonData.features[i];
        const feature2 = geoJsonData.features[j];
        
        if (this.areAdjacent(feature1, feature2)) {
          adjacencyMap.get(feature1.id).add(feature2.id);
          adjacencyMap.get(feature2.id).add(feature1.id);
        }
      }
    }

    return adjacencyMap;
  }

  areAdjacent(feature1, feature2) {
    // Use cached result if available
    const cacheKey = `${feature1.id}-${feature2.id}`;
    const reverseCacheKey = `${feature2.id}-${feature1.id}`;
    
    if (this.adjacencyCache.has(cacheKey)) {
      return this.adjacencyCache.get(cacheKey);
    }
    if (this.adjacencyCache.has(reverseCacheKey)) {
      return this.adjacencyCache.get(reverseCacheKey);
    }

    // Simple adjacency check based on bounding boxes and border properties
    const adjacent = this.checkAdjacency(feature1, feature2);
    
    // Cache the result
    this.adjacencyCache.set(cacheKey, adjacent);
    
    return adjacent;
  }

  checkAdjacency(feature1, feature2) {
    // Check if countries share a border based on their properties
    const borders1 = feature1.properties?.borders || [];
    const borders2 = feature2.properties?.borders || [];
    
    // If we have border data, use it
    if (borders1.length > 0 || borders2.length > 0) {
      return borders1.includes(feature2.properties?.iso3) || 
             borders2.includes(feature1.properties?.iso3);
    }

    // Fallback to geometric proximity check
    return this.checkGeometricProximity(feature1, feature2);
  }

  checkGeometricProximity(feature1, feature2) {
    // Get bounding boxes
    const bbox1 = this.getBoundingBox(feature1.geometry);
    const bbox2 = this.getBoundingBox(feature2.geometry);
    
    // Check if bounding boxes are close enough to be adjacent
    const threshold = 0.1; // degrees
    
    const horizontalOverlap = 
      bbox1.minX <= bbox2.maxX + threshold && bbox1.maxX >= bbox2.minX - threshold;
    const verticalOverlap = 
      bbox1.minY <= bbox2.maxY + threshold && bbox1.maxY >= bbox2.minY - threshold;
    
    return horizontalOverlap && verticalOverlap;
  }

  getBoundingBox(geometry) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    const processCoordinates = (coords) => {
      if (Array.isArray(coords[0])) {
        coords.forEach(processCoordinates);
      } else {
        const [x, y] = coords;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    };

    if (geometry.type === 'Polygon') {
      geometry.coordinates.forEach(processCoordinates);
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon => {
        polygon.forEach(processCoordinates);
      });
    }

    return { minX, minY, maxX, maxY };
  }

  findAvailableColor(countryId, neighbors) {
    // Get colors used by neighbors
    const usedColors = new Set();
    neighbors.forEach(neighborId => {
      const neighborColor = this.colorAssignments.get(neighborId);
      if (neighborColor) {
        usedColors.add(neighborColor);
      }
    });

    // Find first available color
    for (const color of this.colors) {
      if (!usedColors.has(color)) {
        return color;
      }
    }

    // If all colors are used by neighbors (rare), use a hash-based approach
    return this.getHashBasedColor(countryId);
  }

  getHashBasedColor(countryId) {
    // Simple hash function to consistently assign colors
    let hash = 0;
    for (let i = 0; i < countryId.length; i++) {
      const char = countryId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return this.colors[Math.abs(hash) % this.colors.length];
  }

  getCountryColor(countryId) {
    return this.colorAssignments.get(countryId) || this.getHashBasedColor(countryId);
  }

  saveColors() {
    try {
      const colorData = Object.fromEntries(this.colorAssignments);
      localStorage.setItem('geoquiz_country_colors', JSON.stringify(colorData));
    } catch (error) {
      console.warn('Failed to save color assignments:', error);
    }
  }

  loadSavedColors() {
    try {
      const saved = localStorage.getItem('geoquiz_country_colors');
      if (saved) {
        const colorData = JSON.parse(saved);
        this.colorAssignments = new Map(Object.entries(colorData));
      }
    } catch (error) {
      console.warn('Failed to load saved colors:', error);
    }
  }

  clearColors() {
    this.colorAssignments.clear();
    this.adjacencyCache.clear();
    localStorage.removeItem('geoquiz_country_colors');
  }

  // Get color statistics for debugging
  getColorStats() {
    const colorCounts = {};
    this.colors.forEach(color => {
      colorCounts[color] = 0;
    });

    this.colorAssignments.forEach(color => {
      if (colorCounts.hasOwnProperty(color)) {
        colorCounts[color]++;
      }
    });

    return {
      totalCountries: this.colorAssignments.size,
      colorDistribution: colorCounts,
      colors: this.colors
    };
  }

  // Method to force regenerate colors (useful for testing)
  regenerateColors(geoJsonData) {
    this.clearColors();
    return this.assignColors(geoJsonData);
  }
}

// Export singleton instance
const mapColorService = new MapColorService();
export default mapColorService;