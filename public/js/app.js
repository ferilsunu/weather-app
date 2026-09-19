/**
 * WEATHER PLATFORM - CORE FRONTEND ENGINE
 * Dual-Mode (2020 Vintage / 2026 NextGen)
 * Author: Feril Sunu
 */

(function () {
  'use strict';

  // State Management
  const state = {
    currentMode: localStorage.getItem('weather_app_mode') || '2026',
    unit: localStorage.getItem('weather_app_unit') || 'C', // 'C' or 'F'
    soundEnabled: false,
    currentWeatherData: null,
    leafletMap: null,
    radarMarker: null,
    searchDebounceTimer: null,
    audioCtx: null,
    audioNodes: null
  };

  // Weather condition icons mapping
  const GLYPHS = {
    sun: '☀️',
    'sun-dim': '🌤️',
    'cloud-sun': '⛅',
    'cloud-moon': '☁️',
    moon: '🌙',
    'moon-dim': '🌘',
    cloud: '☁️',
    'cloud-fog': '🌫️',
    'cloud-drizzle': '🌦️',
    'cloud-rain': '🌧️',
    'cloud-lightning-rain': '⛈️',
    'cloud-lightning': '🌩️',
    'cloud-snow': '🌨️',
    snowflake: '❄️'
  };

  // Country code to Flag Emoji helper
  function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  // Temperature Unit Conversion
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

  /* =========================================================
     1. ERA MODE SWITCHER (2020 vs 2026)
     ========================================================= */
  const btnMode2020 = document.getElementById('btn-mode-2020');
  const btnMode2026 = document.getElementById('btn-mode-2026');
  const view2020 = document.getElementById('view-2020');
  const view2026 = document.getElementById('view-2026');
  const eraPill = document.querySelector('.era-slider-pill');
  const btnUnit = document.getElementById('btn-unit-toggle');
  const unitLabel = document.getElementById('unit-label');
  const btnSound = document.getElementById('btn-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');

  function updateEraPill(mode) {
    if (!eraPill) return;
    if (mode === '2020') {
      eraPill.style.left = '4px';
      eraPill.style.width = `${btnMode2020.offsetWidth}px`;
    } else {
      eraPill.style.left = `${btnMode2020.offsetLeft + btnMode2020.offsetWidth + 4}px`;
      eraPill.style.width = `${btnMode2026.offsetWidth}px`;
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
  }

  btnMode2020.addEventListener('click', () => setMode('2020'));
  btnMode2026.addEventListener('click', () => setMode('2026'));
  window.addEventListener('resize', () => updateEraPill(state.currentMode));

  // Unit Toggle
  btnUnit.addEventListener('click', () => {
    state.unit = state.unit === 'C' ? 'F' : 'C';
    localStorage.setItem('weather_app_unit', state.unit);
    unitLabel.textContent = `°${state.unit}`;
    if (state.currentWeatherData) {
      render2026Dashboard(state.currentWeatherData);
    }
  });

  /* =========================================================
     2. 2020 VINTAGE LOGIC (100% Backwards Compatible)
     ========================================================= */
  const form2020 = document.getElementById('form-2020') || document.querySelector('#view-2020 form');
  const input2020 = document.getElementById('input-2020') || document.querySelector('#view-2020 input[type="text"]');
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
        .catch((err) => {
          temp2020.textContent = 'Unable to connect to weather services.';
        });
    });
  }

  /* =========================================================
     3. 2026 NEXTGEN FUTURISTIC CONTROLLER
     ========================================================= */
  const input2026 = document.getElementById('input-2026');
  const autocompleteList = document.getElementById('autocomplete-list');
  const btnGeoDetect = document.getElementById('btn-geo-detect');
  const cityChips = document.querySelectorAll('.city-chip');

  // Search autocomplete debouncer
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
                  <span class="country-flag-badge">${getFlagEmoji(item.country_code)}</span>
                </div>
              `).join('');
              autocompleteList.classList.add('show');
            } else {
              autocompleteList.classList.remove('show');
            }
          })
          .catch(() => autocompleteList.classList.remove('show'));
      }, 250);
    });

    // Handle autocomplete selection
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

    // Enter key triggers immediate search
    input2026.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = input2026.value.trim();
        if (!query) return;
        autocompleteList.classList.remove('show');
        loadQueryWeather(query);
      }
    });

    // Close autocomplete on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-command-box')) {
        autocompleteList.classList.remove('show');
      }
    });
  }

  // Quick Popular Cities Chips
  cityChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const city = chip.getAttribute('data-city');
      if (input2026) input2026.value = city;
      loadQueryWeather(city);
    });
  });

  // GPS Geolocation Button
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
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          loadReverseWeather(lat, lon);
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
     4. DATA FETCHING HELPERS
     ========================================================= */
  function loadQueryWeather(query) {
    setLoadingState(true);
    fetch(`/weather?search=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        setLoadingState(false);
        if (data.ErrorMessage) {
          alert(data.ErrorMessage);
          return;
        }
        if (data.data) {
          state.currentWeatherData = data.data;
          render2026Dashboard(data.data);
        }
        // Update 2020 fields as well
        if (place2020) place2020.textContent = `${data.Place}, ${data.Country}`;
        if (temp2020) temp2020.innerHTML = `${data.Temperature}<sup>°</sup>`;
      })
      .catch(err => {
        setLoadingState(false);
        console.error('Weather load error:', err);
      });
  }

  function loadCoordinatesWeather(lat, lon, name, country) {
    setLoadingState(true);
    fetch(`/weather/detailed?lat=${lat}&lon=${lon}&city=${encodeURIComponent(name)}&country=${encodeURIComponent(country)}`)
      .then(res => res.json())
      .then(res => {
        setLoadingState(false);
        if (res.data) {
          state.currentWeatherData = res.data;
          render2026Dashboard(res.data);
          if (place2020) place2020.textContent = `${res.data.place}, ${res.data.country}`;
          if (temp2020) temp2020.innerHTML = `${res.data.current.temperature}<sup>°</sup>`;
        }
      })
      .catch(() => setLoadingState(false));
  }

  function loadReverseWeather(lat, lon) {
    setLoadingState(true);
    fetch(`/weather/reverse?lat=${lat}&lon=${lon}`)
      .then(res => res.json())
      .then(res => {
        setLoadingState(false);
        if (res.data) {
          state.currentWeatherData = res.data;
          render2026Dashboard(res.data);
          if (input2026) input2026.value = `${res.data.place}, ${res.data.country}`;
          if (place2020) place2020.textContent = `${res.data.place}, ${res.data.country}`;
          if (temp2020) temp2020.innerHTML = `${res.data.current.temperature}<sup>°</sup>`;
        }
      })
      .catch(() => setLoadingState(false));
  }

  function setLoadingState(isLoading) {
    const heroCondition = document.getElementById('hero-condition');
    if (heroCondition && isLoading) {
      heroCondition.textContent = 'Syncing atmospheric telemetry...';
    }
  }

  /* =========================================================
     5. 2026 DASHBOARD RENDERING PIPELINE
     ========================================================= */
  function render2026Dashboard(data) {
    if (!data || !data.current) return;

    const cur = data.current;
    const dailyToday = data.daily && data.daily[0];

    // 1. Hero Overview
    const heroCity = document.getElementById('hero-city');
    const heroFlag = document.getElementById('hero-flag');
    const heroLocalTime = document.getElementById('hero-local-time');
    const heroCoords = document.getElementById('hero-coords');
    const heroGlyphBox = document.getElementById('hero-glyph-box');
    const heroTemp = document.getElementById('hero-temp');
    const heroCondition = document.getElementById('hero-condition');
    const heroFeelsLike = document.getElementById('hero-feels-like');
    const heroMinMax = document.getElementById('hero-min-max');
    const heroCloudCover = document.getElementById('hero-cloud-cover');
    const heroPressure = document.getElementById('hero-pressure');

    if (heroCity) heroCity.textContent = data.place;
    if (heroFlag) heroFlag.textContent = getFlagEmoji(data.country);
    if (heroCoords) heroCoords.textContent = `${data.latitude.toFixed(2)}°N, ${data.longitude.toFixed(2)}°E`;
    if (heroLocalTime) {
      const now = new Date();
      heroLocalTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    if (heroGlyphBox) {
      const glyph = GLYPHS[cur.icon] || (cur.is_day ? '☀️' : '🌙');
      heroGlyphBox.innerHTML = `<span class="animated-glyph" style="font-size: 72px;">${glyph}</span>`;
    }

    if (heroTemp) heroTemp.textContent = formatTemp(cur.temperature);
    if (heroCondition) heroCondition.textContent = cur.condition;
    if (heroFeelsLike) heroFeelsLike.textContent = `${formatTemp(cur.feels_like)}${getUnitSymbol()}`;
    if (heroMinMax && dailyToday) {
      heroMinMax.textContent = `${formatTemp(dailyToday.temp_min)}° / ${formatTemp(dailyToday.temp_max)}${getUnitSymbol()}`;
    }
    if (heroCloudCover) heroCloudCover.textContent = `${cur.cloud_cover}%`;
    if (heroPressure) heroPressure.textContent = `${cur.pressure_msl} hPa`;

    // 2. Render Hourly Deck
    const hourlyDeck = document.getElementById('hourly-deck');
    if (hourlyDeck && data.hourly) {
      hourlyDeck.innerHTML = data.hourly.slice(0, 24).map((h, i) => {
        const timeStr = h.time.split('T')[1].slice(0, 5);
        const icon = GLYPHS[h.icon] || (h.is_day ? '☀️' : '🌙');
        return `
          <div class="hourly-item ${i === 0 ? 'now' : ''}">
            <span class="h-time">${i === 0 ? 'Now' : timeStr}</span>
            <span class="h-icon">${icon}</span>
            <span class="h-temp">${formatTemp(h.temperature)}°</span>
            <span class="h-precip">${h.precipitation_probability > 0 ? h.precipitation_probability + '%' : '0%'}</span>
          </div>
        `;
      }).join('');
    }

    // 3. Render 7-Day Extended Outlook
    const dailyDeck = document.getElementById('daily-deck');
    if (dailyDeck && data.daily) {
      const allMax = Math.max(...data.daily.map(d => d.temp_max));
      const allMin = Math.min(...data.daily.map(d => d.temp_min));
      const range = Math.max(allMax - allMin, 1);

      dailyDeck.innerHTML = data.daily.slice(0, 7).map((d, idx) => {
        const dateObj = new Date(d.date);
        const dayName = idx === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const icon = GLYPHS[d.icon] || '☀️';
        
        const leftPercent = Math.max(0, ((d.temp_min - allMin) / range) * 100);
        const widthPercent = Math.max(15, ((d.temp_max - d.temp_min) / range) * 100);

        return `
          <div class="daily-row">
            <div class="d-day-group">
              <span class="d-day-name">${dayName}</span>
              <span class="d-day-date">${dateFormatted}</span>
            </div>
            <span class="d-icon">${icon}</span>
            <div class="d-bar-track">
              <span class="d-min">${formatTemp(d.temp_min)}°</span>
              <div class="d-range-bar">
                <div class="d-range-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
              </div>
              <span class="d-max">${formatTemp(d.temp_max)}°</span>
            </div>
            <span class="d-condition">${d.condition}</span>
          </div>
        `;
      }).join('');
    }

    // 4. Render Diagnostics Matrix
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
      let color = '#10b981';
      if (aqi > 150) { cat = 'Unhealthy'; color = '#f43f5e'; }
      else if (aqi > 100) { cat = 'Sensitive'; color = '#f59e0b'; }
      else if (aqi > 50) { cat = 'Moderate'; color = '#fbbf24'; }
      
      if (aqiCat) { aqiCat.textContent = cat; aqiCat.style.color = color; }
      if (aqiBarFill) { aqiBarFill.style.width = `${Math.min(100, (aqi / 250) * 100)}%`; }
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
      else if (uv >= 6) { label = 'High'; advice = 'Sunscreen, hat, and sunglasses needed.'; }
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
      windSpeed.innerHTML = `${cur.wind_speed_10m} <span class="unit-sm">km/h</span>`;
      if (windDir) windDir.textContent = `Direction: ${cur.wind_direction_10m}°`;
      if (windGusts) windGusts.textContent = `Gusts: ${cur.wind_gusts_10m} km/h`;
      if (needle) needle.style.transform = `rotate(${cur.wind_direction_10m}deg)`;
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

    // Solar Arc & Times
    const sunriseTime = document.getElementById('sunrise-time');
    const sunsetTime = document.getElementById('sunset-time');
    const sunOrb = document.getElementById('sun-orb');
    if (dailyToday && dailyToday.sunrise && sunriseTime && sunsetTime) {
      const sRise = dailyToday.sunrise.split('T')[1].slice(0, 5);
      const sSet = dailyToday.sunset.split('T')[1].slice(0, 5);
      sunriseTime.textContent = sRise;
      sunsetTime.textContent = sSet;

      // Calculate progress across daylight
      const now = new Date();
      const riseDate = new Date(dailyToday.sunrise);
      const setDate = new Date(dailyToday.sunset);
      const totalDaylight = setDate - riseDate;
      const currentDaylight = now - riseDate;
      const fraction = Math.max(0, Math.min(1, currentDaylight / totalDaylight));

      if (sunOrb) {
        // SVG curve x: 10 to 90, y: 45 down to 5 up to 45
        const cx = 10 + fraction * 80;
        const cy = 45 - Math.sin(fraction * Math.PI) * 35;
        sunOrb.setAttribute('cx', cx);
        sunOrb.setAttribute('cy', cy);
      }
    }

    // Moon Phase
    const moonGlyph = document.getElementById('moon-glyph');
    const moonName = document.getElementById('moon-name');
    const moonIllum = document.getElementById('moon-illum');
    if (data.moon_phase && moonName && moonIllum) {
      moonName.textContent = data.moon_phase.name;
      moonIllum.textContent = `${data.moon_phase.illumination}% Illumination`;
      const phases = {
        'New Moon': '🌑',
        'Waxing Crescent': '🌒',
        'First Quarter': '🌓',
        'Waxing Gibbous': '🌔',
        'Full Moon': '🌕',
        'Waning Gibbous': '🌖',
        'Last Quarter': '🌗',
        'Waning Crescent': '🌘'
      };
      if (moonGlyph) moonGlyph.textContent = phases[data.moon_phase.name] || '🌕';
    }

    // Precipitation & Pressure
    const precipVal = document.getElementById('precip-val');
    const precipProb = document.getElementById('precip-prob');
    if (precipVal) {
      precipVal.innerHTML = `${cur.precipitation} <span class="unit-sm">mm</span>`;
      if (precipProb && dailyToday) {
        precipProb.textContent = `${dailyToday.precipitation_probability_max}% chance today`;
      }
    }

    // Insights Briefing
    const insightsDeck = document.getElementById('insights-deck');
    if (insightsDeck && data.insights) {
      insightsDeck.innerHTML = data.insights.map(item => `
        <div class="insight-item">
          <div class="insight-icon-box">💡</div>
          <div class="insight-text-group">
            <span class="insight-category ${item.level}">${item.category}</span>
            <p class="insight-message">${item.message}</p>
          </div>
        </div>
      `).join('');
    }

    // 5. Update Interactive Leaflet Map
    updateRadarMap(data.latitude, data.longitude, data.place);

    // 6. Update Ambient Weather Animation Canvas
    updateCanvasAtmosphere(cur.category, cur.is_day);
  }

  /* =========================================================
     6. LEAFLET MAP RADAR INITIALIZATION
     ========================================================= */
  function updateRadarMap(lat, lon, placeName) {
    const mapEl = document.getElementById('radar-map');
    if (!mapEl || typeof L === 'undefined') return;

    if (!state.leafletMap) {
      state.leafletMap = L.map('radar-map', {
        zoomControl: true,
        attributionControl: false
      }).setView([lat, lon], 10);

      // Dark Matter OpenStreetMap Tile Layer
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
     7. DYNAMIC PROCEDURAL WEATHER CANVAS (2026)
     ========================================================= */
  const canvas = document.getElementById('weather-canvas');
  let ctx = canvas ? canvas.getContext('2d') : null;
  let particles = [];
  let currentTheme = 'clear';
  let isDaytime = true;
  let animFrameId = null;

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

  function updateCanvasAtmosphere(category, isDay) {
    currentTheme = category || 'clear';
    isDaytime = Boolean(isDay);
    createParticles();
  }

  function createParticles() {
    particles = [];
    const count = currentTheme === 'rain' ? 120 : currentTheme === 'snow' ? 80 : 50;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * (canvas?.width || window.innerWidth),
        y: Math.random() * (canvas?.height || window.innerHeight),
        speedX: currentTheme === 'rain' ? 2 : (Math.random() - 0.5) * 0.8,
        speedY: currentTheme === 'rain' ? Math.random() * 8 + 8 : currentTheme === 'snow' ? Math.random() * 2 + 1 : (Math.random() - 0.5) * 0.5,
        size: currentTheme === 'rain' ? Math.random() * 15 + 10 : currentTheme === 'snow' ? Math.random() * 3 + 1 : Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.7 + 0.2
      });
    }
  }

  function animateCanvas() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render themed particles
    if (currentTheme === 'rain') {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.speedY;
        p.x += Math.sin(p.y * 0.02) * 0.5;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
      }
    } else {
      // Clear starry/sun dust particles
      ctx.fillStyle = isDaytime ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.5)';
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }
    }

    animFrameId = requestAnimationFrame(animateCanvas);
  }

  /* =========================================================
     8. WEB AUDIO AMBIENT SYNTHESIZER
     ========================================================= */
  function toggleAmbientAudio() {
    state.soundEnabled = !state.soundEnabled;
    if (state.soundEnabled) {
      soundIcon.textContent = '🔊';
      startAudioSynth();
    } else {
      soundIcon.textContent = '🔈';
      stopAudioSynth();
    }
  }

  function startAudioSynth() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!state.audioCtx) state.audioCtx = new AudioContext();
      if (state.audioCtx.state === 'suspended') state.audioCtx.resume();

      // White noise buffer for rain/wind synthesis
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
      filter.frequency.setValueAtTime(450, state.audioCtx.currentTime);

      const gain = state.audioCtx.createGain();
      gain.gain.setValueAtTime(0.04, state.audioCtx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(state.audioCtx.destination);

      noise.start();
      state.audioNodes = { noise, gain, filter };
    } catch (e) {
      console.warn('Audio synth not supported or blocked:', e);
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

  if (btnSound) {
    btnSound.addEventListener('click', toggleAmbientAudio);
  }

  /* =========================================================
     9. KEYBOARD SHORTCUTS & INITIAL BOOT
     ========================================================= */
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (input2026) input2026.focus();
    } else if (e.key === 'm' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      setMode(state.currentMode === '2026' ? '2020' : '2026');
    }
  });

  // Initial Boot
  document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    setMode(state.currentMode);

    // Initial weather location: Dubai / default
    loadQueryWeather('Dubai');
  });

})();