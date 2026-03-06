/**
 * Config Routes — Serves frontend configuration and address lookup securely
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
 * Version: 2.0.0 — Added address autocomplete endpoints
 */

const express = require('express');
const router = express.Router();
const https = require('https');

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
// Helper: fetch JSON from Google API
// ============================================================
function googleGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Invalid JSON from Google')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Google API timeout')); });
  });
}

// ============================================================
// GET /api/widget-config/maps-key — Serves Google Maps API key
// ============================================================
router.get('/maps-key', (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (!key) {
    console.error('[Config] GOOGLE_MAPS_API_KEY not set in environment');
    return res.status(503).json({ error: 'Maps configuration unavailable' });
  }

  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({ key });
});

// ============================================================
// GET /api/widget-config/address-suggest?q=4491+geddes
// Returns up to 3 address suggestions from Google Places
// Used by: booking widget dropdown, chat engine quick replies
// ============================================================
router.get('/address-suggest', async (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(503).json({ error: 'Maps not configured' });

  const q = (req.query.q || '').trim();
  if (q.length < 3) return res.json({ suggestions: [] });

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json`
      + `?input=${encodeURIComponent(q)}`
      + `&types=address`
      + `&components=country:us`
      + `&location=39.7392,-104.9903&radius=80000`  // Bias to Denver metro
      + `&key=${key}`;

    const data = await googleGet(url);

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[Config] Places API error:', data.status, data.error_message);
      return res.json({ suggestions: [] });
    }

    const suggestions = (data.predictions || []).slice(0, 3).map(p => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || ''
    }));

    res.json({ suggestions });
  } catch (err) {
    console.error('[Config] Address suggest error:', err.message);
    res.json({ suggestions: [] });
  }
});

// ============================================================
// GET /api/widget-config/address-details?placeId=ChIJ...
// Returns structured address components from a Google Place ID
// Used by: booking widget auto-fill, chat engine address parsing
// ============================================================
router.get('/address-details', async (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(503).json({ error: 'Maps not configured' });

  const placeId = (req.query.placeId || '').trim();
  if (!placeId) return res.status(400).json({ error: 'Missing placeId' });

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json`
      + `?place_id=${encodeURIComponent(placeId)}`
      + `&fields=address_components,formatted_address`
      + `&key=${key}`;

    const data = await googleGet(url);

    if (data.status !== 'OK') {
      console.error('[Config] Place Details error:', data.status);
      return res.json({ address: null });
    }

    const components = data.result?.address_components || [];
    const get = (type) => components.find(c => c.types.includes(type));

    const streetNumber = get('street_number')?.long_name || '';
    const route = get('route')?.long_name || '';
    const city = get('locality')?.long_name || get('sublocality')?.long_name || '';
    const state = get('administrative_area_level_1')?.short_name || 'CO';
    const zip = get('postal_code')?.long_name || '';

    res.json({
      address: {
        street: `${streetNumber} ${route}`.trim(),
        city,
        state,
        zip,
        formatted: data.result?.formatted_address || ''
      }
    });
  } catch (err) {
    console.error('[Config] Address details error:', err.message);
    res.json({ address: null });
  }
});

// ============================================================
// GET /api/widget-config/health — Config service health check
// ============================================================
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mapsKeyConfigured: !!process.env.GOOGLE_MAPS_API_KEY,
    version: '2.0.0'
  });
});

module.exports = router;
