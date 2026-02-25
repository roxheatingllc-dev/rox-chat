/**
 * ROX Chat Widget - Embeddable Chat Component
 * 
 * Drop this on ANY website with a single script tag:
 *   <script src="https://rox-chat-production.up.railway.app/widget/chat-widget.js" 
 *           data-server="https://rox-chat-production.up.railway.app"></script>
 * 
 * DESIGN: ROX orange (#F78C26), black, and white.
 */

(function() {
  'use strict';

  const scriptTag = document.currentScript || document.querySelector('script[data-tenant]');
  const CONFIG = {
    tenantId: scriptTag?.getAttribute('data-tenant') || 'rox-heating',
    serverUrl: scriptTag?.getAttribute('data-server') || window.location.origin,
    position: scriptTag?.getAttribute('data-position') || 'bottom-right',
    primaryColor: scriptTag?.getAttribute('data-color') || '#F78C26',
    secondaryColor: scriptTag?.getAttribute('data-secondary') || '#1A1A1A',
  };

  const SESSION_KEY = `rox_chat_${CONFIG.tenantId}`;

  let state = {
    isOpen: false,
    sessionId: null,
    messages: [],
    isTyping: false,
    isEnded: false,
  };

  function injectStyles() {
    if (document.getElementById('rox-chat-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'rox-chat-styles';
    style.textContent = `
      #rox-chat-widget,
      #rox-chat-widget * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      /* ========== CHAT BUBBLE ========== */
      #rox-chat-bubble {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: ${CONFIG.primaryColor};
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 24px rgba(247, 140, 38, 0.45), 0 2px 8px rgba(0,0,0,0.15);
        z-index: 999998;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    box-shadow 0.3s ease,
                    opacity 0.3s ease;
      }
      #rox-chat-bubble:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 32px rgba(247, 140, 38, 0.55), 0 4px 12px rgba(0,0,0,0.2);
      }
      #rox-chat-bubble:active { transform: scale(0.95); }
      #rox-chat-bubble.rox-hidden { 
        opacity: 0; 
        pointer-events: none; 
        transform: scale(0.5); 
      }
      #rox-chat-bubble svg { width: 28px; height: 28px; fill: white; }

      #rox-chat-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #22c55e;
        color: white;
        font-size: 12px;
        font-weight: 700;
        display: none;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        animation: rox-bounce 0.4s ease;
      }
      @keyframes rox-bounce {
        0% { transform: scale(0); }
        60% { transform: scale(1.3); }
        100% { transform: scale(1); }
      }

      /* ========== CHAT WINDOW ========== */
      #rox-chat-window {
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 400px;
        max-width: calc(100vw - 32px);
        height: 600px;
        max-height: calc(100vh - 120px);
        border-radius: 16px;
        background: #ffffff;
        box-shadow: 0 16px 70px rgba(0,0,0,0.3), 0 4px 24px rgba(0,0,0,0.12);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
        transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      #rox-chat-window.rox-open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }

      /* ========== HEADER ========== */
      .rox-chat-header {
        background: ${CONFIG.secondaryColor};
        color: white;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
        border-bottom: 3px solid ${CONFIG.primaryColor};
      }
      .rox-chat-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: ${CONFIG.primaryColor};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 800;
        color: white;
        flex-shrink: 0;
        letter-spacing: -0.02em;
      }
      .rox-chat-header-info { flex: 1; }
      .rox-chat-header-title {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .rox-chat-header-status {
        font-size: 12px;
        opacity: 0.7;
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 2px;
      }
      .rox-chat-header-status::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #22c55e;
        display: inline-block;
      }
      .rox-chat-close {
        background: rgba(255,255,255,0.08);
        border: none;
        color: white;
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .rox-chat-close:hover { background: rgba(255,255,255,0.15); }
      .rox-chat-close svg { width: 18px; height: 18px; fill: white; }

      /* ========== MESSAGES ========== */
      .rox-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scroll-behavior: smooth;
        background: #f5f5f5;
      }
      .rox-chat-messages::-webkit-scrollbar { width: 5px; }
      .rox-chat-messages::-webkit-scrollbar-track { background: transparent; }
      .rox-chat-messages::-webkit-scrollbar-thumb { 
        background: #c0c0c0; 
        border-radius: 10px; 
      }

      .rox-msg {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 14.5px;
        line-height: 1.5;
        word-wrap: break-word;
        animation: rox-fadeIn 0.3s ease;
      }
      @keyframes rox-fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .rox-msg-bot {
        align-self: flex-start;
        background: white;
        color: #222;
        border-bottom-left-radius: 6px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      }
      .rox-msg-user {
        align-self: flex-end;
        background: ${CONFIG.secondaryColor};
        color: white;
        border-bottom-right-radius: 6px;
      }

      /* Typing */
      .rox-typing {
        align-self: flex-start;
        display: flex;
        gap: 4px;
        padding: 14px 18px;
        background: white;
        border-radius: 18px;
        border-bottom-left-radius: 6px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        animation: rox-fadeIn 0.2s ease;
      }
      .rox-typing-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #999;
        animation: rox-typingBounce 1.4s ease-in-out infinite;
      }
      .rox-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .rox-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes rox-typingBounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-6px); }
      }

      /* ========== QUICK REPLIES ========== */
      .rox-quick-replies {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 4px 0;
        animation: rox-fadeIn 0.3s ease 0.1s both;
      }
      .rox-quick-btn {
        background: white;
        color: ${CONFIG.primaryColor};
        border: 1.5px solid ${CONFIG.primaryColor};
        border-radius: 20px;
        padding: 8px 16px;
        font-size: 13.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      .rox-quick-btn:hover {
        background: ${CONFIG.primaryColor};
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 3px 12px rgba(247, 140, 38, 0.35);
      }
      .rox-quick-btn:active { transform: scale(0.97); }

      /* ========== INPUT ========== */
      .rox-chat-input-area {
        padding: 12px 16px 16px;
        background: white;
        border-top: 1px solid #e5e5e5;
        display: flex;
        gap: 10px;
        align-items: flex-end;
        flex-shrink: 0;
      }
      .rox-chat-input {
        flex: 1;
        border: 1.5px solid #d4d4d4;
        border-radius: 24px;
        padding: 10px 18px;
        font-size: 14.5px;
        outline: none;
        resize: none;
        max-height: 80px;
        line-height: 1.4;
        transition: border-color 0.2s;
        font-family: inherit;
        color: #222;
      }
      .rox-chat-input:focus { border-color: ${CONFIG.primaryColor}; }
      .rox-chat-input::placeholder { color: #999; }
      .rox-chat-input:disabled { 
        background: #f3f3f3; 
        cursor: not-allowed; 
      }
      .rox-chat-send {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: ${CONFIG.primaryColor};
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background 0.2s, transform 0.15s;
      }
      .rox-chat-send:hover { background: #e07b1a; }
      .rox-chat-send:active { transform: scale(0.92); }
      .rox-chat-send:disabled { 
        background: #ccc; 
        cursor: not-allowed; 
      }
      .rox-chat-send svg { width: 18px; height: 18px; fill: white; }

      /* ========== BOOKING CARD ========== */
      .rox-booking-card {
        background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
        border: 1px solid #86efac;
        border-radius: 14px;
        padding: 16px;
        margin: 4px 0;
        animation: rox-fadeIn 0.4s ease;
      }
      .rox-booking-card-title {
        font-size: 13px;
        font-weight: 700;
        color: #166534;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 8px;
      }
      .rox-booking-card-detail {
        font-size: 14px;
        color: #15803d;
        margin: 4px 0;
      }

      .rox-powered-by {
        text-align: center;
        padding: 6px;
        font-size: 11px;
        color: #94a3b8;
        background: white;
      }

      /* ========== MOBILE ========== */
      @media (max-width: 480px) {
        #rox-chat-window {
          bottom: 0;
          right: 0;
          width: 100vw;
          height: 100vh;
          max-height: 100vh;
          border-radius: 0;
        }
        #rox-chat-bubble {
          bottom: 16px;
          right: 16px;
          width: 56px;
          height: 56px;
        }
        #rox-chat-bubble svg { width: 24px; height: 24px; }
      }
    `;
    
    document.head.appendChild(style);
  }

  const ICONS = {
    chat: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    close: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    send: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    minimize: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 13H5v-2h14v2z"/></svg>',
  };

  function buildWidget() {
    const container = document.createElement('div');
    container.id = 'rox-chat-widget';
    
    container.innerHTML = `
      <button id="rox-chat-bubble" aria-label="Open chat">
        ${ICONS.chat}
        <span id="rox-chat-badge">1</span>
      </button>
      
      <div id="rox-chat-window" role="dialog" aria-label="Chat with ROX Heating & Air">
        <div class="rox-chat-header">
          <div class="rox-chat-avatar">ROX</div>
          <div class="rox-chat-header-info">
            <div class="rox-chat-header-title">ROX Heating & Air</div>
            <div class="rox-chat-header-status">Online</div>
          </div>
          <button class="rox-chat-close" aria-label="Close chat">
            ${ICONS.minimize}
          </button>
        </div>
        
        <div class="rox-chat-messages" id="rox-chat-messages"></div>
        
        <div class="rox-chat-input-area">
          <input 
            type="text" 
            class="rox-chat-input" 
            id="rox-chat-input" 
            placeholder="Type a message or tap a button..."
            autocomplete="off"
            maxlength="500"
          />
          <button class="rox-chat-send" id="rox-chat-send" aria-label="Send message">
            ${ICONS.send}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
  }

  let els = {};
  
  function cacheElements() {
    els = {
      bubble: document.getElementById('rox-chat-bubble'),
      badge: document.getElementById('rox-chat-badge'),
      window: document.getElementById('rox-chat-window'),
      messages: document.getElementById('rox-chat-messages'),
      input: document.getElementById('rox-chat-input'),
      sendBtn: document.getElementById('rox-chat-send'),
      closeBtn: document.querySelector('.rox-chat-close'),
    };
  }

  const api = {
    async startSession() {
      const res = await fetch(`${CONFIG.serverUrl}/api/chat/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': CONFIG.tenantId,
        },
        body: JSON.stringify({
          metadata: {
            referrer: document.referrer,
            page: window.location.href,
          },
        }),
      });
      return res.json();
    },

    async sendMessage(sessionId, text) {
      const res = await fetch(`${CONFIG.serverUrl}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': CONFIG.tenantId,
        },
        body: JSON.stringify({ sessionId, text }),
      });
      return res.json();
    },

    async getSession(sessionId) {
      const res = await fetch(
        `${CONFIG.serverUrl}/api/chat/session?sessionId=${sessionId}&tenant=${CONFIG.tenantId}`,
        { headers: { 'X-Tenant-ID': CONFIG.tenantId } }
      );
      return res.json();
    },

    async endSession(sessionId) {
      await fetch(`${CONFIG.serverUrl}/api/chat/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': CONFIG.tenantId,
        },
        body: JSON.stringify({ sessionId }),
      });
    },
  };

  function saveSession() {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        sessionId: state.sessionId,
        messages: state.messages,
        isEnded: state.isEnded,
        savedAt: Date.now(),
      }));
    } catch (e) {}
  }

  function loadSession() {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (!saved) return null;
      const data = JSON.parse(saved);
      if (Date.now() - data.savedAt > 30 * 60 * 1000) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return data;
    } catch (e) { 
      return null; 
    }
  }

  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function renderMessage(msg) {
    const div = document.createElement('div');
    
    if (msg.type === 'bot') {
      div.className = 'rox-msg rox-msg-bot';
      div.textContent = msg.text;
      els.messages.appendChild(div);
      
      if (msg.card && msg.card.type === 'booking_confirmation') {
        renderBookingCard(msg.card);
      }
      
      if (msg.quickReplies && msg.quickReplies.length > 0 && !msg._repliesUsed) {
        renderQuickReplies(msg.quickReplies);
      }
    } else if (msg.type === 'user') {
      div.className = 'rox-msg rox-msg-user';
      div.textContent = msg.text;
      els.messages.appendChild(div);
    }
    
    scrollToBottom();
  }

  function renderQuickReplies(replies) {
    removeQuickReplies();
    
    const container = document.createElement('div');
    container.className = 'rox-quick-replies';
    container.id = 'rox-active-replies';
    
    replies.forEach(reply => {
      const btn = document.createElement('button');
      btn.className = 'rox-quick-btn';
      btn.textContent = reply.label || reply;
      btn.addEventListener('click', () => {
        const value = reply.value || reply.label || reply;
        handleQuickReply(value);
      });
      container.appendChild(btn);
    });
    
    els.messages.appendChild(container);
    scrollToBottom();
  }

  function removeQuickReplies() {
    const existing = document.getElementById('rox-active-replies');
    if (existing) existing.remove();
  }

  function renderBookingCard(card) {
    const div = document.createElement('div');
    div.className = 'rox-booking-card';
    div.innerHTML = `
      <div class="rox-booking-card-title">✅ Appointment Confirmed</div>
      ${card.date ? `<div class="rox-booking-card-detail">📅 ${card.date}</div>` : ''}
      ${card.time ? `<div class="rox-booking-card-detail">🕐 ${card.time}</div>` : ''}
      ${card.tech ? `<div class="rox-booking-card-detail">👤 ${card.tech}</div>` : ''}
    `;
    els.messages.appendChild(div);
  }

  function showTyping() {
    if (state.isTyping) return;
    state.isTyping = true;
    
    const div = document.createElement('div');
    div.className = 'rox-typing';
    div.id = 'rox-typing-indicator';
    div.innerHTML = `
      <div class="rox-typing-dot"></div>
      <div class="rox-typing-dot"></div>
      <div class="rox-typing-dot"></div>
    `;
    els.messages.appendChild(div);
    scrollToBottom();
  }

  function hideTyping() {
    state.isTyping = false;
    const indicator = document.getElementById('rox-typing-indicator');
    if (indicator) indicator.remove();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      els.messages.scrollTop = els.messages.scrollHeight;
    });
  }

  function setInputEnabled(enabled) {
    els.input.disabled = !enabled;
    els.sendBtn.disabled = !enabled;
  }

  async function openChat() {
    state.isOpen = true;
    els.window.classList.add('rox-open');
    els.bubble.classList.add('rox-hidden');
    els.badge.style.display = 'none';
    els.input.focus();
    
    if (!state.sessionId && !state.isEnded) {
      await startNewSession();
    }
  }

  function closeChat() {
    state.isOpen = false;
    els.window.classList.remove('rox-open');
    els.bubble.classList.remove('rox-hidden');
  }

  async function startNewSession() {
    try {
      setInputEnabled(false);
      showTyping();
      
      const data = await api.startSession();
      
      hideTyping();
      
      if (data.sessionId && data.message) {
        state.sessionId = data.sessionId;
        
        const botMsg = {
          type: 'bot',
          text: data.message.text,
          quickReplies: data.message.quickReplies,
        };
        
        state.messages.push(botMsg);
        renderMessage(botMsg);
        saveSession();
      }
      
      setInputEnabled(true);
      
    } catch (error) {
      hideTyping();
      console.error('[ROX Chat] Failed to start session:', error);
      
      const errorMsg = {
        type: 'bot',
        text: "Sorry, I'm having trouble connecting. Please try again in a moment or call us at (720) 468-0689.",
      };
      state.messages.push(errorMsg);
      renderMessage(errorMsg);
      setInputEnabled(true);
    }
  }

  async function sendMessage(text) {
    if (!text.trim() || state.isEnded) return;
    
    removeQuickReplies();
    
    const userMsg = { type: 'user', text: text.trim() };
    state.messages.push(userMsg);
    renderMessage(userMsg);
    
    els.input.value = '';
    setInputEnabled(false);
    showTyping();
    
    try {
      const data = await api.sendMessage(state.sessionId, text.trim());
      
      await new Promise(r => setTimeout(r, 400));
      
      hideTyping();
      
      if (data.message) {
        const botMsg = {
          type: 'bot',
          text: data.message.text,
          quickReplies: data.message.quickReplies,
          card: data.message.card,
        };
        
        state.messages.push(botMsg);
        renderMessage(botMsg);
        
        if (data.message.endChat) {
          state.isEnded = true;
          setInputEnabled(false);
          els.input.placeholder = 'Chat ended. Refresh to start a new conversation.';
          clearSession();
          return;
        }
      }
      
      if (data.shouldRestart) {
        state.sessionId = null;
        state.messages = [];
        els.messages.innerHTML = '';
        await startNewSession();
        return;
      }
      
      saveSession();
      setInputEnabled(true);
      els.input.focus();
      
    } catch (error) {
      hideTyping();
      console.error('[ROX Chat] Message failed:', error);
      
      const errorMsg = {
        type: 'bot',
        text: "I'm having trouble right now. Please try again, or call us at (720) 468-0689 for immediate help.",
      };
      state.messages.push(errorMsg);
      renderMessage(errorMsg);
      setInputEnabled(true);
    }
  }

  function handleQuickReply(value) {
    sendMessage(value);
  }

  function attachListeners() {
    els.bubble.addEventListener('click', openChat);
    els.closeBtn.addEventListener('click', closeChat);
    
    els.sendBtn.addEventListener('click', () => {
      const text = els.input.value;
      if (text.trim()) sendMessage(text);
    });
    
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = els.input.value;
        if (text.trim()) sendMessage(text);
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isOpen) closeChat();
    });
  }

  function restoreSession() {
    const saved = loadSession();
    if (!saved || saved.isEnded) return false;
    
    state.sessionId = saved.sessionId;
    state.messages = saved.messages || [];
    state.isEnded = saved.isEnded || false;
    
    state.messages.forEach((msg, i) => {
      const isLast = i === state.messages.length - 1;
      if (!isLast) {
        msg._repliesUsed = true;
      }
      renderMessage(msg);
    });
    
    return true;
  }

  function init() {
    injectStyles();
    buildWidget();
    cacheElements();
    attachListeners();
    
    const restored = restoreSession();
    
    if (!restored && !state.isOpen) {
      setTimeout(() => {
        els.badge.style.display = 'flex';
      }, 3000);
    }
    
    console.log('[ROX Chat] Widget initialized for tenant:', CONFIG.tenantId);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
