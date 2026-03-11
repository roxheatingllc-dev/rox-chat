/**
 * Chat API Routes
 * Version: 3.1.0
 * 
 * REST endpoints for the chat widget to communicate with the engine.
 * 
 * v3.1.0 Changes:
 *   - Added injectQuickReplies() function that reads conversation state
 *     from engine responses and injects clickable quick reply buttons
 *   - Only injects when the engine does not provide its own quickReplies
 *     (engine always takes priority - this is a fallback enhancement)
 *   - Buttons mapped by state: system_age, offer_slot, final_questions,
 *     additional_notes, collect_email, schedule/time preference, 
 *     address_confirm, rox_installed
 *
 * Multi-tenant ready: state-to-button mappings could move to tenant config
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
// v3.1.0: QUICK REPLY BUTTON INJECTION
//
// Maps conversation states to helpful quick
// reply buttons. Only injects when the engine
// does not already provide its own quickReplies.
//
// This runs on the rox-chat side (not engine)
// so it works without modifying rox-ai-answering.
//
// Multi-tenant ready: could be moved to tenant
// config or loaded from theme files.
// ========================================

/**
 * State-to-button mapping.
 * Each key is a conversation state from the engine.
 * Each value is an array of { label, value } objects.
 * 
 * label = what the user sees on the button
 * value = what gets sent as the message when clicked
 */
const STATE_QUICK_REPLIES = {
  // System age question - helps users pick without typing
  system_age: [
    { label: '0-2 Years', value: '0 to 2 years old' },
    { label: '3-10 Years', value: '3 to 10 years old' },
    { label: '10+ Years', value: 'Over 10 years old' },
    { label: 'Not Sure', value: "I'm not sure how old it is" }
  ],
  
  // Slot offered - accept or request different time
  offer_slot: [
    { label: 'Yes, that works!', value: 'Yes, that works!' },
    { label: 'Different time', value: "I'd prefer a different time" }
  ],
  
  // Post-booking - any final questions?
  final_questions: [
    { label: "No, that's all!", value: "No, that's all!" },
    { label: 'Yes, I have a question', value: 'Yes, I have a question' }
  ],
  
  // Additional notes for the technician
  additional_notes: [
    { label: 'No additional notes', value: 'No additional notes' }
  ],
  
  // Email collection - allow skip
  collect_email: [
    { label: 'Skip', value: "I'll skip the email" }
  ],
  
  // Schedule preference (ASAP vs specific time)
  schedule_preference: [
    { label: 'ASAP', value: 'As soon as possible' },
    { label: 'Morning', value: 'Morning works best' },
    { label: 'Afternoon', value: 'Afternoon works best' }
  ],
  
  // Time preference (same options, different state name)
  time_preference: [
    { label: 'ASAP', value: 'As soon as possible' },
    { label: 'Morning', value: 'Morning works best' },
    { label: 'Afternoon', value: 'Afternoon works best' }
  ],
  
  // Address confirmation
  address_confirm: [
    { label: 'Yes', value: 'Yes, that address is correct' },
    { label: 'No, different address', value: 'No, I have a different address' }
  ],
  
  // ROX-installed system check
  rox_installed: [
    { label: 'Yes', value: 'Yes, ROX installed it' },
    { label: 'No', value: 'No, a different company installed it' },
    { label: 'Not Sure', value: "I'm not sure who installed it" }
  ]
};

/**
 * Inject quick reply buttons based on conversation state.
 * 
 * Rules:
 *   1. If the engine already returned quickReplies, DO NOT override
 *   2. Look up the response state in STATE_QUICK_REPLIES
 *   3. If found, inject those buttons into the response
 *   4. If not found, leave quickReplies empty (no injection)
 * 
 * This is safe to call on every response. It is a no-op when
 * the engine provides its own buttons or the state is not mapped.
 * 
 * @param {Object} response - Engine response with { message, quickReplies, state, ... }
 * @returns {Object} Same response, possibly with quickReplies added
 */
function injectQuickReplies(response) {
  // Rule 1: Engine already provided buttons - respect engine priority
  if (response.quickReplies && response.quickReplies.length > 0) {
    return response;
  }
  
  // Rule 2: Look up state in our mapping
  const state = response.state;
  if (state && STATE_QUICK_REPLIES[state]) {
    response.quickReplies = STATE_QUICK_REPLIES[state];
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

    // Track session activity
    sessionStore.incrementMessages(sessionId);

    // Send to engine
    const response = await chatAdapter.sendMessage(
      sessionId,
      trimmedMessage,
      tenantId || chatConfig.tenantId
    );

    // v3.1.0: Build response and inject quick replies based on state
    const chatResponse = {
      message: response.message,
      quickReplies: response.quickReplies || [],
      booking: response.booking || null,
      endChat: response.endChat || false,
      state: response.state || null
    };

    // Inject smart quick reply buttons if engine did not provide any
    injectQuickReplies(chatResponse);

    res.json(chatResponse);
  } catch (err) {
    console.error('[ChatRoutes] Message error:', err);
    res.status(500).json({
      error: 'Failed to process message',
      message: "I'm sorry, something went wrong. Please try again or call us at (720) 468-0689."
    });
  }
});

// ========================================
// POST /api/chat/end — Chat closed/abandoned (proxy to engine)
// ========================================
router.post('/end', async (req, res) => {
  try {
    const { sessionId, reason } = req.body || {};
    if (!sessionId) return res.json({ ok: true });

    // Forward to engine
    const engineUrl = process.env.ENGINE_API_URL || 'http://localhost:3000/api/engine';
    fetch(`${engineUrl}/chat/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, reason }),
      signal: AbortSignal.timeout(5000)
    }).catch(e => console.error('[ChatRoutes] End proxy error:', e.message));

    res.json({ ok: true });
  } catch (err) {
    console.error('[ChatRoutes] End error:', err.message);
    res.json({ ok: true });
  }
});

// ========================================
// GET /api/chat/health
// ========================================
router.get('/health', async (req, res) => {
  let engineStatus = 'unknown';
  try {
    const healthy = await chatAdapter.checkHealth();
    engineStatus = healthy ? 'connected' : 'unreachable';
  } catch {
    engineStatus = 'error';
  }

  res.json({
    status: 'ok',
    engine: engineStatus,
    activeSessions: sessionStore.getCount ? sessionStore.getCount() : 'unknown'
  });
});

module.exports = router;
