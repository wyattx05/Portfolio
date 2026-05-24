require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const morgan = require('morgan');
const pino = require('pino');
const path = require('path');
const crypto = require('crypto');

const contentApi = require('./api/content');

const logger = pino();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware: Security headers
app.use(helmet());

// Middleware: CORS with allowed origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3001').split(',');
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Middleware: Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Middleware: Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api', contentApi);

// Basic Auth for static admin panel
const basicAuthMiddleware = basicAuth({
  users: {
    [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'admin123',
  },
  challenge: true,
  realm: 'Portfolio CMS Admin',
});

function getAuthCookieValue() {
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS || 'admin123';
  const secret = process.env.SESSION_SECRET || pass;

  return crypto
    .createHmac('sha256', secret)
    .update(`${user}:${pass}`)
    .digest('hex');
}

// Static admin panel (protected)
app.use('/cms/admin', basicAuthMiddleware, (req, res, next) => {
  res.cookie('cms_auth', getAuthCookieValue(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
  next();
}, express.static(path.join(__dirname, 'admin')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error({ error: err }, 'Unhandled error');
  
  // Don't leak stack traces in production
  const isDev = process.env.NODE_ENV === 'development';
  const message = isDev ? err.message : 'Internal server error';
  
  res.status(err.status || 500).json({
    error: message,
    ...(isDev && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`CMS server running on port ${PORT}`);
  logger.info(`Admin panel: http://localhost:${PORT}/cms/admin`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
