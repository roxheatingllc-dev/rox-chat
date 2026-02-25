/**
 * Chat Adapter - HTTP Bridge to Conversation Engine
 * 
 * Translates between chat widget requests and the
 * rox-ai-answering conversation engine via HTTP API.
 * 
 * Architecture:
 *   [Chat Widget] → [rox-chat server] → HTTP → [rox-ai-answering /api/engine]
 */

const chatConfig = require('../config/chat-config');

// Engine API base URL (set in environment)
const ENGINE_URL = process.env.ENGINE_API_URL || 'http://localhost:3000/api/engine';

class ChatAdapter {
  constructor() {
    this.engineUrl = ENGINE_URL;
    this.healthChecked = false;
    console.log(`[ChatAdapter] Engine URL: ${this.engineUrl}`);
  }

  /**
   * Check if engine is reachable
   */
  async checkHealth() {
    try {
      const res = await fetch(`${this.engineUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        this.healthChecked = true;
        console.log('[ChatAdapter] Engine is reachable');
        return true;
      }
      console.error(`[ChatAdapter] Engine health check failed: HTTP ${res.status}`);
      return false;
    } catch (err) {
      console.error(`[ChatAdapter] Engine unreachable at ${this.engineUrl}/health`);
      console.error(`[ChatAdapter] ${err.message}`);
      return false;
    }
  }

  /**
   * Start a new chat session via the engine API
   * @param {string} tenantId
   * @returns {Object} { sessionId, greeting, quickReplies }
   */
  async startSession(tenantId) {
    // Health check on first call
    if (!this.healthChecked) {
      await this.checkHealth();
    }

    try {
      const res = await fetch(`${this.engineUrl}/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Engine returned ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return {
        sessionId: data.sessionId,
        greeting: data.greeting || null,
        quickReplies: data.quickReplies || []
      };
    } catch (err) {
      console.error('[ChatAdapter] startSession error:', err.message);
      throw err;
    }
  }

  /**
   * Send a message to the engine and get the AI response
   * @param {string} sessionId
   * @param {string} message - User's text
   * @param {string} tenantId
   * @returns {Object} { message, quickReplies, booking, endChat }
   */
  async sendMessage(sessionId, message, tenantId) {
    try {
      const res = await fetch(`${this.engineUrl}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message, tenantId }),
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Engine returned ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return {
        message: data.message || "I'm sorry, I didn't catch that. Could you try again?",
        quickReplies: data.quickReplies || [],
        booking: data.booking || null,
        endChat: data.endChat || false,
        state: data.state || null
      };
    } catch (err) {
      console.error('[ChatAdapter] sendMessage error:', err.message);
      throw err;
    }
  }

  /**
   * Get session info from engine
   * @param {string} sessionId
   * @returns {Object|null}
   */
  async getSession(sessionId) {
    try {
      const res = await fetch(`${this.engineUrl}/chat/session/${sessionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('[ChatAdapter] getSession error:', err.message);
      return null;
    }
  }
}

// Export singleton
module.exports = new ChatAdapter();
