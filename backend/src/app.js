const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

const allowedOrigins = new Set(
  (process.env.CLIENT_URL || 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.set('trust proxy', 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found.' });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors)[0]?.message || 'Invalid data.';
    return response.status(400).json({ message });
  }
  if (error.code === 11000) {
    return response.status(409).json({ message: 'This email is already registered.' });
  }
  return response.status(500).json({ message: 'Something went wrong. Please try again.' });
});

module.exports = app;
