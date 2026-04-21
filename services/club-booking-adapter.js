/**
 * Club Booking Adapter
 * =====================================================================
 *
 * HTTP client used by rox-chat's /api/club-booking routes to call
 * the rox-ai-answering engine at /api/engine/club-booking.
 *
 * Architecture:
 *   [Club Booking Widget]
 *        ↓
 *   [rox-chat /api/club-booking/*]      ← rate-limited, validated
 *        ↓ (this adapter)
 *   [rox-ai-answering /api/engine/club-booking/*]
 *        ↓
 *   [HousecallPro API]
 *
 * Multi-tenant ready: tenantId flows through every request.
 *
 * Version: 1.0.0
 * =====================================================================
 */

'use strict';

const ENGINE_URL = process.env.ENGINE_API_URL || 'http://localhost:3000/api/engine';

class ClubBookingAdapter {
  constructor() {
    this.engineUrl = ENGINE_URL;
    console.log(`[ClubBookingAdapter] Engine URL: ${this.engineUrl}/club-booking`);
  }

  /**
   * Generic request method. All other methods are convenience wrappers.
   * @param {string} method   HTTP verb
   * @param {string} path     leading slash, e.g. '/lookup-customer'
   * @param {object} [body]   JSON body for POSTs
   * @param {object} [query]  query-string params for GETs
   */
  async request(method, path, body = null, query = null) {
    let url = `${this.engineUrl}/club-booking${path}`;

    if (query) {
      const params = new URLSearchParams(query);
      url += `?${params.toString()}`;
    }

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      // 30s is generous — availability lookups are the slow path
      signal: AbortSignal.timeout(30000),
    };

    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Engine returned ${res.status}: ${errText}`);
    }
    return res.json();
  }

  // ---- Convenience wrappers ----

  /** POST /start — create session, get campaign config */
  async startSession(tenantId) {
    return this.request('POST', '/start', { tenantId });
  }

  /** POST /lookup-customer — phone search + PCC verify + age infer */
  async lookupCustomer(sessionId, phone) {
    return this.request('POST', '/lookup-customer', { sessionId, phone });
  }

  /** POST /select-address — pick which of multiple addresses */
  async selectAddress(sessionId, addressIndex) {
    return this.request('POST', '/select-address', { sessionId, addressIndex });
  }

  /** GET /availability — slots filtered to <= cutoff */
  async getAvailability(sessionId) {
    return this.request('GET', '/availability', null, { sessionId });
  }

  /** POST /confirm — create the $0 PCC job */
  async confirmBooking(sessionId, selectedSlot, weatherAcknowledged) {
    return this.request('POST', '/confirm', {
      sessionId,
      selectedSlot,
      weatherAcknowledged,
    });
  }

  /** POST /late-callback — send a lead instead of booking */
  async lateCallback(sessionId, message) {
    return this.request('POST', '/late-callback', { sessionId, message });
  }

  /** POST /abandon — fire-and-forget on widget close/unload */
  async abandon(sessionId, reason) {
    return this.request('POST', '/abandon', { sessionId, reason });
  }

  /** GET /health — liveness check */
  async checkHealth() {
    try {
      const data = await this.request('GET', '/health');
      return data.status === 'ok';
    } catch {
      return false;
    }
  }
}

module.exports = new ClubBookingAdapter();
