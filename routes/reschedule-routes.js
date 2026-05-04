/**
 * Reschedule Routes (rox-chat side)
 * ==================================
 *
 * Proxy layer for the customer self-serve reschedule flow. The widget
 * (booking-widget.js running in reschedule mode) calls these endpoints
 * which forward to rox-ai-answering /api/engine/reschedule/*.
 *
 * Mirrors routes/booking-routes.js exactly so future maintainers see the
 * same shape twice instead of two diverging proxy patterns.
 *
 * Why proxy instead of widget-to-engine-direct
 * ---------------------------------------------
 * 1. Architectural consistency. Every other widget on the site (chat,
 *    booking, club-booking) uses the proxy pattern. Diverging here would
 *    force future maintainers to remember why this one is different.
 * 2. Multi-tenant SaaS readiness. When DispatchHQ launches, the proxy
 *    is where tenant-routing lives (widget calls a stable rox-chat URL,
 *    proxy decides which tenant's rox-ai-answering instance to forward
 *    to). Direct calls would require widget rebuild for SaaS.
 * 3. CORS simplicity. Adding rox-ai-answering as a CORS-allowed origin
 *    for WordPress is doable but error-prone (multiple deploy environments
 *    to keep in sync). The existing rox-chat CORS config already covers
 *    WordPress.
 *
 * Status code passthrough
 * -----------------------
 * The widget needs to distinguish between failure modes:
 *   401 -> token invalid/missing/expired -> generic "call us" card
 *   410 -> appointment passed / already rescheduled -> generic "call us" card
 *   409 -> slot taken between render and confirm -> refetch availability
 *   502 -> HCP failure -> generic "call us" card
 *   503 -> DB / availability service down -> generic "call us" card
 *   500 -> server bug -> generic "call us" card
 *
 * The reschedule-adapter throws on any non-2xx with the engine's status
 * code attached as `err.status`. Each route handler below catches and
 * forwards that status so the widget gets the same code the engine
 * generated. Don't collapse non-200s into a generic 500 here -- the
 * widget's switch on status code is how it picks the right failure card.
 */

'use strict';

const express = require('express');
const router = express.Router();
const adapter = require('../services/reschedule-adapter');

// ----------------------------------------------------------------------
// Rate limiter (per IP)
// ----------------------------------------------------------------------
// Same pattern + same generosity as booking-routes.js. Reschedule traffic
// is even more bursty than booking (a single widget mount can fire
// /load + /availability + /prewarm + multiple /confirm retries) so we
// keep the limit at 30/min/IP. Increase if real traffic shows we need it.
const rateLimits = new Map();
const RATE_LIMIT = 30;

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

// Periodic cleanup so rateLimits doesn't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - 120000;
  for (const [ip, timestamps] of rateLimits) {
    const filtered = timestamps.filter(t => t > cutoff);
    if (filtered.length === 0) rateLimits.delete(ip);
    else rateLimits.set(ip, filtered);
  }
}, 5 * 60 * 1000);

// ----------------------------------------------------------------------
// Helper: forward an engine error to the widget with the right status
// ----------------------------------------------------------------------
// The reschedule-adapter throws with err.status = engine's HTTP status.
// We forward that status verbatim so the widget can switch on it, AND
// we forward the engine's structured body (with `error` and optional
// `code` fields) so the widget knows WHICH 401/410/etc fired.
function forwardEngineError(err, res, fallbackMessage) {
  const status = err && typeof err.status === 'number' ? err.status : 500;
  const body = (err && err.body) || { error: fallbackMessage || 'request_failed' };
  // Log at warn for client-side errors (4xx) and error for server-side (5xx)
  // so monitoring can distinguish "customer hit an expired link" (warn) from
  // "engine is down" (error / page).
  const logFn = status >= 500 ? console.error : console.warn;
  logFn(`[RescheduleRoutes] Engine returned ${status}: ${JSON.stringify(body)}`);
  return res.status(status).json(body);
}

// ----------------------------------------------------------------------
// GET /api/reschedule/expand?slug=<slug>  (v2.12.3)
// ----------------------------------------------------------------------
// Resolves a customer-facing short slug into the full HMAC token. The
// dashboard's reschedule SMS now uses URLs like:
//     roxheating.com/reschedule?t=abc12345
// The widget detects the ?t=<slug> param on mount and calls this BEFORE
// /load. On success it stores the returned token in memory and proceeds
// exactly like the legacy ?token=<HMAC> flow.
//
// Backward compatibility: legacy ?token=<HMAC> URLs skip this step and
// go straight to /load. Both URL forms continue to work.
//
// Status passthrough: 400 missing_slug, 404 not_found, 503 db_unavailable.
// The widget treats 404 the same as a 401 from /load (generic 'this link
// can't be used right now' card).
router.get('/expand', rateLimit, async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) {
      return res.status(400).json({ error: 'missing_slug' });
    }
    const result = await adapter.expand(slug);
    res.json(result);
  } catch (err) {
    forwardEngineError(err, res, 'expand_failed');
  }
});

// ----------------------------------------------------------------------
// GET /api/reschedule/load?token=<HMAC>
// ----------------------------------------------------------------------
// First call from the widget on mount. Verifies the token, loads the
// reschedule_requests row + live HCP job, returns the context the widget
// needs to render its header and pick which tech-tag pool to fetch
// availability from.
router.get('/load', rateLimit, async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(401).json({ error: 'token_missing', message: 'Missing token parameter.' });
    }
    const result = await adapter.load(token);
    res.json(result);
  } catch (err) {
    forwardEngineError(err, res, 'load_failed');
  }
});

// ----------------------------------------------------------------------
// POST /api/reschedule/availability  body: { token, daysAhead? }
// ----------------------------------------------------------------------
// Called after /load to populate the calendar. Server filters slots
// through the weather-eligibility engine so cold-forecast days are
// silently dropped (customer doesn't see them at all -- no separate
// "blocked" UI, just "not offered").
router.post('/availability', rateLimit, async (req, res) => {
  try {
    const { token, daysAhead } = req.body || {};
    if (!token) {
      return res.status(401).json({ error: 'token_missing', message: 'Missing token in request body.' });
    }
    const result = await adapter.availability(token, daysAhead);
    res.json(result);
  } catch (err) {
    forwardEngineError(err, res, 'availability_failed');
  }
});

// ----------------------------------------------------------------------
// POST /api/reschedule/confirm  body: { token, slotStartISO }
// ----------------------------------------------------------------------
// Customer's commitment point. Server re-verifies the token, re-checks
// eligibility, re-checks slot availability (returns 409 if taken between
// render and confirm), moves the HCP job, marks the DB row rescheduled,
// fires the office notification email AFTER HCP move succeeds.
//
// Token is NOT invalidated on success -- per Q5 locked design, customer
// can come back and re-reschedule within the 60-day window. The DB row's
// `rescheduled_at` and `new_scheduled_start` fields just record the most
// recent move.
router.post('/confirm', rateLimit, async (req, res) => {
  try {
    const { token, slotStartISO } = req.body || {};
    if (!token) {
      return res.status(401).json({ error: 'token_missing', message: 'Missing token in request body.' });
    }
    if (!slotStartISO) {
      return res.status(400).json({ error: 'missing_slot' });
    }
    const result = await adapter.confirm(token, slotStartISO);
    res.json(result);
  } catch (err) {
    forwardEngineError(err, res, 'confirm_failed');
  }
});

// ----------------------------------------------------------------------
// POST /api/reschedule/prewarm  body: { daysAhead? }
// ----------------------------------------------------------------------
// Fire-and-forget climatology cache warm. Called when the widget mounts
// so the calendar's first render doesn't wait on 14 sequential cold-cache
// fan-outs to Open-Meteo's archive API. Always returns 202.
//
// Deliberately NOT token-required: the data being warmed is climatology
// averages keyed on lat/lon, which is not customer-specific. The engine
// caps daysAhead at 60 to defend against abuse.
router.post('/prewarm', rateLimit, async (req, res) => {
  try {
    const { daysAhead } = req.body || {};
    const result = await adapter.prewarm(daysAhead);
    // Adapter catches its own errors and returns { ok: false, prewarmFailed: true }
    // on failure -- forward as 200 either way because prewarm is best-effort.
    res.json(result);
  } catch (err) {
    // Should never reach here (adapter swallows) but defensive: still 200
    // because prewarm failures are non-fatal and shouldn't surface as
    // errors to the widget.
    console.warn('[RescheduleRoutes] Prewarm route caught (unexpected):', err.message);
    res.json({ ok: false, prewarmFailed: true });
  }
});

// ----------------------------------------------------------------------
// GET /api/reschedule/health
// ----------------------------------------------------------------------
// Cheap sanity check. Tries an unauthenticated load with a dummy token
// and expects a 401 back -- if engine is reachable, we get 401; if engine
// is down we get an error from the adapter.
router.get('/health', async (req, res) => {
  try {
    await adapter.load('healthcheck-not-a-real-token');
    // If we somehow got 200 from a fake token, engine is broken.
    res.json({ status: 'degraded', engine: 'unexpected_response' });
  } catch (err) {
    if (err && err.status === 401) {
      // Expected -- engine rejected our fake token, which means it's alive
      res.json({ status: 'ok', engine: 'connected' });
    } else {
      res.json({ status: 'degraded', engine: 'unreachable', error: err.message });
    }
  }
});

module.exports = router;
