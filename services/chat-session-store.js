/**
 * Chat Session Store
 * In-memory session management with TTL cleanup.
 * Swap to Redis for multi-tenant SaaS scaling.
 */

class ChatSessionStore {
  constructor() {
    this.sessions = new Map();
    this.maxAge = 30 * 60 * 1000; // 30 minutes

    // Cleanup expired sessions every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Create a new session
   */
  create(sessionId, tenantId) {
    const session = {
      id: sessionId,
      tenantId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0
    };
    this.sessions.set(sessionId, session);
    console.log(`[ChatSessions] Created session: ${sessionId} for tenant: ${tenantId}`);
    return session;
  }

  /**
   * Get a session by ID
   */
  get(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if expired
    if (Date.now() - session.lastActivity > this.maxAge) {
      this.sessions.delete(sessionId);
      console.log(`[ChatSessions] Session expired: ${sessionId}`);
      return null;
    }

    // Touch last activity
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Update session data
   */
  update(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, data);
      session.lastActivity = Date.now();
    }
    return session;
  }

  /**
   * Increment message count
   */
  incrementMessages(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messageCount++;
      session.lastActivity = Date.now();
    }
  }

  /**
   * Delete a session
   */
  delete(sessionId) {
    this.sessions.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > this.maxAge) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[ChatSessions] Cleaned ${cleaned} expired sessions. Active: ${this.sessions.size}`);
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      mode: 'memory'
    };
  }

  /**
   * Shutdown cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = new ChatSessionStore();
