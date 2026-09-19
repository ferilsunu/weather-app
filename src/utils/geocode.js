const axios = require('axios');

const axiosInstance = axios.create({
  timeout: 5000,
  headers: {
    'User-Agent': 'WeatherApp-Modern/2.0 (contact@ferilsunu.com)'
  }
});

/**
 * Searches for location matches using Open-Meteo Geocoding API
 * with optional Mapbox fallback if configured.
 * @param {string} address - The query string (e.g. "Tokyo", "London, UK")
 * @param {Function} [callback] - Optional legacy callback(err, data)
 * @returns {Promise<object>}
 */
const geocode = async (address, callback) => {
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    const errorMsg = 'Please provide a valid location string';
    if (callback) return callback(errorMsg, undefined);
    throw new Error(errorMsg);
  }

  const cleanQuery = address.trim().slice(0, 100);

  // If Mapbox token is explicitly configured and valid, use Mapbox if requested
  if (process.env.mapbox_token && process.env.mapbox_token.startsWith('pk.')) {
    try {
      const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cleanQuery)}.json?access_token=${encodeURIComponent(process.env.mapbox_token)}`;
      const response = await axiosInstance.get(mapboxUrl);
      
      if (response.data && response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        const [longitude, latitude] = feature.center;
        const placeName = feature.text || feature.place_name.split(',')[0];
        const countryContext = (feature.context || []).find(c => c.id.startsWith('country.'));
        const country = countryContext ? countryContext.short_code?.toUpperCase() || countryContext.text : '';

        const result = {
          latitude,
          longitude,
          name: placeName,
          country: country || 'Global',
          full_name: feature.place_name,
          timezone: 'auto'
        };

        if (callback) return callback(undefined, result);
        return result;
      }
    } catch (mapboxErr) {
      console.warn('Mapbox geocoding failed, falling back to Open-Meteo:', mapboxErr.message);
    }
  }

  // Primary resilient global geocoder: Open-Meteo Geocoding API
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=10&language=en&format=json`;
    const response = await axiosInstance.get(geoUrl);

    if (!response.data || !response.data.results || response.data.results.length === 0) {
      const errorMsg = 'Wrong search query. Please try again with a valid city or place name.';
      if (callback) return callback(errorMsg, undefined);
      throw new Error(errorMsg);
    }

    const first = response.data.results[0];
    const result = {
      latitude: first.latitude,
      longitude: first.longitude,
      name: first.name,
      admin1: first.admin1 || '',
      country: first.country_code ? first.country_code.toUpperCase() : (first.country || ''),
      country_name: first.country || '',
      timezone: first.timezone || 'auto',
      elevation: first.elevation || 0,
      population: first.population || 0
    };

    if (callback) return callback(undefined, result);
    return result;
  } catch (err) {
    const errorMsg = err.response ? `Geocoding error: ${err.response.statusText}` : 'Unable to connect to geocoding services. Check your network.';
    if (callback) return callback(errorMsg, undefined);
    throw new Error(errorMsg);
  }
};

/**
 * Autocomplete location search returning up to 8 matched locations
 * @param {string} query
 * @returns {Promise<Array>}
 */
const searchLocations = async (query) => {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return [];
  }

  const cleanQuery = query.trim().slice(0, 100);

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=8&language=en&format=json`;
    const response = await axiosInstance.get(geoUrl);

    if (!response.data || !response.data.results) {
      return [];
    }

    return response.data.results.map(item => ({
      id: item.id,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      country: item.country || '',
      country_code: item.country_code ? item.country_code.toUpperCase() : '',
      admin1: item.admin1 || '',
      timezone: item.timezone || 'auto',
      elevation: item.elevation || 0
    }));
  } catch (err) {
    console.error('Error during searchLocations:', err.message);
    return [];
  }
};

/**
 * Reverse geocode latitude and longitude to a readable location name
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<object>}
 */
const reverseGeocode = async (latitude, longitude) => {
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
    const response = await axiosInstance.get(nominatimUrl, {
      headers: {
        'User-Agent': 'WeatherApp-Modern/2.0 (contact@ferilsunu.com)'
      }
    });

    if (response.data && response.data.address) {
      const addr = response.data.address;
      const name = addr.city || addr.town || addr.village || addr.municipality || addr.county || 'Local Area';
      const country = (addr.country_code || '').toUpperCase();
      const country_name = addr.country || '';
      const admin1 = addr.state || addr.region || '';

      return {
        latitude,
        longitude,
        name,
        admin1,
        country,
        country_name,
        full_name: response.data.display_name
      };
    }
  } catch (err) {
    console.warn('Reverse geocode failed, using coordinates fallback:', err.message);
  }

  return {
    latitude,
    longitude,
    name: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
    admin1: '',
    country: '',
    country_name: '',
    full_name: `Coordinates: ${latitude}, ${longitude}`
  };
};

module.exports = {
  geocode,
  searchLocations,
  reverseGeocode
};
