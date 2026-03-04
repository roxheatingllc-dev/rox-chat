/**
 * Config Routes — Serves frontend configuration securely
 * API keys are stored in environment variables, never in client-side code.
 * 
 * Mount in your Express app:
 *   const configRoutes = require('./routes/config-routes');
 *   app.use('/api/widget-config', configRoutes);
 * 
 * Required environment variable:
 *   GOOGLE_MAPS_API_KEY=your_new_key_here
 * 
 * Multi-tenant ready: extend with tenant-specific config lookups.
 * 
 * Version: 1.0.0
 */

const express = require('express');
const router = express.Router();

// ============================================================
// CORS — allow your frontend domains to fetch the key
// ============================================================
const ALLOWED_ORIGINS = [
  'https://www.roxheating.com',
  'https://roxheating.com',
  'https://rox-chat-production.up.railway.app',
  'http://localhost:3000',  // Local dev
  'http://localhost:5500',  // VS Code Live Server
];

router.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ============================================================
// GET /api/widget-config/maps-key — Serves Google Maps API key
// ============================================================
// The key is restricted in Google Cloud Console to:
//   - HTTP referrers: roxheating.com/*, rox-chat-production.up.railway.app/*
//   - API restrictions: Maps JavaScript API, Places API only
// ============================================================
router.get('/maps-key', (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (!key) {
    console.error('[Config] GOOGLE_MAPS_API_KEY not set in environment');
    return res.status(503).json({ error: 'Maps configuration unavailable' });
  }

  // Cache for 1 hour — key doesn't change often
  res.setHeader('Cache-Control', 'public, max-age=3600');

  res.json({ key });
});

// ============================================================
// GET /api/config/health — Config service health check
// ============================================================
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mapsKeyConfigured: !!process.env.GOOGLE_MAPS_API_KEY,
    version: '1.0.0'
  });
});

module.exports = router;
