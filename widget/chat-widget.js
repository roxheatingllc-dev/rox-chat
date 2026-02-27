/**
 * ROX Chat Widget v3.1 - Theme-Aware Embeddable Chat Component
 * 
 * Embed on any website:
 * <script>
 *   window.ROX_CHAT_CONFIG = {
 *     serverUrl: "https://rox-chat-production.up.railway.app",
 *     theme: "rox-default"    // optional — loads from /api/themes/rox-default
 *   };
 * </script>
 * <script data-no-optimize="1" src="https://rox-chat-production.up.railway.app/widget/chat-widget.js"></script>
 */
(function() {
  'use strict';

  // ========================================
  // DOUBLE-INIT GUARD
  // ========================================
  if (window._roxChatInitialized) {
    console.log('[ROX Chat] Already initialized — skipping duplicate');
    return;
  }
  window._roxChatInitialized = true;

  // ========================================
  // CONFIG
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
    themeId: globalCfg.theme
      || (scriptTag && scriptTag.getAttribute('data-theme'))
      || 'rox-default',
    phone: globalCfg.phone || '(720) 468-0689'
  };

  if (!CONFIG.serverUrl) {
    console.error('[ROX Chat] No serverUrl configured.');
    return;
  }

  // ========================================
  // DEFAULT THEME (fallback if fetch fails)
  // ========================================
  const DEFAULT_THEME = {
    colors: {
      primary: '#F78C26', primaryHover: '#E07520',
      headerBg: '#1A1A1A', headerText: '#FFFFFF',
      headerStatusText: 'rgba(255,255,255,0.6)', statusDot: '#4ADE80',
      bubbleBg: '#F78C26', bubbleGlow: 'rgba(247,140,38,0.45)',
      bubbleGlowHover: 'rgba(247,140,38,0.55)',
      chatBg: '#f7f7f8',
      botBubbleBg: '#FFFFFF', botBubbleText: '#1a1a1a', botBubbleShadow: 'rgba(0,0,0,0.06)',
      userBubbleBg: '#1A1A1A', userBubbleText: '#FFFFFF',
      inputBg: '#FFFFFF', inputBorder: '#dddddd', inputFocusBorder: '#F78C26',
      inputText: '#1a1a1a', inputPlaceholder: '#aaaaaa',
      sendBtnBg: '#F78C26', sendBtnText: '#FFFFFF',
      quickReplyBg: '#FFFFFF', quickReplyBorder: '#F78C26', quickReplyText: '#F78C26',
      quickReplyHoverBg: '#F78C26', quickReplyHoverText: '#FFFFFF',
      welcomeCardBg: '#FFFFFF', welcomeCardShadow: 'rgba(0,0,0,0.08)',
      welcomeTitleText: '#1a1a1a', welcomeSubtitleText: '#888888',
      welcomeBtnBg: '#FFFFFF', welcomeBtnBorder: '#e5e5e5',
      welcomeBtnHoverBorder: '#F78C26', welcomeBtnHoverBg: 'rgba(247,140,38,0.03)',
      welcomeBtnLabelText: '#1a1a1a', welcomeBtnDescText: '#999999',
      bookingCardBg: '#FFFFFF', bookingCardBorder: '#e5e5e5', bookingIconColor: '#F78C26',
      poweredByText: '#bbbbbb', scrollbarThumb: '#cccccc'
    },
    bubble: { size: 60, iconSize: 26, bottomOffset: 24, rightOffset: 24, glowEnabled: true, glowDuration: '3s' },
    window: { width: 380, height: 550, borderRadius: 16, bottomOffset: 100 },
    header: { avatar: '🔧', avatarType: 'emoji', companyName: 'ROX Heating & Air', statusText: 'Online', accentBarHeight: 3, accentBarColor: '#F78C26' },
    messages: { botBubbleRadius: '16px', botBubbleCorner: '4px', userBubbleRadius: '16px', userBubbleCorner: '4px', bubblePadding: '12px 16px', fontSize: 14, lineHeight: 1.45 },
    quickReplies: { borderRadius: 18, fontSize: 13, fontWeight: 500, padding: '7px 14px', gap: 8 },
    welcomeCard: {
      padding: '24px 20px', borderRadius: 14,
      titleSize: 18, titleWeight: 700, titleAlign: 'center',
      subtitleSize: 14, subtitleAlign: 'center', subtitleMarginBottom: 20,
      gridColumns: '1fr 1fr', gridGap: 10,
      btnPadding: '14px 12px', btnBorderRadius: 12, btnBorderWidth: 1.5,
      btnTextAlign: 'center', btnAlignItems: 'center',
      btnShadow: '0 2px 6px rgba(0,0,0,0.06)', btnHoverShadow: '0 4px 12px rgba(0,0,0,0.1)', btnHoverLift: -1,
      iconSize: 22, labelSize: 13, labelWeight: 600, descSize: 11
    },
    input: { borderRadius: 20, fontSize: 14, sendBtnSize: 38 },
    font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif", importUrl: null }
  };

  // Active theme — starts as default, updated when server theme loads
  let T = DEFAULT_THEME;

  // ========================================
  // STATE
  // ========================================
  let sessionId = null;
  let isOpen = false;
  let isTyping = false;

  // ========================================
  // LOAD THEME FROM SERVER
  // ========================================
  async function loadTheme() {
    try {
      const res = await fetch(`${CONFIG.serverUrl}/api/themes/${CONFIG.themeId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const theme = await res.json();
      // Merge with defaults (so missing keys don't break anything)
      T = deepMerge(DEFAULT_THEME, theme);
      console.log(`[ROX Chat] Theme loaded: ${T.id || CONFIG.themeId}`);
    } catch (err) {
      console.warn(`[ROX Chat] Could not load theme "${CONFIG.themeId}", using defaults:`, err.message);
      T = DEFAULT_THEME;
    }
  }

  function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  // ========================================
  // GENERATE CSS FROM THEME
  // ========================================
  function generateCSS() {
    const C = T.colors;
    const B = T.bubble;
    const W = T.window;
    const H = T.header;
    const M = T.messages;
    const QR = T.quickReplies;
    const WC = T.welcomeCard;
    const I = T.input;
    const F = T.font;

    let fontImport = '';
    if (F.importUrl) {
      fontImport = `@import url('${F.importUrl}');`;
    }

    return `
      ${fontImport}

      #rox-chat-container * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: ${F.family};
      }

      /* ---- BUBBLE ---- */
      #rox-chat-bubble {
        position: fixed;
        bottom: ${B.bottomOffset}px;
        right: ${B.rightOffset}px;
        width: ${B.size}px;
        height: ${B.size}px;
        border-radius: 50%;
        background: ${C.bubbleBg};
        color: #fff;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999998;
        box-shadow: 0 4px 20px ${C.bubbleGlow}, 0 2px 8px rgba(0,0,0,0.15);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        ${B.glowEnabled ? `animation: rox-bubble-glow ${B.glowDuration} ease-in-out infinite;` : ''}
      }
      #rox-chat-bubble:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 28px ${C.bubbleGlowHover}, 0 3px 12px rgba(0,0,0,0.2);
      }
      ${B.glowEnabled ? `
      @keyframes rox-bubble-glow {
        0%, 100% { box-shadow: 0 4px 20px ${C.bubbleGlow}, 0 2px 8px rgba(0,0,0,0.15); }
        50% { box-shadow: 0 4px 30px ${C.bubbleGlowHover}, 0 2px 12px rgba(0,0,0,0.2); }
      }` : ''}
      #rox-chat-bubble svg { width: ${B.iconSize}px; height: ${B.iconSize}px; }

      /* ---- WINDOW ---- */
      #rox-chat-window {
        position: fixed;
        bottom: ${W.bottomOffset}px;
        right: ${B.rightOffset}px;
        width: ${W.width}px;
        max-width: calc(100vw - 32px);
        height: ${W.height}px;
        max-height: calc(100vh - 130px);
        background: #fff;
        border-radius: ${W.borderRadius}px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.15);
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
        background: ${C.headerBg};
        padding: 16px 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
        border-bottom: ${H.accentBarHeight}px solid ${H.accentBarColor};
      }
      .rox-header-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${C.primary};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
      }
      .rox-header-info { flex: 1; }
      .rox-header-name {
        color: ${C.headerText};
        font-size: 15px;
        font-weight: 600;
      }
      .rox-header-status {
        color: ${C.headerStatusText};
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
        background: ${C.statusDot};
      }
      .rox-close-btn {
        background: none;
        border: none;
        color: ${C.headerStatusText};
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
      }
      .rox-close-btn:hover { color: ${C.headerText}; }

      /* ---- MESSAGES ---- */
      .rox-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: ${C.chatBg};
      }
      .rox-chat-messages::-webkit-scrollbar { width: 4px; }
      .rox-chat-messages::-webkit-scrollbar-track { background: transparent; }
      .rox-chat-messages::-webkit-scrollbar-thumb { background: ${C.scrollbarThumb}; border-radius: 4px; }

      /* ---- WELCOME CARD ---- */
      .rox-welcome-card {
        background: ${C.chatBg};
        border-radius: ${WC.borderRadius}px;
        padding: ${WC.padding};
        margin-bottom: 12px;
      }
      .rox-welcome-title {
        font-size: ${WC.titleSize}px;
        font-weight: ${WC.titleWeight};
        color: ${C.welcomeTitleText};
        margin-bottom: 4px;
        text-align: ${WC.titleAlign};
      }
      .rox-welcome-subtitle {
        font-size: ${WC.subtitleSize}px;
        color: ${C.welcomeSubtitleText};
        margin-bottom: ${WC.subtitleMarginBottom}px;
        text-align: ${WC.subtitleAlign};
      }
      .rox-welcome-actions {
        display: grid;
        grid-template-columns: ${WC.gridColumns};
        gap: ${WC.gridGap}px;
      }
      .rox-welcome-btn {
        background: ${C.welcomeBtnBg};
        border: ${WC.btnBorderWidth}px solid ${C.welcomeBtnBorder};
        border-radius: ${WC.btnBorderRadius}px;
        padding: ${WC.btnPadding};
        cursor: pointer;
        text-align: ${WC.btnTextAlign};
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        align-items: ${WC.btnAlignItems};
        gap: 4px;
        box-shadow: ${WC.btnShadow};
      }
      .rox-welcome-btn:hover {
        border-color: ${C.welcomeBtnHoverBorder};
        background: ${C.welcomeBtnHoverBg};
        box-shadow: ${WC.btnHoverShadow};
        transform: translateY(${WC.btnHoverLift}px);
      }
      .rox-welcome-btn-icon { font-size: ${WC.iconSize}px; line-height: 1; margin-bottom: 2px; }
      .rox-welcome-btn-label { font-size: ${WC.labelSize}px; font-weight: ${WC.labelWeight}; color: ${C.welcomeBtnLabelText}; }
      .rox-welcome-btn-desc { font-size: ${WC.descSize}px; color: ${C.welcomeBtnDescText}; }

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
      .rox-message.rox-user { flex-direction: row-reverse; }
      .rox-msg-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: ${C.primary};
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
        padding: ${M.bubblePadding || '12px 16px'};
        border-radius: ${M.botBubbleRadius};
        font-size: ${M.fontSize}px;
        line-height: ${M.lineHeight};
        word-wrap: break-word;
      }
      .rox-message:not(.rox-user) .rox-msg-bubble {
        background: ${C.botBubbleBg};
        color: ${C.botBubbleText};
        border-bottom-left-radius: ${M.botBubbleCorner};
        box-shadow: 0 1px 2px ${C.botBubbleShadow};
      }
      .rox-message.rox-user .rox-msg-bubble {
        background: ${C.userBubbleBg};
        color: ${C.userBubbleText};
        border-bottom-right-radius: ${M.userBubbleCorner};
      }

      /* ---- QUICK REPLIES ---- */
      .rox-quick-replies { display: flex; flex-wrap: wrap; gap: ${QR.gap || 6}px; }
      .rox-quick-reply {
        background: ${C.quickReplyBg};
        border: 1.5px solid ${C.quickReplyBorder};
        color: ${C.quickReplyText};
        padding: ${QR.padding};
        border-radius: ${QR.borderRadius}px;
        font-size: ${QR.fontSize}px;
        font-weight: ${QR.fontWeight};
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .rox-quick-reply:hover {
        background: ${C.quickReplyHoverBg};
        color: ${C.quickReplyHoverText};
      }

      /* ---- BOOKING CARD ---- */
      .rox-booking-card {
        background: ${C.bookingCardBg};
        border: 1px solid ${C.bookingCardBorder};
        border-radius: 12px;
        padding: 14px;
      }
      .rox-booking-header {
        display: flex; align-items: center; gap: 8px;
        margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid ${C.bookingCardBorder};
      }
      .rox-booking-icon { font-size: 18px; }
      .rox-booking-title { font-size: 14px; font-weight: 600; color: ${C.botBubbleText}; }
      .rox-booking-detail {
        display: flex; align-items: center; gap: 8px;
        margin-bottom: 4px; font-size: 13px; color: ${C.welcomeSubtitleText};
      }
      .rox-booking-detail svg { width: 14px; height: 14px; color: ${C.bookingIconColor}; flex-shrink: 0; }

      /* ---- TYPING ---- */
      .rox-typing { display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-end; }
      .rox-typing-dots {
        background: ${C.botBubbleBg};
        border-radius: 16px; border-bottom-left-radius: 4px;
        padding: 12px 16px; display: flex; gap: 4px; align-items: center;
        box-shadow: 0 1px 2px ${C.botBubbleShadow};
      }
      .rox-typing-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: ${C.inputPlaceholder};
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
        background: ${C.inputBg};
        border-top: 1px solid ${C.inputBorder};
        display: flex; align-items: center; gap: 8px; flex-shrink: 0;
      }
      .rox-chat-input {
        flex: 1;
        border: 1px solid ${C.inputBorder};
        border-radius: ${I.borderRadius}px;
        padding: 9px 16px;
        font-size: ${I.fontSize}px;
        outline: none;
        transition: border-color 0.2s ease;
        color: ${C.inputText};
        background: ${C.chatBg};
      }
      .rox-chat-input::placeholder { color: ${C.inputPlaceholder}; }
      .rox-chat-input:focus { border-color: ${C.inputFocusBorder}; background: ${C.inputBg}; }
      .rox-send-btn {
        width: ${I.sendBtnSize}px; height: ${I.sendBtnSize}px;
        border-radius: 50%;
        background: ${C.sendBtnBg};
        border: none; color: ${C.sendBtnText};
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: opacity 0.15s ease; flex-shrink: 0;
      }
      .rox-send-btn:hover { opacity: 0.9; }
      .rox-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .rox-send-btn svg { width: 16px; height: 16px; }

      .rox-powered-by {
        text-align: center; padding: 5px;
        font-size: 10px; color: ${C.poweredByText};
        background: ${C.inputBg}; flex-shrink: 0;
      }

      @media (max-width: 480px) {
        #rox-chat-window { bottom: 0; right: 0; width: 100%; max-width: 100%; height: 100%; max-height: 100%; border-radius: 0; }
        #rox-chat-bubble { bottom: 16px; right: 16px; }
      }
    `;
  }

  // ========================================
  // INJECT STYLES
  // ========================================
  function injectStyles() {
    if (document.getElementById('rox-chat-styles')) return;
    const style = document.createElement('style');
    style.id = 'rox-chat-styles';
    style.textContent = generateCSS();
    document.head.appendChild(style);
  }

  // Re-inject styles when theme changes
  function updateStyles() {
    const existing = document.getElementById('rox-chat-styles');
    if (existing) existing.remove();
    injectStyles();
  }

  // ========================================
  // BUILD DOM
  // ========================================
  function buildWidget() {
    if (document.getElementById('rox-chat-container')) return;
    const H = T.header;

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
          <div class="rox-header-avatar">${H.avatar}</div>
          <div class="rox-header-info">
            <div class="rox-header-name">${H.companyName}</div>
            <div class="rox-header-status">
              <span class="rox-status-dot"></span>
              ${H.statusText}
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
        if (msg) { card.remove(); sendMessage(msg); }
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
    bubble.addEventListener('click', () => { isOpen ? closeChat() : openChat(); });
    closeBtn.addEventListener('click', closeChat);
    input.addEventListener('input', () => { sendBtn.disabled = !input.value.trim(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && input.value.trim()) sendMessage(input.value.trim()); });
    sendBtn.addEventListener('click', () => { if (input.value.trim()) sendMessage(input.value.trim()); });
  }

  function openChat() {
    const chatWindow = document.getElementById('rox-chat-window');
    const bubble = document.getElementById('rox-chat-bubble');
    chatWindow.style.display = 'flex';
    requestAnimationFrame(() => { requestAnimationFrame(() => { chatWindow.classList.add('rox-open'); }); });
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
      showWelcomeCard();
      if (data.greeting) addBotMessage(data.greeting, data.quickReplies || []);
    } catch (err) {
      console.error('[ROX Chat] Failed to start session:', err);
      addBotMessage(`Sorry, I'm having trouble connecting. Please call us directly at ${CONFIG.phone}.`);
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
    let html = `<div class="rox-msg-avatar">${T.header.avatar}</div><div class="rox-msg-content"><div class="rox-msg-bubble">${escapeHtml(text)}</div>`;
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
    wrapper.innerHTML = `<div class="rox-msg-content"><div class="rox-msg-bubble">${escapeHtml(text)}</div></div>`;
    messagesEl.appendChild(wrapper);
    scrollToBottom();
  }

  function addBookingCard(booking) {
    const messagesEl = document.getElementById('rox-messages');
    const wrapper = document.createElement('div');
    wrapper.className = 'rox-message';
    wrapper.innerHTML = `
      <div class="rox-msg-avatar">${T.header.avatar}</div>
      <div class="rox-msg-content">
        <div class="rox-booking-card">
          <div class="rox-booking-header">
            <span class="rox-booking-icon">✅</span>
            <span class="rox-booking-title">Appointment Confirmed</span>
          </div>
          ${booking.date ? `<div class="rox-booking-detail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>${escapeHtml(booking.date)}</span></div>` : ''}
          ${booking.time ? `<div class="rox-booking-detail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>${escapeHtml(booking.time)}</span></div>` : ''}
          ${booking.tech ? `<div class="rox-booking-detail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>${escapeHtml(booking.tech)}</span></div>` : ''}
        </div>
      </div>
    `;
    messagesEl.appendChild(wrapper);
    scrollToBottom();
  }

  function showTyping() {
    if (isTyping) return;
    isTyping = true;
    const messagesEl = document.getElementById('rox-messages');
    const el = document.createElement('div');
    el.className = 'rox-typing';
    el.id = 'rox-typing-indicator';
    el.innerHTML = `<div class="rox-msg-avatar">${T.header.avatar}</div><div class="rox-typing-dots"><div class="rox-typing-dot"></div><div class="rox-typing-dot"></div><div class="rox-typing-dot"></div></div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function hideTyping() {
    isTyping = false;
    const el = document.getElementById('rox-typing-indicator');
    if (el) el.remove();
  }

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
  // INIT — load theme, then build widget
  // ========================================
  async function init() {
    await loadTheme();
    injectStyles();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildWidget);
    } else {
      buildWidget();
    }
  }

  init();
})();
