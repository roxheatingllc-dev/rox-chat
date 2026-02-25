/**
 * ROX Chat Widget v2 - Embeddable Chat Component
 * 
 * Drop this on ANY website with a single script tag:
 *   <script src="https://rox-chat-production.up.railway.app/widget/chat-widget.js" 
 *           data-server="https://rox-chat-production.up.railway.app"></script>
 * 
 * DESIGN: Bold, dark theme matching roxheating.com - orange accents, professional feel.
 */

(function() {
  'use strict';

  const scriptTag = document.currentScript || document.querySelector('script[data-tenant]');
  const CONFIG = {
    tenantId: scriptTag?.getAttribute('data-tenant') || 'rox-heating',
    serverUrl: scriptTag?.getAttribute('data-server') || window.location.origin,
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
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      #rox-chat-widget,
      #rox-chat-widget * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      /* ========== CHAT BUBBLE ========== */
      #rox-chat-bubble {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 66px;
        height: 66px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${CONFIG.primaryColor} 0%, #e07518 100%);
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(247, 140, 38, 0.5), 0 0 0 0 rgba(247, 140, 38, 0.4);
        z-index: 999998;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    box-shadow 0.3s ease,
                    opacity 0.3s ease;
        animation: rox-pulse 3s ease-in-out infinite;
      }
      @keyframes rox-pulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(247, 140, 38, 0.5), 0 0 0 0 rgba(247, 140, 38, 0.4); }
        50% { box-shadow: 0 4px 20px rgba(247, 140, 38, 0.5), 0 0 0 10px rgba(247, 140, 38, 0); }
      }
      #rox-chat-bubble:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 32px rgba(247, 140, 38, 0.6);
        animation: none;
      }
      #rox-chat-bubble:active { transform: scale(0.95); }
      #rox-chat-bubble.rox-hidden { 
        opacity: 0; pointer-events: none; transform: scale(0.5); animation: none;
      }
      #rox-chat-bubble svg { width: 30px; height: 30px; fill: white; }

      #rox-chat-badge {
        position: absolute; top: -3px; right: -3px;
        width: 22px; height: 22px; border-radius: 50%;
        background: #ef4444; color: white;
        font-size: 12px; font-weight: 700;
        display: none; align-items: center; justify-content: center;
        border: 2.5px solid white;
        animation: rox-badgePop 0.4s ease;
      }
      @keyframes rox-badgePop {
        0% { transform: scale(0); } 60% { transform: scale(1.3); } 100% { transform: scale(1); }
      }

      /* ========== CHAT WINDOW ========== */
      #rox-chat-window {
        position: fixed; bottom: 100px; right: 24px;
        width: 410px; max-width: calc(100vw - 32px);
        height: 620px; max-height: calc(100vh - 120px);
        border-radius: 20px; background: #f0f0f0;
        box-shadow: 0 20px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08);
        z-index: 999999;
        display: flex; flex-direction: column; overflow: hidden;
        opacity: 0; transform: translateY(24px) scale(0.92); pointer-events: none;
        transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      #rox-chat-window.rox-open {
        opacity: 1; transform: translateY(0) scale(1); pointer-events: all;
      }

      /* ========== HEADER ========== */
      .rox-chat-header {
        background: linear-gradient(180deg, ${CONFIG.secondaryColor} 0%, #111 100%);
        color: white; padding: 20px 20px 18px;
        display: flex; align-items: center; gap: 14px;
        flex-shrink: 0; position: relative;
      }
      .rox-chat-header::after {
        content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, ${CONFIG.primaryColor}, #e07518, ${CONFIG.primaryColor});
      }
      .rox-chat-avatar {
        width: 46px; height: 46px; border-radius: 14px;
        background: ${CONFIG.primaryColor};
        display: flex; align-items: center; justify-content: center;
        font-size: 15px; font-weight: 800; color: white; flex-shrink: 0;
        letter-spacing: -0.03em;
        box-shadow: 0 2px 8px rgba(247, 140, 38, 0.35);
      }
      .rox-chat-header-info { flex: 1; }
      .rox-chat-header-title { font-size: 16px; font-weight: 700; }
      .rox-chat-header-status {
        font-size: 12px; opacity: 0.65;
        display: flex; align-items: center; gap: 6px; margin-top: 3px;
      }
      .rox-status-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #22c55e; display: inline-block;
        box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
      }
      .rox-chat-close {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        color: white; cursor: pointer;
        width: 34px; height: 34px; border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .rox-chat-close:hover { background: rgba(255,255,255,0.12); }
      .rox-chat-close svg { width: 18px; height: 18px; fill: white; }

      /* ========== MESSAGES ========== */
      .rox-chat-messages {
        flex: 1; overflow-y: auto; padding: 20px 16px;
        display: flex; flex-direction: column; gap: 14px;
        scroll-behavior: smooth; background: #f0f0f0;
      }
      .rox-chat-messages::-webkit-scrollbar { width: 4px; }
      .rox-chat-messages::-webkit-scrollbar-track { background: transparent; }
      .rox-chat-messages::-webkit-scrollbar-thumb { background: #bbb; border-radius: 10px; }

      .rox-msg {
        max-width: 82%; padding: 13px 17px;
        font-size: 14px; line-height: 1.55; word-wrap: break-word;
        animation: rox-slideIn 0.3s ease;
      }
      @keyframes rox-slideIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .rox-msg-bot {
        align-self: flex-start; background: white; color: #222;
        border-radius: 4px 18px 18px 18px;
        box-shadow: 0 1px 6px rgba(0,0,0,0.07);
      }
      .rox-msg-user {
        align-self: flex-end; background: ${CONFIG.secondaryColor}; color: white;
        border-radius: 18px 4px 18px 18px;
      }

      /* ========== WELCOME CARD ========== */
      .rox-welcome-card {
        background: white; border-radius: 16px; padding: 20px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        animation: rox-slideIn 0.4s ease;
      }
      .rox-welcome-msg {
        font-size: 15px; color: #222; line-height: 1.5;
        margin-bottom: 16px; font-weight: 500;
      }
      .rox-welcome-buttons { display: flex; flex-direction: column; gap: 8px; }
      .rox-welcome-btn {
        display: flex; align-items: center; gap: 12px;
        background: #fafafa; border: 1.5px solid #e5e5e5;
        border-radius: 12px; padding: 14px 16px;
        font-size: 14px; font-weight: 600; color: #222;
        cursor: pointer; transition: all 0.2s ease;
        text-align: left; width: 100%;
      }
      .rox-welcome-btn:hover {
        border-color: ${CONFIG.primaryColor}; background: #fff8f0;
        transform: translateX(4px);
      }
      .rox-welcome-btn:active { transform: scale(0.98); }
      .rox-welcome-icon {
        width: 38px; height: 38px; border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; flex-shrink: 0;
      }
      .rox-welcome-icon-repair { background: #fef2e0; }
      .rox-welcome-icon-estimate { background: #e8f5e9; }
      .rox-welcome-icon-maintenance { background: #e3f2fd; }
      .rox-welcome-icon-appt { background: #f3e8fd; }
      .rox-welcome-btn-sub { font-size: 12px; font-weight: 400; color: #888; margin-top: 2px; }

      /* ========== TYPING ========== */
      .rox-typing {
        align-self: flex-start; display: flex; gap: 5px;
        padding: 14px 18px; background: white;
        border-radius: 4px 18px 18px 18px;
        box-shadow: 0 1px 6px rgba(0,0,0,0.07);
        animation: rox-slideIn 0.2s ease;
      }
      .rox-typing-dot {
        width: 8px; height: 8px; border-radius: 50%; background: #aaa;
        animation: rox-typingBounce 1.4s ease-in-out infinite;
      }
      .rox-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .rox-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes rox-typingBounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
        30% { transform: translateY(-8px); opacity: 1; }
      }

      /* ========== QUICK REPLIES ========== */
      .rox-quick-replies {
        display: flex; flex-wrap: wrap; gap: 8px; padding: 6px 0;
        animation: rox-slideIn 0.3s ease 0.1s both;
      }
      .rox-quick-btn {
        background: white; color: ${CONFIG.secondaryColor};
        border: 1.5px solid #ddd; border-radius: 24px;
        padding: 10px 18px; font-size: 13.5px; font-weight: 600;
        cursor: pointer; transition: all 0.2s ease;
        white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }
      .rox-quick-btn:hover {
        background: ${CONFIG.primaryColor}; color: white;
        border-color: ${CONFIG.primaryColor};
        transform: translateY(-2px);
        box-shadow: 0 4px 14px rgba(247, 140, 38, 0.35);
      }
      .rox-quick-btn:active { transform: scale(0.97); }

      /* ========== INPUT ========== */
      .rox-chat-input-area {
        padding: 14px 16px 18px; background: white;
        border-top: 1px solid #e5e5e5;
        display: flex; gap: 10px; align-items: center; flex-shrink: 0;
      }
      .rox-chat-input {
        flex: 1; border: 1.5px solid #e0e0e0; border-radius: 24px;
        padding: 11px 18px; font-size: 14px; outline: none;
        resize: none; max-height: 80px; line-height: 1.4;
        transition: border-color 0.2s, box-shadow 0.2s;
        font-family: inherit; color: #222; background: #fafafa;
      }
      .rox-chat-input:focus { 
        border-color: ${CONFIG.primaryColor}; 
        box-shadow: 0 0 0 3px rgba(247, 140, 38, 0.12);
        background: white;
      }
      .rox-chat-input::placeholder { color: #aaa; }
      .rox-chat-input:disabled { background: #f3f3f3; cursor: not-allowed; }
      .rox-chat-send {
        width: 44px; height: 44px; border-radius: 50%;
        background: linear-gradient(135deg, ${CONFIG.primaryColor} 0%, #e07518 100%);
        border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(247, 140, 38, 0.3);
      }
      .rox-chat-send:hover { transform: scale(1.05); box-shadow: 0 4px 14px rgba(247, 140, 38, 0.45); }
      .rox-chat-send:active { transform: scale(0.92); }
      .rox-chat-send:disabled { background: #ddd; box-shadow: none; cursor: not-allowed; }
      .rox-chat-send svg { width: 18px; height: 18px; fill: white; }

      /* ========== BOOKING CARD ========== */
      .rox-booking-card {
        background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
        border: 1.5px solid #86efac; border-radius: 14px;
        padding: 18px; margin: 4px 0; max-width: 82%;
        animation: rox-slideIn 0.4s ease;
      }
      .rox-booking-card-title {
        font-size: 13px; font-weight: 700; color: #166534;
        text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;
      }
      .rox-booking-card-detail { font-size: 14px; color: #15803d; margin: 5px 0; font-weight: 500; }

      /* ========== MOBILE ========== */
      @media (max-width: 480px) {
        #rox-chat-window {
          bottom: 0; right: 0; width: 100vw; height: 100vh;
          max-height: 100vh; border-radius: 0;
        }
        #rox-chat-bubble { bottom: 16px; right: 16px; width: 58px; height: 58px; }
        #rox-chat-bubble svg { width: 26px; height: 26px; }
      }
    `;
    document.head.appendChild(style);
  }

  const ICONS = {
    chat: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    send: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    minimize: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 13H5v-2h14v2z"/></svg>',
  };

  const WELCOME_BUTTONS = [
    { icon: '🔧', label: 'Repair / Service', sub: 'Fix a problem with your system', value: 'I need a repair', iconClass: 'rox-welcome-icon-repair' },
    { icon: '💰', label: 'Get a Free Estimate', sub: 'New installation or replacement', value: 'I want a new installation estimate', iconClass: 'rox-welcome-icon-estimate' },
    { icon: '🔄', label: 'Maintenance / Tune-up', sub: 'Keep your system running great', value: 'I need maintenance', iconClass: 'rox-welcome-icon-maintenance' },
    { icon: '📅', label: 'My Appointment', sub: 'Reschedule, cancel, or check status', value: 'I have an appointment', iconClass: 'rox-welcome-icon-appt' },
  ];

  function buildWidget() {
    const container = document.createElement('div');
    container.id = 'rox-chat-widget';
    container.innerHTML = `
      <button id="rox-chat-bubble" aria-label="Chat with ROX Heating & Air">
        ${ICONS.chat}
        <span id="rox-chat-badge">1</span>
      </button>
      <div id="rox-chat-window" role="dialog" aria-label="Chat with ROX Heating & Air">
        <div class="rox-chat-header">
          <div class="rox-chat-avatar">ROX</div>
          <div class="rox-chat-header-info">
            <div class="rox-chat-header-title">ROX Heating & Air</div>
            <div class="rox-chat-header-status">
              <span class="rox-status-dot"></span> We typically reply instantly
            </div>
          </div>
          <button class="rox-chat-close" aria-label="Minimize chat">${ICONS.minimize}</button>
        </div>
        <div class="rox-chat-messages" id="rox-chat-messages"></div>
        <div class="rox-chat-input-area">
          <input type="text" class="rox-chat-input" id="rox-chat-input" 
            placeholder="Type your message..." autocomplete="off" maxlength="500" />
          <button class="rox-chat-send" id="rox-chat-send" aria-label="Send">${ICONS.send}</button>
        </div>
      </div>`;
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
      const r = await fetch(`${CONFIG.serverUrl}/api/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': CONFIG.tenantId },
        body: JSON.stringify({ metadata: { referrer: document.referrer, page: window.location.href } }),
      });
      return r.json();
    },
    async sendMessage(sid, text) {
      const r = await fetch(`${CONFIG.serverUrl}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': CONFIG.tenantId },
        body: JSON.stringify({ sessionId: sid, text }),
      });
      return r.json();
    },
    async endSession(sid) {
      await fetch(`${CONFIG.serverUrl}/api/chat/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': CONFIG.tenantId },
        body: JSON.stringify({ sessionId: sid }),
      });
    },
  };

  function saveSession() {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      sessionId: state.sessionId, messages: state.messages, isEnded: state.isEnded, savedAt: Date.now(),
    })); } catch(e) {}
  }
  function loadSession() {
    try {
      const s = sessionStorage.getItem(SESSION_KEY);
      if (!s) return null;
      const d = JSON.parse(s);
      if (Date.now() - d.savedAt > 30*60*1000) { sessionStorage.removeItem(SESSION_KEY); return null; }
      return d;
    } catch(e) { return null; }
  }
  function clearSession() { try { sessionStorage.removeItem(SESSION_KEY); } catch(e) {} }

  function renderWelcomeCard() {
    const card = document.createElement('div');
    card.className = 'rox-welcome-card';
    card.id = 'rox-welcome-card';
    card.innerHTML = `
      <div class="rox-welcome-msg">Hi there! 👋 How can we help you today?</div>
      <div class="rox-welcome-buttons">
        ${WELCOME_BUTTONS.map(b => `
          <button class="rox-welcome-btn" data-value="${b.value}">
            <div class="rox-welcome-icon ${b.iconClass}">${b.icon}</div>
            <div>
              <div>${b.label}</div>
              <div class="rox-welcome-btn-sub">${b.sub}</div>
            </div>
          </button>`).join('')}
      </div>`;
    els.messages.appendChild(card);
    card.querySelectorAll('.rox-welcome-btn').forEach(btn => {
      btn.addEventListener('click', () => { card.remove(); sendMessage(btn.getAttribute('data-value')); });
    });
    scrollToBottom();
  }

  function renderMessage(msg) {
    const div = document.createElement('div');
    if (msg.type === 'bot') {
      div.className = 'rox-msg rox-msg-bot'; div.textContent = msg.text;
      els.messages.appendChild(div);
      if (msg.card && msg.card.type === 'booking_confirmation') renderBookingCard(msg.card);
      if (msg.quickReplies && msg.quickReplies.length > 0 && !msg._repliesUsed) renderQuickReplies(msg.quickReplies);
    } else if (msg.type === 'user') {
      div.className = 'rox-msg rox-msg-user'; div.textContent = msg.text;
      els.messages.appendChild(div);
    }
    scrollToBottom();
  }

  function renderQuickReplies(replies) {
    removeQuickReplies();
    const c = document.createElement('div'); c.className = 'rox-quick-replies'; c.id = 'rox-active-replies';
    replies.forEach(r => {
      const b = document.createElement('button'); b.className = 'rox-quick-btn';
      b.textContent = r.label || r;
      b.addEventListener('click', () => handleQuickReply(r.value || r.label || r));
      c.appendChild(b);
    });
    els.messages.appendChild(c); scrollToBottom();
  }
  function removeQuickReplies() { const e = document.getElementById('rox-active-replies'); if (e) e.remove(); }

  function renderBookingCard(card) {
    const d = document.createElement('div'); d.className = 'rox-booking-card';
    d.innerHTML = `<div class="rox-booking-card-title">✅ Appointment Confirmed</div>
      ${card.date ? `<div class="rox-booking-card-detail">📅 ${card.date}</div>` : ''}
      ${card.time ? `<div class="rox-booking-card-detail">🕐 ${card.time}</div>` : ''}
      ${card.tech ? `<div class="rox-booking-card-detail">👤 ${card.tech}</div>` : ''}`;
    els.messages.appendChild(d);
  }

  function showTyping() {
    if (state.isTyping) return; state.isTyping = true;
    const d = document.createElement('div'); d.className = 'rox-typing'; d.id = 'rox-typing-indicator';
    d.innerHTML = '<div class="rox-typing-dot"></div><div class="rox-typing-dot"></div><div class="rox-typing-dot"></div>';
    els.messages.appendChild(d); scrollToBottom();
  }
  function hideTyping() { state.isTyping = false; const i = document.getElementById('rox-typing-indicator'); if (i) i.remove(); }
  function scrollToBottom() { requestAnimationFrame(() => { els.messages.scrollTop = els.messages.scrollHeight; }); }
  function setInputEnabled(e) { els.input.disabled = !e; els.sendBtn.disabled = !e; }

  async function openChat() {
    state.isOpen = true; els.window.classList.add('rox-open');
    els.bubble.classList.add('rox-hidden'); els.badge.style.display = 'none';
    els.input.focus();
    if (!state.sessionId && !state.isEnded) await startNewSession();
  }
  function closeChat() {
    state.isOpen = false; els.window.classList.remove('rox-open'); els.bubble.classList.remove('rox-hidden');
  }

  async function startNewSession() {
    try {
      setInputEnabled(false);
      const data = await api.startSession();
      if (data.sessionId) {
        state.sessionId = data.sessionId;
        renderWelcomeCard();
        state.messages.push({ type: 'bot', text: 'How can we help you today?', _isWelcome: true });
        saveSession();
      }
      setInputEnabled(true);
    } catch (error) {
      console.error('[ROX Chat] Start failed:', error);
      const msg = { type: 'bot', text: "Sorry, I'm having trouble connecting. Call us at (720) 468-0689." };
      state.messages.push(msg); renderMessage(msg); setInputEnabled(true);
    }
  }

  async function sendMessage(text) {
    if (!text.trim() || state.isEnded) return;
    removeQuickReplies();
    const wc = document.getElementById('rox-welcome-card'); if (wc) wc.remove();
    const userMsg = { type: 'user', text: text.trim() };
    state.messages.push(userMsg); renderMessage(userMsg);
    els.input.value = ''; setInputEnabled(false); showTyping();
    try {
      const data = await api.sendMessage(state.sessionId, text.trim());
      await new Promise(r => setTimeout(r, 400)); hideTyping();
      if (data.message) {
        const botMsg = { type: 'bot', text: data.message.text, quickReplies: data.message.quickReplies, card: data.message.card };
        state.messages.push(botMsg); renderMessage(botMsg);
        if (data.message.endChat) {
          state.isEnded = true; setInputEnabled(false);
          els.input.placeholder = 'Chat ended — refresh to start new'; clearSession(); return;
        }
      }
      if (data.shouldRestart) { state.sessionId = null; state.messages = []; els.messages.innerHTML = ''; await startNewSession(); return; }
      saveSession(); setInputEnabled(true); els.input.focus();
    } catch (error) {
      hideTyping(); console.error('[ROX Chat] Failed:', error);
      const msg = { type: 'bot', text: "I'm having trouble. Call us at (720) 468-0689 for immediate help." };
      state.messages.push(msg); renderMessage(msg); setInputEnabled(true);
    }
  }

  function handleQuickReply(v) { sendMessage(v); }

  function attachListeners() {
    els.bubble.addEventListener('click', openChat);
    els.closeBtn.addEventListener('click', closeChat);
    els.sendBtn.addEventListener('click', () => { if (els.input.value.trim()) sendMessage(els.input.value); });
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (els.input.value.trim()) sendMessage(els.input.value); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.isOpen) closeChat(); });
  }

  function restoreSession() {
    const saved = loadSession();
    if (!saved || saved.isEnded) return false;
    state.sessionId = saved.sessionId; state.messages = saved.messages || []; state.isEnded = saved.isEnded || false;
    state.messages.forEach((msg, i) => {
      if (!( i === state.messages.length - 1)) msg._repliesUsed = true;
      if (msg._isWelcome && i === 0) { renderWelcomeCard(); return; }
      renderMessage(msg);
    });
    return true;
  }

  function init() {
    injectStyles(); buildWidget(); cacheElements(); attachListeners();
    const restored = restoreSession();
    if (!restored && !state.isOpen) setTimeout(() => { els.badge.style.display = 'flex'; }, 3000);
    console.log('[ROX Chat] Widget v2 initialized');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
