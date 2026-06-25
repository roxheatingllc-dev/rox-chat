/**
 * Booking API Routes (rox-chat side)
 * Proxies booking wizard requests to the engine API.
 * Handles rate limiting, validation, and CORS.
 * 
 * v1.1.0 — Added /abandon proxy for abandonment notifications
 * v1.2.0 — Added /check-area proxy (service-area + GoodFellas referral
 *          decision; the engine owns the logic). v2.22.74 cross-channel parity.
 */

const express = require('express');
const router = express.Router();
const bookingAdapter = require('../services/booking-adapter');

// ========================================
// Rate limiter (per IP, more generous than chat)
// ========================================
const rateLimits = new Map();
const RATE_LIMIT = 30; // 30 requests per minute (availability checks are frequent)

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - 60000;

  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, []);
  }

  const timestamps = rateLimits.get(ip).filter(t => t > windowStart);
  
  if (timestamps.length >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  timestamps.push(now);
  rateLimits.set(ip, timestamps);
  next();
}

// Clean up rate limits every 5 min
setInterval(() => {
  const cutoff = Date.now() - 120000;
  for (const [ip, timestamps] of rateLimits) {
    const filtered = timestamps.filter(t => t > cutoff);
    if (filtered.length === 0) rateLimits.delete(ip);
    else rateLimits.set(ip, filtered);
  }
}, 5 * 60 * 1000);

// ========================================
// POST /api/booking/start
// ========================================
router.post('/start', rateLimit, async (req, res) => {
  try {
    const { tenantId } = req.body;
    const result = await bookingAdapter.startSession(tenantId || 'rox-heating');
    res.json(result);
  } catch (err) {
    console.error('[BookingRoutes] Start error:', err.message);
    res.status(500).json({ error: 'Failed to start booking session' });
  }
});

// ========================================
// POST /api/booking/lookup-customer
// ========================================
router.post('/lookup-customer', rateLimit, async (req, res) => {
  try {
    const { sessionId, phone } = req.body;
    
    if (!sessionId || !phone) {
      return res.status(400).json({ error: 'Missing sessionId or phone' });
    }
    
    const result = await bookingAdapter.lookupCustomer(sessionId, phone);
    res.json(result);
  } catch (err) {
    console.error('[BookingRoutes] Lookup error:', err.message);
    res.status(500).json({ error: 'Failed to look up customer' });
  }
});

// ========================================
// GET /api/booking/availability
// ========================================
router.get('/availability', rateLimit, async (req, res) => {
  try {
    const { sessionId, tag, startDate, days } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    const result = await bookingAdapter.getAvailability(sessionId, {
      tag, startDate, days: days || 14
    });
    res.json(result);
  } catch (err) {
    console.error('[BookingRoutes] Availability error:', err.message);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// ========================================
// POST /api/booking/update-session
// ========================================
router.post('/update-session', rateLimit, async (req, res) => {
  try {
    const { sessionId, updates, step } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    const result = await bookingAdapter.updateSession(sessionId, updates, step);
    res.json(result);
  } catch (err) {
    console.error('[BookingRoutes] Update error:', err.message);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// ========================================
// POST /api/booking/confirm
// ========================================
router.post('/confirm', rateLimit, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    const result = await bookingAdapter.confirmBooking(sessionId);
    res.json(result);
  } catch (err) {
    console.error('[BookingRoutes] Confirm error:', err.message);
    res.status(500).json({ error: 'Failed to confirm booking' });
  }
});

// ========================================
// POST /api/booking/warranty-check
// Called by widget when 0-2yr customer says ROX installed their system.
// Proxies to engine, which sends the office email and terminates the session.
// ========================================
router.post('/warranty-check', rateLimit, async (req, res) => {
  try {
    const result = await bookingAdapter.request('POST', '/warranty-check', req.body);
    res.json(result);
  } catch (err) {
    console.error('[BookingRoutes] Warranty-check error:', err.message);
    res.status(500).json({ error: 'Failed to process warranty check' });
  }
});

// ========================================
// POST /api/booking/check-area — Service-area + referral decision (proxy)
// Pure check (zip + city in, decision out). The engine owns the logic via
// config/service-areas.js + config/referral-partner.js. v2.22.74.
// ========================================
router.post('/check-area', rateLimit, async (req, res) => {
  try {
    const result = await bookingAdapter.request('POST', '/check-area', req.body);
    res.json(result);
  } catch (err) {
    console.error('[BookingRoutes] Check-area error:', err.message);
    // Fail open on a proxy/engine hiccup so a real customer is never blocked.
    // The widget treats inArea:true as "proceed".
    res.status(200).json({
      inArea: true,
      cityServiced: false,
      matchedCity: null,
      referral: { enabled: false, offerText: null, numberText: null },
      _error: 'proxy_failed'
    });
  }
});

// ========================================
// POST /api/booking/message — Send message to office (proxy)
// ========================================
router.post('/message', rateLimit, async (req, res) => {
  try {
    const result = await bookingAdapter.request('POST', '/message', req.body);
    res.json(result);
  } catch (err) {
    console.error('[BookingRoutes] Message error:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ========================================
// POST /api/booking/abandon — Proxy to engine
// Called by booking widget on page unload or close
// ========================================
router.post('/abandon', async (req, res) => {
  try {
    const { sessionId, reason } = req.body || {};
    if (!sessionId) return res.json({ ok: true });

    bookingAdapter.request('POST', '/abandon', { sessionId, reason })
      .catch(e => console.error('[BookingRoutes] Abandon proxy error:', e.message));

    res.json({ ok: true });
  } catch (err) {
    console.error('[BookingRoutes] Abandon error:', err.message);
    res.json({ ok: true });
  }
});

// ========================================
// GET /api/booking/health
// ========================================
router.get('/health', async (req, res) => {
  const engineHealthy = await bookingAdapter.checkHealth();
  res.json({
    status: engineHealthy ? 'ok' : 'degraded',
    engine: engineHealthy ? 'connected' : 'unreachable'
  });
});

module.exports = router;
