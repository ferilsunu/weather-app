const axios = require('axios');
const { getWeatherInfo } = require('./weatherCodes');

const axiosInstance = axios.create({
  timeout: 6000,
  headers: {
    'User-Agent': 'WeatherApp-Modern/2.0 (contact@ferilsunu.com)'
  }
});

/**
 * Calculates approximate moon phase (0.0 to 1.0) and lunar phase name
 * @param {Date} date
 */
function getMoonPhase(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let c = 0;
  let e = 0;
  let jd = 0;
  let b = 0;

  if (month < 3) {
    year - 1;
    month + 12;
  }

  const a = Math.floor(year / 100);
  b = 2 - a + Math.floor(a / 4);
  jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
  
  // Known new moon: Jan 11 2000 12:24 UTC -> JD 2451555.01667
  const daysSinceNew = jd - 2451555.01667;
  const newMoons = daysSinceNew / 29.53058867;
  const phase = newMoons - Math.floor(newMoons);

  let phaseName = 'New Moon';
  let illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100);

  if (phase < 0.03 || phase > 0.97) phaseName = 'New Moon';
  else if (phase < 0.22) phaseName = 'Waxing Crescent';
  else if (phase < 0.28) phaseName = 'First Quarter';
  else if (phase < 0.47) phaseName = 'Waxing Gibbous';
  else if (phase < 0.53) phaseName = 'Full Moon';
  else if (phase < 0.72) phaseName = 'Waning Gibbous';
  else if (phase < 0.78) phaseName = 'Last Quarter';
  else phaseName = 'Waning Crescent';

  return {
    fraction: phase,
    illumination,
    name: phaseName
  };
}

/**
 * Generates smart lifestyle and weather insights based on atmospheric metrics
 */
function generateWeatherInsights(current, dailyToday, aqiData) {
  const insights = [];

  // UV insight
  const uv = current.uv_index || 0;
  if (uv >= 8) {
    insights.push({
      category: 'UV Alert',
      level: 'danger',
      icon: 'sun-alert',
      message: 'Very high UV levels. Generous SPF 50+ sunscreen, hat, and sunglasses are essential.'
    });
  } else if (uv >= 5) {
    insights.push({
      category: 'UV Moderate',
      level: 'warning',
      icon: 'sun-medium',
      message: 'Moderate UV index. Sun protection recommended between 10 AM and 4 PM.'
    });
  } else {
    insights.push({
      category: 'UV Safe',
      level: 'safe',
      icon: 'sun-low',
      message: 'Minimal UV radiation. Safe for outdoor exposure without special sun protection.'
    });
  }

  // Rain / Umbrella insight
  const rainProb = dailyToday ? dailyToday.precipitation_probability_max : current.precipitation;
  if (current.precipitation > 0 || (rainProb && rainProb > 50)) {
    insights.push({
      category: 'Precipitation',
      level: 'warning',
      icon: 'umbrella',
      message: `Rain expected (${rainProb || 70}% probability). Carry an umbrella and waterproof gear.`
    });
  } else {
    insights.push({
      category: 'Precipitation',
      level: 'safe',
      icon: 'umbrella-off',
      message: 'No rain expected today. Ideal for dry outdoor activities.'
    });
  }

  // Outdoor Running / Workout Index
  const temp = current.temperature;
  const humidity = current.relative_humidity_2m;
  const aqi = aqiData ? aqiData.us_aqi : 30;

  let workoutScore = 'Great';
  let workoutAdvice = 'Perfect conditions for running and cycling.';
  if (temp > 35 || temp < -5 || aqi > 150) {
    workoutScore = 'Poor';
    workoutAdvice = 'Extreme temperatures or poor air quality. Prefer indoor workouts.';
  } else if (temp > 29 || humidity > 80 || aqi > 100) {
    workoutScore = 'Fair';
    workoutAdvice = 'Stay well hydrated and take frequent breaks due to heat/humidity.';
  }

  insights.push({
    category: 'Outdoor Fitness',
    level: workoutScore === 'Great' ? 'safe' : workoutScore === 'Fair' ? 'warning' : 'danger',
    icon: 'activity',
    message: `${workoutScore} conditions for sports: ${workoutAdvice}`
  });

  // Wind Insight
  if (current.wind_speed_10m > 40) {
    insights.push({
      category: 'High Winds',
      level: 'warning',
      icon: 'wind',
      message: `Gusty winds up to ${Math.round(current.wind_gusts_10m || current.wind_speed_10m)} km/h. Secure loose outdoor objects.`
    });
  }

  return insights;
}

/**
 * Fetches rich comprehensive weather dataset from Open-Meteo
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} [timezone='auto']
 * @param {string} [place='']
 * @param {string} [country='']
 * @returns {Promise<object>}
 */
const getDetailedForecast = async (latitude, longitude, timezone = 'auto', place = '', country = '') => {
  const weatherUrl = 'https://api.open-meteo.com/v1/forecast';
  const aqiUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality';

  const weatherParams = {
    latitude,
    longitude,
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'rain',
      'showers',
      'snowfall',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m'
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'dew_point_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'pressure_msl',
      'cloud_cover',
      'visibility',
      'wind_speed_10m',
      'wind_direction_10m',
      'uv_index',
      'is_day'
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'sunrise',
      'sunset',
      'daylight_duration',
      'sunshine_duration',
      'uv_index_max',
      'precipitation_sum',
      'precipitation_hours',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant'
    ].join(','),
    timezone: timezone || 'auto'
  };

  const aqiParams = {
    latitude,
    longitude,
    current: [
      'us_aqi',
      'european_aqi',
      'pm10',
      'pm2_5',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'sulphur_dioxide',
      'ozone'
    ].join(','),
    timezone: timezone || 'auto'
  };

  try {
    const [weatherRes, aqiRes] = await Promise.all([
      axiosInstance.get(weatherUrl, { params: weatherParams }),
      axiosInstance.get(aqiUrl, { params: aqiParams }).catch(err => {
        console.warn('AQI fetch non-fatal error:', err.message);
        return { data: { current: {} } };
      })
    ]);

    const raw = weatherRes.data;
    const aqi = aqiRes.data.current || {};

    const currentWeatherCode = raw.current.weather_code;
    const isDay = raw.current.is_day;
    const weatherInfo = getWeatherInfo(currentWeatherCode, isDay);

    // Build current weather object
    const currentHourIndex = new Date().getHours();
    const currentUV = raw.hourly && raw.hourly.uv_index ? (raw.hourly.uv_index[currentHourIndex] || 0) : (raw.daily?.uv_index_max?.[0] || 0);
    const currentVisibility = raw.hourly && raw.hourly.visibility ? (raw.hourly.visibility[currentHourIndex] || 10000) : 10000;
    const currentDewPoint = raw.hourly && raw.hourly.dew_point_2m ? (raw.hourly.dew_point_2m[currentHourIndex] || 0) : 0;

    const currentData = {
      temperature: Math.round(raw.current.temperature_2m * 10) / 10,
      feels_like: Math.round(raw.current.apparent_temperature * 10) / 10,
      relative_humidity_2m: raw.current.relative_humidity_2m,
      is_day: isDay,
      precipitation: raw.current.precipitation,
      cloud_cover: raw.current.cloud_cover,
      pressure_msl: Math.round(raw.current.pressure_msl),
      surface_pressure: Math.round(raw.current.surface_pressure),
      wind_speed_10m: Math.round(raw.current.wind_speed_10m * 10) / 10,
      wind_direction_10m: raw.current.wind_direction_10m,
      wind_gusts_10m: Math.round(raw.current.wind_gusts_10m * 10) / 10,
      uv_index: currentUV,
      visibility: Math.round(currentVisibility / 1000 * 10) / 10, // km
      dew_point: Math.round(currentDewPoint * 10) / 10,
      weather_code: currentWeatherCode,
      condition: weatherInfo.description,
      icon: weatherInfo.icon,
      theme: weatherInfo.theme,
      category: weatherInfo.category,
      time: raw.current.time
    };

    // Build 24-48h Hourly list
    const hourlyList = [];
    const nowIso = new Date().toISOString();
    let startIndex = 0;
    if (raw.hourly && raw.hourly.time) {
      startIndex = raw.hourly.time.findIndex(t => t >= nowIso.slice(0, 13));
      if (startIndex === -1) startIndex = 0;

      for (let i = startIndex; i < Math.min(startIndex + 24, raw.hourly.time.length); i++) {
        const hCode = raw.hourly.weather_code[i];
        const hIsDay = raw.hourly.is_day[i];
        const hInfo = getWeatherInfo(hCode, hIsDay);

        hourlyList.push({
          time: raw.hourly.time[i],
          temperature: Math.round(raw.hourly.temperature_2m[i]),
          feels_like: Math.round(raw.hourly.apparent_temperature[i]),
          humidity: raw.hourly.relative_humidity_2m[i],
          dew_point: Math.round(raw.hourly.dew_point_2m[i]),
          precipitation_probability: raw.hourly.precipitation_probability[i] || 0,
          precipitation: raw.hourly.precipitation[i] || 0,
          weather_code: hCode,
          condition: hInfo.description,
          icon: hInfo.icon,
          wind_speed: Math.round(raw.hourly.wind_speed_10m[i]),
          wind_direction: raw.hourly.wind_direction_10m[i],
          uv_index: raw.hourly.uv_index[i] || 0,
          is_day: hIsDay
        });
      }
    }

    // Build 7-10 day Daily list
    const dailyList = [];
    if (raw.daily && raw.daily.time) {
      for (let i = 0; i < raw.daily.time.length; i++) {
        const dCode = raw.daily.weather_code[i];
        const dInfo = getWeatherInfo(dCode, 1);

        dailyList.push({
          date: raw.daily.time[i],
          temp_max: Math.round(raw.daily.temperature_2m_max[i]),
          temp_min: Math.round(raw.daily.temperature_2m_min[i]),
          apparent_max: Math.round(raw.daily.apparent_temperature_max[i]),
          apparent_min: Math.round(raw.daily.apparent_temperature_min[i]),
          sunrise: raw.daily.sunrise[i],
          sunset: raw.daily.sunset[i],
          daylight_duration: raw.daily.daylight_duration[i],
          uv_index_max: raw.daily.uv_index_max[i],
          precipitation_sum: raw.daily.precipitation_sum[i],
          precipitation_probability_max: raw.daily.precipitation_probability_max[i] || 0,
          wind_speed_max: Math.round(raw.daily.wind_speed_10m_max[i]),
          wind_gusts_max: Math.round(raw.daily.wind_gusts_10m_max[i]),
          wind_direction_dominant: raw.daily.wind_direction_10m_dominant[i],
          weather_code: dCode,
          condition: dInfo.description,
          icon: dInfo.icon
        });
      }
    }

    // Air Quality Data
    const airQuality = {
      us_aqi: aqi.us_aqi || 28,
      european_aqi: aqi.european_aqi || 20,
      pm2_5: aqi.pm2_5 || 8.5,
      pm10: aqi.pm10 || 15.2,
      no2: aqi.nitrogen_dioxide || 12.0,
      so2: aqi.sulphur_dioxide || 3.1,
      o3: aqi.ozone || 45.0,
      co: aqi.carbon_monoxide || 250
    };

    // Moon phase
    const moonPhase = getMoonPhase(new Date());

    // Lifestyle insights
    const insights = generateWeatherInsights(currentData, dailyList[0], airQuality);

    return {
      place: place || `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
      country: country || '',
      latitude,
      longitude,
      elevation: raw.elevation,
      timezone: raw.timezone,
      timezone_abbreviation: raw.timezone_abbreviation,
      utc_offset_seconds: raw.utc_offset_seconds,
      current: currentData,
      hourly: hourlyList,
      daily: dailyList,
      air_quality: airQuality,
      moon_phase: moonPhase,
      insights,
      // Legacy 2020 compatibility fields
      temperature: currentData.temperature,
      Country: country,
      Place: place
    };
  } catch (err) {
    console.error('Forecast API error:', err.message);
    throw new Error('Unable to retrieve weather forecast data for the requested location');
  }
};

/**
 * Legacy forecast wrapper for 2020 interface compatibility
 * @param {number} latitude
 * @param {number} longitude
 * @param {Function} callback
 */
const forecast = (latitude, longitude, callback) => {
  getDetailedForecast(latitude, longitude)
    .then(data => {
      callback(undefined, {
        temperature: data.current.temperature,
        country: data.country || 'Global',
        place: data.place || 'Unknown',
        fullData: data
      });
    })
    .catch(err => {
      callback(err.message, undefined);
    });
};

module.exports = {
  forecast,
  getDetailedForecast
};