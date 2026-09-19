/**
 * WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs
 */

const WEATHER_CODES = {
  0: {
    description: "Clear sky",
    dayIcon: "sun",
    nightIcon: "moon",
    theme: "clear",
    category: "clear"
  },
  1: {
    description: "Mainly clear",
    dayIcon: "sun-dim",
    nightIcon: "moon-dim",
    theme: "mostly-clear",
    category: "clear"
  },
  2: {
    description: "Partly cloudy",
    dayIcon: "cloud-sun",
    nightIcon: "cloud-moon",
    theme: "partly-cloudy",
    category: "clouds"
  },
  3: {
    description: "Overcast",
    dayIcon: "cloud",
    nightIcon: "cloud",
    theme: "overcast",
    category: "clouds"
  },
  45: {
    description: "Foggy",
    dayIcon: "cloud-fog",
    nightIcon: "cloud-fog",
    theme: "fog",
    category: "fog"
  },
  48: {
    description: "Depositing rime fog",
    dayIcon: "cloud-fog",
    nightIcon: "cloud-fog",
    theme: "fog",
    category: "fog"
  },
  51: {
    description: "Light drizzle",
    dayIcon: "cloud-drizzle",
    nightIcon: "cloud-drizzle",
    theme: "drizzle",
    category: "rain"
  },
  53: {
    description: "Moderate drizzle",
    dayIcon: "cloud-drizzle",
    nightIcon: "cloud-drizzle",
    theme: "drizzle",
    category: "rain"
  },
  55: {
    description: "Dense drizzle",
    dayIcon: "cloud-drizzle",
    nightIcon: "cloud-drizzle",
    theme: "rain",
    category: "rain"
  },
  56: {
    description: "Light freezing drizzle",
    dayIcon: "cloud-snow",
    nightIcon: "cloud-snow",
    theme: "freezing-rain",
    category: "snow"
  },
  57: {
    description: "Dense freezing drizzle",
    dayIcon: "cloud-snow",
    nightIcon: "cloud-snow",
    theme: "freezing-rain",
    category: "snow"
  },
  61: {
    description: "Slight rain",
    dayIcon: "cloud-rain",
    nightIcon: "cloud-rain",
    theme: "rain",
    category: "rain"
  },
  63: {
    description: "Moderate rain",
    dayIcon: "cloud-rain",
    nightIcon: "cloud-rain",
    theme: "rain",
    category: "rain"
  },
  65: {
    description: "Heavy rain",
    dayIcon: "cloud-lightning-rain",
    nightIcon: "cloud-lightning-rain",
    theme: "heavy-rain",
    category: "rain"
  },
  66: {
    description: "Light freezing rain",
    dayIcon: "cloud-snow",
    nightIcon: "cloud-snow",
    theme: "freezing-rain",
    category: "snow"
  },
  67: {
    description: "Heavy freezing rain",
    dayIcon: "cloud-snow",
    nightIcon: "cloud-snow",
    theme: "freezing-rain",
    category: "snow"
  },
  71: {
    description: "Slight snow fall",
    dayIcon: "snowflake",
    nightIcon: "snowflake",
    theme: "snow",
    category: "snow"
  },
  73: {
    description: "Moderate snow fall",
    dayIcon: "snowflake",
    nightIcon: "snowflake",
    theme: "snow",
    category: "snow"
  },
  75: {
    description: "Heavy snow fall",
    dayIcon: "snowflake",
    nightIcon: "snowflake",
    theme: "heavy-snow",
    category: "snow"
  },
  77: {
    description: "Snow grains",
    dayIcon: "snowflake",
    nightIcon: "snowflake",
    theme: "snow",
    category: "snow"
  },
  80: {
    description: "Slight rain showers",
    dayIcon: "cloud-rain",
    nightIcon: "cloud-rain",
    theme: "rain",
    category: "rain"
  },
  81: {
    description: "Moderate rain showers",
    dayIcon: "cloud-rain",
    nightIcon: "cloud-rain",
    theme: "rain",
    category: "rain"
  },
  82: {
    description: "Violent rain showers",
    dayIcon: "cloud-lightning-rain",
    nightIcon: "cloud-lightning-rain",
    theme: "heavy-rain",
    category: "rain"
  },
  85: {
    description: "Slight snow showers",
    dayIcon: "cloud-snow",
    nightIcon: "cloud-snow",
    theme: "snow",
    category: "snow"
  },
  86: {
    description: "Heavy snow showers",
    dayIcon: "snowflake",
    nightIcon: "snowflake",
    theme: "heavy-snow",
    category: "snow"
  },
  95: {
    description: "Thunderstorm",
    dayIcon: "cloud-lightning",
    nightIcon: "cloud-lightning",
    theme: "thunderstorm",
    category: "thunderstorm"
  },
  96: {
    description: "Thunderstorm with slight hail",
    dayIcon: "cloud-lightning",
    nightIcon: "cloud-lightning",
    theme: "thunderstorm",
    category: "thunderstorm"
  },
  99: {
    description: "Thunderstorm with heavy hail",
    dayIcon: "cloud-lightning",
    nightIcon: "cloud-lightning",
    theme: "thunderstorm",
    category: "thunderstorm"
  }
};

function getWeatherInfo(code, isDay = 1) {
  const defaultInfo = {
    description: "Unknown",
    dayIcon: "cloud",
    nightIcon: "cloud",
    theme: "clear",
    category: "clear"
  };

  const info = WEATHER_CODES[code] || defaultInfo;
  return {
    code,
    description: info.description,
    icon: isDay ? info.dayIcon : info.nightIcon,
    theme: info.theme,
    category: info.category,
    isDay: Boolean(isDay)
  };
}

module.exports = {
  WEATHER_CODES,
  getWeatherInfo
};
