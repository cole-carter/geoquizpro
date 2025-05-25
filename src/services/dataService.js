import apiService from './apiService';
import analyticsService from './analyticsService';
// import mapColorService from './mapColorService'; // Removed color functionality

class DataService {
  constructor() {
    this.countries = new Map();
    this.geoJsonData = null;
    this.isLoading = false;
    this.isLoaded = false;
    this.loadPromise = null;
  }

  async initialize() {
    if (this.isLoaded) return this.getData();
    
    if (this.loadPromise) return this.loadPromise;
    
    this.loadPromise = this.loadData();
    return this.loadPromise;
  }

  async loadData() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    const startTime = Date.now();
    
    try {
      analyticsService.track('data_loading_started');
      
      // Load both datasets in parallel
      const [countriesData, geoJsonData] = await Promise.all([
        this.loadCountriesData(),
        this.loadGeoJsonData()
      ]);

      // Match and merge the data
      this.mergeData(countriesData, geoJsonData);
      
      // Color functionality removed - using simple white fill
      
      this.isLoaded = true;
      const loadTime = Date.now() - startTime;
      
      analyticsService.track('data_loading_completed', {
        load_time: loadTime,
        countries_count: this.countries.size,
        geojson_features: this.geoJsonData?.features?.length || 0
      });
      
      console.log(`Data loaded successfully in ${loadTime}ms`);
      return this.getData();
      
    } catch (error) {
      this.isLoading = false;
      
      analyticsService.trackError(error, {
        context: 'data_loading',
        load_time: Date.now() - startTime
      });
      
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async loadCountriesData() {
    const startTime = Date.now();
    try {
      const data = await apiService.fetchCountriesData();
      
      analyticsService.trackApiCall(
        'rest_countries',
        true,
        Date.now() - startTime
      );
      
      return data;
    } catch (error) {
      analyticsService.trackApiCall(
        'rest_countries',
        false,
        Date.now() - startTime,
        error.message
      );
      throw error;
    }
  }

  async loadGeoJsonData() {
    const startTime = Date.now();
    try {
      const data = await apiService.fetchGeoJsonData();
      
      analyticsService.trackApiCall(
        'natural_earth_geojson',
        true,
        Date.now() - startTime
      );
      
      return data;
    } catch (error) {
      analyticsService.trackApiCall(
        'natural_earth_geojson',
        false,
        Date.now() - startTime,
        error.message
      );
      throw error;
    }
  }

  mergeData(countriesData, geoJsonData) {
    // Create a map of countries from REST Countries API
    const countriesMap = new Map();
    
    if (Array.isArray(countriesData)) {
      countriesData.forEach(country => {
        if (country && typeof country === 'object') {
          // Use multiple keys for better matching
          if (country.cca3) countriesMap.set(country.cca3, country);
          if (country.cca2) countriesMap.set(country.cca2, country);
          if (country.name) {
            countriesMap.set(country.name.toLowerCase(), country);
          }
        }
      });
    }

    // Process GeoJSON features and merge with country data
    if (!geoJsonData.features || !Array.isArray(geoJsonData.features)) {
      console.warn('Invalid GeoJSON features data');
      return;
    }
    
    const enhancedFeatures = geoJsonData.features
      .filter(feature => feature && feature.properties && feature.geometry)
      .map((feature, index) => {
        const geoProps = feature.properties;
      
      // Try to find matching country data
      let countryData = null;
      
      // Try ISO3 first (most reliable)
      if (geoProps.iso3) {
        countryData = countriesMap.get(geoProps.iso3);
      }
      
      // Try ISO2 if ISO3 didn't work
      if (!countryData && geoProps.iso2) {
        countryData = countriesMap.get(geoProps.iso2);
      }
      
      // Try name matching as last resort
      if (!countryData && geoProps.name) {
        countryData = countriesMap.get(geoProps.name.toLowerCase());
      }

        // Ensure feature has valid ID
        const featureId = feature.id || geoProps.iso3 || geoProps.iso_a3 || `unknown-${index}`;
        
        // Create enhanced feature
        const enhancedFeature = {
          ...feature,
          id: featureId,
          properties: {
            ...geoProps,
            // Add country data if found
            ...(countryData && {
              population: countryData.population,
              capital: countryData.capital,
              region: countryData.region,
              subregion: countryData.subregion,
              flag: countryData.flag,
              languages: countryData.languages,
              currencies: countryData.currencies,
              area: countryData.area,
              borders: countryData.borders,
              latlng: countryData.latlng,
              cca2: countryData.cca2,
              cca3: countryData.cca3
            }),
            // Color functionality removed
            // Track if we found matching data
            hasData: !!countryData
          }
        };

        // Add to countries map for quick lookup
        if (countryData) {
          this.countries.set(featureId, {
            ...countryData,
            geoFeature: enhancedFeature
            // Color functionality removed
          });
        }

        return enhancedFeature;
      })
      .filter(feature => feature && feature.id); // Remove any invalid features

    // Update GeoJSON with enhanced features
    this.geoJsonData = {
      ...geoJsonData,
      features: enhancedFeatures
    };

    // Log matching statistics
    const totalFeatures = geoJsonData.features.length;
    const matchedFeatures = enhancedFeatures.filter(f => f.properties.hasData).length;
    const matchRate = (matchedFeatures / totalFeatures) * 100;
    
    console.log(`Data merge complete: ${matchedFeatures}/${totalFeatures} features matched (${matchRate.toFixed(1)}%)`);
    
    analyticsService.track('data_merge_completed', {
      total_features: totalFeatures,
      matched_features: matchedFeatures,
      match_rate: matchRate,
      countries_in_map: this.countries.size
    });
  }

  getData() {
    return {
      countries: this.countries,
      geoJsonData: this.geoJsonData,
      isLoaded: this.isLoaded
    };
  }

  getCountryById(id) {
    return this.countries.get(id);
  }

  getAllCountries() {
    return Array.from(this.countries.values());
  }

  getCountriesByRegion(region) {
    return Array.from(this.countries.values()).filter(
      country => country.region === region
    );
  }

  getRandomCountries(count = 10, excludeIds = []) {
    // Whitelist of independent nations under 100K population that should still be included
    const independentNationsWhitelist = [
      'VAT', 'NRU', 'TUV', 'PLW', 'SMR', 'LIE', 'MCO', 
      'KNA', 'MHL', 'DMA', 'AND', 'ATG', 'SYC'
    ];
    
    const available = Array.from(this.countries.values()).filter(
      country => !excludeIds.includes(country.cca3) && 
                 (country.population > 100000 || independentNationsWhitelist.includes(country.cca3))
    );
    
    // Shuffle array
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    
    return available.slice(0, count);
  }

  getPopulationRange(population) {
    if (population < 1000000) return 'Under 1M';
    if (population < 10000000) return '1M - 10M';
    if (population < 50000000) return '10M - 50M';
    if (population < 100000000) return '50M - 100M';
    if (population < 500000000) return '100M - 500M';
    return 'Over 500M';
  }

  findCountryByPoint(longitude, latitude) {
    if (!this.geoJsonData) return null;

    // Simple point-in-polygon check for each country
    for (const feature of this.geoJsonData.features) {
      if (this.isPointInFeature(longitude, latitude, feature)) {
        return this.getCountryById(feature.id);
      }
    }
    
    return null;
  }

  isPointInFeature(longitude, latitude, feature) {
    // Simplified point-in-polygon check
    // For production, you might want to use a more robust library like turf.js
    
    if (feature.geometry.type === 'Polygon') {
      return this.isPointInPolygon(longitude, latitude, feature.geometry.coordinates[0]);
    } else if (feature.geometry.type === 'MultiPolygon') {
      return feature.geometry.coordinates.some(polygon =>
        this.isPointInPolygon(longitude, latitude, polygon[0])
      );
    }
    
    return false;
  }

  isPointInPolygon(longitude, latitude, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > latitude) !== (yj > latitude)) &&
          (longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Get debug information
  getDebugInfo() {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      countriesCount: this.countries.size,
      geoJsonFeatures: this.geoJsonData?.features?.length || 0,
      cacheStatus: apiService.getCacheStatus(),
      analyticsInfo: analyticsService.getAnalyticsSummary()
    };
  }

  // Force reload data (useful for development)
  async forceReload() {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.countries.clear();
    this.geoJsonData = null;
    
    apiService.clearCache();
    // Color functionality removed
    
    return this.initialize();
  }
}

// Export singleton instance
const dataService = new DataService();
export default dataService;