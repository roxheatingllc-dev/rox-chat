/**
 * Chat API Routes
 * REST endpoints for the chat widget to communicate with the engine.
 * 
 * v3.1.0 - Added smart quick reply injection based on conversation state
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
// SMART QUICK REPLY INJECTION
// Adds clickable buttons based on the
// conversation state returned by the engine.
// Engine returns state but empty quickReplies[]
// in Phase 3 — we fill them in here.
// ========================================
function injectQuickReplies(response) {
  // If engine already provided quick replies, don't override
  if (response.quickReplies && response.quickReplies.length > 0) {
    return response;
  }

  const state = response.state;
  if (!state) return response;

  switch (state) {
    // System age question
    case 'system_age':
      response.quickReplies = [
        { label: '🆕 0–2 Years', value: '0 to 2 years old' },
        { label: '✅ 3–5 Years', value: '3 to 5 years old' },
        { label: '⚠️ 6–10 Years', value: '6 to 10 years old' },
        { label: '🔴 10+ Years', value: 'Over 10 years old' },
        { label: '❓ Not Sure', value: "I'm not sure how old it is" }
      ];
      break;

    // Offered a time slot — yes/no
    case 'offer_slot':
      response.quickReplies = [
        { label: '✅ Yes, that works!', value: 'Yes that works for me' },
        { label: '🔄 Different time', value: 'I need a different time' }
      ];
      break;

    // After booking — anything else?
    case 'final_questions':
      response.quickReplies = [
        { label: "👍 No, that's all!", value: "No that's all thank you" },
        { label: '🙋 Yes, I have a question', value: 'Yes I have a question' }
      ];
      break;

    // Additional notes for tech
    case 'additional_notes':
      response.quickReplies = [
        { label: '👍 No additional notes', value: 'No additional notes' }
      ];
      break;

    // Email collection
    case 'collect_email':
      response.quickReplies = [
        { label: '⏭️ Skip', value: 'No email' }
      ];
      break;

    // Address confirmation (existing customer)
    case 'address_confirm':
      response.quickReplies = [
        { label: '✅ Yes, that\'s correct', value: 'Yes that is correct' },
        { label: '❌ No, different address', value: 'No different address' }
      ];
      break;

    // Time preference
    case 'schedule_preference':
    case 'time_preference':
      response.quickReplies = [
        { label: '⚡ ASAP / Next Available', value: 'As soon as possible' },
        { label: '🌅 Morning', value: 'Morning' },
        { label: '☀️ Afternoon', value: 'Afternoon' }
      ];
      break;

    // ROX installed question
    case 'rox_installed':
      response.quickReplies = [
        { label: '✅ Yes, ROX installed it', value: 'Yes ROX installed it' },
        { label: '❌ No', value: 'No a different company installed it' },
        { label: '❓ Not Sure', value: "I'm not sure who installed it" }
      ];
      break;

    default:
      // No buttons for this state
      break;
  }

  return response;
}

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

    // Inject smart quick reply buttons based on conversation state
    const enriched = injectQuickReplies(response);

    res.json({
      message: enriched.message,
      quickReplies: enriched.quickReplies || [],
      booking: enriched.booking || null,
      endChat: enriched.endChat || false
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
    version: '3.1.0'
  });
});

module.exports = router;
