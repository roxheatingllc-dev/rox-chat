/**
 * ROX Chat Widget v3.0 - Embeddable Chat Component
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
  // for JS bundlers that strip data-attributes
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
    primaryColor: '#F78C26',
    headerColor: '#1A1A1A',
    userBubbleColor: '#1A1A1A',
    companyName: 'ROX Heating & Air',
    phone: '(720) 468-0689',
    avatarEmoji: '🔧'
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

  // ========================================
  // INJECT STYLES
  // ========================================
  function injectStyles() {
    if (document.getElementById('rox-chat-styles')) return;
    const style = document.createElement('style');
    style.id = 'rox-chat-styles';
    style.textContent = `
      #rox-chat-container * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      }

      /* ---- BUBBLE ---- */
      #rox-chat-bubble {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${CONFIG.primaryColor};
        color: #fff;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999998;
        box-shadow: 0 4px 20px rgba(247,140,38,0.45), 0 2px 8px rgba(0,0,0,0.15);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        animation: rox-bubble-glow 3s ease-in-out infinite;
      }
      #rox-chat-bubble:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 28px rgba(247,140,38,0.55), 0 3px 12px rgba(0,0,0,0.2);
      }
      @keyframes rox-bubble-glow {
        0%, 100% { box-shadow: 0 4px 20px rgba(247,140,38,0.45), 0 2px 8px rgba(0,0,0,0.15); }
        50% { box-shadow: 0 4px 30px rgba(247,140,38,0.65), 0 2px 12px rgba(0,0,0,0.2); }
      }
      #rox-chat-bubble svg {
        width: 26px;
        height: 26px;
      }

      /* ---- WINDOW ---- */
      #rox-chat-window {
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 380px;
        max-width: calc(100vw - 32px);
        height: 550px;
        max-height: calc(100vh - 130px);
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        display: none;
        flex-direction: column;
        z-index: 999999;
        overflow: hidden;
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 0.25s ease, transform 0.25s ease;
      }
      #rox-chat-window.rox-open {
        display: flex;
        opacity: 1;
        transform: translateY(0);
      }

      /* ---- HEADER ---- */
      .rox-chat-header {
        background: ${CONFIG.headerColor};
        padding: 16px 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
        border-bottom: 3px solid ${CONFIG.primaryColor};
      }
      .rox-header-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${CONFIG.primaryColor};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
      }
      .rox-header-info {
        flex: 1;
      }
      .rox-header-name {
        color: #fff;
        font-size: 15px;
        font-weight: 600;
      }
      .rox-header-status {
        color: rgba(255,255,255,0.6);
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 2px;
      }
      .rox-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #4ADE80;
      }
      .rox-close-btn {
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
      }
      .rox-close-btn:hover {
        color: #fff;
      }

      /* ---- MESSAGES ---- */
      .rox-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f7f7f8;
      }
      .rox-chat-messages::-webkit-scrollbar { width: 4px; }
      .rox-chat-messages::-webkit-scrollbar-track { background: transparent; }
      .rox-chat-messages::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }

      /* ---- WELCOME CARD ---- */
      .rox-welcome-card {
        background: #fff;
        border-radius: 14px;
        padding: 20px 16px;
        margin-bottom: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      }
      .rox-welcome-title {
        font-size: 16px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 4px;
      }
      .rox-welcome-subtitle {
        font-size: 13px;
        color: #888;
        margin-bottom: 16px;
      }
      .rox-welcome-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .rox-welcome-btn {
        background: #fff;
        border: 1px solid #e5e5e5;
        border-radius: 10px;
        padding: 12px 10px;
        cursor: pointer;
        text-align: left;
        transition: all 0.15s ease;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .rox-welcome-btn:hover {
        border-color: ${CONFIG.primaryColor};
        background: rgba(247,140,38,0.03);
      }
      .rox-welcome-btn-icon {
        font-size: 20px;
        line-height: 1;
      }
      .rox-welcome-btn-label {
        font-size: 13px;
        font-weight: 600;
        color: #1a1a1a;
      }
      .rox-welcome-btn-desc {
        font-size: 11px;
        color: #999;
      }

      /* ---- MESSAGE BUBBLES ---- */
      .rox-message {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        animation: rox-fade-in 0.2s ease;
      }
      @keyframes rox-fade-in {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .rox-message.rox-user {
        flex-direction: row-reverse;
      }
      .rox-msg-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: ${CONFIG.primaryColor};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .rox-msg-content {
        max-width: 75%;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .rox-msg-bubble {
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.45;
        word-wrap: break-word;
      }
      .rox-message:not(.rox-user) .rox-msg-bubble {
        background: #fff;
        color: #1a1a1a;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.06);
      }
      .rox-message.rox-user .rox-msg-bubble {
        background: ${CONFIG.userBubbleColor};
        color: #fff;
        border-bottom-right-radius: 4px;
      }

      /* ---- QUICK REPLIES ---- */
      .rox-quick-replies {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .rox-quick-reply {
        background: #fff;
        border: 1.5px solid ${CONFIG.primaryColor};
        color: ${CONFIG.primaryColor};
        padding: 7px 14px;
        border-radius: 18px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .rox-quick-reply:hover {
        background: ${CONFIG.primaryColor};
        color: #fff;
      }

      /* ---- BOOKING CARD ---- */
      .rox-booking-card {
        background: #fff;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        padding: 14px;
      }
      .rox-booking-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid #eee;
      }
      .rox-booking-icon { font-size: 18px; }
      .rox-booking-title {
        font-size: 14px;
        font-weight: 600;
        color: #1a1a1a;
      }
      .rox-booking-detail {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
        font-size: 13px;
        color: #555;
      }
      .rox-booking-detail svg {
        width: 14px;
        height: 14px;
        color: ${CONFIG.primaryColor};
        flex-shrink: 0;
      }

      /* ---- TYPING ---- */
      .rox-typing {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        align-items: flex-end;
      }
      .rox-typing-dots {
        background: #fff;
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        padding: 12px 16px;
        display: flex;
        gap: 4px;
        align-items: center;
        box-shadow: 0 1px 2px rgba(0,0,0,0.06);
      }
      .rox-typing-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #aaa;
        animation: rox-bounce 1.4s ease-in-out infinite;
      }
      .rox-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .rox-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes rox-bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-5px); }
      }

      /* ---- INPUT ---- */
      .rox-chat-input-bar {
        padding: 12px 14px;
        background: #fff;
        border-top: 1px solid #e5e5e5;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .rox-chat-input {
        flex: 1;
        border: 1px solid #ddd;
        border-radius: 20px;
        padding: 9px 16px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s ease;
        color: #1a1a1a;
      }
      .rox-chat-input::placeholder { color: #aaa; }
      .rox-chat-input:focus { border-color: ${CONFIG.primaryColor}; }
      .rox-send-btn {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: ${CONFIG.primaryColor};
        border: none;
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.15s ease;
        flex-shrink: 0;
      }
      .rox-send-btn:hover { opacity: 0.9; }
      .rox-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .rox-send-btn svg { width: 16px; height: 16px; }

      /* ---- POWERED BY ---- */
      .rox-powered-by {
        text-align: center;
        padding: 5px;
        font-size: 10px;
        color: #bbb;
        background: #fff;
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
    container.innerHTML = `
      <button id="rox-chat-bubble" aria-label="Open chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <div id="rox-chat-window">
        <div class="rox-chat-header">
          <div class="rox-header-avatar">${CONFIG.avatarEmoji}</div>
          <div class="rox-header-info">
            <div class="rox-header-name">${CONFIG.companyName}</div>
            <div class="rox-header-status">
              <span class="rox-status-dot"></span>
              Online
            </div>
          </div>
          <button class="rox-close-btn" aria-label="Close chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="rox-chat-messages" id="rox-messages"></div>

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
      <div class="rox-welcome-title">Hi there! 👋</div>
      <div class="rox-welcome-subtitle">How can we help you today?</div>
      <div class="rox-welcome-actions">
        <button class="rox-welcome-btn" data-msg="I need to schedule a repair">
          <span class="rox-welcome-btn-icon">🔧</span>
          <span class="rox-welcome-btn-label">Repair Service</span>
          <span class="rox-welcome-btn-desc">Fix a broken system</span>
        </button>
        <button class="rox-welcome-btn" data-msg="I'd like an estimate for a new system">
          <span class="rox-welcome-btn-icon">📊</span>
          <span class="rox-welcome-btn-label">Free Estimate</span>
          <span class="rox-welcome-btn-desc">New installation</span>
        </button>
        <button class="rox-welcome-btn" data-msg="I need to schedule maintenance">
          <span class="rox-welcome-btn-icon">🛠️</span>
          <span class="rox-welcome-btn-label">Maintenance</span>
          <span class="rox-welcome-btn-desc">Tune-up or check-up</span>
        </button>
        <button class="rox-welcome-btn" data-msg="I have a question about my appointment">
          <span class="rox-welcome-btn-icon">📅</span>
          <span class="rox-welcome-btn-label">My Appointment</span>
          <span class="rox-welcome-btn-desc">Reschedule or check</span>
        </button>
      </div>
    `;
    messagesEl.appendChild(card);

    card.querySelectorAll('.rox-welcome-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = btn.getAttribute('data-msg');
        if (msg) {
          card.remove();
          sendMessage(msg);
        }
      });
    });
  }

  // ========================================
  // EVENTS
  // ========================================
  function bindEvents() {
    const bubble = document.getElementById('rox-chat-bubble');
    const chatWindow = document.getElementById('rox-chat-window');
    const closeBtn = chatWindow.querySelector('.rox-close-btn');
    const input = document.getElementById('rox-input');
    const sendBtn = document.getElementById('rox-send');

    bubble.addEventListener('click', () => {
      isOpen ? closeChat() : openChat();
    });

    closeBtn.addEventListener('click', closeChat);

    input.addEventListener('input', () => {
      sendBtn.disabled = !input.value.trim();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) sendMessage(input.value.trim());
    });

    sendBtn.addEventListener('click', () => {
      if (input.value.trim()) sendMessage(input.value.trim());
    });
  }

  function openChat() {
    const chatWindow = document.getElementById('rox-chat-window');
    const bubble = document.getElementById('rox-chat-bubble');
    chatWindow.style.display = 'flex';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { chatWindow.classList.add('rox-open'); });
    });
    isOpen = true;
    if (window.innerWidth <= 480) bubble.style.display = 'none';
    if (!sessionId) startSession();
  }

  function closeChat() {
    const chatWindow = document.getElementById('rox-chat-window');
    const bubble = document.getElementById('rox-chat-bubble');
    chatWindow.classList.remove('rox-open');
    setTimeout(() => { if (!isOpen) chatWindow.style.display = 'none'; }, 250);
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

      // Show welcome card with 4 service buttons
      showWelcomeCard();

      // Also show engine greeting if present
      if (data.greeting) {
        addBotMessage(data.greeting, data.quickReplies || []);
      }
    } catch (err) {
      console.error('[ROX Chat] Failed to start session:', err);
      addBotMessage(`Sorry, I'm having trouble connecting. Please try again in a moment or call us directly at ${CONFIG.phone}.`);
    }
  }

  // ========================================
  // SEND / RECEIVE
  // ========================================
  async function sendMessage(text) {
    const input = document.getElementById('rox-input');
    const sendBtn = document.getElementById('rox-send');
    addUserMessage(text);
    input.value = '';
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(`${CONFIG.serverUrl}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text, tenantId: CONFIG.tenantId })
      });
      hideTyping();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.booking) addBookingCard(data.booking);
      if (data.message) addBotMessage(data.message, data.quickReplies || []);
    } catch (err) {
      hideTyping();
      console.error('[ROX Chat] Send error:', err);
      addBotMessage(`I'm sorry, something went wrong. Please try again or call us at ${CONFIG.phone}.`);
    }
  }

  // ========================================
  // RENDER MESSAGES
  // ========================================
  function addBotMessage(text, quickReplies) {
    const messagesEl = document.getElementById('rox-messages');
    const wrapper = document.createElement('div');
    wrapper.className = 'rox-message';

    let html = `
      <div class="rox-msg-avatar">${CONFIG.avatarEmoji}</div>
      <div class="rox-msg-content">
        <div class="rox-msg-bubble">${escapeHtml(text)}</div>
    `;
    if (quickReplies && quickReplies.length > 0) {
      html += '<div class="rox-quick-replies">';
      quickReplies.forEach(r => {
        const label = typeof r === 'string' ? r : r.label;
        const value = typeof r === 'string' ? r : (r.value || r.label);
        html += `<button class="rox-quick-reply" data-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
      });
      html += '</div>';
    }
    html += '</div>';
    wrapper.innerHTML = html;
    messagesEl.appendChild(wrapper);

    wrapper.querySelectorAll('.rox-quick-reply').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-value');
        const repliesEl = btn.closest('.rox-quick-replies');
        if (repliesEl) repliesEl.remove();
        sendMessage(val);
      });
    });
    scrollToBottom();
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
      <div class="rox-msg-avatar">${CONFIG.avatarEmoji}</div>
      <div class="rox-msg-content">
        <div class="rox-booking-card">
          <div class="rox-booking-header">
            <span class="rox-booking-icon">✅</span>
            <span class="rox-booking-title">Appointment Confirmed</span>
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
    const el = document.createElement('div');
    el.className = 'rox-typing';
    el.id = 'rox-typing-indicator';
    el.innerHTML = `
      <div class="rox-msg-avatar">${CONFIG.avatarEmoji}</div>
      <div class="rox-typing-dots">
        <div class="rox-typing-dot"></div>
        <div class="rox-typing-dot"></div>
        <div class="rox-typing-dot"></div>
      </div>
    `;
    messagesEl.appendChild(el);
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
    const el = document.getElementById('rox-messages');
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
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
