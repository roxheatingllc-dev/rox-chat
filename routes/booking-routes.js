/**
 * Booking API Routes (rox-chat side)
 * Proxies booking wizard requests to the engine API.
 * Handles rate limiting, validation, and CORS.
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
