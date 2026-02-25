/**
 * Chat API Routes
 * REST endpoints for the chat widget to communicate with the engine.
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const chatAdapter = require('../services/chat-adapter');
const sessionStore = require('../services/chat-session-store');
const chatConfig = require('../config/chat-config');

// ========================================
// Simple rate limiter (per IP)
// ========================================
const rateLimits = new Map();
const RATE_LIMIT = chatConfig.chat.rateLimitPerMinute || 20;

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window

  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, []);
  }

  const timestamps = rateLimits.get(ip).filter(t => t > windowStart);
  
  if (timestamps.length >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Too many messages. Please wait a moment.',
      retryAfter: 10
    });
  }

  timestamps.push(now);
  rateLimits.set(ip, timestamps);
  next();
}

// Clean up rate limit data every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 120000;
  for (const [ip, timestamps] of rateLimits) {
    const filtered = timestamps.filter(t => t > cutoff);
    if (filtered.length === 0) {
      rateLimits.delete(ip);
    } else {
      rateLimits.set(ip, filtered);
    }
  }
}, 5 * 60 * 1000);

// ========================================
// POST /api/chat/start - Start a new session
// ========================================
router.post('/start', rateLimit, async (req, res) => {
  try {
    const tenantId = req.body.tenantId || chatConfig.tenantId;
    const sessionId = uuidv4();

    // Create local session tracking
    sessionStore.create(sessionId, tenantId);

    // Start engine session
    let engineData = {};
    try {
      engineData = await chatAdapter.startSession(tenantId);
    } catch (err) {
      console.error('[ChatRoutes] Engine start failed, using local session only:', err.message);
    }

    res.json({
      sessionId: engineData.sessionId || sessionId,
      greeting: engineData.greeting || null,
      quickReplies: engineData.quickReplies || [],
      tenantId
    });
  } catch (err) {
    console.error('[ChatRoutes] Start session error:', err);
    res.status(500).json({ error: 'Failed to start chat session' });
  }
});

// ========================================
// POST /api/chat/message - Send a message
// ========================================
router.post('/message', rateLimit, async (req, res) => {
  try {
    const { sessionId, message, tenantId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid message' });
    }

    // Validate message length
    const maxLen = chatConfig.chat.maxMessageLength || 500;
    const trimmedMessage = message.trim().substring(0, maxLen);

    // Track session
    sessionStore.incrementMessages(sessionId);

    // Send to engine
    const response = await chatAdapter.sendMessage(
      sessionId,
      trimmedMessage,
      tenantId || chatConfig.tenantId
    );

    res.json({
      message: response.message,
      quickReplies: response.quickReplies || [],
      booking: response.booking || null,
      endChat: response.endChat || false
    });
  } catch (err) {
    console.error('[ChatRoutes] Message error:', err);
    res.status(500).json({
      error: 'Failed to process message',
      message: `I'm sorry, something went wrong. Please try again or call us at ${chatConfig.company.phone}.`
    });
  }
});

// ========================================
// GET /api/chat/health - Health check
// ========================================
router.get('/health', async (req, res) => {
  const engineHealthy = await chatAdapter.checkHealth();
  const sessionStats = sessionStore.getStats();

  res.json({
    status: engineHealthy ? 'ok' : 'degraded',
    engine: engineHealthy ? 'connected' : 'unreachable',
    sessions: sessionStats,
    uptime: process.uptime(),
    version: '3.0.0'
  });
});

module.exports = router;
