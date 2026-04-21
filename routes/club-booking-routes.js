/**
 * Club Booking Routes (rox-chat side)
 * =====================================================================
 *
 * Proxies club booking widget requests to the engine API. Same shape
 * as the regular booking-routes.js, completely separate router so the
 * two flows can never affect each other.
 *
 * Mounted in chat-server.js at:  /api/club-booking
 *
 * Version: 1.0.0
 * =====================================================================
 */

'use strict';

const express        = require('express');
const router         = express.Router();
const clubAdapter    = require('../services/club-booking-adapter');

// ============================================================
// Per-IP rate limiter (60/min — generous because availability
// checks fire often and the audience is pre-vetted members)
// ============================================================
const rateLimits = new Map();
const RATE_LIMIT = 60;

function rateLimit(req, res, next) {
  const ip  = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - 60_000;

  if (!rateLimits.has(ip)) rateLimits.set(ip, []);
  const timestamps = rateLimits.get(ip).filter(t => t > windowStart);

  if (timestamps.length >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  timestamps.push(now);
  rateLimits.set(ip, timestamps);
  next();
}

// Cleanup stale entries every 5 min
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [ip, timestamps] of rateLimits) {
    const filtered = timestamps.filter(t => t > cutoff);
    if (filtered.length === 0) rateLimits.delete(ip);
    else rateLimits.set(ip, filtered);
  }
}, 5 * 60 * 1000);


// ============================================================
// POST /start
// ============================================================
router.post('/start', rateLimit, async (req, res) => {
  try {
    const { tenantId } = req.body || {};
    const result = await clubAdapter.startSession(tenantId || 'rox-heating');
    res.json(result);
  } catch (err) {
    console.error('[ClubBookingRoutes] Start error:', err.message);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// ============================================================
// POST /lookup-customer
// ============================================================
router.post('/lookup-customer', rateLimit, async (req, res) => {
  try {
    const { sessionId, phone } = req.body || {};
    if (!sessionId || !phone) {
      return res.status(400).json({ error: 'Missing sessionId or phone' });
    }
    const result = await clubAdapter.lookupCustomer(sessionId, phone);
    res.json(result);
  } catch (err) {
    console.error('[ClubBookingRoutes] Lookup error:', err.message);
    res.status(500).json({ error: 'Failed to look up customer' });
  }
});

// ============================================================
// POST /select-address
// ============================================================
router.post('/select-address', rateLimit, async (req, res) => {
  try {
    const { sessionId, addressIndex } = req.body || {};
    if (!sessionId || addressIndex === undefined) {
      return res.status(400).json({ error: 'Missing sessionId or addressIndex' });
    }
    const result = await clubAdapter.selectAddress(sessionId, addressIndex);
    res.json(result);
  } catch (err) {
    console.error('[ClubBookingRoutes] select-address error:', err.message);
    res.status(500).json({ error: 'Failed to select address' });
  }
});

// ============================================================
// GET /availability
// ============================================================
router.get('/availability', rateLimit, async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
    const result = await clubAdapter.getAvailability(sessionId);
    res.json(result);
  } catch (err) {
    console.error('[ClubBookingRoutes] Availability error:', err.message);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// ============================================================
// POST /confirm
// ============================================================
router.post('/confirm', rateLimit, async (req, res) => {
  try {
    const { sessionId, selectedSlot, weatherAcknowledged } = req.body || {};
    if (!sessionId)         return res.status(400).json({ error: 'Missing sessionId' });
    if (!selectedSlot)      return res.status(400).json({ error: 'Missing selectedSlot' });
    if (!weatherAcknowledged) {
      return res.status(400).json({ error: 'Weather acknowledgement required' });
    }
    const result = await clubAdapter.confirmBooking(sessionId, selectedSlot, weatherAcknowledged);
    res.json(result);
  } catch (err) {
    console.error('[ClubBookingRoutes] Confirm error:', err.message);
    res.status(500).json({ error: 'Failed to confirm booking' });
  }
});

// ============================================================
// POST /late-callback
// ============================================================
router.post('/late-callback', rateLimit, async (req, res) => {
  try {
    const { sessionId, message } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
    const result = await clubAdapter.lateCallback(sessionId, message || '');
    res.json(result);
  } catch (err) {
    console.error('[ClubBookingRoutes] late-callback error:', err.message);
    res.status(500).json({ error: 'Failed to send callback request' });
  }
});

// ============================================================
// POST /abandon  (no rate limit — must always go through)
// ============================================================
router.post('/abandon', async (req, res) => {
  try {
    const { sessionId, reason } = req.body || {};
    if (!sessionId) return res.json({ ok: true });
    // Fire-and-forget — never make the user wait on this
    clubAdapter.abandon(sessionId, reason)
      .catch(e => console.error('[ClubBookingRoutes] Abandon proxy error:', e.message));
    res.json({ ok: true });
  } catch (err) {
    console.error('[ClubBookingRoutes] Abandon error:', err.message);
    res.json({ ok: true });
  }
});

// ============================================================
// GET /health
// ============================================================
router.get('/health', async (req, res) => {
  const engineHealthy = await clubAdapter.checkHealth();
  res.json({
    status: engineHealthy ? 'ok' : 'degraded',
    engine: engineHealthy ? 'connected' : 'unreachable',
  });
});

module.exports = router;
