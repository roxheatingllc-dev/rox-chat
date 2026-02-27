/**
 * Booking Adapter
 * Proxies booking wizard requests from rox-chat to the rox-ai-answering engine.
 * 
 * Architecture:
 *   [Booking Widget] → [rox-chat /api/booking] → [this adapter] → [engine /api/engine/booking]
 * 
 * Multi-tenant ready: tenantId flows through all requests
 */

const ENGINE_URL = process.env.ENGINE_API_URL || 'http://localhost:3000/api/engine';

class BookingAdapter {
  constructor() {
    this.engineUrl = ENGINE_URL;
    console.log(`[BookingAdapter] Engine URL: ${this.engineUrl}`);
  }

  /**
   * Generic request to the engine booking API
   */
  async request(method, path, body = null, queryParams = null) {
    let url = `${this.engineUrl}/booking${path}`;
    
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000) // 30s for availability lookups
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Engine returned ${res.status}: ${errText}`);
    }

    return await res.json();
  }

  /**
   * Start a booking session
   */
  async startSession(tenantId) {
    return this.request('POST', '/start', { tenantId });
  }

  /**
   * Look up existing customer by phone
   */
  async lookupCustomer(sessionId, phone) {
    return this.request('POST', '/lookup-customer', { sessionId, phone });
  }

  /**
   * Get available time slots
   */
  async getAvailability(sessionId, options = {}) {
    const params = { sessionId };
    if (options.tag) params.tag = options.tag;
    if (options.startDate) params.startDate = options.startDate;
    if (options.days) params.days = options.days.toString();
    
    return this.request('GET', '/availability', null, params);
  }

  /**
   * Update session data (save step progress)
   */
  async updateSession(sessionId, updates, step) {
    return this.request('POST', '/update-session', { sessionId, updates, step });
  }

  /**
   * Confirm booking (create job in HCP)
   */
  async confirmBooking(sessionId) {
    return this.request('POST', '/confirm', { sessionId });
  }

  /**
   * Health check
   */
  async checkHealth() {
    try {
      const data = await this.request('GET', '/health');
      return data.status === 'ok';
    } catch {
      return false;
    }
  }
}

module.exports = new BookingAdapter();
