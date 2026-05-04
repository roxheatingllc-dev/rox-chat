/**
 * ROX Booking Widget v1.12 - Self-Service Scheduling + Reschedule Wizard
 *
 * v1.12 Changes (2026-05-04):
 *   - ADD: Reschedule mode. When the widget mounts on a URL that has a
 *           ?token=... query parameter (the SMS deep link from the
 *           dashboard self-serve reschedule flow), the widget skips the
 *           entire booking wizard and renders a small calendar UI for
 *           the customer to pick a new time for an existing appointment.
 *   - ADD: 4 new STEPS constants — RESCHEDULE_LOAD, RESCHEDULE_CALENDAR,
 *           RESCHEDULE_SUCCESS, RESCHEDULE_FAIL — used only when in
 *           reschedule mode. They do NOT appear in any STEP_FLOW because
 *           reschedule mode bypasses the wizard's progress-bar concept.
 *   - ADD: apiReschedule() helper — parallels api()/apiGet() but hits
 *           /api/reschedule/* on the rox-chat proxy instead of /api/booking/*.
 *           Throws on non-2xx with err.status set so the caller can
 *           branch on the engine's HTTP status (401/410/409/502/503).
 *   - ADD: prewarmReschedule() — fire-and-forget call to /prewarm at
 *           mount time so the calendar's first render isn't waiting on
 *           14 sequential cold-cache fan-outs to Open-Meteo's archive
 *           API. Server returns 202 immediately. Failure is silent.
 *   - ADD: 5 failure-state cards. Per locked v2.12.0 design, statuses
 *           401/410-passed/500/502/503 ALL render the same generic
 *           "this link can't be used right now — please call (720)
 *           468-0689" card. ONLY 409 (slot taken between render and
 *           confirm) is special-cased into refetch + toast. ONLY the
 *           already-rescheduled state (returned from /load as
 *           state.alreadyRescheduled, NOT a 410 error) gets a special
 *           "you've moved this to <new date>" card with offer to move
 *           again.
 *   - ADD: TOAST UI. A small banner at the top of the calendar card
 *           that auto-dismisses after 5s. Used right now only for the
 *           409 "that time was just taken" case but written generically
 *           for any future ephemeral message.
 *   - ADD: Exit-intent and beforeunload abandonment listeners are
 *           SKIPPED in reschedule mode. The customer can always come
 *           back via the SMS link, so there's no abandon to capture.
 *
 * v1.11 Changes (2026-04-30):
 *   - FIX: Send firstName + lastName as separate fields to /update-session
 *           (after QUICK_INFO and inside confirmBooking) and to /message
 *           (submitMessage + exit-intent overlay). Previously only the
 *           combined `name` string was sent, so the server had no way to
 *           guarantee both halves were captured — if `state.data.name`
 *           somehow held only the first name (browser autofill quirk,
 *           empty lastName slipping past validation, or a stale cached
 *           v1.9 widget on a customer’s browser), the abandoned-booking
 *           email subject would read "Abandoned Booking — John" instead
 *           of "Abandoned Booking — John Smith". Server-side v2.7.4 now
 *           prefers `firstName + lastName` over the combined field; this
 *           widget version supplies them so the defensive resolution has
 *           the correct data to work with.
 *   - FIX: Exit-intent overlay click handler was passing a bare `name`
 *           identifier in the /message body. There is no local `name`
 *           variable in that scope — only `firstName`, `lastName`, and
 *           `phone` — so `name` resolved to `window.name` (the DOM
 *           window-name property, almost always an empty string). Every
 *           exit-intent message has been arriving at the office with
 *           `Name:` blank in the subject. Now passes
 *           `name: "${firstName} ${lastName}"` along with the explicit
 *           firstName/lastName fields.
 *
 * v1.10 Changes (2026-04-28):
 *   - FIX: Split single "Full Name" field into First Name + Last Name on
 *           three name-capture points: QUICK_INFO, CONTACT_INFO, and the
 *           exit-intent overlay. Previously, customers often typed only
 *           their first name into the single field — abandon emails ended
 *           up with subjects like "Abandoned Booking — Karen" instead of
 *           "Abandoned Booking — Karen Smith". The server-side subject
 *           template already uses the full name; the gap was that the
 *           form wasn't requiring both halves. Two separate inputs make
 *           the requirement obvious to the customer. state.data.name is
 *           still maintained as the single combined string "First Last"
 *           so server-side code that splits on whitespace (HCP customer
 *           creation, abandon email subject) continues to work unchanged.
 *
 * v1.9 Changes (2026-04-28):
 *   - ADD: TCPA consent checkbox on Confirm + Message steps. Existing
 *           customers and message-flow customers previously skipped the
 *           QUICK_INFO step where consent was first introduced, so they
 *           had no consent gate. Now blocked from submitting until the
 *           box is checked. State is shared via state.data._tcpaConsent
 *           so a customer who checked it on QUICK_INFO sees it pre-checked
 *           on Confirm — single click for new customers, single click
 *           for existing/message customers, no double-prompting either way.
 * 
 * Embed on any website:
 * <script>
 *   window.ROX_BOOKING_CONFIG = {
 *     serverUrl: "https://rox-chat-production.up.railway.app",
 *     theme: "rox-default",
 *     containerId: "rox-booking",
 *     companyName: "ROX Heating & Air",
 *     companyPhone: "(720) 468-0689"
 *   };
 * </script>
 * <div id="rox-booking"></div>
 * <script src="https://rox-chat-production.up.railway.app/widget/booking-widget.js?v=11"></script>
 * 
 * v1.4 Changes:
 *   - FIX: Push name+phone to server after QUICK_INFO so abandon emails have contact info
 *   - ADD: Weather forecast temps on calendar days (Open-Meteo, 16-day, no API key)
 *   - ADD: Pricing banner on calendar (repair $148, maintenance $128, PCC, estimate free)
 *   - ADD: "Just to Confirm" messaging when contact info was already captured
 *   - FIX: Sort time slots chronologically after deduplication (renderCalendar)
 * 
 * Multi-tenant ready: pass tenantId in config for SaaS deployment
 */

(function() {
  'use strict';

  if (window.__ROX_BOOKING_INIT__) return;
  window.__ROX_BOOKING_INIT__ = true;

  const CONFIG = Object.assign({
    serverUrl: '',
    theme: 'rox-default',
    containerId: 'rox-booking',
    tenantId: 'rox-heating',
    companyName: 'ROX Heating & Air',
    companyPhone: '(720) 468-0689'
  }, window.ROX_BOOKING_CONFIG || {});

  const DEFAULT_THEME = {
    colors: {
      primary: '#F78C26',
      primaryHover: '#E07520',
      primaryLight: 'rgba(247,140,38,0.08)',
      primaryBorder: 'rgba(247,140,38,0.25)',
      bg: '#ffffff',
      cardBg: '#ffffff',
      cardBorder: '#e8e8e8',
      text: '#1a1a1a',
      textSecondary: '#666666',
      textMuted: '#999999',
      inputBg: '#ffffff',
      inputBorder: '#d4d4d4',
      inputFocus: '#F78C26',
      successBg: '#f0fdf4',
      successBorder: '#86efac',
      successText: '#166534',
      errorBg: '#fef2f2',
      errorBorder: '#fca5a5',
      errorText: '#991b1b',
      calendarToday: 'rgba(247,140,38,0.12)',
      calendarAvailable: '#F78C26',
      calendarSelected: '#F78C26',
      calendarDisabled: '#e5e5e5',
      progressBg: '#e5e5e5',
      progressFill: '#F78C26',
      stepBtnBg: '#ffffff',
      stepBtnBorder: '#e5e5e5',
      stepBtnHoverBorder: '#F78C26',
      stepBtnHoverBg: 'rgba(247,140,38,0.04)',
      stepBtnActiveBg: '#F78C26',
      stepBtnActiveText: '#ffffff'
    },
    font: {
      family: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      importUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'
    },
    borderRadius: 12,
    cardShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)'
  };

  let THEME = { ...DEFAULT_THEME };

  const STEPS = {
    SERVICE_TYPE: 'service_type',
    CUSTOMER_TYPE: 'customer_type',
    PHONE_LOOKUP: 'phone_lookup',
    QUICK_INFO: 'quick_info', // Name + phone early capture
    SYSTEM_AGE: 'system_age',
    CALENDAR: 'calendar',
    DESCRIBE_ISSUE: 'describe_issue',
    ADDRESS: 'address',
    CONTACT_INFO: 'contact_info',
    CONFIRM: 'confirm',
    SUCCESS: 'success',
    MESSAGE: 'message',
    PCC_ASK: 'pcc_ask',
    PCC_TYPE: 'pcc_type',
    ROX_INSTALLED: 'rox_installed',
    WARRANTY_HANDOFF: 'warranty_handoff',
    DECLINED: 'declined',          // Shown when a service type is not supported
    // ── v1.12 RESCHEDULE MODE STEPS ─────────────────────
    // These four are NEVER part of any STEP_FLOW. They are only reached
    // via the URL ?token=... entry path in init(). The progress bar is
    // suppressed in reschedule mode (see render()).
    RESCHEDULE_LOAD: 'reschedule_load',
    RESCHEDULE_CALENDAR: 'reschedule_calendar',
    RESCHEDULE_SUCCESS: 'reschedule_success',
    RESCHEDULE_FAIL: 'reschedule_fail'
  };

  const STEP_FLOW = {
    new: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.QUICK_INFO,
      STEPS.SYSTEM_AGE, STEPS.ROX_INSTALLED, STEPS.CALENDAR, STEPS.DESCRIBE_ISSUE,
      STEPS.ADDRESS, STEPS.CONTACT_INFO, STEPS.CONFIRM
    ],
    existing: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.PHONE_LOOKUP,
      STEPS.SYSTEM_AGE, STEPS.ROX_INSTALLED, STEPS.CALENDAR, STEPS.DESCRIBE_ISSUE,
      STEPS.CONFIRM
    ],
    message_new: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.CONTACT_INFO,
      STEPS.MESSAGE, STEPS.SUCCESS
    ],
    message_existing: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.PHONE_LOOKUP,
      STEPS.MESSAGE, STEPS.SUCCESS
    ],
    pcc_new: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.QUICK_INFO,
      STEPS.PCC_ASK, STEPS.PCC_TYPE, STEPS.SYSTEM_AGE, STEPS.CALENDAR,
      STEPS.ADDRESS, STEPS.CONTACT_INFO, STEPS.CONFIRM
    ],
    pcc_existing: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.PHONE_LOOKUP,
      STEPS.PCC_ASK, STEPS.PCC_TYPE, STEPS.SYSTEM_AGE, STEPS.CALENDAR, STEPS.CONFIRM
    ],
    maint_new: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.QUICK_INFO,
      STEPS.PCC_ASK, STEPS.SYSTEM_AGE, STEPS.CALENDAR,
      STEPS.DESCRIBE_ISSUE, STEPS.ADDRESS, STEPS.CONTACT_INFO, STEPS.CONFIRM
    ],
    maint_existing: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.PHONE_LOOKUP,
      STEPS.PCC_ASK, STEPS.SYSTEM_AGE, STEPS.CALENDAR,
      STEPS.DESCRIBE_ISSUE, STEPS.CONFIRM
    ]
  };

  // Service area zip codes (Denver metro)
  const SERVICE_AREA_ZIPS = new Set([
    '80002','80003','80004','80005','80007','80010','80011','80012','80013','80014',
    '80015','80016','80017','80018','80019','80022','80045','80104','80108','80109',
    '80110','80111','80112','80113','80120','80121','80122','80123','80124','80125',
    '80126','80127','80128','80129','80130','80134','80138','80165','80166',
    '80202','80203','80204','80205','80206','80207','80208','80209','80210','80211',
    '80212','80214','80215','80216','80218','80219','80220','80221','80222','80223',
    '80224','80226','80227','80228','80230','80231','80232','80235','80236','80237',
    '80238','80239','80243','80244','80246','80247','80249'
  ]);

  let state = {
    sessionId: null,
    currentStep: STEPS.SERVICE_TYPE,
    path: null,
    data: {
      serviceType: null, customerType: null, systemAge: null,
      selectedDate: null, selectedSlot: null, issue: '',
      name: '', phone: '', email: '', message: '',
      // v1.10 — name now collected as two separate fields. The combined
      // "First Last" string is mirrored into state.data.name on every
      // saveFormData() call so any code (server payloads, summaries,
      // back-compat) reading state.data.name keeps working unchanged.
      firstName: '', lastName: '',
      address: { street: '', city: '', state: 'CO', zip: '' },
      isPccMember: null,
      pccType: null, // 'cooling' or 'heating'
      _tcpaConsent: false, // TCPA/CTIA consent checkbox
      _addrSuggestions: [],
      _addrPicked: false,
      _addrLoading: false,
      _zipConfirmed: false,
      customer: null
    },
    availability: null, loading: false, error: null, confirmation: null,
    _weather: null,      // Map of YYYY-MM-DD → high temp in °F (from Open-Meteo)
    _isAfterHours: false, // Set at session start from server
    _isSunday: false,     // Set at session start from server
    _declineMsg: null,    // Message shown on DECLINED step
    _declineOfferEstimate: false, // Whether to offer free estimate on decline screen
    // ── v1.12 RESCHEDULE MODE STATE ─────────────────────
    // All reschedule-only state is _reschedule*-prefixed so it's clear
    // at a glance what belongs to the booking flow vs the reschedule
    // flow. None of these fields are touched by the booking wizard's
    // render functions.
    _rescheduleMode: false,        // True iff URL had ?token=... at mount time
    _rescheduleToken: null,        // The HMAC token from the URL (string)
    _rescheduleContext: null,      // Result of /load
    _rescheduleFailMode: null,     // 'generic' for 401/410-passed/500/502/503
    _rescheduleToast: null,        // Ephemeral message shown above calendar (e.g., 409)
    _rescheduleConfirmed: null,    // Result of /confirm — { jobId, newStartISO, newEndISO }
    _rescheduleToastTimer: null    // setTimeout handle so toasts auto-clear
  };

  // ============================================
  // API HELPERS
  // ============================================
  async function api(method, path, body = null) {
    const url = `${CONFIG.serverUrl}/api/booking${path}`;
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || err.message || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  async function apiGet(path, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${CONFIG.serverUrl}/api/booking${path}${query ? '?' + query : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || err.message || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  // ============================================
  // RESCHEDULE API HELPER (v1.12)
  // ============================================
  // Parallels api() / apiGet() but hits the rox-chat reschedule proxy at
  // /api/reschedule/*. The critical difference is that NON-2XX RESPONSES
  // PRESERVE THE ENGINE'S HTTP STATUS CODE on the thrown Error object, so
  // the caller can branch on err.status to distinguish:
  //   401 → token bad/missing/expired
  //   410 → appointment already passed
  //   409 → slot taken between render and confirm (refetch + toast)
  //   502 → HCP move failed
  //   503 → DB or availability service down
  //   500 → server bug
  // The standard api() helper above collapses all non-2xx into a generic
  // Error message; that's fine for the booking flow but useless for
  // reschedule, where 409 must be handled differently from 401.
  async function apiReschedule(method, path, body = null, queryParams = null) {
    let url = `${CONFIG.serverUrl}/api/reschedule${path}`;
    if (queryParams) {
      const qs = new URLSearchParams(queryParams).toString();
      if (qs) url += '?' + qs;
    }
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    // Read body whether 2xx or not — engine returns structured JSON on
    // errors too (e.g. { error: 'slot_taken' }) and the caller needs it.
    let json;
    try {
      json = await res.json();
    } catch (e) {
      json = { error: `HTTP ${res.status}` };
    }
    if (!res.ok) {
      const err = new Error(json.error || json.message || `Request failed: ${res.status}`);
      err.status = res.status;     // <-- the bit booking api() drops
      err.body = json;
      throw err;
    }
    return json;
  }

  // ============================================
  // ADDRESS AUTOCOMPLETE (server-side Google Places)
  // ============================================
  let _addrTimer = null;

  // Update just the dropdown without rebuilding the whole DOM
  function updateAddrDropdown() {
    const wrap = root.querySelector('.rxb-addr-wrap');
    if (!wrap) return;

    // Remove existing dropdown
    const existing = wrap.querySelector('.rxb-addr-dropdown');
    if (existing) existing.remove();

    const suggestions = state._addrSuggestions || [];
    const showDropdown = suggestions.length > 0 && !state._addrPicked;

    if (state._addrLoading) {
      wrap.insertAdjacentHTML('beforeend', '<div class="rxb-addr-dropdown"><div class="rxb-addr-loading">Looking up address...</div></div>');
    } else if (showDropdown) {
      const html = '<div class="rxb-addr-dropdown">' + suggestions.map((s, i) =>
        `<div class="rxb-addr-item" data-action="pick-address" data-value="${i}"><span>${escapeHtml(s.mainText)}</span><small>${escapeHtml(s.secondaryText || '')}</small></div>`
      ).join('') + '</div>';
      wrap.insertAdjacentHTML('beforeend', html);
      // Attach click handlers to new dropdown items
      wrap.querySelectorAll('[data-action="pick-address"]').forEach(el => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault(); // Prevent blur from firing before click
          handleAction({ currentTarget: el });
        });
      });
    }
  }

  async function fetchAddressSuggestions(query) {
    if (query.length < 3) { state._addrSuggestions = []; updateAddrDropdown(); return; }
    state._addrLoading = true; updateAddrDropdown();
    try {
      const url = `${CONFIG.serverUrl}/api/widget-config/address-suggest?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Suggest failed');
      const data = await res.json();
      state._addrSuggestions = data.suggestions || [];
      state._addrLoading = false;
      state._addrPicked = false;
      updateAddrDropdown();
    } catch (e) {
      state._addrSuggestions = [];
      state._addrLoading = false;
      updateAddrDropdown();
    }
  }
  async function fetchAddressDetails(placeId) {
    try {
      const url = `${CONFIG.serverUrl}/api/widget-config/address-details?placeId=${encodeURIComponent(placeId)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Details failed');
      const data = await res.json();
      return data.address || null;
    } catch (e) { return null; }
  }

  // ============================================
  // THEME LOADER
  // ============================================
  async function loadTheme() {
    if (!CONFIG.serverUrl || !CONFIG.theme) return;
    try {
      const res = await fetch(`${CONFIG.serverUrl}/api/themes/${CONFIG.theme}`);
      if (res.ok) {
        const themeData = await res.json();
        if (themeData.colors) {
          THEME.colors = Object.assign({}, DEFAULT_THEME.colors, {
            primary: themeData.colors.primary,
            primaryHover: themeData.colors.primaryHover,
            text: themeData.colors.botBubbleText || DEFAULT_THEME.colors.text,
            cardBg: themeData.colors.botBubbleBg || DEFAULT_THEME.colors.cardBg,
            inputBorder: themeData.colors.inputBorder || DEFAULT_THEME.colors.inputBorder,
            inputFocus: themeData.colors.inputFocusBorder || DEFAULT_THEME.colors.inputFocus
          });
          THEME.colors.primaryLight = hexToRgba(THEME.colors.primary, 0.08);
          THEME.colors.primaryBorder = hexToRgba(THEME.colors.primary, 0.25);
          THEME.colors.calendarAvailable = THEME.colors.primary;
          THEME.colors.calendarSelected = THEME.colors.primary;
          THEME.colors.calendarToday = hexToRgba(THEME.colors.primary, 0.12);
          THEME.colors.progressFill = THEME.colors.primary;
          THEME.colors.stepBtnHoverBorder = THEME.colors.primary;
          THEME.colors.stepBtnHoverBg = hexToRgba(THEME.colors.primary, 0.04);
          THEME.colors.stepBtnActiveBg = THEME.colors.primary;
        }
        if (themeData.font) {
          THEME.font = Object.assign({}, DEFAULT_THEME.font, themeData.font);
        }
        console.log('[ROX Booking] Theme loaded:', CONFIG.theme);
      }
    } catch (err) {
      console.warn('[ROX Booking] Theme load failed, using defaults:', err.message);
    }
  }

  function hexToRgba(hex, alpha) {
    if (!hex || hex.startsWith('rgba')) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ============================================
  // CSS INJECTION
  // ============================================
  function injectStyles() {
    const C = THEME.colors;
    const F = THEME.font;
    const R = THEME.borderRadius;

    if (F.importUrl) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = F.importUrl;
      document.head.appendChild(link);
    }

    const style = document.createElement('style');
    style.textContent = `
      #rox-booking-root * { box-sizing: border-box; margin: 0; font-family: ${F.family}; }
      #rox-booking-root { max-width: 640px; margin: 0 auto; color: ${C.text}; line-height: 1.5; -webkit-font-smoothing: antialiased; }
      .rxb-header { text-align: center; margin-bottom: 28px; }
      .rxb-header h2 { font-size: 26px; font-weight: 700; color: ${C.text}; margin-bottom: 6px; letter-spacing: -0.3px; }
      .rxb-header p { font-size: 15px; color: ${C.textSecondary}; }
      .rxb-progress { display: flex; align-items: center; gap: 4px; margin-bottom: 32px; padding: 0 4px; }
      .rxb-progress-segment { flex: 1; height: 4px; border-radius: 2px; background: ${C.progressBg}; transition: background 0.4s ease; }
      .rxb-progress-segment.active { background: ${C.progressFill}; }
      .rxb-card { background: ${C.cardBg}; border: 1px solid ${C.cardBorder}; border-radius: ${R}px; padding: 32px 28px; box-shadow: ${THEME.cardShadow}; animation: rxbFadeIn 0.35s ease; }
      @keyframes rxbFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .rxb-card-title { font-size: 18px; font-weight: 600; color: ${C.text}; margin-bottom: 6px; }
      .rxb-card-subtitle { font-size: 14px; color: ${C.textSecondary}; margin-bottom: 24px; }
      .rxb-options { display: flex; flex-direction: column; gap: 10px; }
      .rxb-option-btn { display: flex; align-items: center; gap: 14px; width: 100%; padding: 16px 20px; background: ${C.stepBtnBg}; border: 1.5px solid ${C.stepBtnBorder}; border-radius: ${R}px; cursor: pointer; text-align: left; font-size: 15px; font-weight: 500; color: ${C.text}; transition: all 0.2s ease; }
      .rxb-option-btn:hover { border-color: ${C.stepBtnHoverBorder}; background: ${C.stepBtnHoverBg}; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
      .rxb-option-btn.selected { border-color: ${C.primary}; background: ${C.primaryLight}; color: ${C.primary}; font-weight: 600; }
      .rxb-option-icon { font-size: 22px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: ${C.primaryLight}; border-radius: 10px; flex-shrink: 0; }
      .rxb-option-label { font-weight: 600; }
      .rxb-option-desc { font-size: 13px; color: ${C.textMuted}; font-weight: 400; margin-top: 2px; }
      .rxb-field { margin-bottom: 18px; }
      .rxb-label { display: block; font-size: 13px; font-weight: 600; color: ${C.textSecondary}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
      .rxb-input, .rxb-textarea { width: 100%; padding: 12px 16px; font-size: 15px; border: 1.5px solid ${C.inputBorder}; border-radius: ${R - 2}px; background: ${C.inputBg}; color: ${C.text}; outline: none; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
      .rxb-input:focus, .rxb-textarea:focus { border-color: ${C.inputFocus}; box-shadow: 0 0 0 3px ${C.primaryLight}; }
      .rxb-input::placeholder, .rxb-textarea::placeholder { color: ${C.textMuted}; }
      .rxb-textarea { min-height: 100px; resize: vertical; font-family: ${F.family}; }
      .rxb-input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      @media (max-width: 480px) { .rxb-input-row { grid-template-columns: 1fr; } }
      .rxb-calendar { margin-bottom: 20px; }
      .rxb-cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
      .rxb-cal-title { font-size: 16px; font-weight: 600; }
      .rxb-cal-nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 1px solid ${C.cardBorder}; border-radius: 8px; background: ${C.cardBg}; cursor: pointer; font-size: 14px; color: ${C.textSecondary}; transition: all 0.15s ease; }
      .rxb-cal-nav-btn:hover { border-color: ${C.primary}; color: ${C.primary}; }
      .rxb-cal-nav-btn:disabled { opacity: 0.3; cursor: default; }
      .rxb-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; }
      .rxb-cal-dow { font-size: 11px; font-weight: 600; color: ${C.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 0; }
      .rxb-cal-day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; border-radius: 10px; border: none; background: transparent; color: ${C.textMuted}; cursor: default; transition: all 0.15s ease; gap: 1px; padding: 2px 0; }
      .rxb-cal-day .rxb-cal-temp { font-size: 9px; font-weight: 400; opacity: 0.7; line-height: 1; }
      .rxb-cal-day.empty { visibility: hidden; }
      .rxb-cal-day.today { background: ${C.calendarToday}; color: ${C.text}; }
      .rxb-cal-day.available { background: ${C.primaryLight}; color: ${C.primary}; font-weight: 600; cursor: pointer; }
      .rxb-cal-day.available:hover { background: ${C.primary}; color: #fff; transform: scale(1.08); }
      .rxb-cal-day.selected { background: ${C.calendarSelected}; color: #fff; font-weight: 700; box-shadow: 0 2px 8px ${hexToRgba(C.primary, 0.35)}; }
      .rxb-cal-day.past { opacity: 0.3; }
      .rxb-slots { margin-top: 20px; animation: rxbFadeIn 0.3s ease; }
      .rxb-slots-title { font-size: 14px; font-weight: 600; color: ${C.textSecondary}; margin-bottom: 12px; }
      .rxb-slots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
      .rxb-slot-btn { padding: 10px 12px; font-size: 14px; font-weight: 500; border: 1.5px solid ${C.cardBorder}; border-radius: ${R - 2}px; background: ${C.cardBg}; color: ${C.text}; cursor: pointer; text-align: center; transition: all 0.2s ease; }
      .rxb-slot-btn:hover { border-color: ${C.primary}; background: ${C.primaryLight}; color: ${C.primary}; }
      .rxb-slot-btn.selected { border-color: ${C.primary}; background: ${C.primary}; color: #fff; font-weight: 600; }
      .rxb-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 28px; padding-top: 20px; border-top: 1px solid ${C.cardBorder}; }
      .rxb-back-btn { display: flex; align-items: center; gap: 6px; padding: 10px 18px; font-size: 14px; font-weight: 500; color: ${C.textSecondary}; background: transparent; border: 1px solid ${C.cardBorder}; border-radius: ${R - 2}px; cursor: pointer; transition: all 0.2s ease; }
      .rxb-back-btn:hover { border-color: ${C.primary}; color: ${C.primary}; }
      .rxb-next-btn { padding: 12px 28px; font-size: 15px; font-weight: 600; color: #fff; background: ${C.primary}; border: none; border-radius: ${R - 2}px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 6px ${hexToRgba(C.primary, 0.3)}; }
      .rxb-next-btn:hover { background: ${C.primaryHover}; transform: translateY(-1px); box-shadow: 0 4px 12px ${hexToRgba(C.primary, 0.4)}; }
      .rxb-next-btn:disabled { opacity: 0.5; cursor: default; transform: none; box-shadow: none; }
      .rxb-summary { border: 1px solid ${C.cardBorder}; border-radius: ${R - 2}px; overflow: hidden; }
      .rxb-summary-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid ${C.cardBorder}; }
      .rxb-summary-row:last-child { border-bottom: none; }
      .rxb-summary-label { font-size: 13px; font-weight: 600; color: ${C.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px; }
      .rxb-summary-value { font-size: 15px; font-weight: 500; color: ${C.text}; }
      .rxb-success { text-align: center; padding: 20px 0; }
      .rxb-success-icon { width: 64px; height: 64px; border-radius: 50%; background: ${C.successBg}; border: 2px solid ${C.successBorder}; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 20px; color: ${C.successText}; }
      .rxb-success h3 { font-size: 22px; font-weight: 700; color: ${C.text}; margin-bottom: 8px; }
      .rxb-success p { font-size: 15px; color: ${C.textSecondary}; margin-bottom: 4px; }
      .rxb-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0; gap: 16px; }
      .rxb-spinner { width: 36px; height: 36px; border: 3px solid ${C.progressBg}; border-top-color: ${C.primary}; border-radius: 50%; animation: rxbSpin 0.8s linear infinite; }
      @keyframes rxbSpin { to { transform: rotate(360deg); } }
      .rxb-loading-text { font-size: 14px; color: ${C.textSecondary}; }
      .rxb-pricing-banner { padding: 14px 18px; border-radius: ${R - 2}px; font-size: 14px; line-height: 1.5; margin-bottom: 16px; }
      .rxb-pricing-banner.repair { background: #FFF7ED; border: 1px solid #FDBA74; color: #9A3412; }
      .rxb-pricing-banner.maintenance { background: #F0FDF4; border: 1px solid #86EFAC; color: #166534; }
      .rxb-pricing-banner.estimate { background: #EFF6FF; border: 1px solid #93C5FD; color: #1E40AF; }
      .rxb-pricing-banner strong { font-weight: 600; }
      .rxb-consent { display: flex; align-items: flex-start; gap: 10px; margin-top: 18px; padding: 14px 16px; background: ${C.primaryLight}; border: 1px solid ${C.primaryBorder}; border-radius: ${R - 2}px; cursor: pointer; }
      .rxb-consent input[type="checkbox"] { margin-top: 3px; width: 18px; height: 18px; flex-shrink: 0; accent-color: ${C.primary}; cursor: pointer; }
      .rxb-consent-text { font-size: 12px; line-height: 1.5; color: ${C.textSecondary}; }
      .rxb-error { padding: 14px 18px; background: ${C.errorBg}; border: 1px solid ${C.errorBorder}; border-radius: ${R - 2}px; color: ${C.errorText}; font-size: 14px; margin-bottom: 16px; }
      .rxb-customer-card { padding: 16px 20px; background: ${C.successBg}; border: 1px solid ${C.successBorder}; border-radius: ${R - 2}px; margin-bottom: 20px; }
      .rxb-customer-card h4 { font-size: 15px; font-weight: 600; color: ${C.successText}; margin-bottom: 4px; }
      .rxb-customer-card p { font-size: 13px; color: ${C.textSecondary}; }
      .rxb-addr-wrap { position: relative; }
      .rxb-addr-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: ${C.cardBg}; border: 1.5px solid ${C.primary}; border-top: none; border-radius: 0 0 ${R - 2}px ${R - 2}px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 50; overflow: hidden; }
      .rxb-addr-item { padding: 12px 16px; font-size: 14px; color: ${C.text}; cursor: pointer; border-bottom: 1px solid ${C.cardBorder}; transition: background 0.15s; }
      .rxb-addr-item:last-child { border-bottom: none; }
      .rxb-addr-item:hover { background: ${C.primaryLight}; color: ${C.primary}; }
      .rxb-addr-item small { display: block; font-size: 12px; color: ${C.textMuted}; margin-top: 2px; }
      .rxb-addr-loading { padding: 12px 16px; font-size: 13px; color: ${C.textMuted}; text-align: center; }
      /* ── v1.12 RESCHEDULE MODE STYLES ──────────────── */
      /* Toast: shows above the calendar after a 409 race-condition refetch.
         Auto-dismisses after 5s via setTimeout in showRescheduleToast(). */
      .rxb-toast { padding: 12px 16px; background: #FEF3C7; border: 1px solid #FCD34D; border-radius: ${R - 2}px; color: #92400E; font-size: 14px; line-height: 1.5; margin-bottom: 16px; animation: rxbFadeIn 0.3s ease; display: flex; align-items: center; gap: 10px; }
      .rxb-toast-icon { font-size: 18px; flex-shrink: 0; }
      /* "Move from X to Y" header: appears at the top of the reschedule
         calendar so the customer can see what they're moving. */
      .rxb-from-card { background: ${C.primaryLight}; border: 1px solid ${C.primaryBorder}; border-radius: ${R - 2}px; padding: 16px 20px; margin-bottom: 20px; }
      .rxb-from-card h4 { font-size: 15px; font-weight: 600; color: ${C.text}; margin-bottom: 4px; }
      .rxb-from-card p { font-size: 14px; color: ${C.textSecondary}; line-height: 1.5; }
      .rxb-from-card strong { color: ${C.text}; font-weight: 600; }
      /* Side-by-side button row used on the "already rescheduled" card.
         Each button is full-width on mobile (single column), 50/50 on desktop. */
      .rxb-btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
      @media (max-width: 480px) { .rxb-btn-row { grid-template-columns: 1fr; } }
      .rxb-btn-secondary { padding: 12px 24px; font-size: 15px; font-weight: 500; color: ${C.text}; background: ${C.cardBg}; border: 1.5px solid ${C.cardBorder}; border-radius: ${R - 2}px; cursor: pointer; transition: all 0.2s ease; }
      .rxb-btn-secondary:hover { border-color: ${C.primary}; color: ${C.primary}; }
      @media (max-width: 480px) { .rxb-card { padding: 24px 18px; } .rxb-header h2 { font-size: 22px; } .rxb-slots-grid { grid-template-columns: repeat(2, 1fr); } }
    `;
    document.head.appendChild(style);
  }

  // ============================================
  // RENDER ENGINE
  // ============================================
  let root = null;

  function getStepIndex() {
    const flow = state.path ? STEP_FLOW[state.path] : STEP_FLOW.new;
    return flow.indexOf(state.currentStep);
  }

  function getTotalSteps() {
    const flow = state.path ? STEP_FLOW[state.path] : STEP_FLOW.new;
    return flow.length;
  }

  function render() {
    if (!root) return;
    let html = '';

    // ── v1.12 — header for reschedule mode is different, and we
    // suppress the booking wizard's progress bar (the reschedule flow
    // has only 2-3 steps total — load → calendar → done — and a
    // progress bar would feel oversized for that).
    if (state._rescheduleMode) {
      html += `<div class="rxb-header"><h2>Reschedule Your Appointment</h2><p>Pick a new time that works for you</p></div>`;
    } else {
      const stepIdx = getStepIndex();
      const totalSteps = getTotalSteps();
      const isMessage = state.data.serviceType === 'message';
      const headerTitle = isMessage ? 'Send a Message' : 'Book an Appointment';
      const headerSub = isMessage ? `Send a message to ${CONFIG.companyName}` : `Schedule your service with ${CONFIG.companyName}`;
      html += `<div class="rxb-header"><h2>${headerTitle}</h2><p>${headerSub}</p></div>`;
      if (state.currentStep !== STEPS.SUCCESS) {
        html += '<div class="rxb-progress">';
        for (let i = 0; i < totalSteps; i++) {
          html += `<div class="rxb-progress-segment${i <= stepIdx ? ' active' : ''}"></div>`;
        }
        html += '</div>';
      }
    }
    html += renderStep();
    root.innerHTML = html;
    attachEvents();
  }

  function renderStep() {
    switch (state.currentStep) {
      case STEPS.SERVICE_TYPE: return renderServiceType();
      case STEPS.CUSTOMER_TYPE: return renderCustomerType();
      case STEPS.PHONE_LOOKUP: return renderPhoneLookup();
      case STEPS.QUICK_INFO: return renderQuickInfo();
      case STEPS.SYSTEM_AGE: return renderSystemAge();
      case STEPS.ROX_INSTALLED: return renderRoxInstalled();
      case STEPS.WARRANTY_HANDOFF: return renderWarrantyHandoff();
      case STEPS.DECLINED: return renderDeclined();
      case STEPS.CALENDAR: return renderCalendar();
      case STEPS.DESCRIBE_ISSUE: return renderDescribeIssue();
      case STEPS.MESSAGE: return renderMessage();
      case STEPS.PCC_ASK: return renderPccAsk();
      case STEPS.PCC_TYPE: return renderPccType();
      case STEPS.ADDRESS: return renderAddress();
      case STEPS.CONTACT_INFO: return renderContactInfo();
      case STEPS.CONFIRM: return renderConfirm();
      case STEPS.SUCCESS: return renderSuccess();
      // v1.12 — reschedule mode steps
      case STEPS.RESCHEDULE_LOAD: return renderRescheduleLoad();
      case STEPS.RESCHEDULE_CALENDAR: return renderRescheduleCalendar();
      case STEPS.RESCHEDULE_SUCCESS: return renderRescheduleSuccess();
      case STEPS.RESCHEDULE_FAIL: return renderRescheduleFail();
      default: return '<p>Unknown step</p>';
    }
  }

  function renderServiceType() {
    const options = [
      { value: 'repair', icon: '\uD83D\uDD27', label: 'System Not Working', desc: 'Fix a broken or malfunctioning system' },
      { value: 'estimate', icon: '\uD83D\uDCCB', label: 'Free Estimate', desc: 'New installations only' },
      { value: 'maintenance', icon: '\uD83D\uDEE1\uFE0F', label: 'Maintenance', desc: 'Annual tune-up and system check' },
      { value: 'message', icon: '\uD83D\uDCE9', label: 'Send a Message', desc: 'Send a message or request to our office' }
    ];
    // After-hours banner — shown when the office is closed at the time the widget was opened.
    // The server detects this at /start and sends back isAfterHours + isSunday flags.
    const afterHoursHtml = state._isAfterHours
      ? `<div style="background:#EFF6FF;border:1px solid #93C5FD;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:14px;color:#1E40AF;">\uD83C\uDF19 <strong>${state._isSunday ? "We're closed today" : "We're currently closed"}</strong> \u2014 but you can still book an appointment here and we'll confirm ${state._isSunday ? 'Monday morning' : 'first thing in the morning'}!</div>`
      : '';
    return `<div class="rxb-card"><div class="rxb-card-title">What do you need help with?</div><div class="rxb-card-subtitle">Select the service you're looking for</div>${afterHoursHtml}<div class="rxb-options">${options.map(o => `<button class="rxb-option-btn${state.data.serviceType === o.value ? ' selected' : ''}" data-action="select-service" data-value="${o.value}"><div class="rxb-option-icon">${o.icon}</div><div><div class="rxb-option-label">${o.label}</div><div class="rxb-option-desc">${o.desc}</div></div></button>`).join('')}</div></div>`;
  }

  function renderCustomerType() {
    const options = [
      { value: 'existing', icon: '\uD83D\uDC64', label: 'Existing Customer', desc: "I've used ROX before" },
      { value: 'new', icon: '\uD83D\uDC4B', label: 'New Customer', desc: 'This is my first time' }
    ];
    return `<div class="rxb-card"><div class="rxb-card-title">Have you worked with us before?</div><div class="rxb-card-subtitle">This helps us look up your account</div><div class="rxb-options">${options.map(o => `<button class="rxb-option-btn${state.data.customerType === o.value ? ' selected' : ''}" data-action="select-customer-type" data-value="${o.value}"><div class="rxb-option-icon">${o.icon}</div><div><div class="rxb-option-label">${o.label}</div><div class="rxb-option-desc">${o.desc}</div></div></button>`).join('')}</div>${renderNav(true, false)}</div>`;
  }

  function renderPhoneLookup() {
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    const customerHtml = state.data.customer ? `<div class="rxb-customer-card"><h4>\u2714 Welcome back, ${state.data.customer.firstName || state.data.name}!</h4><p>${state.data.customer.address ? `${state.data.customer.address.street}, ${state.data.customer.address.city}` : 'Account found'}</p></div>` : '';
    if (state.loading) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Looking up your account...</div></div></div>`;
    }
    return `<div class="rxb-card"><div class="rxb-card-title">Let's find your account</div><div class="rxb-card-subtitle">Enter the phone number on your account</div>${errorHtml}${customerHtml}<div class="rxb-field"><label class="rxb-label">Phone Number</label><input type="tel" class="rxb-input" id="rxb-phone" placeholder="(720) 555-1234" value="${formatPhone(state.data.phone)}" maxlength="14" autocomplete="tel"></div>${!state.data.customer ? `<button class="rxb-next-btn" style="width:100%" data-action="lookup-phone" ${!state.data.phone || state.data.phone.length < 10 ? 'disabled' : ''}>Look Up Account</button>` : ''}${renderNav(true, !!state.data.customer)}</div>`;
  }

  function renderQuickInfo() {
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    const consentHtml = `<label class="rxb-consent"><input type="checkbox" id="rxb-tcpa" ${state.data._tcpaConsent ? 'checked' : ''}><span class="rxb-consent-text">By submitting this form you consent to receive SMS and email messages from ${CONFIG.companyName} at the number and email provided. Consent is not a condition of purchase. Msg &amp; data rates may apply.</span></label>`;
    // v1.10 — split into First Name + Last Name fields. Reuses the existing
    // .rxb-input-row 2-column grid (also used for City + Zip). Pre-fills
    // from firstName/lastName if set, OR from a previously-combined
    // state.data.name (split on the first whitespace). The split-on-load
    // matters when a customer lands here from a prior step that only knew
    // the combined name string.
    const fn = state.data.firstName || (state.data.name ? state.data.name.split(/\s+/)[0] : '');
    const ln = state.data.lastName  || (state.data.name ? state.data.name.split(/\s+/).slice(1).join(' ') : '');
    const nameRow = `<div class="rxb-input-row">`
      + `<div class="rxb-field"><label class="rxb-label">First Name</label><input type="text" class="rxb-input" id="rxb-first-name" placeholder="John" value="${escapeHtml(fn)}" autocomplete="given-name"></div>`
      + `<div class="rxb-field"><label class="rxb-label">Last Name</label><input type="text" class="rxb-input" id="rxb-last-name" placeholder="Smith" value="${escapeHtml(ln)}" autocomplete="family-name"></div>`
      + `</div>`;
    return `<div class="rxb-card"><div class="rxb-card-title">Quick Info</div><div class="rxb-card-subtitle">In case we get disconnected, we'd love to be able to reach you</div>${errorHtml}${nameRow}<div class="rxb-field"><label class="rxb-label">Phone Number</label><input type="tel" class="rxb-input" id="rxb-contact-phone" placeholder="(720) 555-1234" value="${formatPhone(state.data.phone)}" maxlength="14" autocomplete="tel"></div>${consentHtml}${renderNav(true, true)}</div>`;
  }

  function renderSystemAge() {
    const options = [
      { value: '0-2', icon: '\uD83C\uDD95', label: '0\u20132 Years' },
      { value: '3-10', icon: '\u2705', label: '3\u201310 Years' },
      { value: '10+', icon: '\uD83D\uDD34', label: '10+ Years' },
      { value: '10+', icon: '\u2753', label: 'Not Sure' }
    ];
    return `<div class="rxb-card"><div class="rxb-card-title">How old is your system?</div><div class="rxb-card-subtitle">This helps us send the right technician</div><div class="rxb-options">${options.map(o => `<button class="rxb-option-btn${state.data.systemAge === o.value ? ' selected' : ''}" data-action="select-age" data-value="${o.value}"><div class="rxb-option-icon">${o.icon}</div><div><div class="rxb-option-label">${o.label}</div></div></button>`).join('')}</div>${renderNav(true, false)}</div>`;
  }

  // ============================================
  // ROX INSTALLED CHECK — renders after system_age for 0-2 year systems
  // ============================================
  function renderRoxInstalled() {
    const options = [
      { value: 'yes',      icon: '\u2705', label: 'Yes, ROX installed it' },
      { value: 'no',       icon: '\u274C', label: 'No' },
      { value: 'not-sure', icon: '\u2753', label: "I'm not sure" }
    ];
    return '<div class="rxb-card">'
      + '<div class="rxb-card-title">Was your system installed by ROX Heating & Air?</div>'
      + '<div class="rxb-card-subtitle">This helps us determine if your service may be covered under warranty</div>'
      + '<div class="rxb-options">'
      + options.map(o =>
          '<button class="rxb-option-btn" data-action="rox-installed" data-value="' + o.value + '">'
          + '<div class="rxb-option-icon">' + o.icon + '</div>'
          + '<div><div class="rxb-option-label">' + o.label + '</div></div>'
          + '</button>'
        ).join('')
      + '</div>'
      + renderNav(true, false)
      + '</div>';
  }

  function renderWarrantyHandoff() {
    return '<div class="rxb-card">'
      + '<div class="rxb-success">'
      + '<div class="rxb-success-icon" style="font-size:32px; background:none; border:none;">\uD83D\uDD27</div>'
      + '<h3>We\'ll Be in Touch!</h3>'
      + '<p>We have all of your information and our team will reach out to you as soon as possible.</p>'
      + '<p style="margin-top:16px; font-size:13px; color:' + THEME.colors.textMuted + '">'
      + 'Questions? Call us at <strong>' + CONFIG.companyPhone + '</strong></p>'
      + '</div>'
      + '</div>';
  }

  // ============================================
  // DECLINED STEP — shown when we can't service a request
  // e.g. duct cleaning, water heater 10+ years
  // If offerEstimate is true, customer can pivot to a free estimate.
  // ============================================
  function renderDeclined() {
    const msg = state._declineMsg || "Unfortunately we're unable to service this request at this time.";
    const C = THEME.colors;
    const offerHtml = state._declineOfferEstimate
      ? `<p style="margin-top:14px;font-size:14px;color:${C.textSecondary}">We can schedule a <strong>free estimate</strong> to discuss your replacement options!</p>`
        + `<button data-action="decline-estimate" style="margin-top:16px;padding:14px 28px;font-size:15px;font-weight:600;color:#fff;background:${C.primary};border:none;border-radius:10px;cursor:pointer;width:100%">Schedule Free Estimate \u2192</button>`
        + `<div style="margin-top:10px"><button data-action="decline-restart" style="background:none;border:none;color:${C.textMuted};font-size:13px;cursor:pointer;padding:6px 0">No thanks, start over</button></div>`
      : `<p style="margin-top:16px;font-size:13px;color:${C.textMuted}">Questions? Call us at <strong>${CONFIG.companyPhone}</strong></p>`
        + `<div style="margin-top:14px"><button data-action="decline-restart" style="background:none;border:none;color:${C.primary};font-size:13px;cursor:pointer;text-decoration:underline">\u2190 Start over</button></div>`;
    return `<div class="rxb-card"><div class="rxb-success">`
      + `<div class="rxb-success-icon" style="background:#FFF7ED;border-color:#FDBA74;color:#C2410C;font-size:26px;">\u26A0\uFE0F</div>`
      + `<h3 style="color:${C.text}">We're Sorry</h3>`
      + `<p style="color:${C.textSecondary}">${escapeHtml(msg)}</p>`
      + offerHtml
      + `</div></div>`;
  }

  // Called when customer taps Yes / No / Not Sure on the ROX installed step.
  // Yes  → POST /warranty-check → show WARRANTY_HANDOFF screen.
  // No / Not sure → proceed to calendar as normal.
  async function handleRoxInstalledAction(value) {
    state.data.roxInstalled = value;

    if (value === 'yes') {
      state.loading = true;
      state.error   = null;
      render();

      try {
        const result = await api('POST', '/warranty-check', {
          sessionId:   state.sessionId,
          roxInstalled: true,
          serviceType: state.data.serviceType,
          systemAge:   state.data.systemAge,
          issue:       state.data.issue       || '',
          name:        state.data.name        || '',
          phone:       state.data.phone       || '',
          email:       state.data.email       || ''
        });

        state.loading = false;

        if (result && result.warrantyHandoff) {
          goToStep(STEPS.WARRANTY_HANDOFF);
        } else {
          // Server says not a warranty — continue to calendar
          goToStep(STEPS.CALENDAR);
          loadAvailability();
        }
      } catch (err) {
        state.loading = false;
        state.error   = 'Something went wrong. Please try again or call ' + CONFIG.companyPhone;
        render();
      }
    } else {
      // Not ROX installed — proceed to calendar
      goToStep(STEPS.CALENDAR);
      loadAvailability();
    }
  }

  // ── Pricing banner for calendar step ──
  // MULTI-TENANT: Move fee amounts to tenantConfig.fees in SaaS version
  function getPricingBanner() {
    const svc = state.data.serviceType;
    const isPcc = state.data.isPccMember;

    if (svc === 'repair') {
      // 10+ year systems get the reduced $49 diagnostic fee (sales tech visit)
      // Matches voice channel getServiceFee() and chat getRepairFeeInfo() behavior.
      if (state.data.systemAge === '10+') {
        return '<div class="rxb-pricing-banner repair"><strong>\uD83D\uDD0D Diagnostic Fee: $49</strong><br>The $49 diagnostic fee is waived if you proceed with repairs. One of our comfort advisors will assess your system.</div>';
      }
      return '<div class="rxb-pricing-banner repair"><strong>\uD83D\uDCB0 Service Call Fee: $148</strong><br>The $148 service call fee is waived if you proceed with repairs.</div>';
    }
    if (svc === 'maintenance') {
      if (isPcc) {
        return '<div class="rxb-pricing-banner maintenance"><strong>\u2B50 PCC Member \u2014 No Charge!</strong><br>Your maintenance is included with your Priority Comfort Club membership.</div>';
      }
      return '<div class="rxb-pricing-banner maintenance"><strong>\uD83D\uDEE0\uFE0F Tune-Up Fee: $128</strong><br>One-time tune-up is $128. Ask about our <strong>Priority Comfort Club</strong> \u2014 just $149/year and includes 2 annual tune-ups (spring A/C + fall furnace).</div>';
    }
    if (svc === 'estimate') {
      return '<div class="rxb-pricing-banner estimate"><strong>\uD83D\uDCCA Estimates Are Always Free!</strong><br>No charge for your in-home estimate.</div>';
    }
    return '';
  }

  function renderCalendar() {
    if (state.loading) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Checking available times...</div></div></div>`;
    }
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    if (!state.availability || state.availability.availableDays.length === 0) {
      const pricingHtml = getPricingBanner();
      return `<div class="rxb-card"><div class="rxb-card-title">Pick a Date & Time</div>${pricingHtml}${errorHtml}<div style="text-align:center; padding: 30px 0;"><p style="font-size: 16px; margin-bottom: 12px;">No available times found in the next 4 weeks.</p><p style="font-size: 14px; color: ${THEME.colors.textSecondary}; margin-bottom: 20px;">Please call us at <strong>${CONFIG.companyPhone}</strong> and we'll find a time that works.</p><button class="rxb-next-btn" style="width:100%" data-action="book-further-out">\uD83D\uDCE9 Send a Request for a Later Date</button></div>${renderNav(true, false)}</div>`;
    }

    const availDates = new Set(state.availability.availableDays.map(d => d.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const calMonth = state._calMonth || today.getMonth();
    const calYear = state._calYear || today.getFullYear();
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let daysHtml = '';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => { daysHtml += `<div class="rxb-cal-dow">${d}</div>`; });
    for (let i = 0; i < startDow; i++) { daysHtml += '<div class="rxb-cal-day empty"></div>'; }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(calYear, calMonth, d);
      const dateStr = dateObj.toISOString().split('T')[0];
      const isPast = dateObj < today;
      const isToday = dateObj.getTime() === today.getTime();
      const isAvail = availDates.has(dateStr);
      const isSelected = state.data.selectedDate === dateStr;
      let cls = 'rxb-cal-day';
      if (isPast) cls += ' past';
      if (isToday) cls += ' today';
      if (isAvail && !isPast) cls += ' available';
      if (isSelected) cls += ' selected';
      const clickable = isAvail && !isPast;
      const temp = state._weather && state._weather[dateStr];
      const tempHtml = temp ? `<span class="rxb-cal-temp">${temp}°</span>` : '';
      daysHtml += `<button class="${cls}" ${clickable ? `data-action="select-date" data-value="${dateStr}"` : 'disabled'}>${d}${tempHtml}</button>`;
    }

    // Time slots for selected date
    let slotsHtml = '';
    if (state.data.selectedDate) {
      const dayData = state.availability.availableDays.find(d => d.date === state.data.selectedDate);
      if (dayData && dayData.slots.length > 0) {
        // Deduplicate: multiple techs may share the same time window
        const seen = new Set();
        const uniqueSlots = [];
        for (let i = 0; i < dayData.slots.length; i++) {
          const s = dayData.slots[i];
          if (!seen.has(s.start)) {
            seen.add(s.start);
            uniqueSlots.push({ ...s, originalIdx: i });
          }
        }

        // ── FIX v1.2: Sort slots chronologically so times display in order ──
        // Without this, slots from multiple techs display in arbitrary order
        uniqueSlots.sort((a, b) => new Date(a.start) - new Date(b.start));

        // Saturday fee disclosure — match voice and chat channel behavior
        const isSaturdayRepair = dayData.dayOfWeek === 'Saturday' && state.data.serviceType === 'repair';

        const shortLabel = (s) => {
          try {
            const st = new Date(s.start);
            const en = new Date(s.end);
            const fmt = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Denver' });
            return fmt(st) + ' - ' + fmt(en);
          } catch (e) { return s.formatted; }
        };
        slotsHtml = `<div class="rxb-slots"><div class="rxb-slots-title">Available times for ${dayData.displayDate}</div>${isSaturdayRepair ? `<div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:8px;padding:12px 16px;margin-bottom:12px;font-size:14px;color:#9A3412;"><strong>\uD83D\uDCC5 Weekend Service Call</strong> \u2014 Weekend service calls are billed at $148, waived if you proceed with repairs.</div>` : ''}<div class="rxb-slots-grid">${uniqueSlots.map(s => `<button class="rxb-slot-btn${state.data.selectedSlot && state.data.selectedSlot.start === s.start ? ' selected' : ''}" data-action="select-slot" data-idx="${s.originalIdx}">${shortLabel(s)}</button>`).join('')}</div></div>`;
      }
    }

    const canPrev = calMonth > today.getMonth() || calYear > today.getFullYear();
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 28);
    const canNext = new Date(calYear, calMonth + 1, 1) <= maxDate;

    const furtherOutHtml = `<div style="text-align:center; margin-top:16px; padding-top:12px; border-top:1px solid ${THEME.colors.cardBorder};">${canNext ? `<button data-action="cal-next" style="display:inline-flex; align-items:center; gap:6px; padding:10px 24px; background:${THEME.colors.primaryLight}; border:1.5px solid ${THEME.colors.primaryBorder}; border-radius:8px; color:${THEME.colors.primary}; font-size:14px; font-weight:600; cursor:pointer; margin-bottom:12px; transition:all 0.2s ease;">View More Dates \u2192</button><br>` : ''}<button data-action="book-further-out" style="background:none; border:none; color:${THEME.colors.textMuted}; font-size:13px; cursor:pointer; padding:8px 0;">Need to book further out? Send us a request \u2192</button></div>`;
    const pricingHtml = getPricingBanner();
    return `<div class="rxb-card"><div class="rxb-card-title">Pick a Date & Time</div><div class="rxb-card-subtitle">Select an available day, then choose a time slot</div>${pricingHtml}${errorHtml}<div class="rxb-calendar"><div class="rxb-cal-header"><button class="rxb-cal-nav-btn" data-action="cal-prev" ${!canPrev ? 'disabled' : ''}>\u2039</button><div class="rxb-cal-title">${monthName}</div><button class="rxb-cal-nav-btn" data-action="cal-next" ${!canNext ? 'disabled' : ''}>\u203A</button></div><div class="rxb-cal-grid">${daysHtml}</div></div>${slotsHtml}${furtherOutHtml}${renderNav(true, !!state.data.selectedSlot)}</div>`;
  }

  function renderDescribeIssue() {
    return `<div class="rxb-card"><div class="rxb-card-title">Describe Your Issue</div><div class="rxb-card-subtitle">Help our technician prepare for your visit</div><div class="rxb-field"><label class="rxb-label">What's going on?</label><textarea class="rxb-textarea" id="rxb-issue" placeholder="e.g., My AC is blowing warm air, making a loud noise, furnace won't turn on...">${state.data.issue || ''}</textarea></div>${renderNav(true, true)}</div>`;
  }

  function renderAddress() {
    const a = state.data.address;
    return `<div class="rxb-card"><div class="rxb-card-title">Service Address</div><div class="rxb-card-subtitle">Where should we send the technician?</div><div class="rxb-field"><label class="rxb-label">Street Address</label><div class="rxb-addr-wrap"><input type="text" class="rxb-input" id="rxb-street" placeholder="Start typing your address..." value="${escapeHtml(a.street)}" autocomplete="off"></div></div><div class="rxb-input-row"><div class="rxb-field"><label class="rxb-label">City</label><input type="text" class="rxb-input" id="rxb-city" placeholder="Denver" value="${escapeHtml(a.city)}" autocomplete="address-level2"></div><div class="rxb-field"><label class="rxb-label">Zip Code</label><input type="text" class="rxb-input" id="rxb-zip" placeholder="80202" value="${escapeHtml(a.zip)}" maxlength="5" autocomplete="postal-code"></div></div>${renderNav(true, true)}</div>`;
  }

  function renderContactInfo() {
    const isMessage = state.data.serviceType === 'message';
    // Detect if name + phone were already collected via QUICK_INFO step
    // If so, show "just to confirm" messaging instead of generic subtitle
    const hasEarlyCapture = !isMessage && state.data.name && state.data.phone;
    const title = hasEarlyCapture ? 'Just to Confirm' : 'Your Contact Info';
    const subtitle = isMessage ? 'So our office can follow up with you' : hasEarlyCapture ? "Please verify your information below so we're sure to have the right contact details." : 'So we can reach you about your appointment';
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    const zipWarning = state._zipWarning ? `<div class="rxb-error" style="background: #FFFBE6; border-color: #FFD666; color: #7A6200;">I just want to verify — we don't currently service the ${state.data.address.zip} area. Is this zip correct?</div>` : '';
    let zipField = '';
    if (isMessage) {
      zipField = `<div class="rxb-field"><label class="rxb-label">Zip Code</label><input type="text" class="rxb-input" id="rxb-zip" placeholder="80202" value="${state.data.address.zip}" maxlength="5" autocomplete="postal-code"></div>`;
    }
    // v1.10 — split First Name + Last Name (same pattern as QUICK_INFO).
    // For existing customers coming from HCP lookup, state.data.name is
    // already "First Last" — split it on the first whitespace so both
    // fields pre-fill correctly.
    const fn = state.data.firstName || (state.data.name ? state.data.name.split(/\s+/)[0] : '');
    const ln = state.data.lastName  || (state.data.name ? state.data.name.split(/\s+/).slice(1).join(' ') : '');
    const nameRow = `<div class="rxb-input-row">`
      + `<div class="rxb-field"><label class="rxb-label">First Name</label><input type="text" class="rxb-input" id="rxb-first-name" placeholder="John" value="${escapeHtml(fn)}" autocomplete="given-name"></div>`
      + `<div class="rxb-field"><label class="rxb-label">Last Name</label><input type="text" class="rxb-input" id="rxb-last-name" placeholder="Smith" value="${escapeHtml(ln)}" autocomplete="family-name"></div>`
      + `</div>`;
    return `<div class="rxb-card"><div class="rxb-card-title">${title}</div><div class="rxb-card-subtitle">${subtitle}</div>${errorHtml}${zipWarning}${nameRow}<div class="rxb-field"><label class="rxb-label">Phone Number</label><input type="tel" class="rxb-input" id="rxb-contact-phone" placeholder="(720) 555-1234" value="${formatPhone(state.data.phone)}" maxlength="14" autocomplete="tel"></div><div class="rxb-field"><label class="rxb-label">Email Address</label><input type="email" class="rxb-input" id="rxb-email" placeholder="john@example.com" value="${escapeHtml(state.data.email || '')}" autocomplete="email"></div>${zipField}${renderNav(true, true)}</div>`;
  }

  function renderMessage() {
    if (state.loading) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Sending your message...</div></div></div>`;
    }
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    return `<div class="rxb-card"><div class="rxb-card-title">Your Message</div><div class="rxb-card-subtitle">What would you like to tell our office?</div>${errorHtml}<div class="rxb-field"><label class="rxb-label">Message</label><textarea class="rxb-textarea" id="rxb-message" placeholder="Type your message or request here..." style="min-height: 120px;">${state.data.message || ''}</textarea></div><label class="rxb-consent"><input type="checkbox" id="rxb-tcpa" ${state.data._tcpaConsent ? 'checked' : ''}><span class="rxb-consent-text">By submitting this form you consent to receive SMS and email messages from ${CONFIG.companyName} at the number and email provided. Consent is not a condition of purchase. Msg &amp; data rates may apply.</span></label><div class="rxb-nav" style="border-top:none; margin-top:24px; padding-top:0;"><button class="rxb-back-btn" data-action="back">\u2190 Back</button><button class="rxb-next-btn" data-action="submit-message">Send Message \u2709</button></div></div>`;
  }

  function renderPccAsk() {
    const options = [
      { value: 'yes', icon: '\u2B50', label: 'Yes, I\'m a Member', desc: 'Schedule my included maintenance' },
      { value: 'no', icon: '\u274C', label: 'No', desc: 'Continue with regular maintenance' }
    ];
    return `<div class="rxb-card"><div class="rxb-card-title">Priority Comfort Club</div><div class="rxb-card-subtitle">Are you a Priority Comfort Club member?</div><div class="rxb-options">${options.map(o => `<button class="rxb-option-btn${state.data.isPccMember === (o.value === 'yes') ? ' selected' : ''}" data-action="select-pcc" data-value="${o.value}"><div class="rxb-option-icon">${o.icon}</div><div><div class="rxb-option-label">${o.label}</div><div class="rxb-option-desc">${o.desc}</div></div></button>`).join('')}</div>${renderNav(true, false)}</div>`;
  }

  function renderPccType() {
    const options = [
      { value: 'cooling', icon: '\u2744\uFE0F', label: 'Cooling (A/C)', desc: 'Air conditioner maintenance' },
      { value: 'heating', icon: '\uD83D\uDD25', label: 'Heating (Furnace)', desc: 'Furnace maintenance' }
    ];
    return `<div class="rxb-card"><div class="rxb-card-title">Which Maintenance?</div><div class="rxb-card-subtitle">Select the maintenance you'd like to schedule</div><div class="rxb-options">${options.map(o => `<button class="rxb-option-btn${state.data.pccType === o.value ? ' selected' : ''}" data-action="select-pcc-type" data-value="${o.value}"><div class="rxb-option-icon">${o.icon}</div><div><div class="rxb-option-label">${o.label}</div><div class="rxb-option-desc">${o.desc}</div></div></button>`).join('')}</div>${renderNav(true, false)}</div>`;
  }

  function renderConfirm() {
    if (state.loading) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Confirming your appointment...</div></div></div>`;
    }
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    const d = state.data;
    const slotDay = state.availability?.availableDays?.find(day => day.date === d.selectedDate);
    const dateDisplay = slotDay ? slotDay.displayDate : d.selectedDate;
    const timeDisplay = d.selectedSlot?.formatted || '';
    const serviceLabels = { repair: 'System Not Working', estimate: 'Free Estimate', maintenance: 'Maintenance' };
    let serviceDisplay = serviceLabels[d.serviceType] || d.serviceType;
    if (d.isPccMember && d.pccType) {
      serviceDisplay = d.pccType === 'cooling' ? 'PCC A/C Maintenance (included)' : 'PCC Furnace Maintenance (included)';
    }
    const ageLabels = { '0-2': '0\u20132 Years', '3-10': '3\u201310 Years', '10+': '10+ Years' };
    let addressStr = '';
    if (d.address && d.address.street) { addressStr = `${d.address.street}, ${d.address.city}, ${d.address.state} ${d.address.zip}`; }
    else if (d.customer?.address) { const ca = d.customer.address; addressStr = `${ca.street}, ${ca.city}`; }

    return `<div class="rxb-card"><div class="rxb-card-title">Review & Confirm</div><div class="rxb-card-subtitle">Make sure everything looks right</div>${errorHtml}<div class="rxb-summary"><div class="rxb-summary-row"><span class="rxb-summary-label">Service</span><span class="rxb-summary-value">${serviceLabels[d.serviceType] || d.serviceType}</span></div><div class="rxb-summary-row"><span class="rxb-summary-label">Date & Time</span><span class="rxb-summary-value">${dateDisplay} at ${timeDisplay}</span></div><div class="rxb-summary-row"><span class="rxb-summary-label">System Age</span><span class="rxb-summary-value">${ageLabels[d.systemAge] || d.systemAge}</span></div>${d.issue ? `<div class="rxb-summary-row"><span class="rxb-summary-label">Issue</span><span class="rxb-summary-value" style="max-width:60%">${escapeHtml(d.issue)}</span></div>` : ''}<div class="rxb-summary-row"><span class="rxb-summary-label">Name</span><span class="rxb-summary-value">${escapeHtml(d.name)}</span></div>${d.phone ? `<div class="rxb-summary-row"><span class="rxb-summary-label">Phone</span><span class="rxb-summary-value">${formatPhone(d.phone)}</span></div>` : ''}${addressStr ? `<div class="rxb-summary-row"><span class="rxb-summary-label">Address</span><span class="rxb-summary-value" style="max-width:60%">${escapeHtml(addressStr)}</span></div>` : ''}</div><label class="rxb-consent"><input type="checkbox" id="rxb-tcpa" ${state.data._tcpaConsent ? 'checked' : ''}><span class="rxb-consent-text">By submitting this form you consent to receive SMS and email messages from ${CONFIG.companyName} at the number and email provided. Consent is not a condition of purchase. Msg &amp; data rates may apply.</span></label><div class="rxb-nav" style="border-top:none; margin-top:24px; padding-top:0;"><button class="rxb-back-btn" data-action="back">\u2190 Back</button><button class="rxb-next-btn" data-action="confirm-booking">Confirm Booking \u2714</button></div></div>`;
  }

  function renderSuccess() {
    const c = state.confirmation;
    // Message success
    if (c && c.type === 'message') {
      return `<div class="rxb-card"><div class="rxb-success"><div class="rxb-success-icon">\u2709</div><h3>Message Sent!</h3><p>Your message has been delivered to our office.</p><p style="margin-top:12px; font-size:14px; color:${THEME.colors.textSecondary}">Someone from our team will follow up with you soon.</p><p style="margin-top:24px; font-size:13px; color:${THEME.colors.textMuted}">Questions? Call us at <strong>${CONFIG.companyPhone}</strong></p></div></div>`;
    }
    // Booking success
    return `<div class="rxb-card"><div class="rxb-success"><div class="rxb-success-icon">\u2714</div><h3>You're All Set!</h3><p>Your appointment has been confirmed.</p>${c ? `<div style="margin-top:20px; text-align:left;"><div class="rxb-summary"><div class="rxb-summary-row"><span class="rxb-summary-label">Service</span><span class="rxb-summary-value">${escapeHtml(c.service)}</span></div><div class="rxb-summary-row"><span class="rxb-summary-label">Date</span><span class="rxb-summary-value">${escapeHtml(c.date)}</span></div><div class="rxb-summary-row"><span class="rxb-summary-label">Time</span><span class="rxb-summary-value">${escapeHtml(c.time)}</span></div></div></div>` : ''}<p style="margin-top:24px; font-size:13px; color:${THEME.colors.textMuted}">Questions? Call us at <strong>${CONFIG.companyPhone}</strong></p></div></div>`;
  }

  function renderNav(showBack, showNext) {
    const isFirst = state.currentStep === STEPS.SERVICE_TYPE;
    return `<div class="rxb-nav">${showBack && !isFirst ? '<button class="rxb-back-btn" data-action="back">\u2190 Back</button>' : '<div></div>'}${showNext ? '<button class="rxb-next-btn" data-action="next">Continue \u2192</button>' : '<div></div>'}</div>`;
  }

  // ============================================================
  // RESCHEDULE MODE RENDER FUNCTIONS (v1.12)
  // ============================================================
  // Each renders one step in the reschedule flow. They all use the same
  // .rxb-card / .rxb-success / .rxb-error CSS classes as the booking
  // flow so visual consistency is preserved with no shared code coupling.

  /**
   * RESCHEDULE_LOAD step. Three sub-states:
   *   1. Initial loading (state.loading=true, no _rescheduleContext yet) → spinner
   *   2. Already-rescheduled (context.state.alreadyRescheduled=true) → special card
   *      with the new time + buttons "Pick a new time" / "No, keep this one"
   *   3. Briefly visible if context loaded but transitioning to RESCHEDULE_CALENDAR.
   *      Defensive fallback shows spinner.
   */
  function renderRescheduleLoad() {
    const C = THEME.colors;
    const officePhone = (state._rescheduleContext && state._rescheduleContext.config && state._rescheduleContext.config.officePhone) || CONFIG.companyPhone;

    if (state.loading || !state._rescheduleContext) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Loading your appointment...</div></div></div>`;
    }

    const ctx = state._rescheduleContext;
    const firstName = (ctx.customer && ctx.customer.firstName) || '';
    const tz = (ctx.config && ctx.config.timezone) || 'America/Denver';

    // Already-rescheduled card. The token stays valid for 60 days so they
    // CAN move it again, but we want to make sure they know they already
    // moved it and don't accidentally re-pick the same time thinking it's
    // the original slot.
    if (ctx.state && ctx.state.alreadyRescheduled) {
      const newStartLabel = ctx.state.newScheduledStart
        ? formatRescheduleDateTime(ctx.state.newScheduledStart, tz)
        : 'your new time';
      const greeting = firstName ? `Hi ${escapeHtml(firstName)}!` : 'Hi there!';
      return `<div class="rxb-card">`
        + `<div class="rxb-card-title">${greeting}</div>`
        + `<div class="rxb-card-subtitle">You've already moved this appointment.</div>`
        + `<div class="rxb-from-card">`
        +   `<h4>Your appointment is currently scheduled for:</h4>`
        +   `<p><strong>${escapeHtml(newStartLabel)}</strong></p>`
        + `</div>`
        + `<p style="font-size:14px;color:${C.textSecondary};line-height:1.6">Need to change it again? You can pick another time below.</p>`
        + `<div class="rxb-btn-row">`
        +   `<button class="rxb-btn-secondary" data-action="reschedule-keep-current">No, keep this one</button>`
        +   `<button class="rxb-next-btn" data-action="reschedule-pick-new-time">Pick a new time</button>`
        + `</div>`
        + `<p style="margin-top:20px;font-size:13px;color:${C.textMuted};text-align:center">Questions? Call us at <strong>${officePhone}</strong></p>`
        + `</div>`;
    }

    // Defensive fallback — context loaded, not already-rescheduled, but
    // somehow still on RESCHEDULE_LOAD. loadRescheduleAvailability should
    // have moved us to RESCHEDULE_CALENDAR by now.
    return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Loading available times...</div></div></div>`;
  }

  /**
   * RESCHEDULE_CALENDAR step. Header card showing the original
   * appointment time + a calendar grid + slot grid + "Confirm New Time"
   * button. Reuses the same CSS classes as the booking calendar so styling
   * stays in lockstep, but the surrounding logic is reschedule-specific
   * (no pricing banner, no Saturday fee disclosure, no "book further out"
   * button, no progress bar).
   *
   * Toast: if state._rescheduleToast is set (e.g., after a 409 race
   * condition refetched availability), shown at the top of the card.
   * Auto-clears 5 seconds after it was shown via setTimeout.
   */
  function renderRescheduleCalendar() {
    const C = THEME.colors;

    if (state.loading) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Looking up available times...</div></div></div>`;
    }

    const ctx = state._rescheduleContext || {};
    const firstName = (ctx.customer && ctx.customer.firstName) || '';
    const tz = (ctx.config && ctx.config.timezone) || 'America/Denver';
    const currentStartISO = (ctx.appointment && ctx.appointment.currentStartISO) || (ctx.appointment && ctx.appointment.originalStartISO);
    const currentLabel = currentStartISO ? formatRescheduleDateTime(currentStartISO, tz) : 'your appointment';
    const greetingText = firstName ? `Hi ${escapeHtml(firstName)}, ` : '';

    const fromCardHtml = `<div class="rxb-from-card">`
      + `<h4>${greetingText}let's move your appointment.</h4>`
      + `<p>Currently scheduled for: <strong>${escapeHtml(currentLabel)}</strong></p>`
      + `</div>`;

    const toastHtml = state._rescheduleToast
      ? `<div class="rxb-toast"><span class="rxb-toast-icon">\u26A0\uFE0F</span><span>${escapeHtml(state._rescheduleToast)}</span></div>`
      : '';

    const errorHtml = state.error ? `<div class="rxb-error">${escapeHtml(state.error)}</div>` : '';

    if (!state.availability || !state.availability.availableDays || state.availability.availableDays.length === 0) {
      const officePhone = (ctx.config && ctx.config.officePhone) || CONFIG.companyPhone;
      return `<div class="rxb-card">`
        + fromCardHtml
        + toastHtml
        + errorHtml
        + `<div style="text-align:center;padding:30px 0">`
        +   `<p style="font-size:16px;margin-bottom:12px">No available times found in the next ${(ctx.config && ctx.config.maxDaysAhead) || 30} days.</p>`
        +   `<p style="font-size:14px;color:${C.textSecondary}">Please call us at <strong>${officePhone}</strong> and we'll find a time that works.</p>`
        + `</div>`
        + `</div>`;
    }

    const availDates = new Set(state.availability.availableDays.map(d => d.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const calMonth = (typeof state._calMonth === 'number') ? state._calMonth : today.getMonth();
    const calYear = (typeof state._calYear === 'number') ? state._calYear : today.getFullYear();
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let daysHtml = '';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => { daysHtml += `<div class="rxb-cal-dow">${d}</div>`; });
    for (let i = 0; i < startDow; i++) { daysHtml += '<div class="rxb-cal-day empty"></div>'; }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(calYear, calMonth, d);
      const dateStr = dateObj.toISOString().split('T')[0];
      const isPast = dateObj < today;
      const isToday = dateObj.getTime() === today.getTime();
      const isAvail = availDates.has(dateStr);
      const isSelected = state.data.selectedDate === dateStr;
      let cls = 'rxb-cal-day';
      if (isPast) cls += ' past';
      if (isToday) cls += ' today';
      if (isAvail && !isPast) cls += ' available';
      if (isSelected) cls += ' selected';
      const clickable = isAvail && !isPast;
      daysHtml += `<button class="${cls}" ${clickable ? `data-action="select-date" data-value="${dateStr}"` : 'disabled'}>${d}</button>`;
    }

    let slotsHtml = '';
    if (state.data.selectedDate) {
      const dayData = state.availability.availableDays.find(d => d.date === state.data.selectedDate);
      if (dayData && dayData.slots.length > 0) {
        const seen = new Set();
        const uniqueSlots = [];
        for (let i = 0; i < dayData.slots.length; i++) {
          const s = dayData.slots[i];
          const key = s.start instanceof Date ? s.start.toISOString() : String(s.start);
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSlots.push({ ...s, originalIdx: i });
          }
        }
        uniqueSlots.sort((a, b) => new Date(a.start) - new Date(b.start));
        const shortLabel = (s) => {
          try {
            const st = new Date(s.start);
            const en = new Date(s.end);
            const fmt = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
            return fmt(st) + ' - ' + fmt(en);
          } catch (e) { return s.formatted || ''; }
        };
        slotsHtml = `<div class="rxb-slots">`
          + `<div class="rxb-slots-title">Available times for ${dayData.displayDate}</div>`
          + `<div class="rxb-slots-grid">${uniqueSlots.map(s => {
              const selected = state.data.selectedSlot && state.data.selectedSlot.start && new Date(state.data.selectedSlot.start).getTime() === new Date(s.start).getTime();
              return `<button class="rxb-slot-btn${selected ? ' selected' : ''}" data-action="select-slot" data-idx="${s.originalIdx}">${shortLabel(s)}</button>`;
            }).join('')}</div>`
          + `</div>`;
      }
    }

    const maxDaysAhead = (ctx.config && ctx.config.maxDaysAhead) || 30;
    const canPrev = calMonth > today.getMonth() || calYear > today.getFullYear();
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + maxDaysAhead);
    const canNext = new Date(calYear, calMonth + 1, 1) <= maxDate;

    const canConfirm = !!state.data.selectedSlot;
    const confirmBtnHtml = `<div class="rxb-nav" style="border-top:none;margin-top:24px;padding-top:0">`
      + `<div></div>`
      + `<button class="rxb-next-btn" data-action="reschedule-confirm" ${canConfirm ? '' : 'disabled'}>Confirm New Time \u2714</button>`
      + `</div>`;

    return `<div class="rxb-card">`
      + fromCardHtml
      + toastHtml
      + errorHtml
      + `<div class="rxb-calendar">`
      +   `<div class="rxb-cal-header">`
      +     `<button class="rxb-cal-nav-btn" data-action="cal-prev" ${!canPrev ? 'disabled' : ''}>\u2039</button>`
      +     `<div class="rxb-cal-title">${monthName}</div>`
      +     `<button class="rxb-cal-nav-btn" data-action="cal-next" ${!canNext ? 'disabled' : ''}>\u203A</button>`
      +   `</div>`
      +   `<div class="rxb-cal-grid">${daysHtml}</div>`
      + `</div>`
      + slotsHtml
      + confirmBtnHtml
      + `</div>`;
  }

  /**
   * RESCHEDULE_SUCCESS — confirmation that the move succeeded.
   */
  function renderRescheduleSuccess() {
    const C = THEME.colors;
    const ctx = state._rescheduleContext || {};
    const tz = (ctx.config && ctx.config.timezone) || 'America/Denver';
    const officePhone = (ctx.config && ctx.config.officePhone) || CONFIG.companyPhone;
    const conf = state._rescheduleConfirmed || {};
    const newStartISO = conf.newStartISO || '';
    const newLabel = newStartISO ? formatRescheduleDateTime(newStartISO, tz) : 'your new time';

    return `<div class="rxb-card">`
      + `<div class="rxb-success">`
      +   `<div class="rxb-success-icon">\u2714</div>`
      +   `<h3>You're All Set!</h3>`
      +   `<p>Your appointment has been moved to:</p>`
      +   `<p style="margin-top:12px;font-size:18px;font-weight:600;color:${C.text}">${escapeHtml(newLabel)}</p>`
      +   `<p style="margin-top:18px;font-size:14px;color:${C.textSecondary}">We've notified our office. There's nothing else you need to do.</p>`
      +   `<p style="margin-top:24px;font-size:13px;color:${C.textMuted}">Questions? Call us at <strong>${officePhone}</strong></p>`
      + `</div>`
      + `</div>`;
  }

  /**
   * RESCHEDULE_FAIL — generic "this link can't be used right now —
   * please call us" card. Shown for ALL of: 401 (token bad), 410-passed
   * (appointment already happened), 500 (server bug), 502 (HCP failure),
   * 503 (DB outage). The customer doesn't need to know the technical
   * reason — the only useful action is "call the office", same in
   * every case.
   *
   * 409 (slot taken) is NOT a fail card — it's handled inline as a toast
   * + refetch in confirmReschedule(). Already-rescheduled is NOT an
   * error — it's a state from /load, rendered by renderRescheduleLoad().
   */
  function renderRescheduleFail() {
    const C = THEME.colors;
    const ctx = state._rescheduleContext || {};
    const officePhone = (ctx.config && ctx.config.officePhone) || CONFIG.companyPhone;
    const telHref = officePhone.replace(/\D/g, '');

    return `<div class="rxb-card">`
      + `<div class="rxb-success">`
      +   `<div class="rxb-success-icon" style="background:#FFF7ED;border-color:#FDBA74;color:#C2410C;font-size:26px">\u26A0\uFE0F</div>`
      +   `<h3>We Can't Update This Online Right Now</h3>`
      +   `<p style="color:${C.textSecondary}">This link can't be used to reschedule at the moment.</p>`
      +   `<p style="margin-top:18px;font-size:15px;color:${C.text}">Please give us a call and we'll get you taken care of:</p>`
      +   `<p style="margin-top:8px;font-size:22px;font-weight:700;color:${C.primary}"><a href="tel:${telHref}" style="color:inherit;text-decoration:none">${officePhone}</a></p>`
      + `</div>`
      + `</div>`;
  }

  /**
   * Format an ISO timestamp like "2026-05-06T15:00:00Z" into a friendly
   * "Wednesday, May 6 at 3:00 PM" string in the given timezone. Falls
   * back gracefully on bad input rather than showing "Invalid Date".
   */
  function formatRescheduleDateTime(iso, timezone) {
    try {
      const tz = timezone || 'America/Denver';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const dayPart = d.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: tz
      });
      const timePart = d.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', timeZone: tz
      });
      return `${dayPart} at ${timePart}`;
    } catch (e) {
      console.warn('[ROX Booking] formatRescheduleDateTime failed:', e.message);
      return '';
    }
  }

  /**
   * Transform the engine's flat /availability slots array into the
   * { availableDays: [{date, displayDate, dayOfWeek, slots: [...]}] }
   * shape the calendar render function expects. Dedupes by start time
   * within each day and sorts slots chronologically.
   *
   * Engine input shape: { startISO, endISO, techId, techName, dateISO }
   */
  function groupRescheduleSlots(flatSlots, timezone) {
    const tz = timezone || 'America/Denver';
    const byDate = new Map();

    for (const s of (flatSlots || [])) {
      if (!s || !s.startISO || !s.dateISO) continue;
      if (!byDate.has(s.dateISO)) byDate.set(s.dateISO, new Map());
      const dayMap = byDate.get(s.dateISO);
      if (!dayMap.has(s.startISO)) {
        const startDate = new Date(s.startISO);
        const endDate = new Date(s.endISO);
        if (isNaN(startDate.getTime())) continue;
        const fmt = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
        const formatted = !isNaN(endDate.getTime()) ? `${fmt(startDate)} - ${fmt(endDate)}` : fmt(startDate);
        dayMap.set(s.startISO, {
          start: startDate,
          end: !isNaN(endDate.getTime()) ? endDate : startDate,
          formatted,
          techId: s.techId || null,
          techName: s.techName || null
        });
      }
    }

    const availableDays = [];
    for (const [dateISO, dayMap] of byDate) {
      const slots = Array.from(dayMap.values()).sort((a, b) => a.start - b.start);
      const dateObj = new Date(dateISO + 'T12:00:00Z');
      const displayDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: tz
      });
      const dayOfWeek = dateObj.toLocaleDateString('en-US', {
        weekday: 'long', timeZone: tz
      });
      availableDays.push({ date: dateISO, displayDate, dayOfWeek, slots });
    }
    availableDays.sort((a, b) => a.date.localeCompare(b.date));
    return { availableDays };
  }

  /**
   * Show an ephemeral toast above the reschedule calendar. Auto-clears
   * after `durationMs` (default 5s). If a previous toast timer is still
   * running, it's cancelled so the new toast gets its own full duration.
   */
  function showRescheduleToast(message, durationMs) {
    const ms = typeof durationMs === 'number' ? durationMs : 5000;
    if (state._rescheduleToastTimer) {
      clearTimeout(state._rescheduleToastTimer);
      state._rescheduleToastTimer = null;
    }
    state._rescheduleToast = message;
    state._rescheduleToastTimer = setTimeout(() => {
      state._rescheduleToast = null;
      state._rescheduleToastTimer = null;
      // Re-render only if we're still on the calendar — if the user has
      // moved on to success/fail, the toast is irrelevant.
      if (state.currentStep === STEPS.RESCHEDULE_CALENDAR) render();
    }, ms);
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================
  function attachEvents() {
    root.querySelectorAll('[data-action]').forEach(el => { el.addEventListener('click', handleAction); });
    const phoneInput = root.querySelector('#rxb-phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        const digits = cleanPhoneDigits(e.target.value);
        state.data.phone = digits;
        e.target.value = formatPhone(digits);
        const btn = root.querySelector('[data-action="lookup-phone"]');
        if (btn) btn.disabled = digits.length < 10;
      });
    }
    const contactPhone = root.querySelector('#rxb-contact-phone');
    if (contactPhone) {
      contactPhone.addEventListener('input', (e) => {
        const digits = cleanPhoneDigits(e.target.value);
        state.data.phone = digits;
        e.target.value = formatPhone(digits);
      });
    }
    // Address autocomplete: debounced lookup on street field
    const streetInput = root.querySelector('#rxb-street');
    if (streetInput) {
      streetInput.addEventListener('input', (e) => {
        const val = e.target.value; // Do NOT trim — preserves spaces while typing
        state.data.address.street = val;
        state._addrPicked = false;
        if (_addrTimer) clearTimeout(_addrTimer);
        const trimmed = val.trim();
        if (trimmed.length < 3) { state._addrSuggestions = []; updateAddrDropdown(); return; }
        _addrTimer = setTimeout(() => fetchAddressSuggestions(trimmed), 350);
      });
      // Close dropdown on blur (after a short delay so clicks can register)
      streetInput.addEventListener('blur', () => {
        setTimeout(() => {
          state._addrSuggestions = [];
          state._addrLoading = false;
          updateAddrDropdown(); // Only update dropdown, not full render
        }, 250);
      });
    }
  }

  async function handleAction(e) {
    const action = e.currentTarget.dataset.action;
    const value = e.currentTarget.dataset.value;
    switch (action) {
      case 'select-service':
        state.data.serviceType = value;
        // Clear PCC data when switching service type — prevents stale PCC flags
        // from creating jobs as estimates (or vice versa)
        if (value !== 'maintenance') {
          state.data.isPccMember = null;
          state.data.pccType = null;
        }
        goToStep(STEPS.CUSTOMER_TYPE);
        break;
      case 'select-customer-type':
        state.data.customerType = value;
        if (state.data.serviceType === 'message') {
          state.path = value === 'existing' ? 'message_existing' : 'message_new';
          if (value === 'existing') { goToStep(STEPS.PHONE_LOOKUP); } else { goToStep(STEPS.CONTACT_INFO); }
        } else if (value === 'existing') {
          state.path = state.data.serviceType === 'maintenance' ? 'maint_existing' : 'existing';
          goToStep(STEPS.PHONE_LOOKUP);
        } else {
          // ALL new customers → QUICK_INFO first (name + phone)
          state.path = state.data.serviceType === 'maintenance' ? 'maint_new' : 'new';
          goToStep(STEPS.QUICK_INFO);
        }
        break;
      case 'lookup-phone':
        await lookupCustomer();
        break;
      case 'select-age':
        state.data.systemAge = value;
        await updateSession({ serviceType: state.data.serviceType, customerType: state.data.customerType, systemAge: value });
        // 0-2 year systems: ask if ROX installed before showing calendar
        // ROX installed = potential warranty = team handoff (no AI scheduling)
        if (value === '0-2') {
          goToStep(STEPS.ROX_INSTALLED);
        } else {
          goToStep(STEPS.CALENDAR);
          loadAvailability();
        }
        break;
      case 'rox-installed':
        await handleRoxInstalledAction(value);
        break;
      case 'select-date':
        state.data.selectedDate = value;
        state.data.selectedSlot = null;
        render();
        break;
      case 'select-slot':
        const dayData = state.availability.availableDays.find(d => d.date === state.data.selectedDate);
        if (dayData) { const idx = parseInt(e.currentTarget.dataset.idx); state.data.selectedSlot = dayData.slots[idx]; render(); }
        break;
      case 'cal-prev':
        if (!state._calMonth && state._calMonth !== 0) { state._calMonth = new Date().getMonth(); state._calYear = new Date().getFullYear(); }
        state._calMonth--;
        if (state._calMonth < 0) { state._calMonth = 11; state._calYear--; }
        render();
        break;
      case 'cal-next':
        if (!state._calMonth && state._calMonth !== 0) { state._calMonth = new Date().getMonth(); state._calYear = new Date().getFullYear(); }
        state._calMonth++;
        if (state._calMonth > 11) { state._calMonth = 0; state._calYear++; }
        render();
        break;
      case 'back': goBack(); break;
      case 'next': await goNext(); break;
      case 'pick-address':
        const addrIdx = parseInt(value);
        const suggestion = state._addrSuggestions?.[addrIdx];
        if (suggestion?.placeId) {
          state._addrPicked = true;
          state._addrSuggestions = [];
          state._addrLoading = true;
          render();
          const details = await fetchAddressDetails(suggestion.placeId);
          state._addrLoading = false;
          if (details) {
            state.data.address.street = details.street;
            state.data.address.city = details.city || '';
            state.data.address.state = details.state || 'CO';
            state.data.address.zip = details.zip || '';
            console.log('[ROX Booking] Address auto-filled:', details.formatted || details.street);
          } else {
            state.data.address.street = suggestion.mainText || suggestion.description?.split(',')[0] || '';
          }
          render();
        }
        break;
      case 'decline-estimate':
        // Customer wants to pivot to a free estimate after service declined
        state.data.serviceType = 'estimate';
        state.data.issue = state.data.issue || 'Replacement estimate';
        state.availability = null; // reset so the right tech tag is used
        state._declineMsg = null;
        state._declineOfferEstimate = false;
        state.path = state.data.customerType === 'existing' ? 'existing' : 'new';
        goToStep(STEPS.CALENDAR);
        loadAvailability();
        break;
      case 'decline-restart':
        // Customer doesn't want the estimate — restart from service select
        state._declineMsg = null;
        state._declineOfferEstimate = false;
        state.data.serviceType = null;
        state.data.systemAge = null;
        state.data.issue = '';
        state.availability = null;
        goToStep(STEPS.SERVICE_TYPE);
        break;
      case 'confirm-booking': await confirmBooking(); break;
      case 'submit-message': await submitMessage(); break;
      case 'select-pcc':
        if (value === 'yes') {
          state.data.isPccMember = true;
          state.path = state.data.customerType === 'existing' ? 'pcc_existing' : 'pcc_new';
          goToStep(STEPS.PCC_TYPE);
        } else {
          state.data.isPccMember = false;
          state.path = state.data.customerType === 'existing' ? 'maint_existing' : 'maint_new';
          goToStep(STEPS.SYSTEM_AGE);
        }
        break;
      case 'select-pcc-type':
        state.data.pccType = value; // 'cooling' or 'heating'
        state.data.issue = value === 'cooling'
          ? 'PCC Annual Maintenance - Cooling (A/C)'
          : 'PCC Annual Maintenance - Heating (Furnace)';
        await updateSession({ serviceType: 'maintenance', customerType: state.data.customerType, pccType: value, isPccMember: true });
        goToStep(STEPS.SYSTEM_AGE); // Ask system age for proper tech routing
        break;
      case 'book-further-out':
        // Switch to message flow — pre-fill with scheduling request context
        state.data.serviceType = 'message';
        state.data.message = `I'd like to schedule ${state.data.issue || state.data.serviceType || 'an appointment'} for a date beyond the next 4 weeks. Please contact me to arrange a time.`;
        if (state.data.customer || (state.data.name && state.data.phone)) {
          // Already have contact info → go straight to message
          state.path = state.data.customer ? 'message_existing' : 'message_new';
          goToStep(STEPS.MESSAGE);
        } else {
          // Need contact info first
          state.path = 'message_new';
          goToStep(STEPS.CONTACT_INFO);
        }
        break;
      // ── v1.12 RESCHEDULE MODE ACTIONS ────────────────────────────
      case 'reschedule-pick-new-time':
        // Customer was on the "already rescheduled" card and chose to
        // change the time again. Clear any prior selections and load
        // availability fresh.
        state.data.selectedDate = null;
        state.data.selectedSlot = null;
        loadRescheduleAvailability();
        break;
      case 'reschedule-keep-current':
        // Customer was on the "already rescheduled" card and chose to
        // keep the existing rescheduled time. Reuse the success card
        // with the already-rescheduled timestamp so it reads as a clean
        // confirmation.
        if (state._rescheduleContext && state._rescheduleContext.state && state._rescheduleContext.state.newScheduledStart) {
          state._rescheduleConfirmed = {
            jobId: state._rescheduleContext.appointment ? state._rescheduleContext.appointment.jobId : null,
            newStartISO: state._rescheduleContext.state.newScheduledStart,
            newEndISO: null
          };
        }
        state.currentStep = STEPS.RESCHEDULE_SUCCESS;
        render();
        break;
      case 'reschedule-confirm':
        await confirmReschedule();
        break;
    }
  }

  // ============================================
  // NAVIGATION
  // ============================================
  function goToStep(step) { state.currentStep = step; state.error = null; render(); }

  function goBack() {
    const flow = STEP_FLOW[state.path || 'new'];
    const idx = flow.indexOf(state.currentStep);
    if (idx > 0) { state.currentStep = flow[idx - 1]; state.error = null; render(); }
  }

  async function goNext() {
    saveFormData();
    const flow = STEP_FLOW[state.path || 'new'];
    const idx = flow.indexOf(state.currentStep);
    if (!validateStep()) return;

    // Push name + phone to server immediately after QUICK_INFO
    // so abandon emails have contact info if customer leaves later.
    // v1.11 — also send firstName + lastName as separate fields so the
    // server-side abandon email can guarantee a full name in the subject
    // even if the combined `name` field somehow only holds the first half.
    if (state.currentStep === STEPS.QUICK_INFO) {
      updateSession({
        name:      state.data.name,
        firstName: state.data.firstName,
        lastName:  state.data.lastName,
        phone:     state.data.phone
      });
    }

    // Declined-service checks at DESCRIBE_ISSUE step
    // Client-side duct cleaning and server-side water heater 10+ decline
    if (state.currentStep === STEPS.DESCRIBE_ISSUE && state.data.issue) {
      const lower = state.data.issue.toLowerCase();

      // Duct cleaning (client-side — no server round-trip needed)
      if (/\b(duct\s*clean|air\s*duct\s*clean|ductwork\s*clean)\b/.test(lower) ||
          (lower.includes('clean') && lower.includes('duct'))) {
        state._declineMsg = "We don't offer duct cleaning services at this time. Please call " + CONFIG.companyPhone + " if you have questions.";
        state._declineOfferEstimate = false;
        goToStep(STEPS.DECLINED);
        return;
      }

      // Water heater 10+ yr repair (server-side — checks issue + systemAge together)
      if (state.data.serviceType === 'repair' && state.data.systemAge === '10+') {
        const result = await updateSession({ issue: state.data.issue });
        if (result && result.declined === 'water_heater_10plus') {
          state._declineMsg = result.declineMessage || "We're unable to service water heaters over 10 years old. Manufacturers recommend replacing them every 10\u201312 years.";
          state._declineOfferEstimate = result.offerEstimate || false;
          goToStep(STEPS.DECLINED);
          return;
        }
      }
    }

    if (idx < flow.length - 1) {
      const nextStep = flow[idx + 1];
      state.currentStep = nextStep;
      state.error = null;
      if (nextStep === STEPS.CALENDAR && !state.availability) { loadAvailability(); }
      render();
    }
  }

  function saveFormData() {
    const issue = root.querySelector('#rxb-issue');
    if (issue) state.data.issue = issue.value.trim();
    const message = root.querySelector('#rxb-message');
    if (message) state.data.message = message.value.trim();
    const street = root.querySelector('#rxb-street');
    if (street) state.data.address.street = street.value.trim();
    const city = root.querySelector('#rxb-city');
    if (city) state.data.address.city = city.value.trim();
    const zip = root.querySelector('#rxb-zip');
    if (zip) state.data.address.zip = zip.value.trim();
    // v1.10 — read First Name + Last Name from the split fields and combine
    // into state.data.name (preserved as a single string for back-compat with
    // server-side code that does data.name.split(' ')). Falls back to the old
    // #rxb-name selector for any code path that still uses the single field
    // (none in v1.10, but kept defensively).
    const firstNameEl = root.querySelector('#rxb-first-name');
    const lastNameEl  = root.querySelector('#rxb-last-name');
    if (firstNameEl) state.data.firstName = firstNameEl.value.trim();
    if (lastNameEl)  state.data.lastName  = lastNameEl.value.trim();
    if (firstNameEl || lastNameEl) {
      // Combine — handles edge case where only one half is filled in
      state.data.name = `${state.data.firstName} ${state.data.lastName}`.trim();
    }
    // Defensive fallback for any legacy single-field name input
    const name = root.querySelector('#rxb-name');
    if (name) state.data.name = name.value.trim();
    const email = root.querySelector('#rxb-email');
    if (email) state.data.email = email.value.trim();
    const contactPhone = root.querySelector('#rxb-contact-phone');
    if (contactPhone) state.data.phone = cleanPhoneDigits(contactPhone.value);
    const tcpa = root.querySelector('#rxb-tcpa');
    if (tcpa) state.data._tcpaConsent = tcpa.checked;
  }

  function validateStep() {
    switch (state.currentStep) {
      case STEPS.PHONE_LOOKUP:
        if (!state.data.customer && !state.data.phone) { state.error = 'Please enter your phone number.'; render(); return false; }
        return !!state.data.customer;
      case STEPS.QUICK_INFO:
        // v1.10 — validate first AND last name separately so customers
        // can't slip through with just a first name. Both must be at
        // least 1 character. Mirrors the HCP customer-creation contract
        // which expects both first_name and last_name.
        if (!state.data.firstName || state.data.firstName.trim().length < 1) { state.error = 'Please enter your first name.'; render(); return false; }
        if (!state.data.lastName  || state.data.lastName.trim().length  < 1) { state.error = 'Please enter your last name.';  render(); return false; }
        if (!state.data.phone || state.data.phone.length < 10) { state.error = 'Please enter a valid phone number.'; render(); return false; }
        if (!state.data._tcpaConsent) { state.error = 'Please check the consent box to continue.'; render(); return false; }
        return true;
      case STEPS.CALENDAR:
        if (!state.data.selectedSlot) { state.error = 'Please select a date and time slot.'; render(); return false; }
        return true;
      case STEPS.ADDRESS:
        if (!state.data.address.street || !state.data.address.city || !state.data.address.zip) { state.error = 'Please fill in your complete address.'; render(); return false; }
        if (state.data.address.zip.length < 5) { state.error = 'Please enter a valid 5-digit zip code.'; render(); return false; }
        // Zip confirmation — first time out-of-area, warn and let them fix
        if (!state.data._zipConfirmed && !SERVICE_AREA_ZIPS.has(state.data.address.zip)) {
          state._zipWarning = true;
          state.data._zipConfirmed = true; // Let them proceed on second attempt
          state.error = `We don't currently service the ${state.data.address.zip} area. If this zip code is correct, click Continue again. Otherwise, please update it.`;
          render(); return false;
        }
        state._zipWarning = false;
        return true;
      case STEPS.CONTACT_INFO:
        // v1.10 — same first + last validation as QUICK_INFO. CONTACT_INFO
        // is reached by message-flow new customers (and as a confirmation
        // step for booking new customers), so the name fields must be
        // captured cleanly here too.
        if (!state.data.firstName || state.data.firstName.trim().length < 1) { state.error = 'Please enter your first name.'; render(); return false; }
        if (!state.data.lastName  || state.data.lastName.trim().length  < 1) { state.error = 'Please enter your last name.';  render(); return false; }
        if (!state.data.phone || state.data.phone.length < 10) { state.error = 'Please enter a valid phone number.'; render(); return false; }
        if (!state.data.email || !state.data.email.includes('@') || !state.data.email.includes('.')) { state.error = 'Please enter a valid email address.'; render(); return false; }
        // Message flow: validate zip on contact info
        if (state.data.serviceType === 'message') {
          if (!state.data.address.zip || state.data.address.zip.length < 5) { state.error = 'Please enter your 5-digit zip code.'; render(); return false; }
          if (!state.data._zipConfirmed && !SERVICE_AREA_ZIPS.has(state.data.address.zip)) {
            state._zipWarning = true;
            state.data._zipConfirmed = true;
            state.error = `We don't currently service the ${state.data.address.zip} area. If this zip code is correct, click Continue again. Otherwise, please update it.`;
            render(); return false;
          }
          state._zipWarning = false;
        }
        return true;
      case STEPS.MESSAGE:
        if (!state.data.message || state.data.message.length < 3) { state.error = 'Please enter your message.'; render(); return false; }
        return true;
      default: return true;
    }
  }

  // ============================================
  // API ACTIONS
  // ============================================
  async function startSession() {
    try {
      const result = await api('POST', '/start', { tenantId: CONFIG.tenantId });
      state.sessionId = result.sessionId;
      // Capture after-hours status so the widget can show a note
      state._isAfterHours = result.isAfterHours || false;
      state._isSunday     = result.isSunday     || false;
      console.log(`[ROX Booking] Session started: ${state.sessionId} (afterHours=${state._isAfterHours})`);
    } catch (err) { console.error('[ROX Booking] Failed to start session:', err.message); }
  }

  async function lookupCustomer() {
    state.loading = true; state.error = null; render();
    try {
      const result = await api('POST', '/lookup-customer', { sessionId: state.sessionId, phone: state.data.phone });
      state.loading = false;
      if (result.found) {
        state.data.customer = result.customer;
        state.data.name = result.customer.name || '';
        state.data.email = result.customer.email || '';
        if (result.customer.address) { state.data.address = result.customer.address; }
        // Message flow: skip straight to message
        if (state.data.serviceType === 'message') {
          goToStep(STEPS.MESSAGE);
          return;
        }
        // Maintenance existing: go to PCC question
        if (state.data.serviceType === 'maintenance') {
          goToStep(STEPS.PCC_ASK);
          return;
        }
        render();
      } else {
        // Not found → switch to new customer flow
        switchToNewCustomer("Sorry, we weren't able to locate that number. No worries — we'll get you set up!");
      }
    } catch (err) {
      state.loading = false;
      // API error → switch to new customer flow
      switchToNewCustomer("We had trouble looking up your account, but no worries — let's get you set up!");
    }
  }

  // Gracefully switch from existing → new customer when phone lookup fails
  function switchToNewCustomer(message) {
    state.data.customerType = 'new';
    state.loading = false;
    state.error = message;
    if (state.data.serviceType === 'message') {
      state.path = 'message_new';
      goToStep(STEPS.CONTACT_INFO);
    } else {
      // Go to QUICK_INFO — phone is pre-filled from lookup attempt, just need name
      state.path = state.data.serviceType === 'maintenance' ? 'maint_new' : 'new';
      goToStep(STEPS.QUICK_INFO);
    }
  }

  // Fetch 16-day forecast from Open-Meteo (free, no API key)
  // Denver coordinates: 39.74, -104.99
  // Fire-and-forget: weather is nice-to-have, not blocking
  async function loadWeather() {
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=39.74&longitude=-104.99&daily=temperature_2m_max&temperature_unit=fahrenheit&timezone=America/Denver&forecast_days=16');
      if (!res.ok) return;
      const data = await res.json();
      if (data.daily?.time && data.daily?.temperature_2m_max) {
        const weather = {};
        for (let i = 0; i < data.daily.time.length; i++) {
          weather[data.daily.time[i]] = Math.round(data.daily.temperature_2m_max[i]);
        }
        state._weather = weather;
        // Re-render if calendar is already showing
        if (state.currentStep === STEPS.CALENDAR && !state.loading) render();
      }
    } catch (e) {
      // Weather is optional — fail silently
      console.warn('[ROX Booking] Weather fetch failed:', e.message);
    }
  }

  async function loadAvailability() {
    state.loading = true; state.error = null; render();
    // Fetch weather in background (non-blocking)
    if (!state._weather) loadWeather();
    try {
      let tag = 'service tech 3-10'; // Default for 3-10 year repairs
      if (state.data.serviceType === 'maintenance') {
        tag = state.data.systemAge === '10+' ? 'sales tech' : 'maintenance tech';
      }
      else if (state.data.serviceType === 'estimate') tag = 'sales';
      else if (state.data.systemAge === '10+') tag = 'sales tech';
      else if (state.data.systemAge === '0-2') tag = 'service tech';
      const result = await apiGet('/availability', { sessionId: state.sessionId, tag: tag, days: '28' });
      state.availability = result;
      state.loading = false;
      if (result.availableDays && result.availableDays.length > 0) {
        const firstDate = new Date(result.availableDays[0].date + 'T12:00:00');
        state._calMonth = firstDate.getMonth();
        state._calYear = firstDate.getFullYear();
      }
      render();
    } catch (err) { state.loading = false; state.error = 'Failed to load available times. Please try again or call ' + CONFIG.companyPhone; render(); }
  }

  async function updateSession(updates) {
    try {
      const result = await api('POST', '/update-session', { sessionId: state.sessionId, updates, step: state.currentStep });
      return result;
    }
    catch (err) { console.warn('[ROX Booking] Session update failed:', err.message); return null; }
  }

  async function confirmBooking() {
    saveFormData();
    // v1.9 — TCPA consent gate. Must be checked before booking can
    // be submitted. New customers may have already checked this on
    // QUICK_INFO (state persists across steps); existing customers
    // and re-bookings see it for the first time on the Confirm step.
    if (!state.data._tcpaConsent) { state.error = 'Please check the consent box to continue.'; render(); return; }
    state.loading = true; state.error = null; render();
    try {
      // v1.11 — include firstName + lastName so the server can store them on
      // the session for use in the abandon email if the customer never reaches
      // the success screen but the session expires later.
      await updateSession({
        serviceType:  state.data.serviceType,
        customerType: state.data.customerType,
        systemAge:    state.data.systemAge,
        selectedDate: state.data.selectedDate,
        selectedSlot: state.data.selectedSlot,
        issue:        state.data.issue,
        name:         state.data.name,
        firstName:    state.data.firstName,
        lastName:     state.data.lastName,
        phone:        state.data.phone,
        email:        state.data.email,
        address:      state.data.address,
        isPccMember:  state.data.isPccMember || false,
        pccType:      state.data.pccType || null
      });
      const result = await api('POST', '/confirm', { sessionId: state.sessionId });
      state.loading = false;
      if (result.success) { state.confirmation = result.confirmation; state.currentStep = STEPS.SUCCESS; render(); }
      else { state.error = result.message || 'Failed to confirm booking. Please call ' + CONFIG.companyPhone; render(); }
    } catch (err) { state.loading = false; state.error = 'Something went wrong. Please call ' + CONFIG.companyPhone + ' to complete your booking.'; render(); }
  }

  async function submitMessage() {
    saveFormData();
    if (!state.data.message || state.data.message.length < 3) { state.error = 'Please enter your message.'; render(); return; }
    // v1.9 — TCPA consent gate. Same field as the Confirm flow; new
    // customers see it here on the Message step (they bypass QUICK_INFO
    // when sending a message instead of booking).
    if (!state.data._tcpaConsent) { state.error = 'Please check the consent box to continue.'; render(); return; }
    state.loading = true; state.error = null; render();
    try {
      // v1.11 — send firstName + lastName as separate fields so the
      // server's `/message` endpoint can guarantee a full name in the
      // email subject even if `name` somehow only has the first half.
      const result = await api('POST', '/message', {
        sessionId:    state.sessionId,
        name:         state.data.name,
        firstName:    state.data.firstName,
        lastName:     state.data.lastName,
        phone:        state.data.phone,
        email:        state.data.email,
        zip:          state.data.address.zip,
        message:      state.data.message,
        customerType: state.data.customerType,
        customerId:   state.data.customer?.id || null
      });
      state.loading = false;
      if (result.success) {
        state.confirmation = { type: 'message' };
        state.currentStep = STEPS.SUCCESS;
        render();
      } else {
        state.error = result.error || 'Failed to send message. Please call ' + CONFIG.companyPhone;
        render();
      }
    } catch (err) {
      state.loading = false;
      state.error = 'Something went wrong. Please call ' + CONFIG.companyPhone;
      render();
    }
  }

  // ============================================
  // RESCHEDULE API ACTIONS (v1.12)
  // ============================================

  /**
   * Pull the ?token=<HMAC> from the page URL. Returns null if absent or
   * empty. Called once at init() to decide whether to enter reschedule
   * mode or run the booking wizard.
   */
  function getTokenFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      return (token && token.length > 0) ? token : null;
    } catch (e) {
      console.warn('[ROX Booking] getTokenFromUrl failed:', e.message);
      return null;
    }
  }

  /**
   * Fire-and-forget climatology prewarm. Runs at mount time so the
   * calendar's first /availability call doesn't pay the cold-cache cost
   * for 14+ Open-Meteo archive lookups. Server returns 202 immediately;
   * the actual work happens in the background. Failure is logged but
   * never propagated — prewarm is a pure optimization.
   */
  function prewarmReschedule() {
    try {
      // No await — we don't block the user on this. Use .catch so an
      // unhandled rejection doesn't surface in the browser console.
      apiReschedule('POST', '/prewarm', { daysAhead: 30 }).catch(err => {
        console.warn('[ROX Booking] Prewarm failed (non-fatal):', err.message || err);
      });
    } catch (e) {
      console.warn('[ROX Booking] Prewarm threw (non-fatal):', e.message);
    }
  }

  /**
   * Map an error from apiReschedule() to the right failure mode and
   * step. Per locked v2.12.0 design, statuses 401/410-passed/500/502/503
   * all render the SAME generic "call us" card — only 409 (slot taken)
   * gets special handling, and that's done inline at the call site
   * (confirmReschedule) rather than here.
   *
   * Logs the status + error code (without the token, which is in the
   * URL but never in our logs) so Railway logs can distinguish customer
   * issues from server issues.
   */
  function mapRescheduleErrorToFail(err) {
    const status = err && err.status;
    const code = err && err.body && (err.body.code || err.body.error);
    console.warn(`[ROX Booking] Reschedule failed: status=${status} code=${code} message=${err && err.message}`);
    state._rescheduleFailMode = 'generic';
    state.currentStep = STEPS.RESCHEDULE_FAIL;
    state.loading = false;
    render();
  }

  /**
   * Initial load. Verify the token via /load, populate context, then
   * either show the already-rescheduled card OR fetch availability and
   * render the calendar. Called once at mount time from init() when a
   * token is present.
   */
  async function loadReschedule() {
    state.loading = true;
    state.error = null;
    state.currentStep = STEPS.RESCHEDULE_LOAD;
    render();

    try {
      const result = await apiReschedule('GET', '/load', null, { token: state._rescheduleToken });
      state._rescheduleContext = result;
      state.loading = false;

      // Already-rescheduled state — show the special card. Customer can
      // tap "Pick a new time" to proceed (which will invoke
      // loadRescheduleAvailability) or "Keep this one" to confirm.
      if (result && result.state && result.state.alreadyRescheduled) {
        render();
        return;
      }

      // Normal path — fetch availability and switch to calendar.
      await loadRescheduleAvailability();
    } catch (err) {
      mapRescheduleErrorToFail(err);
    }
  }

  /**
   * Fetch eligible slots from /availability and render the calendar.
   * Also called when the customer taps "Pick a new time" from the
   * already-rescheduled card.
   */
  async function loadRescheduleAvailability() {
    state.loading = true;
    state.error = null;
    state.currentStep = STEPS.RESCHEDULE_CALENDAR;
    render();

    try {
      const ctx = state._rescheduleContext || {};
      const tz = (ctx.config && ctx.config.timezone) || 'America/Denver';
      const result = await apiReschedule('POST', '/availability', {
        token: state._rescheduleToken,
        daysAhead: (ctx.config && ctx.config.maxDaysAhead) || 30
      });

      // Transform engine's flat slots[] → calendar's grouped shape.
      state.availability = groupRescheduleSlots(result.slots || [], tz);
      state.loading = false;

      // Initialize calendar nav to the month of the first available day,
      // so the customer doesn't have to navigate forward to find slots.
      if (state.availability.availableDays.length > 0) {
        const firstDateISO = state.availability.availableDays[0].date;
        const firstDate = new Date(firstDateISO + 'T12:00:00');
        state._calMonth = firstDate.getMonth();
        state._calYear = firstDate.getFullYear();
      }
      render();
    } catch (err) {
      mapRescheduleErrorToFail(err);
    }
  }

  /**
   * Customer tapped "Confirm New Time". POST /confirm with the selected
   * slot's startISO. Three outcomes:
   *   200 → success card (state._rescheduleConfirmed populated)
   *   409 → slot taken between render and confirm. Show toast + refetch
   *         availability. Customer picks again. Token stays valid.
   *   anything else → fail card.
   */
  async function confirmReschedule() {
    if (!state.data.selectedSlot || !state.data.selectedSlot.start) {
      // Defensive — render should have disabled the button without a
      // selection, but if we somehow got here, show inline error.
      state.error = 'Please pick a time first.';
      render();
      return;
    }

    state.loading = true;
    state.error = null;
    render();

    // Selected slot's start could be a Date object (from groupRescheduleSlots)
    // or an ISO string — normalize to ISO for the wire.
    const startVal = state.data.selectedSlot.start;
    const slotStartISO = (startVal instanceof Date) ? startVal.toISOString() : String(startVal);

    try {
      const result = await apiReschedule('POST', '/confirm', {
        token: state._rescheduleToken,
        slotStartISO
      });

      // Success — record the confirmed appointment and switch to the
      // success card.
      state._rescheduleConfirmed = (result && result.appointment) ? result.appointment : { newStartISO: slotStartISO };
      state.loading = false;
      state.currentStep = STEPS.RESCHEDULE_SUCCESS;
      render();
    } catch (err) {
      // 409 — race-condition slot taken. Per locked design, refetch
      // availability and toast. The customer just picks another time.
      // We do NOT switch them to the fail card here.
      if (err && err.status === 409) {
        console.log('[ROX Booking] 409 slot taken — refetching availability');
        // Clear the selected slot so they have to pick fresh.
        state.data.selectedSlot = null;
        state.data.selectedDate = null;
        showRescheduleToast('That time was just taken — please pick another.');
        // loadRescheduleAvailability sets loading=true and renders, then
        // re-renders when slots come back. The toast is preserved on
        // those renders (state._rescheduleToast is its own field).
        await loadRescheduleAvailability();
        return;
      }

      // All other errors → generic fail card.
      mapRescheduleErrorToFail(err);
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  // Strip country code "1" from 11-digit numbers (autofill adds +1)
  function cleanPhoneDigits(raw) {
    let d = raw.replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('1')) d = d.substring(1);
    return d.substring(0, 10);
  }

  function formatPhone(digits) {
    if (!digits) return '';
    const d = cleanPhoneDigits(digits);
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================
  // INIT
  // ============================================
  async function init() {
    const container = document.getElementById(CONFIG.containerId);
    if (!container) { console.error(`[ROX Booking] Container #${CONFIG.containerId} not found`); return; }
    root = document.createElement('div');
    root.id = 'rox-booking-root';
    container.appendChild(root);
    await loadTheme();
    injectStyles();

    // ── v1.12 RESCHEDULE MODE BRANCH ──────────────────────────────────
    // Check for ?token=<HMAC> in the URL BEFORE calling startSession().
    // If present, we're in reschedule mode and skip the entire booking
    // wizard: no /start session, no exit-intent overlay, no abandon
    // beacon. The token is the only identity Anchor — the customer can
    // come back any time within the 60-day window via the same SMS link.
    const rescheduleToken = getTokenFromUrl();
    if (rescheduleToken) {
      console.log('[ROX Booking] Reschedule mode — token present in URL');
      state._rescheduleMode = true;
      state._rescheduleToken = rescheduleToken;
      // Fire prewarm in the background so the calendar's first render
      // doesn't pay the cold-cache cost. Always returns 202 immediately;
      // the actual climatology fetches happen server-side fire-and-forget.
      prewarmReschedule();
      // Kick off the load → availability → calendar flow.
      loadReschedule();
      return;
    }

    // ── BOOKING MODE (default) ─────────────────────────────────────────
    await startSession();
    render();

    // ============================================
    // EXIT-INTENT CAPTURE
    // Shows a modal when user tries to leave without providing contact info
    // ============================================
    let _exitShown = false;
    function showExitCapture() {
      if (_exitShown) return;
      if (state.currentStep === STEPS.SUCCESS || state.currentStep === STEPS.SERVICE_TYPE || state.currentStep === STEPS.CUSTOMER_TYPE) return;
      // Only show if we DON'T have both name + phone yet
      if (state.data.name && state.data.phone && state.data.phone.length >= 10) return;
      if (state.data.customer) return; // existing customer already identified
      _exitShown = true;

      const overlay = document.createElement('div');
      overlay.id = 'rxb-exit-overlay';
      overlay.innerHTML = `
        <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;">
          <div style="background:white;border-radius:12px;padding:32px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;">
            <div style="font-size:32px;margin-bottom:12px;">\uD83D\uDCDE</div>
            <h3 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;">Before you go!</h3>
            <p style="margin:0 0 20px;font-size:14px;color:#666;">Leave your info and our office will reach out to help you get scheduled.</p>
            <input type="text" id="rxb-exit-first-name" placeholder="First name" autocomplete="given-name" value="${escapeHtml(state.data.firstName || (state.data.name ? state.data.name.split(/\s+/)[0] : ''))}" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;font-size:14px;box-sizing:border-box;">
            <input type="text" id="rxb-exit-last-name" placeholder="Last name" autocomplete="family-name" value="${escapeHtml(state.data.lastName || (state.data.name ? state.data.name.split(/\s+/).slice(1).join(' ') : ''))}" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;font-size:14px;box-sizing:border-box;">
            <input type="tel" id="rxb-exit-phone" placeholder="Phone number" value="${state.data.phone ? formatPhone(state.data.phone) : ''}" maxlength="14" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:16px;font-size:14px;box-sizing:border-box;">
            <button id="rxb-exit-submit" style="width:100%;padding:14px;background:${THEME.colors.primary};color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-bottom:10px;">Have Us Call You</button>
            <button id="rxb-exit-close" style="width:100%;padding:10px;background:none;border:none;color:#999;font-size:13px;cursor:pointer;">No thanks, I'll call later</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      overlay.querySelector('#rxb-exit-submit').addEventListener('click', async () => {
        // v1.10 — exit-intent overlay now collects First Name + Last Name
        // separately. Validation requires both to be non-empty so the
        // resulting abandon/follow-up email subject reliably has the full
        // name. Both fields turn red on validation failure.
        const firstNameEl = overlay.querySelector('#rxb-exit-first-name');
        const lastNameEl  = overlay.querySelector('#rxb-exit-last-name');
        const phoneEl     = overlay.querySelector('#rxb-exit-phone');
        const firstName = firstNameEl.value.trim();
        const lastName  = lastNameEl.value.trim();
        const phone     = phoneEl.value.replace(/\D/g, '');
        if (!firstName || !lastName || phone.length < 10) {
          firstNameEl.style.borderColor = !firstName        ? '#e74c3c' : '#ddd';
          lastNameEl.style.borderColor  = !lastName         ? '#e74c3c' : '#ddd';
          phoneEl.style.borderColor     = phone.length < 10 ? '#e74c3c' : '#ddd';
          return;
        }
        // Save to state — combine first+last into the back-compat name field
        const fullName = `${firstName} ${lastName}`.trim();
        state.data.firstName = firstName;
        state.data.lastName  = lastName;
        state.data.name      = fullName;
        state.data.phone = phone;
        // Send message to office.
        // v1.11 — explicit `name: fullName` (was a bare `name` identifier
        // that resolved to `window.name`, almost always an empty string).
        // Also send firstName/lastName separately so the server's /message
        // endpoint can show the full name in the email subject reliably.
        try {
          await api('POST', '/message', {
            sessionId:    state.sessionId,
            name:         fullName,
            firstName,
            lastName,
            phone,
            email:        state.data.email || '',
            zip:          state.data.address?.zip || '',
            message:      'Customer was browsing the booking page and left before completing. Please follow up.',
            customerType: state.data.customerType || 'new',
            customerId:   state.data.customer?.id || null
          });
        } catch (e) { console.error('[ROX Booking] Exit capture send failed:', e.message); }
        overlay.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;"><div style="background:white;border-radius:12px;padding:32px;max-width:400px;width:90%;text-align:center;"><div style="font-size:32px;margin-bottom:12px;">\u2705</div><h3 style="margin:0 0 8px;">Got it!</h3><p style="color:#666;font-size:14px;">Someone from our team will reach out shortly.</p></div></div>';
        setTimeout(() => overlay.remove(), 3000);
      });

      overlay.querySelector('#rxb-exit-close').addEventListener('click', () => overlay.remove());
    }

    // Mouse leaves viewport (desktop) — exit intent
    document.addEventListener('mouseout', (e) => {
      if (e.clientY <= 0 && !_exitShown) showExitCapture();
    });

    // Back button / page unload — also trigger
    window.addEventListener('beforeunload', (e) => {
      if (!_exitShown && state.data.name && state.data.phone) return; // already have info
      // Can't show modal in beforeunload, but sendBeacon with whatever we have
      if (!state.sessionId || state.currentStep === STEPS.SUCCESS) return;
      const payload = JSON.stringify({ sessionId: state.sessionId, reason: 'unload' });
      navigator.sendBeacon(`${CONFIG.serverUrl}/api/booking/abandon`, new Blob([payload], { type: 'application/json' }));
    });

    console.log('[ROX Booking] Widget initialized');
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
