import { v4 as uuidv4 } from 'uuid';

class ApiService {
  constructor() {
    this.sessionId = uuidv4();
    this.baseUrls = {
      countries: 'https://restcountries.com/v3.1/all',
      geoJson: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
    };
    this.cache = new Map();
    this.cacheKeys = {
      countries: 'countries_data',
      geoJson: 'geojson_data',
      timestamp: 'cache_timestamp'
    };
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  async fetchWithCache(url, cacheKey) {
    try {
      // Check if we have cached data
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Using cached data for ${cacheKey}`);
        return cachedData;
      }

      console.log(`Fetching fresh data from ${url}`);
      
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate data structure
      if (!data) {
        throw new Error('Received empty response');
      }
      
      // Cache the data
      this.saveToCache(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error);
      
      // Try to return cached data even if expired
      const fallbackData = this.getFromCache(cacheKey, false);
      if (fallbackData) {
        console.warn(`Using expired cached data for ${cacheKey}`);
        return fallbackData;
      }
      
      throw new Error(`Failed to fetch ${cacheKey}: ${error.message}`);
    }
  }

  async fetchCountriesData() {
    try {
      const data = await this.fetchWithCache(this.baseUrls.countries, this.cacheKeys.countries);
      return this.normalizeCountriesData(data);
    } catch (error) {
      console.error('Failed to fetch countries data:', error);
      throw new Error('Unable to load country data. Please check your internet connection.');
    }
  }

  async fetchGeoJsonData() {
    try {
      const data = await this.fetchWithCache(this.baseUrls.geoJson, this.cacheKeys.geoJson);
      return this.normalizeGeoJsonData(data);
    } catch (error) {
      console.error('Failed to fetch GeoJSON data:', error);
      throw new Error('Unable to load map data. Please check your internet connection.');
    }
  }

  normalizeCountriesData(data) {
    if (!Array.isArray(data)) {
      throw new Error('Invalid countries data format');
    }

    return data.map(country => {
      // Handle various country data structures
      const name = country.name?.common || country.name || 'Unknown';
      const officialName = country.name?.official || name;
      const cca2 = country.cca2 || country.alpha2Code || '';
      const cca3 = country.cca3 || country.alpha3Code || '';
      
      return {
        id: cca3,
        name: name,
        officialName: officialName,
        cca2: cca2,
        cca3: cca3,
        population: country.population || 0,
        capital: Array.isArray(country.capital) ? country.capital[0] : (country.capital || 'Unknown'),
        region: country.region || 'Unknown',
        subregion: country.subregion || '',
        flag: {
          svg: country.flags?.svg || '',
          png: country.flags?.png || '',
          emoji: this.getCountryEmoji(cca2)
        },
        languages: country.languages || {},
        currencies: country.currencies || {},
        area: country.area || 0,
        borders: country.borders || [],
        latlng: country.latlng || [0, 0]
      };
    }).filter(country => country.cca3 && country.name); // Filter out invalid entries
  }

  normalizeGeoJsonData(data) {
    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('Invalid GeoJSON data format');
    }

    return {
      type: 'FeatureCollection',
      features: data.features.map(feature => {
        const props = feature.properties || {};
        
        return {
          type: 'Feature',
          id: props.ISO_A3 || props.ADM0_A3 || props.id,
          properties: {
            name: props.NAME || props.NAME_EN || props.name || 'Unknown',
            nameLong: props.NAME_LONG || props.NAME || props.name || 'Unknown',
            iso2: props.ISO_A2 || props.iso_a2 || '',
            iso3: props.ISO_A3 || props.iso_a3 || '',
            continent: props.CONTINENT || props.continent || 'Unknown',
            region: props.REGION_UN || props.region || 'Unknown',
            subregion: props.SUBREGION || props.subregion || '',
            population: props.POP_EST || props.population || 0,
            area: props.area || 0
          },
          geometry: feature.geometry
        };
      }).filter(feature => feature.id && feature.geometry) // Filter out invalid features
    };
  }

  getCountryEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🏳️';
    
    // Convert ISO 2 country code to emoji flag
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    
    return String.fromCodePoint(...codePoints);
  }

  saveToCache(key, data) {
    try {
      const cacheEntry = {
        data: data,
        timestamp: Date.now()
      };
      
      localStorage.setItem(key, JSON.stringify(cacheEntry));
      console.log(`Cached data for ${key}`);
    } catch (error) {
      console.warn(`Failed to cache data for ${key}:`, error);
    }
  }

  getFromCache(key, checkExpiry = true) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const cacheEntry = JSON.parse(cached);
      
      if (checkExpiry) {
        const isExpired = Date.now() - cacheEntry.timestamp > this.cacheExpiry;
        if (isExpired) {
          console.log(`Cache expired for ${key}`);
          return null;
        }
      }
      
      return cacheEntry.data;
    } catch (error) {
      console.warn(`Failed to read cache for ${key}:`, error);
      return null;
    }
  }

  clearCache() {
    try {
      Object.values(this.cacheKeys).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('Cache cleared successfully');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  // Get cache status for debugging
  getCacheStatus() {
    const status = {};
    Object.entries(this.cacheKeys).forEach(([name, key]) => {
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const entry = JSON.parse(cached);
          const age = Date.now() - entry.timestamp;
          const isExpired = age > this.cacheExpiry;
          status[name] = {
            exists: true,
            age: Math.round(age / 1000 / 60), // minutes
            expired: isExpired,
            size: new Blob([cached]).size
          };
        } catch (error) {
          status[name] = { exists: true, error: 'Parse error' };
        }
      } else {
        status[name] = { exists: false };
      }
    });
    return status;
  }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;