const express = require('express');
const router = express.Router();
const { geocode, searchLocations, reverseGeocode } = require('../utils/geocode');
const { getDetailedForecast } = require('../utils/forecast');

// Helper to validate coordinates
function isValidCoord(lat, lon) {
  const nLat = Number(lat);
  const nLon = Number(lon);
  return !isNaN(nLat) && !isNaN(nLon) && nLat >= -90 && nLat <= 90 && nLon >= -180 && nLon <= 180;
}

// 1. Primary weather route (supports legacy 2020 client and modern queries)
router.get('/', async (req, res) => {
  const search = req.query.search;

  if (!search || typeof search !== 'string' || search.trim().length === 0) {
    return res.status(400).send({ ErrorMessage: 'Provide a Location' });
  }

  // Sanitize input
  const cleanSearch = search.trim().slice(0, 100);

  try {
    const geoData = await geocode(cleanSearch);
    const forecastData = await getDetailedForecast(
      geoData.latitude,
      geoData.longitude,
      geoData.timezone,
      geoData.name,
      geoData.country
    );

    // Set cache control for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');

    // Return combined object preserving 100% legacy 2020 keys while offering full 2026 data
    return res.send({
      Temperature: forecastData.current.temperature,
      Country: geoData.country || geoData.country_name || '',
      Place: geoData.name,
      // Full rich data payload for 2026 UI
      data: forecastData
    });
  } catch (error) {
    return res.status(400).send({
      ErrorMessage: error.message || 'Error occurred while retrieving weather information'
    });
  }
});

// 2. Autocomplete location search endpoint
router.get('/search', async (req, res) => {
  const query = req.query.q;

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.send({ results: [] });
  }

  try {
    const results = await searchLocations(query);
    res.setHeader('Cache-Control', 'public, max-age=600');
    return res.send({ results });
  } catch (error) {
    console.error('Search endpoint error:', error.message);
    return res.status(500).send({ error: 'Search failed', results: [] });
  }
});

// 3. Detailed forecast by exact coordinates
router.get('/detailed', async (req, res) => {
  const { lat, lon, city, country, tz } = req.query;

  if (!isValidCoord(lat, lon)) {
    return res.status(400).send({ error: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required.' });
  }

  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const placeName = (typeof city === 'string' && city.slice(0, 80)) || '';
    const countryName = (typeof country === 'string' && country.slice(0, 80)) || '';

    const forecastData = await getDetailedForecast(
      latitude,
      longitude,
      tz || 'auto',
      placeName,
      countryName
    );

    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send({
      success: true,
      data: forecastData
    });
  } catch (error) {
    return res.status(500).send({
      error: error.message || 'Unable to fetch detailed weather forecast.'
    });
  }
});

// 4. Reverse geocode + forecast by GPS coordinates
router.get('/reverse', async (req, res) => {
  const { lat, lon } = req.query;

  if (!isValidCoord(lat, lon)) {
    return res.status(400).send({ error: 'Valid latitude and longitude are required.' });
  }

  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    // Reverse geocode first
    const geo = await reverseGeocode(latitude, longitude);

    const forecastData = await getDetailedForecast(
      latitude,
      longitude,
      'auto',
      geo.name,
      geo.country || geo.country_name
    );

    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send({
      success: true,
      location: geo,
      data: forecastData,
      Temperature: forecastData.current.temperature,
      Country: geo.country || '',
      Place: geo.name
    });
  } catch (error) {
    return res.status(500).send({
      error: error.message || 'Unable to determine location from coordinates.'
    });
  }
});

module.exports = router;