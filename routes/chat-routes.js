/**
 * Chat API Routes
 * 
 * REST endpoints for the chat widget to communicate with the server.
 * 
 * Endpoints:
 *   POST /api/chat/start     - Start a new chat session
 *   POST /api/chat/message   - Send a message
 *   GET  /api/chat/session    - Get session state + history
 *   POST /api/chat/end       - End a chat session
 *   GET  /api/chat/config    - Get widget config (for dynamic embedding)
 *   GET  /api/chat/health    - Health check
 * 
 * MULTI-TENANT: Tenant ID is passed via header (X-Tenant-ID) or
 * query param (?tenant=xxx). Falls back to default tenant.
 */

const express = require('express');
const router = express.Router();
const chatAdapter = require('../services/chat-adapter');
const sessionStore = require('../services/chat-session-store');
const { getWidgetConfig } = require('../config/chat-config');


// ============================================
// MIDDLEWARE: Extract tenant ID
// ============================================
function extractTenant(req, res, next) {
  req.tenantId = 
    req.headers['x-tenant-id'] || 
    req.query.tenant || 
    'rox-heating';  // Default tenant
  next();
}

router.use(extractTenant);


// ============================================
// RATE LIMITING (basic, per-session)
// ============================================
const messageTimes = new Map();  // sessionId -> [timestamps]
const MAX_MESSAGES_PER_MINUTE = 20;

function rateLimit(req, res, next) {
  const sessionId = req.body?.sessionId || req.query?.sessionId;
  if (!sessionId) return next();
  
  const now = Date.now();
  const times = messageTimes.get(sessionId) || [];
  
  // Remove entries older than 1 minute
  const recent = times.filter(t => (now - t) < 60000);
  
  if (recent.length >= MAX_MESSAGES_PER_MINUTE) {
    return res.status(429).json({
      error: 'Too many messages. Please wait a moment.',
      retryAfterMs: 5000,
    });
  }
  
  recent.push(now);
  messageTimes.set(sessionId, recent);
  next();
}


// ============================================
// POST /api/chat/start - Start a new chat session
// ============================================
router.post('/start', async (req, res) => {
  try {
    const { metadata } = req.body || {};
    
    // Create session in store
    const session = await sessionStore.create(req.tenantId, {
      userAgent: req.headers['user-agent'],
      referrer: metadata?.referrer || req.headers['referer'],
      page: metadata?.page,
    });
    
    // Start conversation via adapter
    const botResponse = await chatAdapter.startChat(session.sessionId, req.tenantId);
    
    // Save bot's greeting to session history
    await sessionStore.addMessage(req.tenantId, session.sessionId, {
      type: 'bot',
      text: botResponse.text,
      quickReplies: botResponse.quickReplies,
    });
    
    // Update session state
    await sessionStore.update(req.tenantId, session.sessionId, {
      conversationState: botResponse.state,
    });
    
    res.json({
      sessionId: session.sessionId,
      message: botResponse,
    });
    
  } catch (error) {
    console.error('[ChatRoutes] Error starting chat:', error);
    res.status(500).json({ error: 'Failed to start chat session' });
  }
});


// ============================================
// POST /api/chat/message - Send a message
// ============================================
router.post('/message', rateLimit, async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required and must be non-empty' });
    }
    
    // Sanitize input (basic XSS prevention)
    const cleanText = text.trim().substring(0, 500);  // Cap at 500 chars
    
    // Verify session exists
    const session = await sessionStore.get(req.tenantId, sessionId);
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found or expired',
        shouldRestart: true,
      });
    }
    
    // Save user message to history
    await sessionStore.addMessage(req.tenantId, sessionId, {
      type: 'user',
      text: cleanText,
    });
    
    // Process through adapter
    const botResponse = await chatAdapter.processMessage(
      sessionId, 
      cleanText, 
      req.tenantId
    );
    
    // Save bot response to history
    await sessionStore.addMessage(req.tenantId, sessionId, {
      type: 'bot',
      text: botResponse.text,
      quickReplies: botResponse.quickReplies,
      card: botResponse.card,
    });
    
    // Update session state
    await sessionStore.update(req.tenantId, sessionId, {
      conversationState: botResponse.state,
      status: botResponse.endChat ? 'ended' : 'active',
    });
    
    res.json({
      message: botResponse,
    });
    
  } catch (error) {
    console.error('[ChatRoutes] Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});


// ============================================
// GET /api/chat/session - Get session state & history
// ============================================
router.get('/session', async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId query param required' });
    }
    
    const session = await sessionStore.get(req.tenantId, sessionId);
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found or expired',
        shouldRestart: true,
      });
    }
    
    res.json({
      sessionId: session.sessionId,
      status: session.status,
      conversationState: session.conversationState,
      messages: session.messages,
      visitorName: session.visitorName,
    });
    
  } catch (error) {
    console.error('[ChatRoutes] Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});


// ============================================
// POST /api/chat/end - End a chat session
// ============================================
router.post('/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    
    // End in both adapter and store
    chatAdapter.endChat(sessionId);
    await sessionStore.destroy(req.tenantId, sessionId);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('[ChatRoutes] Error ending chat:', error);
    res.status(500).json({ error: 'Failed to end chat session' });
  }
});


// ============================================
// GET /api/chat/config - Widget configuration
// ============================================
router.get('/config', (req, res) => {
  const config = getWidgetConfig(req.tenantId);
  
  // Cache for 5 minutes (widget config rarely changes)
  res.set('Cache-Control', 'public, max-age=300');
  res.json(config);
});


// ============================================
// GET /api/chat/health - Health check
// ============================================
router.get('/health', async (req, res) => {
  const activeSessions = await sessionStore.getActiveCount(req.tenantId);
  const activeChats = chatAdapter.getActiveChatCount();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeSessions,
    activeChats,
    tenant: req.tenantId,
  });
});


module.exports = router;
