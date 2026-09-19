const path = require('path');
const express = require('express');
const hbs = require('hbs');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3003;

// Path definitions
const publicDir = path.join(__dirname, '../public');
const viewsPath = path.join(__dirname, '../template/views');
const partialsPath = path.join(__dirname, '../template/partials');

// Trust reverse proxy (Nginx, Cloudflare)
app.set('trust proxy', 1);

// 1. Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://unpkg.com',
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://unpkg.com',
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com',
          'data:'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.tile.openstreetmap.org',
          'https://unpkg.com',
          'https://images.unsplash.com',
          'https://flagcdn.com'
        ],
        connectSrc: [
          "'self'",
          'https://api.open-meteo.com',
          'https://geocoding-api.open-meteo.com',
          'https://air-quality-api.open-meteo.com',
          'https://nominatim.openstreetmap.org',
          'https://*.tile.openstreetmap.org'
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS configuration
app.use(cors({
  origin: true,
  methods: ['GET', 'HEAD']
}));

// 3. Performance: Compression middleware
app.use(compression());

// 4. Rate Limiting: protect weather endpoints against abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ErrorMessage: 'Too many requests from this IP. Please try again after a few minutes.'
  }
});

app.use('/weather', apiLimiter);

// 5. Template Engine Setup
hbs.registerPartials(partialsPath);
app.set('view engine', 'hbs');
app.set('views', viewsPath);

// Serve static assets with caching headers
app.use(express.static(publicDir, {
  maxAge: '1d',
  etag: true
}));

// 6. Routes
const indexRouter = require('./router/index');
const weatherRouter = require('./router/weather');

app.use('/', indexRouter);
app.use('/weather', weatherRouter);

// 7. Health check endpoint for uptime monitors
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 8. 404 Handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found',
    name: 'Feril Sunu'
  });
});

// 9. Centralized Error Handler (prevents leaking internal stack traces)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    ErrorMessage: 'An unexpected internal server error occurred.'
  });
});

// Server Initialization
const server = app.listen(port, () => {
  console.log(`Weather App is securely running on port ${port}`);
});

// Graceful termination
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;