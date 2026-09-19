/**
 * ATMOSPHERE WEATHER PLATFORM - JAVASCRIPT CONTROLLER v2.3
 * Monochrome Edition (Black & White Luxury Minimalist with Lucide Icons)
 * Author: Feril Sunu
 */

(function () {
  'use strict';

  // Global State
  const state = {
    currentMode: localStorage.getItem('weather_app_mode') || '2026',
    unit: localStorage.getItem('weather_app_unit') || 'C',
    soundEnabled: false,
    currentWeatherData: null,
    leafletMap: null,
    radarMarker: null,
    searchDebounceTimer: null,
    audioCtx: null,
    audioNodes: null
  };

  // Weather condition icons mapping to Lucide icon names
  const GLYPH_MAP = {
    sun: 'sun',
    'sun-dim': 'sun-medium',
    'cloud-sun': 'cloud-sun',
    'cloud-moon': 'cloud-moon',
    moon: 'moon',
    'moon-dim': 'moon-star',
    cloud: 'cloud',
    'cloud-fog': 'cloud-fog',
    'cloud-drizzle': 'cloud-drizzle',
    'cloud-rain': 'cloud-rain',
    'cloud-lightning-rain': 'cloud-lightning',
    'cloud-lightning': 'zap',
    'cloud-snow': 'cloud-snow',
    snowflake: 'snowflake',
    clear: 'sun'
  };

  function toPascalCase(str) {
    if (!str) return '';
    return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  }

  function getLucideSvg(iconName, options = { width: 20, height: 20, 'stroke-width': 2 }) {
    const pName = toPascalCase(iconName);
    const lucideObj = window.lucide;
    const iconDef = (lucideObj && lucideObj[pName]) || (lucideObj && lucideObj.icons && lucideObj.icons[pName]);
    if (!iconDef || !Array.isArray(iconDef)) {
      return `<i data-lucide="${iconName}"></i>`;
    }
    const width = options.width || 20;
    const height = options.height || 20;
    const strokeWidth = options['stroke-width'] || options.strokeWidth || 2;
    const cls = options.class || '';
    const style = options.style || '';

    const inner = iconDef.map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
      return `<${tag} ${attrStr}></${tag}>`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${cls}" style="${style}">${inner}</svg>`;
  }

  function formatTemp(celsius) {
    if (celsius === undefined || celsius === null || isNaN(celsius)) return '--';
    if (state.unit === 'F') {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  }

  function getUnitSymbol() {
    return state.unit === 'F' ? '°F' : '°C';
  }

  function getLifestyleIcon(cat) {
    const c = (cat || '').toLowerCase();
    if (c.includes('uv') || c.includes('sun')) return 'sun';
    if (c.includes('rain') || c.includes('umbrella')) return 'umbrella';
    if (c.includes('wind') || c.includes('air')) return 'wind';
    if (c.includes('health') || c.includes('aqi')) return 'heart-pulse';
    if (c.includes('commute') || c.includes('travel')) return 'car';
    if (c.includes('fitness') || c.includes('sport') || c.includes('outdoor')) return 'bike';
    if (c.includes('cloth') || c.includes('wear')) return 'shirt';
    return 'sparkles';
  }

  /* =========================================================
     1. VERSION SWITCHER (2020 vs 2026)
     ========================================================= */
  const btnMode2020 = document.getElementById('btn-mode-2020');
  const btnMode2026 = document.getElementById('btn-mode-2026');
  const view2020 = document.getElementById('view-2020');
  const view2026 = document.getElementById('view-2026');
  const activePill = document.querySelector('.era-active-pill');
  const btnUnit = document.getElementById('btn-unit-toggle');
  const unitLabel = document.getElementById('unit-label');
  const btnSound = document.getElementById('btn-sound-toggle');
  const soundIconWrap = document.getElementById('sound-icon-wrap');

  function updateEraPill(mode) {
    if (!activePill) return;
    if (mode === '2020') {
      activePill.style.left = '3px';
      activePill.style.width = `${btnMode2020.offsetWidth}px`;
    } else {
      activePill.style.left = `${btnMode2020.offsetLeft + btnMode2020.offsetWidth + 2}px`;
      activePill.style.width = `${btnMode2026.offsetWidth}px`;
    }
  }

  function setMode(mode) {
    state.currentMode = mode;
    localStorage.setItem('weather_app_mode', mode);

    if (mode === '2020') {
      document.body.className = 'mode-2020';
      btnMode2020.classList.add('active');
      btnMode2026.classList.remove('active');
      view2020.classList.add('active');
      view2026.classList.remove('active');
    } else {
      document.body.className = 'mode-2026';
      btnMode2026.classList.add('active');
      btnMode2020.classList.remove('active');
      view2026.classList.add('active');
      view2020.classList.remove('active');
      if (state.leafletMap) {
        setTimeout(() => state.leafletMap.invalidateSize(), 300);
      }
    }
    updateEraPill(mode);
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  btnMode2020.addEventListener('click', () => setMode('2020'));
  btnMode2026.addEventListener('click', () => setMode('2026'));
  window.addEventListener('resize', () => updateEraPill(state.currentMode));

  // Temperature Unit Toggle
  btnUnit.addEventListener('click', () => {
    state.unit = state.unit === 'C' ? 'F' : 'C';
    localStorage.setItem('weather_app_unit', state.unit);
    unitLabel.textContent = `°${state.unit}`;
    if (state.currentWeatherData) {
      render2026Dashboard(state.currentWeatherData);
    }
  });

  /* =========================================================
     2. 2020 VINTAGE SEARCH HANDLER
     ========================================================= */
  const form2020 = document.getElementById('form-2020');
  const input2020 = document.getElementById('input-2020');
  const place2020 = document.getElementById('place');
  const temp2020 = document.getElementById('temp');

  if (form2020) {
    form2020.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = input2020 ? input2020.value.trim() : '';
      if (!query) return;

      temp2020.textContent = 'Loading...';
      place2020.textContent = '--';

      fetch(`/weather?search=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ErrorMessage) {
            temp2020.textContent = data.ErrorMessage;
            return;
          }
          place2020.textContent = `${data.Place}, ${data.Country}`;
          temp2020.innerHTML = `${data.Temperature}<sup>°</sup>`;

          if (data.data) {
            state.currentWeatherData = data.data;
            render2026Dashboard(data.data);
          }
        })
        .catch(() => {
          temp2020.textContent = 'Unable to connect to weather services.';
        });
    });
  }

  /* =========================================================
     3. 2026 AUTOCOMPLETE & QUICK SEARCH
     ========================================================= */
  const input2026 = document.getElementById('input-2026');
  const autocompleteList = document.getElementById('autocomplete-list');
  const btnGeoDetect = document.getElementById('btn-geo-detect');
  const quickCities = document.querySelectorAll('.city-pill');

  if (input2026) {
    input2026.addEventListener('input', () => {
      clearTimeout(state.searchDebounceTimer);
      const val = input2026.value.trim();

      if (val.length < 2) {
        autocompleteList.classList.remove('show');
        autocompleteList.innerHTML = '';
        return;
      }

      state.searchDebounceTimer = setTimeout(() => {
        fetch(`/weather/search?q=${encodeURIComponent(val)}`)
          .then(res => res.json())
          .then(data => {
            if (data.results && data.results.length > 0) {
              autocompleteList.innerHTML = data.results.map(item => `
                <div class="autocomplete-item" data-lat="${item.latitude}" data-lon="${item.longitude}" data-name="${item.name}" data-country="${item.country_code || item.country}">
                  <div>
                    <span class="autocomplete-main">${item.name}</span>
                    <span class="autocomplete-sub">${item.admin1 ? item.admin1 + ', ' : ''}${item.country}</span>
                  </div>
                  <span class="country-badge">${item.country_code || 'GEO'}</span>
                </div>
              `).join('');
              autocompleteList.classList.add('show');
            } else {
              autocompleteList.classList.remove('show');
            }
          })
          .catch(() => autocompleteList.classList.remove('show'));
      }, 200);
    });

    autocompleteList.addEventListener('click', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (!item) return;

      const lat = item.getAttribute('data-lat');
      const lon = item.getAttribute('data-lon');
      const name = item.getAttribute('data-name');
      const country = item.getAttribute('data-country');

      autocompleteList.classList.remove('show');
      input2026.value = `${name}, ${country}`;

      loadCoordinatesWeather(lat, lon, name, country);
    });

    input2026.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = input2026.value.trim();
        if (!query) return;
        autocompleteList.classList.remove('show');
        loadQueryWeather(query);
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-bar-glass')) {
        autocompleteList.classList.remove('show');
      }
    });
  }

  // Quick City Filters
  quickCities.forEach(pill => {
    pill.addEventListener('click', () => {
      const city = pill.getAttribute('data-city');
      if (input2026) input2026.value = city;
      loadQueryWeather(city);
    });
  });

  // GPS Geolocation
  if (btnGeoDetect) {
    btnGeoDetect.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      btnGeoDetect.style.transform = 'rotate(180deg)';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          btnGeoDetect.style.transform = 'none';
          loadReverseWeather(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          btnGeoDetect.style.transform = 'none';
          alert(`Location access denied or unavailable: ${err.message}`);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }

  /* =========================================================
     4. DATA FETCHING METHODS
     ========================================================= */
  function loadQueryWeather(query) {
    setLoadingUI(true);
    fetch(`/weather?search=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        setLoadingUI(false);
        if (data.ErrorMessage) {
          alert(data.ErrorMessage);
          return;
        }
        if (data.data) {
          state.currentWeatherData = data.data;
          render2026Dashboard(data.data);
        }
        if (place2020) place2020.textContent = `${data.Place}, ${data.Country}`;
        if (temp2020) temp2020.innerHTML = `${data.Temperature}<sup>°</sup>`;
      })
      .catch(() => setLoadingUI(false));
  }

  function loadCoordinatesWeather(lat, lon, name, country) {
    setLoadingUI(true);
    fetch(`/weather/detailed?lat=${lat}&lon=${lon}&city=${encodeURIComponent(name)}&country=${encodeURIComponent(country)}`)
      .then(res => res.json())
      .then(res => {
        setLoadingUI(false);
        if (res.data) {
          state.currentWeatherData = res.data;
          render2026Dashboard(res.data);
          if (place2020) place2020.textContent = `${res.data.place}, ${res.data.country}`;
          if (temp2020) temp2020.innerHTML = `${res.data.current.temperature}<sup>°</sup>`;
        }
      })
      .catch(() => setLoadingUI(false));
  }

  function loadReverseWeather(lat, lon) {
    setLoadingUI(true);
    fetch(`/weather/reverse?lat=${lat}&lon=${lon}`)
      .then(res => res.json())
      .then(res => {
        setLoadingUI(false);
        if (res.data) {
          state.currentWeatherData = res.data;
          render2026Dashboard(res.data);
          if (input2026) input2026.value = `${res.data.place}, ${res.data.country}`;
          if (place2020) place2020.textContent = `${res.data.place}, ${res.data.country}`;
          if (temp2020) temp2020.innerHTML = `${res.data.current.temperature}<sup>°</sup>`;
        }
      })
      .catch(() => setLoadingUI(false));
  }

  function setLoadingUI(isLoading) {
    const condEl = document.getElementById('hero-condition');
    if (condEl && isLoading) condEl.textContent = 'Syncing atmospheric telemetry...';
  }

  /* =========================================================
     5. 2026 DASHBOARD RENDERING
     ========================================================= */
  function render2026Dashboard(data) {
    if (!data || !data.current) return;

    const cur = data.current;
    const dailyToday = data.daily && data.daily[0];

    // 1. Hero Showcase
    const heroCity = document.getElementById('hero-city');
    const heroCountryBadge = document.getElementById('hero-country-badge');
    const heroLocalTime = document.getElementById('hero-local-time');
    const heroCoords = document.getElementById('hero-coords');
    const heroGlyphBox = document.getElementById('hero-glyph-box');
    const heroTemp = document.getElementById('hero-temp');
    const heroCondition = document.getElementById('hero-condition');
    const heroFeelsLike = document.getElementById('hero-feels-like');
    const heroMinMax = document.getElementById('hero-min-max');

    const heroPrecipStat = document.getElementById('hero-precip-stat');
    const heroHumidityStat = document.getElementById('hero-humidity-stat');
    const heroWindStat = document.getElementById('hero-wind-stat');
    const heroUvStat = document.getElementById('hero-uv-stat');

    if (heroCity) heroCity.textContent = data.place;
    if (heroCountryBadge) heroCountryBadge.textContent = (data.country || 'GLOBAL').slice(0, 3).toUpperCase();
    if (heroCoords) heroCoords.textContent = `${data.latitude.toFixed(2)}°N, ${data.longitude.toFixed(2)}°E`;
    if (heroLocalTime) {
      const now = new Date();
      heroLocalTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    if (heroGlyphBox) {
      const glyphKey = GLYPH_MAP[cur.icon] || (cur.is_day ? 'sun' : 'moon');
      heroGlyphBox.innerHTML = getLucideSvg(glyphKey, { width: 72, height: 72, 'stroke-width': 1.8 });
    }

    if (heroTemp) heroTemp.textContent = formatTemp(cur.temperature);
    if (heroCondition) heroCondition.textContent = cur.condition;
    if (heroFeelsLike) heroFeelsLike.textContent = `${formatTemp(cur.feels_like)}${getUnitSymbol()}`;
    if (heroMinMax && dailyToday) {
      heroMinMax.textContent = `H: ${formatTemp(dailyToday.temp_max)}° L: ${formatTemp(dailyToday.temp_min)}°`;
    }

    if (heroPrecipStat) heroPrecipStat.textContent = dailyToday ? `${dailyToday.precipitation_probability_max}%` : '0%';
    if (heroHumidityStat) heroHumidityStat.textContent = `${cur.relative_humidity_2m}%`;
    if (heroWindStat) heroWindStat.textContent = `${cur.wind_speed_10m} km/h`;
    if (heroUvStat) {
      const uv = cur.uv_index;
      let uvLabel = 'Low';
      if (uv >= 8) uvLabel = 'Very High';
      else if (uv >= 6) uvLabel = 'High';
      else if (uv >= 3) uvLabel = 'Moderate';
      heroUvStat.textContent = `${uv} ${uvLabel}`;
    }

    // 2. Hourly Slider
    const hourlyDeck = document.getElementById('hourly-deck');
    if (hourlyDeck && data.hourly) {
      hourlyDeck.innerHTML = data.hourly.slice(0, 24).map((h, i) => {
        const timeStr = h.time.split('T')[1].slice(0, 5);
        const iconKey = GLYPH_MAP[h.icon] || (h.is_day ? 'sun' : 'moon');
        const iconSvg = getLucideSvg(iconKey, { width: 22, height: 22, 'stroke-width': 2, class: 'h-icon-svg' });
        return `
          <div class="hourly-item-box ${i === 0 ? 'now' : ''}">
            <span class="h-time-txt">${i === 0 ? 'Now' : timeStr}</span>
            <span class="h-icon-box">${iconSvg}</span>
            <span class="h-temp-txt">${formatTemp(h.temperature)}°</span>
            <span class="h-pop-txt">${h.precipitation_probability > 0 ? h.precipitation_probability + '%' : '0%'}</span>
          </div>
        `;
      }).join('');
    }

    // 3. 7-Day Extended Forecast
    const dailyDeck = document.getElementById('daily-deck');
    if (dailyDeck && data.daily) {
      const allMax = Math.max(...data.daily.map(d => d.temp_max));
      const allMin = Math.min(...data.daily.map(d => d.temp_min));
      const range = Math.max(allMax - allMin, 1);

      dailyDeck.innerHTML = data.daily.slice(0, 7).map((d, idx) => {
        const dateObj = new Date(d.date);
        const dayName = idx === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const iconKey = GLYPH_MAP[d.icon] || 'sun';
        const iconSvg = getLucideSvg(iconKey, { width: 20, height: 20, 'stroke-width': 2, class: 'day-icon-svg' });
        
        const leftPercent = Math.max(0, ((d.temp_min - allMin) / range) * 100);
        const widthPercent = Math.max(15, ((d.temp_max - d.temp_min) / range) * 100);

        return `
          <div class="daily-item-row">
            <div class="day-label-box">
              <span class="day-title">${dayName}</span>
              <span class="day-date">${dateFormatted}</span>
            </div>
            <div class="day-icon-box">${iconSvg}</div>
            <div class="temp-bar-container">
              <span class="t-min">${formatTemp(d.temp_min)}°</span>
              <div class="t-track">
                <div class="t-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
              </div>
              <span class="t-max">${formatTemp(d.temp_max)}°</span>
            </div>
            <span class="day-condition-phrase">${d.condition}</span>
          </div>
        `;
      }).join('');
    }

    // 4. Diagnostics Matrix
    // AQI
    const aqiVal = document.getElementById('aqi-value');
    const aqiCat = document.getElementById('aqi-category');
    const aqiBarFill = document.getElementById('aqi-bar-fill');
    const aqiPm25 = document.getElementById('aqi-pm25');
    const aqiPm10 = document.getElementById('aqi-pm10');
    if (aqiVal && data.air_quality) {
      const aqi = data.air_quality.us_aqi;
      aqiVal.textContent = aqi;
      let cat = 'Good';
      if (aqi > 150) cat = 'Unhealthy';
      else if (aqi > 100) cat = 'Sensitive';
      else if (aqi > 50) cat = 'Moderate';

      if (aqiCat) aqiCat.textContent = cat;
      if (aqiBarFill) aqiBarFill.style.width = `${Math.min(100, (aqi / 250) * 100)}%`;
      if (aqiPm25) aqiPm25.textContent = `PM2.5: ${data.air_quality.pm2_5} µg/m³`;
      if (aqiPm10) aqiPm10.textContent = `PM10: ${data.air_quality.pm10} µg/m³`;
    }

    // UV
    const uvVal = document.getElementById('uv-value');
    const uvCat = document.getElementById('uv-category');
    const uvBarFill = document.getElementById('uv-bar-fill');
    const uvAdvice = document.getElementById('uv-advice');
    if (uvVal) {
      const uv = cur.uv_index;
      uvVal.textContent = uv;
      let label = 'Low';
      let advice = 'No protection required.';
      if (uv >= 8) { label = 'Very High'; advice = 'Avoid noon sun, wear SPF 50+.'; }
      else if (uv >= 6) { label = 'High'; advice = 'Sunscreen, hat, and shades needed.'; }
      else if (uv >= 3) { label = 'Moderate'; advice = 'Sun protection advised.'; }

      if (uvCat) uvCat.textContent = label;
      if (uvAdvice) uvAdvice.textContent = advice;
      if (uvBarFill) uvBarFill.style.width = `${Math.min(100, (uv / 11) * 100)}%`;
    }

    // Wind & Compass
    const windSpeed = document.getElementById('wind-speed');
    const windDir = document.getElementById('wind-direction');
    const windGusts = document.getElementById('wind-gusts');
    const needle = document.getElementById('compass-needle');
    if (windSpeed) {
      windSpeed.innerHTML = `${cur.wind_speed_10m} <small>km/h</small>`;
      if (windDir) windDir.textContent = `Direction: ${cur.wind_direction_10m}°`;
      if (windGusts) windGusts.textContent = `Gusts: ${cur.wind_gusts_10m} km/h`;
      if (needle) needle.style.transform = `rotate(${cur.wind_direction_10m}deg)`;
    }

    // Solar Arc & Times
    const sunriseTime = document.getElementById('sunrise-time');
    const sunsetTime = document.getElementById('sunset-time');
    const sunOrb = document.getElementById('sun-orb');
    if (dailyToday && dailyToday.sunrise && sunriseTime && sunsetTime) {
      sunriseTime.textContent = dailyToday.sunrise.split('T')[1].slice(0, 5);
      sunsetTime.textContent = dailyToday.sunset.split('T')[1].slice(0, 5);

      const now = new Date();
      const riseDate = new Date(dailyToday.sunrise);
      const setDate = new Date(dailyToday.sunset);
      const totalDaylight = setDate - riseDate;
      const currentDaylight = now - riseDate;
      const fraction = Math.max(0, Math.min(1, currentDaylight / totalDaylight));

      if (sunOrb) {
        const cx = 10 + fraction * 100;
        const cy = 45 - Math.sin(fraction * Math.PI) * 38;
        sunOrb.setAttribute('cx', cx);
        sunOrb.setAttribute('cy', cy);
      }
    }

    // Humidity
    const humVal = document.getElementById('humidity-value');
    const dewVal = document.getElementById('dew-point-val');
    const humComfort = document.getElementById('humidity-comfort');
    if (humVal) {
      humVal.textContent = `${cur.relative_humidity_2m}%`;
      if (dewVal) dewVal.textContent = `${formatTemp(cur.dew_point)}${getUnitSymbol()}`;
      if (humComfort) {
        humComfort.textContent = cur.relative_humidity_2m > 70 ? 'Humid' : cur.relative_humidity_2m < 30 ? 'Dry' : 'Comfortable';
      }
    }

    // Moon Phase
    const moonGlyph = document.getElementById('moon-glyph');
    const moonName = document.getElementById('moon-name');
    const moonIllum = document.getElementById('moon-illum');
    if (data.moon_phase && moonName && moonIllum) {
      moonName.textContent = data.moon_phase.name;
      moonIllum.textContent = `${data.moon_phase.illumination}% Illumination`;
      if (moonGlyph) {
        moonGlyph.innerHTML = getLucideSvg('moon', { width: 36, height: 36, 'stroke-width': 1.8 });
      }
    }

    // Precipitation & Pressure
    const precipVal = document.getElementById('precip-val');
    const precipProb = document.getElementById('precip-prob');
    if (precipVal) {
      precipVal.innerHTML = `${cur.precipitation} <small>mm</small>`;
      if (precipProb && dailyToday) {
        precipProb.textContent = `${dailyToday.precipitation_probability_max}% chance in next 24h`;
      }
    }

    const pressureVal = document.getElementById('pressure-val');
    const pressureTrend = document.getElementById('pressure-trend');
    if (pressureVal) {
      pressureVal.innerHTML = `${cur.pressure_msl} <small>hPa</small>`;
      if (pressureTrend) {
        pressureTrend.textContent = cur.pressure_msl > 1015 ? 'High Pressure • Stable' : cur.pressure_msl < 1005 ? 'Low Pressure • Unstable' : 'Steady Barometer';
      }
    }

    // Lifestyle & AI Briefing
    const insightsDeck = document.getElementById('insights-deck');
    if (insightsDeck && data.insights) {
      insightsDeck.innerHTML = data.insights.map(item => {
        const iconKey = getLifestyleIcon(item.category);
        const iconSvg = getLucideSvg(iconKey, { width: 16, height: 16, 'stroke-width': 2.2 });
        return `
          <div class="lifestyle-item">
            <span class="lifestyle-icon">${iconSvg}</span>
            <div class="lifestyle-text-wrap">
              <span class="lifestyle-tag">${item.category}</span>
              <p class="lifestyle-msg">${item.message}</p>
            </div>
          </div>
        `;
      }).join('');
    }

    // Update Map
    updateRadarMap(data.latitude, data.longitude, data.place);

    // Update Monochrome Particle Canvas
    updateCanvasAtmosphere(cur.category, cur.is_day);

    // Refresh any declarative Lucide tags
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  /* =========================================================
     6. LEAFLET RADAR MAP ENGINE (MONOCHROME TILES)
     ========================================================= */
  function updateRadarMap(lat, lon, placeName) {
    const mapEl = document.getElementById('radar-map');
    if (!mapEl || typeof L === 'undefined') return;

    if (!state.leafletMap) {
      state.leafletMap = L.map('radar-map', {
        zoomControl: true,
        attributionControl: false
      }).setView([lat, lon], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(state.leafletMap);

      state.radarMarker = L.marker([lat, lon]).addTo(state.leafletMap);
      state.radarMarker.bindPopup(`<b>${placeName}</b><br>Atmospheric Radar Active`).openPopup();
    } else {
      state.leafletMap.setView([lat, lon], 10);
      if (state.radarMarker) {
        state.radarMarker.setLatLng([lat, lon]);
        state.radarMarker.bindPopup(`<b>${placeName}</b><br>Atmospheric Radar Active`).openPopup();
      }
      state.leafletMap.invalidateSize();
    }
  }

  /* =========================================================
     7. PROCEDURAL MONOCHROME PARTICLE CANVAS
     ========================================================= */
  const canvas = document.getElementById('weather-canvas');
  let ctx = canvas ? canvas.getContext('2d') : null;
  let particles = [];
  let currentTheme = 'clear';

  function initCanvas() {
    if (!canvas) return;
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    createParticles();
    animateCanvas();
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function updateCanvasAtmosphere(category) {
    currentTheme = category || 'clear';
    createParticles();
  }

  function createParticles() {
    particles = [];
    const count = currentTheme === 'rain' ? 90 : currentTheme === 'snow' ? 60 : 35;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * (canvas?.width || window.innerWidth),
        y: Math.random() * (canvas?.height || window.innerHeight),
        speedX: currentTheme === 'rain' ? 1.2 : (Math.random() - 0.5) * 0.5,
        speedY: currentTheme === 'rain' ? Math.random() * 7 + 5 : currentTheme === 'snow' ? Math.random() * 2 + 0.8 : (Math.random() - 0.5) * 0.3,
        size: currentTheme === 'rain' ? Math.random() * 10 + 6 : currentTheme === 'snow' ? Math.random() * 2.5 + 1 : Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.6 + 0.2
      });
    }
  }

  function animateCanvas() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentTheme === 'rain') {
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const p of particles) {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.speedX * 2, p.y + p.size);
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
      }
      ctx.stroke();
    } else if (currentTheme === 'snow') {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.speedY;
        p.x += Math.sin(p.y * 0.02) * 0.3;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
      }
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }
    }

    requestAnimationFrame(animateCanvas);
  }

  /* =========================================================
     8. AMBIENT AUDIO SYNTHESIZER
     ========================================================= */
  function toggleAmbientAudio() {
    state.soundEnabled = !state.soundEnabled;
    if (soundIconWrap) {
      soundIconWrap.innerHTML = state.soundEnabled 
        ? getLucideSvg('volume-2', { width: 16, height: 16, 'stroke-width': 2.2 })
        : getLucideSvg('volume-x', { width: 16, height: 16, 'stroke-width': 2.2 });
    }

    if (state.soundEnabled) {
      startAudioSynth();
    } else {
      stopAudioSynth();
    }
  }

  function startAudioSynth() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!state.audioCtx) state.audioCtx = new AudioCtx();
      if (state.audioCtx.state === 'suspended') state.audioCtx.resume();

      const bufferSize = state.audioCtx.sampleRate * 2;
      const buffer = state.audioCtx.createBuffer(1, bufferSize, state.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = state.audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = state.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, state.audioCtx.currentTime);

      const gain = state.audioCtx.createGain();
      gain.gain.setValueAtTime(0.035, state.audioCtx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(state.audioCtx.destination);

      noise.start();
      state.audioNodes = { noise, gain, filter };
    } catch (e) {
      console.warn('Audio synth failed:', e);
    }
  }

  function stopAudioSynth() {
    if (state.audioNodes && state.audioNodes.noise) {
      try {
        state.audioNodes.noise.stop();
      } catch (e) {}
      state.audioNodes = null;
    }
  }

  if (btnSound) btnSound.addEventListener('click', toggleAmbientAudio);

  /* =========================================================
     9. BOOTSTRAP
     ========================================================= */
  function bootstrap() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
    initCanvas();
    setMode(state.currentMode);
    loadQueryWeather('Dubai');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();