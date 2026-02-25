/**
 * Chat Channel Adapter
 * 
 * Bridges the existing ConversationManager (built for voice/Vapi)
 * with the website chat widget. This is the key integration layer.
 * 
 * Responsibilities:
 * 1. Create & manage ConversationManager instances per chat session
 * 2. Translate CM responses into chat-friendly format (with buttons)
 * 3. Handle chat-specific flows (no caller ID, phone collection)
 * 4. Clean up voice-specific artifacts (TTS pronunciation, etc.)
 * 
 * INTEGRATION: This file requires your existing rox-ai-answering project.
 * Set ROX_ENGINE_PATH env var to point to your rox-ai-answering directory.
 * 
 * MULTI-TENANT READY: Each chat session gets its own CM instance,
 * keyed by tenant. Future: load tenant-specific config per instance.
 */

const { getQuickReplies, isFreeTextState } = require('../config/quick-replies');
const { getConfig } = require('../config/chat-config');

// ============================================
// LOAD EXISTING CONVERSATION ENGINE
// ============================================
// Point this to your existing rox-ai-answering project
const ENGINE_PATH = process.env.ROX_ENGINE_PATH || '../rox-ai-answering';

let ConversationManager, hcp;

try {
  const engine = require(`${ENGINE_PATH}/services/conversation-manager`);
  ConversationManager = engine.ConversationManager;
  hcp = require(`${ENGINE_PATH}/services/housecall-pro`);
  console.log('[ChatAdapter] ✅ Conversation engine loaded from:', ENGINE_PATH);
} catch (err) {
  console.warn('[ChatAdapter] ⚠️  Could not load conversation engine:', err.message);
  console.warn('[ChatAdapter] Set ROX_ENGINE_PATH to your rox-ai-answering directory');
  console.warn('[ChatAdapter] Running in DEMO MODE (simulated responses)');
  ConversationManager = null;
  hcp = null;
}


// ============================================
// ACTIVE CHAT MANAGERS
// ============================================
// Maps sessionId -> ConversationManager instance
const activeManagers = new Map();


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
    // Fix TTS pronunciation spelling
    .replace(/Rocks Heating/gi, 'ROX Heating')
    .replace(/Rocks heating/gi, 'ROX Heating')
    
    // Remove voice-specific phrases
    .replace(/Thanks for calling /gi, 'Welcome to ')
    .replace(/this is the AI dispatcher\. ?/gi, '')
    .replace(/This is the AI dispatcher\. ?/gi, '')
    
    // Clean up phone formatting artifacts (TTS had special formatting)
    // Keep phone numbers readable in chat
    .replace(/\. Goodbye!?$/i, '.')
    
    .trim();
}

/**
 * Format a bot response for the chat widget
 */
function formatChatResponse(cmResponse, session = {}) {
  const state = cmResponse.state || session?.conversationState;
  const text = cleanForChat(cmResponse.message);
  
  // Get quick replies for this state
  let quickReplies = null;
  if (!isFreeTextState(state)) {
    quickReplies = getQuickReplies(state, session);
  }
  
  return {
    type: 'bot',
    text,
    quickReplies,
    state,
    endChat: cmResponse.endCall || false,
    
    // Include booking card if job was created
    card: cmResponse.job ? {
      type: 'booking_confirmation',
      date: cmResponse.offeredSlot?.date,
      time: cmResponse.offeredSlot?.time,
      tech: cmResponse.offeredTech?.name,
    } : null,
  };
}


// ============================================
// DEMO MODE (when engine not connected)
// ============================================

/**
 * Simulated responses for demo/development when the
 * conversation engine isn't connected.
 */
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

let demoState = 'greeting';

function getDemoResponse(input) {
  const response = DEMO_STATES[demoState] || DEMO_STATES.final_questions;
  demoState = response.state;
  return response;
}

function resetDemo() {
  demoState = 'greeting';
}


// ============================================
// MAIN ADAPTER CLASS
// ============================================

class ChatAdapter {
  
  /**
   * Start a new chat conversation
   * 
   * Unlike voice calls, we don't have caller ID, so the flow is:
   * 1. Show welcome message with quick options
   * 2. If they want scheduling, ask for phone to look up account
   * 3. Route through ConversationManager as usual
   * 
   * @param {string} sessionId - Chat session ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Initial bot response with quick replies
   */
  async startChat(sessionId, tenantId = 'rox-heating') {
    const config = getConfig(tenantId);
    
    if (!ConversationManager) {
      // Demo mode
      resetDemo();
      const demoResponse = getDemoResponse();
      return formatChatResponse(demoResponse);
    }
    
    // Create a ConversationManager with a placeholder phone
    // We'll update it when/if the customer provides their phone
    const manager = new ConversationManager('chat_visitor');
    manager.session._chatSession = true;  // Flag for chat-specific behavior
    manager.session._tenantId = tenantId;
    
    // Store the manager
    activeManagers.set(sessionId, manager);
    
    // Return welcome message (don't call startCall yet - no phone to look up)
    const welcomeResponse = {
      message: `Welcome to ${config.businessName}! How can we help you today?`,
      state: 'chat_welcome',
    };
    
    return formatChatResponse(welcomeResponse);
  }
  
  /**
   * Process a message from the chat visitor
   * 
   * @param {string} sessionId - Chat session ID
   * @param {string} text - User's message text
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Bot response with optional quick replies
   */
  async processMessage(sessionId, text, tenantId = 'rox-heating') {
    
    if (!ConversationManager) {
      // Demo mode
      const demoResponse = getDemoResponse(text);
      return formatChatResponse(demoResponse);
    }
    
    let manager = activeManagers.get(sessionId);
    
    if (!manager) {
      // Session expired or not found - restart
      console.warn(`[ChatAdapter] No manager for session ${sessionId}, restarting`);
      return await this.startChat(sessionId, tenantId);
    }
    
    const currentState = manager.session.state;
    
    // ============================================
    // CHAT-SPECIFIC: Phone Collection Flow
    // ============================================
    // If we're in the chat welcome state, route based on what they chose
    if (currentState === undefined || manager.session.state === 'greeting' || !manager.session._chatStarted) {
      return await this._handleInitialInput(sessionId, manager, text);
    }
    
    // ============================================
    // PHONE LOOKUP STATE (chat-specific)
    // ============================================
    if (manager.session._awaitingPhone) {
      return await this._handlePhoneLookup(sessionId, manager, text);
    }
    
    // ============================================
    // STANDARD FLOW: Route through ConversationManager
    // ============================================
    try {
      const response = await manager.processInput(text);
      
      console.log(`[ChatAdapter] Session ${sessionId}: state=${response.state}, input="${text.substring(0, 50)}"`);
      
      // Check if chat should end
      if (response.endCall || response.state === 'complete') {
        // Keep session alive briefly for the farewell message
        setTimeout(() => {
          activeManagers.delete(sessionId);
        }, 60000);
      }
      
      return formatChatResponse(response, manager.session);
      
    } catch (error) {
      console.error(`[ChatAdapter] Error processing message:`, error.message);
      
      return formatChatResponse({
        message: "I'm sorry, I ran into a technical issue. You can call us directly for immediate help, or try again in a moment.",
        state: 'error',
      });
    }
  }
  
  /**
   * Handle the first real input after welcome message.
   * Determines if we need to collect phone first or go straight to new customer flow.
   */
  async _handleInitialInput(sessionId, manager, text) {
    const lower = text.toLowerCase();
    
    // Check if they have an appointment (need phone lookup)
    const needsLookup = 
      lower.includes('appointment') || 
      lower.includes('reschedule') ||
      lower.includes('cancel') ||
      lower.includes('scheduled');
    
    if (needsLookup) {
      // Need phone to look up their account
      manager.session._awaitingPhone = true;
      manager.session._pendingIntent = text;
      
      return formatChatResponse({
        message: "I can help with your appointment! Could you please provide the phone number on your account so I can pull up your information?",
        state: 'phone_collect',
      });
    }
    
    // For repairs, estimates, maintenance - start as new visitor
    // Ask for phone to check if they're an existing customer
    manager.session._awaitingPhone = true;
    manager.session._pendingIntent = text;
    
    return formatChatResponse({
      message: "I'd be happy to help! Could you provide your phone number so I can check if we have your information on file? This helps us serve you faster.",
      state: 'phone_collect',
    });
  }
  
  /**
   * Handle phone number input for customer lookup
   */
  async _handlePhoneLookup(sessionId, manager, text) {
    // Extract phone number from input
    const phone = this._extractPhone(text);
    
    if (!phone) {
      return formatChatResponse({
        message: "I couldn't find a valid phone number in that. Could you please enter your 10-digit phone number? For example: 303-555-1234",
        state: 'phone_collect',
      });
    }
    
    manager.session._awaitingPhone = false;
    manager.session.data.phone = phone;
    manager.session.callerId = phone;
    
    // Look up customer by phone
    try {
      if (hcp) {
        const customer = await hcp.findCustomerByPhone(phone);
        
        if (customer) {
          // Existing customer found!
          manager.session.customer = customer;
          manager.session.isNewCustomer = false;
          manager.session.data.name = `${customer.first_name} ${customer.last_name}`;
          
          const address = customer.addresses?.[0];
          if (address) {
            manager.session.data.address = `${address.street}, ${address.city}`;
            manager.session.data.zipCode = address.zip;
          }
        }
      }
    } catch (err) {
      console.warn('[ChatAdapter] Customer lookup failed:', err.message);
    }
    
    // Now start the real conversation
    manager.session._chatStarted = true;
    
    if (manager.session.customer) {
      // Existing customer - run startCall to set up state
      const startResponse = await manager.startCall();
      
      // If they had a pending intent, process it
      if (manager.session._pendingIntent) {
        const intent = manager.session._pendingIntent;
        delete manager.session._pendingIntent;
        
        // Process the original intent through the conversation manager
        const intentResponse = await manager.processInput(intent);
        return formatChatResponse(intentResponse, manager.session);
      }
      
      return formatChatResponse(startResponse, manager.session);
    } else {
      // New customer - set up for new customer flow
      manager.session.isNewCustomer = true;
      manager.session.state = 'new_customer_name';
      manager.session._chatStarted = true;
      
      const response = {
        message: "Welcome! I don't see that number in our system, so let's get you set up. What's your first and last name?",
        state: 'new_customer_name',
      };
      
      // Store pending intent for after name/address collection
      if (manager.session._pendingIntent) {
        manager.session.data.pendingIssue = manager.session._pendingIntent;
        delete manager.session._pendingIntent;
      }
      
      return formatChatResponse(response, manager.session);
    }
  }
  
  /**
   * Extract a 10-digit phone number from text input
   */
  _extractPhone(text) {
    if (!text) return null;
    
    // Strip everything except digits
    const digits = text.replace(/\D/g, '');
    
    // Handle 10-digit (local) or 11-digit (with country code 1)
    if (digits.length === 10) return digits;
    if (digits.length === 11 && digits.startsWith('1')) return digits.substring(1);
    
    return null;
  }
  
  /**
   * Get the current state of a chat session
   */
  getSessionState(sessionId) {
    const manager = activeManagers.get(sessionId);
    if (!manager) return null;
    
    return {
      state: manager.session.state,
      isNewCustomer: manager.session.isNewCustomer,
      customerName: manager.session.data?.name,
      hasAppointment: !!manager.session.existingAppointment,
    };
  }
  
  /**
   * End a chat session
   */
  endChat(sessionId) {
    const manager = activeManagers.get(sessionId);
    if (manager) {
      activeManagers.delete(sessionId);
      console.log(`[ChatAdapter] Chat ended: ${sessionId}`);
    }
  }
  
  /**
   * Get count of active chat sessions (for monitoring)
   */
  getActiveChatCount() {
    return activeManagers.size;
  }
}


// ============================================
// SINGLETON EXPORT
// ============================================
module.exports = new ChatAdapter();
