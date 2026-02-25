/**
 * ROX Chat Widget v2 - Embeddable Chat Component
 * 
 * METHOD 1 - Simple (if your site doesn't bundle JS):
 *   <script src="https://rox-chat-production.up.railway.app/widget/chat-widget.js" 
 *           data-server="https://rox-chat-production.up.railway.app"></script>
 * 
 * METHOD 2 - For sites with JS bundlers (WordPress, SiteGround, etc.):
 *   <script>
 *     window.ROX_CHAT_CONFIG = { serverUrl: "https://rox-chat-production.up.railway.app" };
 *   </script>
 *   <script src="https://rox-chat-production.up.railway.app/widget/chat-widget.js"></script>
 * 
 * DESIGN: Bold, dark theme matching roxheating.com - orange accents, professional feel.
 */

(function() {
  'use strict';

  // Read config from: 1) window.ROX_CHAT_CONFIG (for bundled sites), 2) script tag attributes, 3) defaults
  const _wc = window.ROX_CHAT_CONFIG || {};
  const scriptTag = document.currentScript || document.querySelector('script[data-server]') || document.querySelector('script[data-tenant]');
  const CONFIG = {
    tenantId: _wc.tenantId || scriptTag?.getAttribute('data-tenant') || 'rox-heating',
    // IMPORTANT: Never default to window.location.origin; WordPress/CMS sites often 404 /api/*.
    // If config can't be read (e.g., due to JS bundling/combining), we default to the hosted widget server.
    serverUrl: (_wc.serverUrl || scriptTag?.getAttribute('data-server') || 'https://rox-chat-production.up.railway.app').replace(/\/$/, ''),
    primaryColor: _wc.primaryColor || scriptTag?.getAttribute('data-color') || '#F78C26',
    secondaryColor: _wc.secondaryColor || scriptTag?.getAttribute('data-secondary') || '#1A1A1A',
  };

  const SESSION_KEY = `rox_chat_${CONFIG.tenantId}`;

  let state = {
    isOpen: false,
    sessionId: null,
    messages: [],
    isLoading: false,
    isInitialized: false,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    position: { bottom: 24, right: 24 },
  };

  const styles = `
    /* ===== ROX CHAT WIDGET STYLES ===== */
    #rox-chat-root {
      position: fixed;
      bottom: ${state.position.bottom}px;
      right: ${state.position.right}px;
      z-index: 999999;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
    }

    #rox-chat-button {
      width: 64px;
      height: 64px;
      border-radius: 9999px;
      background: ${CONFIG.primaryColor};
      color: #111;
      border: none;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(0,0,0,.35);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
      user-select: none;
      -webkit-user-select: none;
    }
    #rox-chat-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 30px rgba(0,0,0,.45);
    }
    #rox-chat-button:active {
      transform: translateY(0px);
      opacity: .95;
    }

    #rox-chat-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      border-radius: 9999px;
      background: #ff3b30;
      color: white;
      font-size: 12px;
      padding: 0 6px;
      display: none;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 14px rgba(0,0,0,.25);
    }

    #rox-chat-panel {
      position: absolute;
      bottom: 78px;
      right: 0;
      width: 360px;
      max-width: calc(100vw - 32px);
      height: 520px;
      max-height: calc(100vh - 120px);
      border-radius: 18px;
      overflow: hidden;
      background: #0f0f10;
      box-shadow: 0 16px 40px rgba(0,0,0,.55);
      border: 1px solid rgba(255,255,255,.08);
      display: none;
      flex-direction: column;
    }

    #rox-chat-header {
      background: linear-gradient(135deg, rgba(247,140,38,0.95), rgba(247,140,38,0.75));
      color: #111;
      padding: 14px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: default;
    }

    #rox-chat-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    #rox-chat-logo {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: rgba(0,0,0,.18);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      letter-spacing: .5px;
    }

    #rox-chat-title {
      display: flex;
      flex-direction: column;
      line-height: 1.05;
    }
    #rox-chat-title strong {
      font-size: 14px;
      font-weight: 800;
    }
    #rox-chat-title span {
      font-size: 12px;
      opacity: .85;
      font-weight: 600;
    }

    #rox-chat-close {
      border: none;
      background: rgba(0,0,0,.18);
      color: #111;
      width: 34px;
      height: 34px;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .12s ease, opacity .12s ease;
    }
    #rox-chat-close:hover { transform: scale(1.03); opacity: .95; }
    #rox-chat-close:active { transform: scale(.98); opacity: .9; }

    #rox-chat-body {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      background: radial-gradient(1200px 600px at 10% 0%, rgba(247,140,38,.10), transparent 55%),
                  radial-gradient(900px 500px at 90% 10%, rgba(255,255,255,.04), transparent 55%),
                  #0f0f10;
    }

    .rox-msg {
      display: flex;
      margin-bottom: 10px;
      gap: 10px;
      align-items: flex-end;
    }
    .rox-msg.user { justify-content: flex-end; }
    .rox-bubble {
      max-width: 78%;
      padding: 10px 12px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.35;
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid rgba(255,255,255,.08);
      box-shadow: 0 10px 22px rgba(0,0,0,.25);
    }
    .rox-msg.bot .rox-bubble {
      background: rgba(255,255,255,.06);
      color: rgba(255,255,255,.92);
      border-top-left-radius: 6px;
    }
    .rox-msg.user .rox-bubble {
      background: rgba(247,140,38,.95);
      color: #111;
      border-top-right-radius: 6px;
      border-color: rgba(0,0,0,.10);
    }

    #rox-chat-footer {
      padding: 12px;
      background: rgba(255,255,255,.03);
      border-top: 1px solid rgba(255,255,255,.08);
      display: flex;
      gap: 10px;
      align-items: center;
    }

    #rox-chat-input {
      flex: 1;
      height: 42px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(0,0,0,.35);
      color: rgba(255,255,255,.92);
      padding: 0 12px;
      outline: none;
      font-size: 14px;
    }
    #rox-chat-input::placeholder { color: rgba(255,255,255,.45); }

    #rox-chat-send {
      height: 42px;
      width: 42px;
      border-radius: 14px;
      border: none;
      background: ${CONFIG.primaryColor};
      color: #111;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 20px rgba(0,0,0,.25);
      transition: transform .12s ease, opacity .12s ease;
    }
    #rox-chat-send:hover { transform: translateY(-1px); opacity: .98; }
    #rox-chat-send:active { transform: translateY(0px); opacity: .95; }

    #rox-chat-typing {
      display: none;
      padding: 10px 14px;
      font-size: 12px;
      color: rgba(255,255,255,.55);
    }

    /* Mobile tweaks */
    @media (max-width: 480px) {
      #rox-chat-panel { width: 92vw; height: 70vh; }
    }
  `;

  function log(...args) {
    try { console.log('[ROX Chat]', ...args); } catch (_) {}
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'style') node.setAttribute('style', v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    children.forEach(c => node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return node;
  }

  function saveSession() {
    try {
      const payload = {
        sessionId: state.sessionId,
        messages: state.messages.slice(-50),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.sessionId) state.sessionId = parsed.sessionId;
      if (Array.isArray(parsed?.messages)) state.messages = parsed.messages;
    } catch (_) {}
  }

  function renderMessages(container) {
    container.innerHTML = '';
    state.messages.forEach(m => {
      const row = el('div', { class: `rox-msg ${m.role === 'user' ? 'user' : 'bot'}` }, [
        el('div', { class: 'rox-bubble' }, [m.content])
      ]);
      container.appendChild(row);
    });
    container.scrollTop = container.scrollHeight;
  }

  async function startSession() {
    if (state.sessionId) return state.sessionId;

    const url = `${CONFIG.serverUrl}/api/chat/start`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: CONFIG.tenantId }),
      credentials: 'omit',
    });

    const ct = res.headers.get('content-type') || '';
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`startSession failed: ${res.status} ${res.statusText} | ${ct} | ${text.slice(0, 200)}`);
    }
    if (!ct.includes('application/json')) {
      const text = await res.text().catch(() => '');
      throw new Error(`startSession expected JSON but got ${ct} | ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    state.sessionId = data.sessionId;
    saveSession();
    return state.sessionId;
  }

  async function sendMessage(text) {
    if (!text?.trim()) return;
    const message = text.trim();

    state.messages.push({ role: 'user', content: message });
    saveSession();
    updateUI();

    state.isLoading = true;
    updateUI();

    try {
      const sessionId = await startSession();

      const url = `${CONFIG.serverUrl}/api/chat/message`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: CONFIG.tenantId,
          sessionId,
          message,
        }),
        credentials: 'omit',
      });

      const ct = res.headers.get('content-type') || '';
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`sendMessage failed: ${res.status} ${res.statusText} | ${ct} | ${text.slice(0, 200)}`);
      }
      if (!ct.includes('application/json')) {
        const text = await res.text().catch(() => '');
        throw new Error(`sendMessage expected JSON but got ${ct} | ${text.slice(0, 200)}`);
      }

      const data = await res.json();
      if (data?.reply) {
        state.messages.push({ role: 'assistant', content: data.reply });
      } else {
        state.messages.push({ role: 'assistant', content: "Sorry — I didn't get a response. Try again." });
      }
      saveSession();
    } catch (err) {
      log('sendMessage error:', err);
      state.messages.push({ role: 'assistant', content: "Sorry — I had trouble connecting. Please try again." });
      saveSession();
    } finally {
      state.isLoading = false;
      updateUI();
    }
  }

  let refs = {};
  function buildUI() {
    if (document.getElementById('rox-chat-root')) return;

    const styleTag = el('style', {}, [styles]);
    document.head.appendChild(styleTag);

    const root = el('div', { id: 'rox-chat-root' });

    const badge = el('div', { id: 'rox-chat-badge' }, ['1']);

    const button = el('button', { id: 'rox-chat-button', type: 'button' }, [
      el('span', { style: 'font-weight:900;font-size:18px;letter-spacing:.6px;' }, ['ROX'])
    ]);
    button.appendChild(badge);

    const panel = el('div', { id: 'rox-chat-panel' });

    const header = el('div', { id: 'rox-chat-header' }, [
      el('div', { id: 'rox-chat-header-left' }, [
        el('div', { id: 'rox-chat-logo' }, ['R']),
        el('div', { id: 'rox-chat-title' }, [
          el('strong', {}, ['ROX Chat']),
          el('span', {}, ['We reply fast'])
        ])
      ]),
      el('button', { id: 'rox-chat-close', type: 'button' }, ['✕'])
    ]);

    const body = el('div', { id: 'rox-chat-body' });

    const typing = el('div', { id: 'rox-chat-typing' }, ['Typing…']);

    const footer = el('div', { id: 'rox-chat-footer' }, [
      el('input', { id: 'rox-chat-input', type: 'text', placeholder: 'Type your message…' }),
      el('button', { id: 'rox-chat-send', type: 'button' }, ['➤'])
    ]);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(typing);
    panel.appendChild(footer);

    root.appendChild(button);
    root.appendChild(panel);
    document.body.appendChild(root);

    refs = { root, button, badge, panel, header, body, typing, footer, input: footer.querySelector('#rox-chat-input'), send: footer.querySelector('#rox-chat-send'), close: header.querySelector('#rox-chat-close') };

    // Button interactions
    refs.button.addEventListener('click', () => {
      if (state.isOpen) closeChat();
      else openChat();
    });
    refs.close.addEventListener('click', closeChat);

    refs.send.addEventListener('click', () => {
      const v = refs.input.value;
      refs.input.value = '';
      sendMessage(v);
    });

    refs.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const v = refs.input.value;
        refs.input.value = '';
        sendMessage(v);
      }
    });

    loadSession();
    updateUI();
  }

  function openChat() {
    state.isOpen = true;
    updateUI();
    // If no messages, add a friendly greeting
    if (state.messages.length === 0) {
      state.messages.push({ role: 'assistant', content: "Hey — how can I help you today?" });
      saveSession();
      updateUI();
    } else {
      // render existing messages
      updateUI();
    }
  }

  function closeChat() {
    state.isOpen = false;
    updateUI();
  }

  function updateUI() {
    if (!refs.panel) return;
    refs.panel.style.display = state.isOpen ? 'flex' : 'none';

    if (refs.typing) refs.typing.style.display = state.isLoading ? 'block' : 'none';
    if (refs.body) renderMessages(refs.body);
  }

  function init() {
    if (state.isInitialized) return;
    state.isInitialized = true;
    buildUI();
    log(`Widget initialized for tenant: ${CONFIG.tenantId}`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();