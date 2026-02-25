/**
 * Chat Channel Adapter (HTTP Bridge Version)
 * 
 * Connects to the ConversationManager via HTTP API instead of
 * requiring local files. This allows rox-chat and rox-ai-answering
 * to run as separate services (separate Railway deployments).
 * 
 * Architecture:
 *   [Chat Widget] → [rox-chat] → HTTP → [rox-ai-answering /api/engine]
 * 
 * MULTI-TENANT READY: Each tenant can point to their own engine URL.
 * Future SaaS: Store engine URLs per tenant in database.
 */

const { getQuickReplies, isFreeTextState } = require('../config/quick-replies');
const { getConfig } = require('../config/chat-config');

// ============================================
// ENGINE API CLIENT
// ============================================
const ENGINE_BASE_URL = process.env.ENGINE_API_URL || 'http://localhost:3000/api/engine';
const ENGINE_API_KEY = process.env.ENGINE_API_KEY || '';

/**
 * Call the engine API
 */
async function engineCall(endpoint, body = {}) {
  const url = `${ENGINE_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: endpoint === '/health' ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ENGINE_API_KEY ? { 'X-Engine-Key': ENGINE_API_KEY } : {}),
      },
      body: endpoint === '/health' ? undefined : JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Engine API returned ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    // Check if engine is unreachable
    if (error.cause?.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      console.error(`[ChatAdapter] Engine unreachable at ${url}`);
      throw new Error('ENGINE_UNAVAILABLE');
    }
    throw error;
  }
}


// ============================================
// TEXT CLEANUP (Voice → Chat)
// ============================================

/**
 * Clean voice-specific artifacts from response text.
 * The existing scripts use "Rocks" instead of "Rox" for TTS.
 * In chat, we want the correct spelling.
 */
function cleanForChat(text) {
  if (!text) return text;
  
  return text
    .replace(/Rocks Heating/gi, 'ROX Heating')
    .replace(/Rocks heating/gi, 'ROX Heating')
    .replace(/Thanks for calling /gi, 'Welcome to ')
    .replace(/this is the AI dispatcher\. ?/gi, '')
    .replace(/This is the AI dispatcher\. ?/gi, '')
    .replace(/\. Goodbye!?$/i, '.')
    .trim();
}

/**
 * Format a bot response for the chat widget
 */
function formatChatResponse(engineResponse, extraState = null) {
  const state = engineResponse.state || extraState;
  const text = cleanForChat(engineResponse.message);
  
  // Get quick replies for this state
  let quickReplies = null;
  if (!isFreeTextState(state)) {
    quickReplies = getQuickReplies(state);
  }
  
  return {
    type: 'bot',
    text,
    quickReplies,
    state,
    endChat: engineResponse.endCall || false,
    
    // Include booking card if job was created
    card: (engineResponse.offeredSlot || engineResponse.job) ? {
      type: 'booking_confirmation',
      date: engineResponse.offeredSlot?.date,
      time: engineResponse.offeredSlot?.time,
      tech: engineResponse.offeredTech?.name,
    } : null,
  };
}


// ============================================
// DEMO MODE (when engine is unavailable)
// ============================================
const DEMO_STATES = {
  greeting: {
    message: "Welcome to ROX Heating & Air! 👋 How can we help you today?",
    state: 'issue_discovery',
  },
  issue_discovery: {
    message: "I can help with that! What type of system is this for?",
    state: 'system_type',
  },
  system_type: {
    message: "Got it. How old is your system?",
    state: 'system_age',
  },
  system_age: {
    message: "Thanks! Did ROX Heating install this system?",
    state: 'rox_installed',
  },
  rox_installed: {
    message: "Understood. When would you like us to come out? Our next available slot is tomorrow at 10:00 AM.",
    state: 'offer_slot',
  },
  offer_slot: {
    message: "You're all set! We've scheduled your appointment. The service call fee is $148, which is waived if you proceed with repairs. Is there anything else?",
    state: 'final_questions',
  },
  final_questions: {
    message: "Thanks for choosing ROX Heating & Air! We look forward to helping you. Have a great day!",
    state: 'complete',
    endCall: true,
  },
};

// Per-session demo state tracking
const demoStates = new Map();

function getDemoResponse(sessionId, input) {
  const current = demoStates.get(sessionId) || 'greeting';
  const response = DEMO_STATES[current] || DEMO_STATES.final_questions;
  demoStates.set(sessionId, response.state);
  return response;
}


// ============================================
// SESSION STATE (chat-side tracking)
// ============================================
// Track chat-specific state per session (phone collection flow, etc.)
const chatState = new Map();

function getChatState(sessionId) {
  if (!chatState.has(sessionId)) {
    chatState.set(sessionId, {
      engineStarted: false,
      awaitingPhone: false,
      pendingIntent: null,
      customerFound: false,
    });
  }
  return chatState.get(sessionId);
}


// ============================================
// MAIN ADAPTER CLASS
// ============================================

class ChatAdapter {
  
  /**
   * Check if the engine is available
   */
  async isEngineAvailable() {
    try {
      await engineCall('/health');
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Start a new chat conversation
   */
  async startChat(sessionId, tenantId = 'rox-heating') {
    const config = getConfig(tenantId);
    const cs = getChatState(sessionId);
    
    // Check engine availability
    const engineUp = await this.isEngineAvailable();
    
    if (!engineUp) {
      console.warn('[ChatAdapter] Engine unavailable, running in demo mode');
      demoStates.set(sessionId, 'greeting');
      const demoResponse = getDemoResponse(sessionId);
      return formatChatResponse(demoResponse);
    }
    
    // Create engine session (no phone yet for chat visitors)
    try {
      await engineCall('/start', { sessionId, phone: null });
      cs.engineStarted = true;
    } catch (err) {
      console.error('[ChatAdapter] Failed to start engine session:', err.message);
    }
    
    // Return welcome message (phone collection happens next)
    const welcomeResponse = {
      message: `Welcome to ${config.businessName}! How can we help you today?`,
      state: 'chat_welcome',
    };
    
    return formatChatResponse(welcomeResponse);
  }
  
  /**
   * Process a message from the chat visitor
   */
  async processMessage(sessionId, text, tenantId = 'rox-heating') {
    const cs = getChatState(sessionId);
    
    // ============================================
    // DEMO MODE FALLBACK
    // ============================================
    if (!cs.engineStarted) {
      const engineUp = await this.isEngineAvailable();
      if (!engineUp) {
        const demoResponse = getDemoResponse(sessionId, text);
        return formatChatResponse(demoResponse);
      }
      // Engine came back - start session
      try {
        await engineCall('/start', { sessionId, phone: null });
        cs.engineStarted = true;
      } catch {
        const demoResponse = getDemoResponse(sessionId, text);
        return formatChatResponse(demoResponse);
      }
    }
    
    // ============================================
    // CHAT-SPECIFIC: Phone Collection Flow
    // ============================================
    if (!cs.awaitingPhone && !cs.customerFound) {
      // First real input after welcome - ask for phone
      return this._handleInitialInput(sessionId, cs, text);
    }
    
    if (cs.awaitingPhone) {
      return this._handlePhoneLookup(sessionId, cs, text);
    }
    
    // ============================================
    // STANDARD FLOW: Route through Engine API
    // ============================================
    try {
      const response = await engineCall('/message', {
        sessionId,
        text,
      });
      
      console.log(`[ChatAdapter] Session ${sessionId}: state=${response.state}, input="${text.substring(0, 50)}"`);
      
      // Clean up if ended
      if (response.endCall || response.state === 'complete') {
        setTimeout(() => {
          chatState.delete(sessionId);
        }, 60000);
      }
      
      return formatChatResponse(response);
      
    } catch (error) {
      console.error(`[ChatAdapter] Error processing message:`, error.message);
      
      if (error.message === 'ENGINE_UNAVAILABLE') {
        return formatChatResponse({
          message: "I'm sorry, our scheduling system is temporarily unavailable. Please call us directly at (303) 555-0199 for immediate help.",
          state: 'error',
        });
      }
      
      if (error.message.includes('Session not found')) {
        // Session expired on engine side - restart
        cs.engineStarted = false;
        cs.customerFound = false;
        cs.awaitingPhone = false;
        return formatChatResponse({
          message: "It looks like our conversation timed out. Let's start fresh — how can I help you today?",
          state: 'chat_welcome',
        });
      }
      
      return formatChatResponse({
        message: "I ran into a technical issue. You can call us directly for immediate help, or try again in a moment.",
        state: 'error',
      });
    }
  }
  
  /**
   * Handle the first real input after welcome message.
   */
  _handleInitialInput(sessionId, cs, text) {
    const lower = text.toLowerCase();
    
    // Store what they want so we can process it after phone lookup
    cs.pendingIntent = text;
    cs.awaitingPhone = true;
    
    const needsAccountLookup = 
      lower.includes('appointment') || lower.includes('reschedule') || lower.includes('cancel');
    
    const message = needsAccountLookup
      ? "I can help with your appointment! Could you please provide the phone number on your account so I can pull up your information?"
      : "I'd be happy to help! Could you provide your phone number so I can check if we have your information on file? This helps us serve you faster.";
    
    return formatChatResponse({
      message,
      state: 'phone_collect',
    });
  }
  
  /**
   * Handle phone number input for customer lookup
   */
  async _handlePhoneLookup(sessionId, cs, text) {
    const phone = this._extractPhone(text);
    
    if (!phone) {
      return formatChatResponse({
        message: "I couldn't find a valid phone number in that. Could you please enter your 10-digit phone number? For example: 303-555-1234",
        state: 'phone_collect',
      });
    }
    
    cs.awaitingPhone = false;
    
    try {
      // Call engine lookup to find customer by phone
      const lookupResult = await engineCall('/lookup', {
        sessionId,
        phone,
      });
      
      cs.customerFound = true;
      
      // If they had a pending intent, process it through the engine
      if (cs.pendingIntent && !lookupResult.isNewCustomer) {
        const intent = cs.pendingIntent;
        cs.pendingIntent = null;
        
        const intentResponse = await engineCall('/message', {
          sessionId,
          text: intent,
        });
        
        return formatChatResponse(intentResponse);
      }
      
      // New customer - engine is now in new_customer_name state
      if (lookupResult.isNewCustomer) {
        cs.pendingIntent = null;
        return formatChatResponse({
          message: "Welcome! I don't see that number in our system, so let's get you set up. What's your first and last name?",
          state: 'new_customer_name',
        });
      }
      
      // Existing customer - return the engine's greeting
      cs.pendingIntent = null;
      return formatChatResponse(lookupResult);
      
    } catch (error) {
      console.error('[ChatAdapter] Lookup failed:', error.message);
      cs.customerFound = true; // Continue anyway
      
      return formatChatResponse({
        message: "I had trouble looking up your account, but I can still help! What's your first and last name?",
        state: 'new_customer_name',
      });
    }
  }
  
  /**
   * Extract a 10-digit phone number from text
   */
  _extractPhone(text) {
    if (!text) return null;
    const digits = text.replace(/\D/g, '');
    if (digits.length === 10) return digits;
    if (digits.length === 11 && digits.startsWith('1')) return digits.substring(1);
    return null;
  }
  
  /**
   * End a chat session
   */
  async endChat(sessionId) {
    try {
      await engineCall('/end', { sessionId });
    } catch (err) {
      console.warn('[ChatAdapter] Could not end engine session:', err.message);
    }
    chatState.delete(sessionId);
    demoStates.delete(sessionId);
    console.log(`[ChatAdapter] Chat ended: ${sessionId}`);
  }
  
  /**
   * Get count of active chat sessions
   */
  getActiveChatCount() {
    return chatState.size;
  }
}


// ============================================
// SINGLETON EXPORT
// ============================================
module.exports = new ChatAdapter();
