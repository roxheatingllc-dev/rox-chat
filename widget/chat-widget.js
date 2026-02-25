/**
 * ROX Chat Widget v3.0 - Production Embeddable Chat Component
 * 
 * Embed on any website:
 * <script>
 *   window.ROX_CHAT_CONFIG = {
 *     serverUrl: "https://rox-chat-production.up.railway.app"
 *   };
 * </script>
 * <script data-no-optimize="1" src="https://rox-chat-production.up.railway.app/widget/chat-widget.js"></script>
 */
(function() {
  'use strict';

  // ========================================
  // DOUBLE-INIT GUARD (SiteGround bundler fix)
  // ========================================
  if (window._roxChatInitialized) {
    console.log('[ROX Chat] Already initialized — skipping duplicate');
    return;
  }
  window._roxChatInitialized = true;

  // ========================================
  // CONFIG — supports window.ROX_CHAT_CONFIG
  // for JS bundlers that strip data attributes
  // ========================================
  const globalCfg = window.ROX_CHAT_CONFIG || {};
  const scriptTag = document.currentScript;

  const CONFIG = {
    serverUrl: globalCfg.serverUrl
      || (scriptTag && scriptTag.getAttribute('data-server'))
      || '',
    tenantId: globalCfg.tenantId
      || (scriptTag && scriptTag.getAttribute('data-tenant'))
      || 'rox-heating',
    position: globalCfg.position || 'bottom-right',
    // Branding
    brand: {
      primary: '#F78C26',       // ROX orange
      primaryDark: '#E07520',   // Hover orange
      primaryLight: '#FFA54F',  // Light accent
      dark: '#1A1A1A',          // Near-black
      darkAlt: '#2A2A2A',       // Slightly lighter
      light: '#FFFFFF',
      lightGray: '#F5F5F5',
      midGray: '#E8E8E8',
      textDark: '#1A1A1A',
      textMid: '#666666',
      textLight: '#999999',
      avatarText: 'ROX'
    },
    phone: '(720) 468-0689',
    companyName: 'ROX Heating & Air'
  };

  if (!CONFIG.serverUrl) {
    console.error('[ROX Chat] No serverUrl configured. Set window.ROX_CHAT_CONFIG.serverUrl or data-server attribute.');
    return;
  }

  console.log(`[ROX Chat] Widget initialized for tenant: ${CONFIG.tenantId}`);

  // ========================================
  // STATE
  // ========================================
  let sessionId = null;
  let isOpen = false;
  let isTyping = false;
  let messageCount = 0;

  // ========================================
  // INJECT STYLES
  // ========================================
  function injectStyles() {
    if (document.getElementById('rox-chat-styles')) return;
    const style = document.createElement('style');
    style.id = 'rox-chat-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

      /* Reset & base */
      #rox-chat-container * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      /* ---- BUBBLE ---- */
      #rox-chat-bubble {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 62px;
        height: 62px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${CONFIG.brand.primary} 0%, ${CONFIG.brand.primaryDark} 100%);
        color: #fff;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999998;
        box-shadow: 0 4px 20px rgba(247,140,38,0.45), 0 2px 8px rgba(0,0,0,0.15);
        transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease;
        animation: rox-bubble-glow 3s ease-in-out infinite;
      }
      #rox-chat-bubble:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 28px rgba(247,140,38,0.55), 0 3px 12px rgba(0,0,0,0.2);
      }
      #rox-chat-bubble svg { width: 28px; height: 28px; }

      @keyframes rox-bubble-glow {
        0%, 100% { box-shadow: 0 4px 20px rgba(247,140,38,0.45), 0 2px 8px rgba(0,0,0,0.15); }
        50% { box-shadow: 0 4px 30px rgba(247,140,38,0.65), 0 2px 12px rgba(0,0,0,0.2); }
      }

      /* ---- WINDOW ---- */
      #rox-chat-window {
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 400px;
        max-width: calc(100vw - 32px);
        height: 580px;
        max-height: calc(100vh - 130px);
        background: ${CONFIG.brand.light};
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10);
        display: none;
        flex-direction: column;
        z-index: 999999;
        overflow: hidden;
        opacity: 0;
        transform: translateY(16px) scale(0.96);
        transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
      }
      #rox-chat-window.rox-open {
        display: flex;
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      /* ---- HEADER ---- */
      .rox-chat-header {
        background: linear-gradient(135deg, ${CONFIG.brand.dark} 0%, #111 100%);
        padding: 18px 20px 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        position: relative;
        flex-shrink: 0;
      }
      .rox-chat-header::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, ${CONFIG.brand.primary}, ${CONFIG.brand.primaryLight});
      }
      .rox-header-avatar {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${CONFIG.brand.primary}, ${CONFIG.brand.primaryDark});
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 0.5px;
        flex-shrink: 0;
        box-shadow: 0 2px 10px rgba(247,140,38,0.35);
      }
      .rox-header-info { flex: 1; min-width: 0; }
      .rox-header-name {
        color: #fff;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.2px;
      }
      .rox-header-status {
        color: rgba(255,255,255,0.6);
        font-size: 12px;
        margin-top: 2px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .rox-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #4ADE80;
        animation: rox-pulse-dot 2.5s ease-in-out infinite;
      }
      @keyframes rox-pulse-dot {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .rox-close-btn {
        background: rgba(255,255,255,0.1);
        border: none;
        color: rgba(255,255,255,0.7);
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      .rox-close-btn:hover {
        background: rgba(255,255,255,0.2);
        color: #fff;
      }

      /* ---- MESSAGES AREA ---- */
      .rox-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px 16px;
        background: ${CONFIG.brand.lightGray};
        scroll-behavior: smooth;
      }
      .rox-chat-messages::-webkit-scrollbar { width: 5px; }
      .rox-chat-messages::-webkit-scrollbar-track { background: transparent; }
      .rox-chat-messages::-webkit-scrollbar-thumb {
        background: ${CONFIG.brand.midGray};
        border-radius: 10px;
      }

      /* ---- WELCOME CARD ---- */
      .rox-welcome-card {
        background: ${CONFIG.brand.light};
        border-radius: 16px;
        padding: 24px 20px;
        margin-bottom: 12px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      }
      .rox-welcome-title {
        font-size: 18px;
        font-weight: 700;
        color: ${CONFIG.brand.textDark};
        margin-bottom: 4px;
      }
      .rox-welcome-subtitle {
        font-size: 13px;
        color: ${CONFIG.brand.textMid};
        margin-bottom: 18px;
        line-height: 1.4;
      }
      .rox-welcome-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .rox-welcome-btn {
        background: ${CONFIG.brand.light};
        border: 1.5px solid ${CONFIG.brand.midGray};
        border-radius: 12px;
        padding: 14px 12px;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .rox-welcome-btn:hover {
        border-color: ${CONFIG.brand.primary};
        background: rgba(247,140,38,0.04);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(247,140,38,0.12);
      }
      .rox-welcome-btn-icon {
        font-size: 22px;
        line-height: 1;
      }
      .rox-welcome-btn-label {
        font-size: 13px;
        font-weight: 600;
        color: ${CONFIG.brand.textDark};
        line-height: 1.3;
      }
      .rox-welcome-btn-desc {
        font-size: 11px;
        color: ${CONFIG.brand.textLight};
        line-height: 1.3;
      }

      /* ---- MESSAGE BUBBLES ---- */
      .rox-message {
        display: flex;
        gap: 10px;
        margin-bottom: 14px;
        animation: rox-msg-in 0.3s ease-out;
      }
      @keyframes rox-msg-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .rox-message.rox-user {
        flex-direction: row-reverse;
      }
      .rox-msg-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${CONFIG.brand.primary}, ${CONFIG.brand.primaryDark});
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .rox-msg-content {
        max-width: 78%;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .rox-msg-bubble {
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
      }
      .rox-message:not(.rox-user) .rox-msg-bubble {
        background: ${CONFIG.brand.light};
        color: ${CONFIG.brand.textDark};
        border-bottom-left-radius: 6px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      .rox-message.rox-user .rox-msg-bubble {
        background: ${CONFIG.brand.dark};
        color: #fff;
        border-bottom-right-radius: 6px;
      }

      /* ---- QUICK REPLIES ---- */
      .rox-quick-replies {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 4px 0;
      }
      .rox-quick-reply {
        background: ${CONFIG.brand.light};
        border: 1.5px solid ${CONFIG.brand.primary};
        color: ${CONFIG.brand.primary};
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      .rox-quick-reply:hover {
        background: ${CONFIG.brand.primary};
        color: #fff;
        transform: translateY(-1px);
        box-shadow: 0 3px 10px rgba(247,140,38,0.25);
      }

      /* ---- BOOKING CARD ---- */
      .rox-booking-card {
        background: ${CONFIG.brand.light};
        border: 1.5px solid ${CONFIG.brand.midGray};
        border-radius: 14px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .rox-booking-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid ${CONFIG.brand.midGray};
      }
      .rox-booking-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: rgba(247,140,38,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }
      .rox-booking-title {
        font-size: 14px;
        font-weight: 700;
        color: ${CONFIG.brand.textDark};
      }
      .rox-booking-detail {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        font-size: 13px;
        color: ${CONFIG.brand.textMid};
      }
      .rox-booking-detail svg {
        width: 15px;
        height: 15px;
        color: ${CONFIG.brand.primary};
        flex-shrink: 0;
      }

      /* ---- TYPING INDICATOR ---- */
      .rox-typing {
        display: flex;
        gap: 10px;
        margin-bottom: 14px;
        align-items: flex-end;
      }
      .rox-typing-dots {
        background: ${CONFIG.brand.light};
        border-radius: 18px;
        border-bottom-left-radius: 6px;
        padding: 14px 18px;
        display: flex;
        gap: 5px;
        align-items: center;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      .rox-typing-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: ${CONFIG.brand.textLight};
        animation: rox-bounce 1.4s ease-in-out infinite;
      }
      .rox-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .rox-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes rox-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-6px); opacity: 1; }
      }

      /* ---- INPUT BAR ---- */
      .rox-chat-input-bar {
        padding: 14px 16px;
        background: ${CONFIG.brand.light};
        border-top: 1px solid ${CONFIG.brand.midGray};
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }
      .rox-chat-input {
        flex: 1;
        border: 1.5px solid ${CONFIG.brand.midGray};
        border-radius: 24px;
        padding: 10px 18px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s ease;
        color: ${CONFIG.brand.textDark};
        background: ${CONFIG.brand.lightGray};
      }
      .rox-chat-input::placeholder { color: ${CONFIG.brand.textLight}; }
      .rox-chat-input:focus {
        border-color: ${CONFIG.brand.primary};
        background: ${CONFIG.brand.light};
      }
      .rox-send-btn {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${CONFIG.brand.primary}, ${CONFIG.brand.primaryDark});
        border: none;
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(247,140,38,0.3);
      }
      .rox-send-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 14px rgba(247,140,38,0.4);
      }
      .rox-send-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      .rox-send-btn svg { width: 18px; height: 18px; }

      /* ---- POWERED BY ---- */
      .rox-powered-by {
        text-align: center;
        padding: 6px;
        font-size: 10px;
        color: ${CONFIG.brand.textLight};
        background: ${CONFIG.brand.light};
        flex-shrink: 0;
      }

      /* ---- MOBILE ---- */
      @media (max-width: 480px) {
        #rox-chat-window {
          bottom: 0;
          right: 0;
          width: 100%;
          max-width: 100%;
          height: 100%;
          max-height: 100%;
          border-radius: 0;
        }
        #rox-chat-bubble {
          bottom: 16px;
          right: 16px;
          width: 56px;
          height: 56px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ========================================
  // BUILD DOM
  // ========================================
  function buildWidget() {
    if (document.getElementById('rox-chat-container')) return;

    const container = document.createElement('div');
    container.id = 'rox-chat-container';

    // Chat bubble
    container.innerHTML = `
      <button id="rox-chat-bubble" aria-label="Open chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <div id="rox-chat-window">
        <!-- Header -->
        <div class="rox-chat-header">
          <div class="rox-header-avatar">${CONFIG.brand.avatarText}</div>
          <div class="rox-header-info">
            <div class="rox-header-name">${CONFIG.companyName}</div>
            <div class="rox-header-status">
              <span class="rox-status-dot"></span>
              We typically reply instantly
            </div>
          </div>
          <button class="rox-close-btn" aria-label="Close chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Messages -->
        <div class="rox-chat-messages" id="rox-messages"></div>

        <!-- Input -->
        <div class="rox-chat-input-bar">
          <input class="rox-chat-input" id="rox-input" placeholder="Type your message..." autocomplete="off" />
          <button class="rox-send-btn" id="rox-send" disabled aria-label="Send message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <div class="rox-powered-by">Powered by ROX AI</div>
      </div>
    `;

    document.body.appendChild(container);
    bindEvents();
  }

  // ========================================
  // WELCOME CARD
  // ========================================
  function showWelcomeCard() {
    const messagesEl = document.getElementById('rox-messages');
    if (!messagesEl) return;

    const card = document.createElement('div');
    card.className = 'rox-welcome-card';
    card.innerHTML = `
      <div class="rox-welcome-title">Hi there! &#128075;</div>
      <div class="rox-welcome-subtitle">How can we help you today? Pick an option or type your question below.</div>
      <div class="rox-welcome-actions">
        <button class="rox-welcome-btn" data-msg="I need to schedule a repair">
          <span class="rox-welcome-btn-icon">&#128295;</span>
          <span class="rox-welcome-btn-label">Repair Service</span>
          <span class="rox-welcome-btn-desc">Fix a broken system</span>
        </button>
        <button class="rox-welcome-btn" data-msg="I'd like an estimate for a new system">
          <span class="rox-welcome-btn-icon">&#128200;</span>
          <span class="rox-welcome-btn-label">Free Estimate</span>
          <span class="rox-welcome-btn-desc">New installation</span>
        </button>
        <button class="rox-welcome-btn" data-msg="I need to schedule maintenance">
          <span class="rox-welcome-btn-icon">&#128736;</span>
          <span class="rox-welcome-btn-label">Maintenance</span>
          <span class="rox-welcome-btn-desc">Tune-up or check-up</span>
        </button>
        <button class="rox-welcome-btn" data-msg="I have a question about my appointment">
          <span class="rox-welcome-btn-icon">&#128197;</span>
          <span class="rox-welcome-btn-label">My Appointment</span>
          <span class="rox-welcome-btn-desc">Reschedule or check</span>
        </button>
      </div>
    `;
    messagesEl.appendChild(card);

    // Bind welcome button clicks
    card.querySelectorAll('.rox-welcome-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = btn.getAttribute('data-msg');
        if (msg) {
          // Remove welcome card
          card.remove();
          sendMessage(msg);
        }
      });
    });
  }

  // ========================================
  // EVENT BINDING
  // ========================================
  function bindEvents() {
    const bubble = document.getElementById('rox-chat-bubble');
    const chatWindow = document.getElementById('rox-chat-window');
    const closeBtn = chatWindow.querySelector('.rox-close-btn');
    const input = document.getElementById('rox-input');
    const sendBtn = document.getElementById('rox-send');

    bubble.addEventListener('click', () => {
      if (isOpen) {
        closeChat();
      } else {
        openChat();
      }
    });

    closeBtn.addEventListener('click', closeChat);

    input.addEventListener('input', () => {
      sendBtn.disabled = !input.value.trim();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        sendMessage(input.value.trim());
      }
    });

    sendBtn.addEventListener('click', () => {
      if (input.value.trim()) {
        sendMessage(input.value.trim());
      }
    });
  }

  // ========================================
  // OPEN / CLOSE
  // ========================================
  function openChat() {
    const chatWindow = document.getElementById('rox-chat-window');
    const bubble = document.getElementById('rox-chat-bubble');
    
    // First show it (display:flex) so transition can work
    chatWindow.style.display = 'flex';
    
    // Force reflow, then add class for animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        chatWindow.classList.add('rox-open');
      });
    });
    
    isOpen = true;

    // Hide bubble on mobile
    if (window.innerWidth <= 480) {
      bubble.style.display = 'none';
    }

    // Start session if not started
    if (!sessionId) {
      startSession();
    }
  }

  function closeChat() {
    const chatWindow = document.getElementById('rox-chat-window');
    const bubble = document.getElementById('rox-chat-bubble');

    chatWindow.classList.remove('rox-open');
    
    // Wait for transition to finish before hiding
    setTimeout(() => {
      if (!isOpen) chatWindow.style.display = 'none';
    }, 300);
    
    isOpen = false;
    bubble.style.display = 'flex';
  }

  // ========================================
  // SESSION
  // ========================================
  async function startSession() {
    try {
      const res = await fetch(`${CONFIG.serverUrl}/api/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: CONFIG.tenantId })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      sessionId = data.sessionId;

      // Show welcome card instead of a plain message
      showWelcomeCard();

      // Also show the engine's greeting if present
      if (data.greeting) {
        addBotMessage(data.greeting, data.quickReplies || []);
      }
    } catch (err) {
      console.error('[ROX Chat] Failed to start session:', err);
      addBotMessage(
        `Sorry, I'm having trouble connecting. Please call us directly at ${CONFIG.phone} and we'll be happy to help!`
      );
    }
  }

  // ========================================
  // SEND / RECEIVE
  // ========================================
  async function sendMessage(text) {
    const input = document.getElementById('rox-input');
    const sendBtn = document.getElementById('rox-send');

    // Show user message
    addUserMessage(text);
    input.value = '';
    sendBtn.disabled = true;

    // Show typing
    showTyping();

    try {
      const res = await fetch(`${CONFIG.serverUrl}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          message: text,
          tenantId: CONFIG.tenantId
        })
      });

      hideTyping();

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Handle bot response
      if (data.message) {
        // Check for booking confirmation
        if (data.booking) {
          addBookingCard(data.booking);
        }
        addBotMessage(data.message, data.quickReplies || []);
      }

    } catch (err) {
      hideTyping();
      console.error('[ROX Chat] Send error:', err);
      addBotMessage(
        `I'm sorry, something went wrong. Please try again or call us at ${CONFIG.phone}.`
      );
    }
  }

  // ========================================
  // MESSAGE RENDERING
  // ========================================
  function addBotMessage(text, quickReplies) {
    const messagesEl = document.getElementById('rox-messages');
    const wrapper = document.createElement('div');
    wrapper.className = 'rox-message';

    let html = `
      <div class="rox-msg-avatar">${CONFIG.brand.avatarText}</div>
      <div class="rox-msg-content">
        <div class="rox-msg-bubble">${escapeHtml(text)}</div>
    `;

    if (quickReplies && quickReplies.length > 0) {
      html += '<div class="rox-quick-replies">';
      quickReplies.forEach(reply => {
        const label = typeof reply === 'string' ? reply : reply.label;
        const value = typeof reply === 'string' ? reply : (reply.value || reply.label);
        html += `<button class="rox-quick-reply" data-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
      });
      html += '</div>';
    }

    html += '</div>';
    wrapper.innerHTML = html;
    messagesEl.appendChild(wrapper);

    // Bind quick reply clicks
    wrapper.querySelectorAll('.rox-quick-reply').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-value');
        // Remove all quick replies after clicking one
        const repliesEl = btn.closest('.rox-quick-replies');
        if (repliesEl) repliesEl.remove();
        sendMessage(val);
      });
    });

    scrollToBottom();
    messageCount++;
  }

  function addUserMessage(text) {
    const messagesEl = document.getElementById('rox-messages');
    const wrapper = document.createElement('div');
    wrapper.className = 'rox-message rox-user';
    wrapper.innerHTML = `
      <div class="rox-msg-content">
        <div class="rox-msg-bubble">${escapeHtml(text)}</div>
      </div>
    `;
    messagesEl.appendChild(wrapper);
    scrollToBottom();
  }

  function addBookingCard(booking) {
    const messagesEl = document.getElementById('rox-messages');
    const wrapper = document.createElement('div');
    wrapper.className = 'rox-message';
    wrapper.innerHTML = `
      <div class="rox-msg-avatar">${CONFIG.brand.avatarText}</div>
      <div class="rox-msg-content">
        <div class="rox-booking-card">
          <div class="rox-booking-header">
            <div class="rox-booking-icon">&#9989;</div>
            <div class="rox-booking-title">Appointment Confirmed</div>
          </div>
          ${booking.date ? `<div class="rox-booking-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>${escapeHtml(booking.date)}</span>
          </div>` : ''}
          ${booking.time ? `<div class="rox-booking-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${escapeHtml(booking.time)}</span>
          </div>` : ''}
          ${booking.tech ? `<div class="rox-booking-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>${escapeHtml(booking.tech)}</span>
          </div>` : ''}
          ${booking.service ? `<div class="rox-booking-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            <span>${escapeHtml(booking.service)}</span>
          </div>` : ''}
        </div>
      </div>
    `;
    messagesEl.appendChild(wrapper);
    scrollToBottom();
  }

  // ========================================
  // TYPING INDICATOR
  // ========================================
  function showTyping() {
    if (isTyping) return;
    isTyping = true;
    const messagesEl = document.getElementById('rox-messages');
    const typing = document.createElement('div');
    typing.className = 'rox-typing';
    typing.id = 'rox-typing-indicator';
    typing.innerHTML = `
      <div class="rox-msg-avatar">${CONFIG.brand.avatarText}</div>
      <div class="rox-typing-dots">
        <div class="rox-typing-dot"></div>
        <div class="rox-typing-dot"></div>
        <div class="rox-typing-dot"></div>
      </div>
    `;
    messagesEl.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    isTyping = false;
    const el = document.getElementById('rox-typing-indicator');
    if (el) el.remove();
  }

  // ========================================
  // HELPERS
  // ========================================
  function scrollToBottom() {
    const messagesEl = document.getElementById('rox-messages');
    if (messagesEl) {
      requestAnimationFrame(() => {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========================================
  // INIT
  // ========================================
  function init() {
    injectStyles();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildWidget);
    } else {
      buildWidget();
    }
  }

  init();
})();
