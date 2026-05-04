/**
 * Reschedule Adapter
 * ==================
 *
 * Proxies customer self-serve reschedule requests from rox-chat to the
 * rox-ai-answering engine. Mirrors services/booking-adapter.js exactly so
 * future maintainers see two adapters with the same shape rather than one
 * adapter with conditional logic.
 *
 * Architecture
 * ------------
 *   [Booking Widget in reschedule mode]
 *           |
 *           v
 *   [rox-chat /api/reschedule/*]      <-- routes/reschedule-routes.js
 *           |
 *           v
 *   [this adapter]
 *           |
 *           v
 *   [rox-ai-answering /api/engine/reschedule/*]   <-- routes/reschedule-api.js
 *
 * The widget never talks to rox-ai-answering directly. All cross-cutting
 * concerns (CORS, rate limiting, future auth, future tenant routing) live
 * on the rox-chat side, just like booking. When DispatchHQ launches and
 * tenants get their own rox-ai-answering instances, the routing decision
 * lands HERE (in the adapter), not in the widget.
 *
 * Multi-tenant SaaS readiness
 * ----------------------------
 * The token already carries the row id (rid), and the row in
 * reschedule_requests is per-tenant. Adapter doesn't need to know the
 * tenant id explicitly today. When DispatchHQ multi-tenant lands, this
 * adapter will resolve the engine URL per tenant from a config lookup
 * keyed on a tenant id passed via the widget's bootstrap config.
 */

'use strict';

const ENGINE_URL = process.env.ENGINE_API_URL || 'http://localhost:3000/api/engine';

class RescheduleAdapter {
  constructor() {
    this.engineUrl = ENGINE_URL;
    console.log(`[RescheduleAdapter] Engine URL: ${this.engineUrl}`);
  }

  /**
   * Generic request to the engine reschedule API.
   *
   * Matches the booking-adapter pattern exactly so future maintainers see
   * one shape twice rather than two diverging shapes. The 30-second
   * AbortSignal timeout matches booking — availability lookups can take
   * 5-10 seconds against a cold cache (especially the first one of the
   * day after climatology cache reset).
   *
   * Throws on any non-2xx so the route handler can map to HTTP status
   * codes consistently. Specifically: a 401 from the engine (token
   * invalid/expired) needs to surface as a 401 to the widget so the
   * widget renders the right failure card. Same for 410 (appointment
   * passed / already rescheduled), 409 (slot taken), 502 (HCP failure).
   * The route handler is responsible for that status passthrough.
   */
  async request(method, path, body = null, queryParams = null) {
    let url = `${this.engineUrl}/reschedule${path}`;

    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);

    // Even on non-2xx we need to return the body so the route handler can
    // forward the engine's structured error response (with `error` and
    // optional `code` fields) to the widget. Without this, the widget
    // would only see "request failed" instead of the specific failure
    // mode it needs to switch on.
    let bodyJson;
    try {
      bodyJson = await res.json();
    } catch (e) {
      // Engine returned a non-JSON body (rare but defensive). Construct
      // a synthetic error object so the route handler still has
      // something structured to forward.
      bodyJson = { error: 'engine_invalid_response', _httpStatus: res.status };
    }

    if (!res.ok) {
      // Annotate with the HTTP status so the route handler can pass it
      // through. Throwing keeps callers' existing try/catch working.
      const err = new Error(bodyJson.error || `Engine returned ${res.status}`);
      err.status = res.status;
      err.body = bodyJson;
      throw err;
    }

    return bodyJson;
  }

  /**
   * Load reschedule context for a token. Returns the customer + appointment
   * info the widget needs to render its header and decide what to fetch
   * next. See routes/reschedule-api.js GET /load for the exact shape.
   */
  async load(token) {
    return this.request('GET', '/load', null, { token });
  }

  /**
   * Get available + weather-eligible slots for the given token's job.
   * Returns up to `daysAhead` days (default 30, server-capped at 60).
   * See routes/reschedule-api.js POST /availability.
   */
  async availability(token, daysAhead) {
    const body = { token };
    if (typeof daysAhead === 'number') body.daysAhead = daysAhead;
    return this.request('POST', '/availability', body);
  }

  /**
   * Confirm the customer's slot pick. Server moves the HCP job, marks the
   * DB row 'rescheduled' (token stays valid for 60 days for re-reschedule),
   * and fires the office notification email AFTER HCP move succeeds.
   * Returns 409 if the slot was taken between widget render and confirm
   * (per Q2 design); widget handles 409 by refetching availability.
   */
  async confirm(token, slotStartISO) {
    return this.request('POST', '/confirm', { token, slotStartISO });
  }

  /**
   * Resolve a short slug to its full HMAC token (v2.12.3+).
   *
   * The dashboard's reschedule SMS now uses URLs like:
   *     roxheating.com/reschedule?t=abc12345
   * The widget detects the ?t=<slug> param on mount and calls this to
   * swap the slug for the full token, then proceeds exactly like the
   * legacy ?token=<HMAC> flow. Backward compatible: legacy URLs that
   * already carry the full token skip this expand step entirely.
   *
   * Engine returns:
   *   200 { ok: true, token: '...' }   on success
   *   400 missing_slug                   if no slug query param
   *   404 not_found                      slug doesn't match any row
   *   503 db_unavailable                 Postgres is down
   *
   * The adapter's base request() throws on any non-2xx with err.status
   * set, so the route handler can pass the engine's status through to
   * the widget. The widget renders 404 the same as a 401 from /load
   * (generic 'this link can't be used right now' card).
   */
  async expand(slug) {
    return this.request('GET', '/expand', null, { slug });
  }

  /**
   * Fire-and-forget climatology pre-warm. Called when the widget mounts
   * so the calendar's first render doesn't wait for cold-cache fan-outs.
   * Always returns 202 from the engine. Adapter catches any error and
   * resolves silently because failing prewarm shouldn't block the widget.
   */
  async prewarm(daysAhead) {
    const body = {};
    if (typeof daysAhead === 'number') body.daysAhead = daysAhead;
    try {
      return await this.request('POST', '/prewarm', body);
    } catch (e) {
      // Prewarm is purely an optimization. Failure here just means the
      // first calendar render takes the cold-start hit. Log so we can
      // see it in monitoring but never propagate to the widget.
      console.warn(`[RescheduleAdapter] Prewarm failed (non-fatal): ${e.message}`);
      return { ok: false, prewarmFailed: true };
    }
  }
}

module.exports = new RescheduleAdapter();
