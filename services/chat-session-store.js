/**
 * Chat Session Store
 * 
 * Manages chat sessions (separate from voice call sessions).
 * In-memory for standalone, swappable to Redis/PostgreSQL for SaaS.
 * 
 * MULTI-TENANT READY:
 * - Sessions are keyed by tenantId + sessionId
 * - Swap InMemoryStore for RedisStore or PostgresStore
 * - Session data includes tenantId for isolation
 * 
 * Session lifecycle:
 * 1. create() - New visitor opens chat widget
 * 2. get() - Each message retrieves session
 * 3. update() - After processing, save state
 * 4. destroy() - Chat ends or times out
 * 5. cleanup() - Periodic removal of expired sessions
 */

const { v4: uuidv4 } = require('uuid');

// ============================================
// SESSION TIMEOUT CONFIG
// ============================================
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;  // Clean every 5 minutes


// ============================================
// IN-MEMORY STORE (Standalone / Dev)
// ============================================
class InMemoryStore {
  constructor() {
    this.sessions = new Map();
    this._cleanupTimer = null;
  }

  /**
   * Create a new chat session
   * @param {string} tenantId - Tenant identifier
   * @param {Object} metadata - Initial session metadata
   * @returns {Object} Created session
   */
  async create(tenantId, metadata = {}) {
    const sessionId = uuidv4();
    const now = Date.now();

    const session = {
      sessionId,
      tenantId,
      createdAt: now,
      lastActivityAt: now,
      status: 'active',        // active | ended | expired
      
      // Chat-specific fields
      visitorPhone: null,       // Collected during chat
      visitorName: null,
      
      // ConversationManager instance reference key
      managerId: null,
      
      // Message history (for re-rendering on page reload)
      messages: [],
      
      // Current conversation state (mirrors ConversationManager state)
      conversationState: null,
      
      // Metadata (browser info, referrer, etc.)
      metadata: {
        ...metadata,
        userAgent: metadata.userAgent || null,
        referrer: metadata.referrer || null,
        page: metadata.page || null,
      },
    };

    const key = this._key(tenantId, sessionId);
    this.sessions.set(key, session);

    console.log(`[ChatSessions] Created session: ${sessionId} for tenant: ${tenantId}`);
    return session;
  }

  /**
   * Get a session by ID
   * @param {string} tenantId
   * @param {string} sessionId
   * @returns {Object|null} Session or null if not found/expired
   */
  async get(tenantId, sessionId) {
    const key = this._key(tenantId, sessionId);
    const session = this.sessions.get(key);
    
    if (!session) return null;
    
    // Check if expired
    if (this._isExpired(session)) {
      session.status = 'expired';
      this.sessions.delete(key);
      console.log(`[ChatSessions] Session expired: ${sessionId}`);
      return null;
    }

    return session;
  }

  /**
   * Update a session
   * @param {string} tenantId
   * @param {string} sessionId
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated session
   */
  async update(tenantId, sessionId, updates) {
    const key = this._key(tenantId, sessionId);
    const session = this.sessions.get(key);
    
    if (!session) return null;

    // Merge updates
    Object.assign(session, updates, {
      lastActivityAt: Date.now(),
    });

    this.sessions.set(key, session);
    return session;
  }

  /**
   * Add a message to session history
   * @param {string} tenantId
   * @param {string} sessionId
   * @param {Object} message - { type, text, quickReplies?, timestamp }
   */
  async addMessage(tenantId, sessionId, message) {
    const key = this._key(tenantId, sessionId);
    const session = this.sessions.get(key);
    
    if (!session) return null;

    session.messages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    });

    session.lastActivityAt = Date.now();
    return session;
  }

  /**
   * End a session
   */
  async destroy(tenantId, sessionId) {
    const key = this._key(tenantId, sessionId);
    const session = this.sessions.get(key);
    
    if (session) {
      session.status = 'ended';
      // Keep for a bit for analytics, then cleanup will remove
      session.endedAt = Date.now();
    }

    console.log(`[ChatSessions] Ended session: ${sessionId}`);
    return session;
  }

  /**
   * Get active session count (for monitoring)
   */
  async getActiveCount(tenantId = null) {
    let count = 0;
    for (const [key, session] of this.sessions) {
      if (session.status === 'active' && !this._isExpired(session)) {
        if (!tenantId || session.tenantId === tenantId) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Remove expired sessions
   */
  async cleanup() {
    let removed = 0;
    const now = Date.now();
    
    for (const [key, session] of this.sessions) {
      const shouldRemove = 
        this._isExpired(session) ||
        (session.status === 'ended' && (now - session.endedAt) > 60000); // Remove ended sessions after 1 min
      
      if (shouldRemove) {
        this.sessions.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[ChatSessions] Cleanup: removed ${removed} sessions, ${this.sessions.size} remaining`);
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanup() {
    if (this._cleanupTimer) return;
    this._cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    // Allow process to exit even if timer is running
    if (this._cleanupTimer.unref) this._cleanupTimer.unref();
    console.log('[ChatSessions] Cleanup timer started');
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }

  // ---- Private helpers ----

  _key(tenantId, sessionId) {
    return `${tenantId}:${sessionId}`;
  }

  _isExpired(session) {
    return (Date.now() - session.lastActivityAt) > SESSION_TIMEOUT_MS;
  }
}


// ============================================
// SINGLETON INSTANCE
// ============================================
// Future SaaS: Swap with RedisStore or PostgresStore
const store = new InMemoryStore();
store.startCleanup();

module.exports = store;
