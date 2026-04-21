/**
 * ROX Club Booking Widget v1.0.3
 * =====================================================================
 *
 * Standalone booking wizard for Priority Comfort Club members invited
 * via the campaign link (SMS/email). NOT related to the regular
 * booking widget — different file, different endpoints, different
 * business rules.
 *
 * EMBED ON WORDPRESS:
 *   <div id="rox-club-booking"></div>
 *   <script>
 *     window.ROX_CLUB_BOOKING_CONFIG = {
 *       serverUrl:   "https://rox-chat-production.up.railway.app",
 *       containerId: "rox-club-booking",
 *       companyName: "ROX Heating & Air",
 *       companyPhone: "(720) 468-0689"
 *     };
 *   </script>
 *   <script src="https://rox-chat-production.up.railway.app/widget/club-booking-widget.js?v=2"></script>
 *
 * ─── FLOW ───────────────────────────────────────────────────────────
 *   1. PHONE        — single phone input
 *   2. PICK_ADDRESS — only if HCP profile has 2+ addresses
 *   3. CONFIRM_INFO — shows name + address, "Yes that's me / Not me"
 *   4. CALENDAR     — weather banner, dates capped at cutoff, late-CB button
 *   5. CONFIRM      — summary + weather acknowledgement checkbox + Book
 *   6. SUCCESS      — confirmation + what's next
 *
 *   Side paths (v1.0.3 — soft membership handling):
 *   - OFFICE_VERIFYING  — phone IN HCP but no PCC tag. Greet by name,
 *                         tell customer office will follow up. Office
 *                         already emailed.
 *   - NEEDS_INFO_FORM   — phone NOT in HCP. Show a contact form so
 *                         the office can verify & call back ASAP.
 *   - LATE_CALLBACK     — PCC member wants a date past the cutoff.
 *
 *   NO MORE "you're not a member" messaging — the tag might just be
 *   missing in HCP. Every customer is treated as a potential member
 *   until the office confirms otherwise.
 *
 * Cache busting: bump the ?v=N on the embed code after every change.
 * =====================================================================
 */

(function () {
  'use strict';

  // Guard against double-injection (e.g. WordPress page swaps)
  if (window.__ROX_CLUB_BOOKING_INIT__) return;
  window.__ROX_CLUB_BOOKING_INIT__ = true;

  // ──────────────────────────────────────────────────────────────────
  // CONFIG
  // ──────────────────────────────────────────────────────────────────
  const CONFIG = Object.assign({
    serverUrl:    '',
    containerId:  'rox-club-booking',
    tenantId:     'rox-heating',
    companyName:  'ROX Heating & Air',
    companyPhone: '(720) 468-0689',
  }, window.ROX_CLUB_BOOKING_CONFIG || {});

  // ──────────────────────────────────────────────────────────────────
  // THEME (matches the regular booking widget)
  // ──────────────────────────────────────────────────────────────────
  const COLORS = {
    primary:        '#F78C26',
    primaryHover:   '#E07520',
    primaryLight:   'rgba(247,140,38,0.08)',
    primaryBorder:  'rgba(247,140,38,0.25)',
    bg:             '#ffffff',
    cardBorder:     '#e8e8e8',
    text:           '#1a1a1a',
    textSecondary:  '#666666',
    textMuted:      '#999999',
    inputBorder:    '#d4d4d4',
    successBg:      '#f0fdf4',
    successBorder:  '#86efac',
    successText:    '#166534',
    errorBg:        '#fef2f2',
    errorBorder:    '#fca5a5',
    errorText:      '#991b1b',
    warnBg:         '#fffbeb',
    warnBorder:     '#fcd34d',
    warnText:       '#92400e',
  };

  // ──────────────────────────────────────────────────────────────────
  // STEPS
  // ──────────────────────────────────────────────────────────────────
  const STEP = {
    PHONE:              'phone',
    LOOKING_UP:         'looking_up',

    // v1.0.3 — soft membership handling (replaces the old BLOCKED step)
    OFFICE_VERIFYING:   'office_verifying',    // phone IN HCP, no PCC tag
    NEEDS_INFO_FORM:    'needs_info_form',     // phone NOT in HCP
    NEEDS_INFO_SENDING: 'needs_info_sending',
    NEEDS_INFO_SUCCESS: 'needs_info_success',

    PICK_ADDRESS:       'pick_address',
    CONFIRM_INFO:       'confirm_info',
    CALENDAR:           'calendar',
    CONFIRM:            'confirm',
    BOOKING:            'booking',
    SUCCESS:            'success',
    LATE_CALLBACK:      'late_callback',
    LATE_SENDING:       'late_sending',
    LATE_SUCCESS:       'late_success',
  };

  // ──────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────
  const state = {
    sessionId:     null,
    step:          STEP.PHONE,

    // From /start
    campaign:      null,        // server-provided config (cutoff, weather text, etc.)

    // From /lookup-customer
    customer:      null,        // { id, firstName, lastName, fullName, email }
    pccPlanName:   null,        // 'GOLD PCC', 'Silver PCC', etc.
    addresses:     [],          // [] when only one — server already set selectedAddress
    selectedAddress: null,      // { street, city, state, zip }
    blockMessage:  null,        // populated when blocked=true
    blockReason:   null,        // 'needs_info' | 'office_verification' | null

    // From /availability
    availability:  null,        // { availableDays: [...], cutoffDate, totalSlots }

    // User picks
    selectedDate:  null,        // 'YYYY-MM-DD'
    selectedSlot:  null,        // { start, end, formatted, techId, techName }
    weatherAcked:  false,

    // After /confirm
    confirmation:  null,        // { service, date, time, name, phone, address, priceText }

    // UI state
    loading:       false,
    error:         null,
    phoneInput:    '',          // raw text typed into the phone field
    lateMessage:   '',

    // Contact form (shown when phone not found in HCP)
    formFields: {
      firstName: '',
      lastName:  '',
      email:     '',
      bestTime:  '',
      message:   '',
    },
  };

  let root = null;   // the DOM element we render into

  // ──────────────────────────────────────────────────────────────────
  // API HELPERS
  // ──────────────────────────────────────────────────────────────────
  async function api(method, path, body = null) {
    const url = `${CONFIG.serverUrl}/api/club-booking${path}`;
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    if (!res.ok) {
      let errText = `HTTP ${res.status}`;
      try { const j = await res.json(); errText = j.error || j.message || errText; }
      catch (_) { /* keep status */ }
      throw new Error(errText);
    }
    return res.json();
  }

  async function apiGet(path, params = {}) {
    const q = new URLSearchParams(params).toString();
    const url = `${CONFIG.serverUrl}/api/club-booking${path}${q ? '?' + q : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      let errText = `HTTP ${res.status}`;
      try { const j = await res.json(); errText = j.error || j.message || errText; }
      catch (_) { /* keep status */ }
      throw new Error(errText);
    }
    return res.json();
  }

  // ──────────────────────────────────────────────────────────────────
  // UTILITIES
  // ──────────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
  }

  function formatPhoneInput(raw) {
    const d = String(raw || '').replace(/\D/g, '').slice(0, 10);
    if (d.length === 0) return '';
    if (d.length <= 3)  return `(${d}`;
    if (d.length <= 6)  return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  }

  function digitsOnly(raw) {
    return String(raw || '').replace(/\D/g, '');
  }

  function formatAddress(a) {
    if (!a) return '';
    const parts = [a.street, a.city, a.state, a.zip].filter(Boolean);
    return parts.join(', ');
  }

  // ──────────────────────────────────────────────────────────────────
  // STYLES
  // ──────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('rox-club-booking-styles')) return;
    const style = document.createElement('style');
    style.id = 'rox-club-booking-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

      #${CONFIG.containerId} *, #${CONFIG.containerId} *::before, #${CONFIG.containerId} *::after {
        box-sizing: border-box;
      }
      .rcb {
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: ${COLORS.text};
        max-width: 560px;
        margin: 0 auto;
        padding: 16px;
        line-height: 1.5;
        font-size: 16px;
      }
      .rcb-card {
        background: ${COLORS.bg};
        border: 1px solid ${COLORS.cardBorder};
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04);
      }
      .rcb-h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px; line-height: 1.3; }
      .rcb-h2 { font-size: 18px; font-weight: 600; margin: 0 0 12px; line-height: 1.3; }
      .rcb-p  { margin: 0 0 16px; color: ${COLORS.textSecondary}; }
      .rcb-muted { color: ${COLORS.textMuted}; font-size: 14px; }

      .rcb-field { margin-bottom: 16px; }
      .rcb-label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 6px; }
      .rcb-input {
        width: 100%;
        padding: 12px 14px;
        font-size: 16px;
        font-family: inherit;
        border: 1px solid ${COLORS.inputBorder};
        border-radius: 8px;
        background: #fff;
        color: ${COLORS.text};
        transition: border-color 0.15s;
      }
      .rcb-input:focus {
        outline: none;
        border-color: ${COLORS.primary};
        box-shadow: 0 0 0 3px ${COLORS.primaryLight};
      }
      .rcb-textarea { min-height: 80px; resize: vertical; font-family: inherit; }
      select.rcb-input { appearance: auto; cursor: pointer; }

      /* v1.0.3 — side-by-side name fields, reflows to single column on narrow */
      .rcb-field-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
      }
      .rcb-field-row .rcb-field { margin-bottom: 16px; }

      .rcb-btn {
        display: inline-block;
        padding: 12px 20px;
        font-size: 16px;
        font-family: inherit;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.15s, transform 0.05s;
      }
      .rcb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .rcb-btn-primary { background: ${COLORS.primary}; color: #fff; }
      .rcb-btn-primary:hover:not(:disabled) { background: ${COLORS.primaryHover}; }
      .rcb-btn-primary:active:not(:disabled) { transform: translateY(1px); }
      .rcb-btn-secondary {
        background: #fff;
        color: ${COLORS.text};
        border: 1px solid ${COLORS.inputBorder};
      }
      .rcb-btn-secondary:hover:not(:disabled) { border-color: ${COLORS.primary}; background: ${COLORS.primaryLight}; }
      .rcb-btn-link {
        background: none;
        color: ${COLORS.primary};
        padding: 8px 0;
        text-decoration: underline;
      }
      .rcb-btn-block { display: block; width: 100%; }
      .rcb-btn-row { display: flex; gap: 12px; flex-wrap: wrap; }
      .rcb-btn-row .rcb-btn { flex: 1 1 auto; }

      .rcb-error {
        background: ${COLORS.errorBg};
        border: 1px solid ${COLORS.errorBorder};
        color: ${COLORS.errorText};
        padding: 12px 14px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 14px;
      }
      .rcb-warn {
        background: ${COLORS.warnBg};
        border: 1px solid ${COLORS.warnBorder};
        color: ${COLORS.warnText};
        padding: 12px 14px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 14px;
        line-height: 1.5;
      }
      .rcb-success {
        background: ${COLORS.successBg};
        border: 1px solid ${COLORS.successBorder};
        color: ${COLORS.successText};
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 16px;
      }

      /* v1.0.3 — neutral "info" box for office_verifying state (not an error) */
      .rcb-info-box {
        background: ${COLORS.primaryLight};
        border: 1px solid ${COLORS.primaryBorder};
        color: ${COLORS.text};
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 16px;
        line-height: 1.55;
      }

      .rcb-loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid ${COLORS.primaryLight};
        border-top-color: ${COLORS.primary};
        border-radius: 50%;
        animation: rcb-spin 0.8s linear infinite;
        vertical-align: middle;
      }
      @keyframes rcb-spin { to { transform: rotate(360deg); } }

      .rcb-info-row {
        padding: 10px 0;
        border-bottom: 1px solid ${COLORS.cardBorder};
        font-size: 15px;
      }
      .rcb-info-row:last-child { border-bottom: none; }
      .rcb-info-label { color: ${COLORS.textMuted}; font-size: 13px; margin-bottom: 2px; }
      .rcb-info-value { color: ${COLORS.text}; font-weight: 500; }

      .rcb-day-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
        gap: 8px;
        margin-bottom: 20px;
      }
      .rcb-day {
        padding: 12px 8px;
        border: 1px solid ${COLORS.inputBorder};
        border-radius: 8px;
        background: #fff;
        cursor: pointer;
        text-align: center;
        font-size: 14px;
        transition: all 0.15s;
      }
      .rcb-day:hover { border-color: ${COLORS.primary}; background: ${COLORS.primaryLight}; }
      .rcb-day-selected {
        border-color: ${COLORS.primary};
        background: ${COLORS.primary};
        color: #fff;
      }
      .rcb-day-dow { font-size: 12px; opacity: 0.85; }
      .rcb-day-date { font-weight: 600; margin-top: 2px; }

      .rcb-slot-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 8px;
      }
      .rcb-slot {
        padding: 10px;
        border: 1px solid ${COLORS.inputBorder};
        border-radius: 8px;
        background: #fff;
        cursor: pointer;
        text-align: center;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.15s;
      }
      .rcb-slot:hover { border-color: ${COLORS.primary}; background: ${COLORS.primaryLight}; }
      .rcb-slot-selected {
        border-color: ${COLORS.primary};
        background: ${COLORS.primary};
        color: #fff;
      }

      .rcb-radio-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
      .rcb-radio-item {
        display: flex;
        align-items: center;
        padding: 12px 14px;
        border: 1px solid ${COLORS.inputBorder};
        border-radius: 8px;
        cursor: pointer;
        background: #fff;
        transition: border-color 0.15s, background 0.15s;
      }
      .rcb-radio-item:hover { border-color: ${COLORS.primary}; }
      .rcb-radio-item input { margin: 0 12px 0 0; transform: scale(1.2); }
      .rcb-radio-item-selected { border-color: ${COLORS.primary}; background: ${COLORS.primaryLight}; }

      .rcb-checkbox-row {
        display: flex;
        align-items: flex-start;
        padding: 14px;
        border: 1px solid ${COLORS.inputBorder};
        border-radius: 8px;
        background: #fff;
        cursor: pointer;
        margin-bottom: 16px;
      }
      .rcb-checkbox-row input { margin-right: 12px; margin-top: 4px; transform: scale(1.2); flex-shrink: 0; }
      .rcb-checkbox-row label { cursor: pointer; font-size: 14px; line-height: 1.5; }

      .rcb-summary {
        background: ${COLORS.primaryLight};
        border: 1px solid ${COLORS.primaryBorder};
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .rcb-summary-row { padding: 6px 0; font-size: 15px; }
      .rcb-summary-row strong { color: ${COLORS.text}; }

      .rcb-late-cb-prompt {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px dashed ${COLORS.cardBorder};
        text-align: center;
        font-size: 14px;
        color: ${COLORS.textSecondary};
      }
    `;
    document.head.appendChild(style);
  }

  // ──────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────
  function render() {
    if (!root) return;

    let body = '';
    switch (state.step) {
      case STEP.PHONE:              body = renderPhone(); break;
      case STEP.LOOKING_UP:         body = renderLookingUp(); break;
      case STEP.OFFICE_VERIFYING:   body = renderOfficeVerifying(); break;
      case STEP.NEEDS_INFO_FORM:    body = renderNeedsInfoForm(); break;
      case STEP.NEEDS_INFO_SENDING: body = renderNeedsInfoSending(); break;
      case STEP.NEEDS_INFO_SUCCESS: body = renderNeedsInfoSuccess(); break;
      case STEP.PICK_ADDRESS:       body = renderPickAddress(); break;
      case STEP.CONFIRM_INFO:       body = renderConfirmInfo(); break;
      case STEP.CALENDAR:           body = renderCalendar(); break;
      case STEP.CONFIRM:            body = renderConfirm(); break;
      case STEP.BOOKING:            body = renderBooking(); break;
      case STEP.SUCCESS:            body = renderSuccess(); break;
      case STEP.LATE_CALLBACK:      body = renderLateCallback(); break;
      case STEP.LATE_SENDING:       body = renderLateSending(); break;
      case STEP.LATE_SUCCESS:       body = renderLateSuccess(); break;
      default:                      body = renderPhone();
    }

    root.innerHTML = `<div class="rcb"><div class="rcb-card">${body}</div></div>`;
    bindEvents();
  }

  function renderError() {
    return state.error
      ? `<div class="rcb-error">${escapeHtml(state.error)}</div>`
      : '';
  }

  // ─── STEP: phone entry ────────────────────────────────────────────
  function renderPhone() {
    const heading = state.campaign?.displayName || 'Schedule Your Tune-Up';
    return `
      <h1 class="rcb-h1">${escapeHtml(heading)}</h1>
      <p class="rcb-p">
        Welcome back! Enter your phone number to pull up your account and pick a time.
      </p>
      ${renderError()}
      <div class="rcb-field">
        <label class="rcb-label" for="rcb-phone">Phone number</label>
        <input
          class="rcb-input"
          type="tel"
          inputmode="numeric"
          autocomplete="tel"
          id="rcb-phone"
          placeholder="(555) 555-5555"
          value="${escapeHtml(state.phoneInput)}"
        />
      </div>
      <button class="rcb-btn rcb-btn-primary rcb-btn-block" data-action="submit-phone">
        Continue
      </button>
    `;
  }

  // ─── STEP: looking up (loading state) ─────────────────────────────
  function renderLookingUp() {
    return `
      <div style="text-align:center; padding: 40px 0;">
        <div class="rcb-loading"></div>
        <p class="rcb-p" style="margin-top: 16px;">Looking up your account…</p>
      </div>
    `;
  }

  // ─── STEP: office_verifying (phone IN HCP, no PCC tag) ───────────
  // Soft passive message. Customer's name is shown if we got it back.
  // Office was already emailed; customer doesn't need to do anything.
  function renderOfficeVerifying() {
    const firstName = state.customer?.firstName || '';
    const heading = firstName
      ? `Hi ${escapeHtml(firstName)}!`
      : `Thanks for reaching out!`;
    const msg = state.blockMessage
      || `We're having trouble locating your membership plan in our system. Our office team will reach out to you shortly to confirm your membership and get your tune-up scheduled.`;

    return `
      <h1 class="rcb-h1">${heading}</h1>
      <div class="rcb-info-box">${escapeHtml(msg)}</div>
      <p class="rcb-muted">
        You don't need to do anything — our team will be in touch soon.
        Questions in the meantime? Call us at ${escapeHtml(CONFIG.companyPhone)}.
      </p>
    `;
  }

  // ─── STEP: needs_info_form (phone NOT in HCP) ─────────────────────
  // Quick contact form so the office can verify + call back ASAP.
  // Email fires on submit (/member-verification-form) OR via abandon
  // path if they close without submitting.
  function renderNeedsInfoForm() {
    const f = state.formFields || {};
    const msg = state.blockMessage
      || `We're having trouble locating your membership in our system. Please share a few quick details and our office will reach out to you as soon as possible.`;

    return `
      <h1 class="rcb-h1">A few quick details</h1>
      <p class="rcb-p">${escapeHtml(msg)}</p>
      ${renderError()}

      <div class="rcb-field-row">
        <div class="rcb-field">
          <label class="rcb-label" for="rcb-info-fname">First name *</label>
          <input
            class="rcb-input"
            id="rcb-info-fname"
            autocomplete="given-name"
            value="${escapeHtml(f.firstName || '')}"
          />
        </div>
        <div class="rcb-field">
          <label class="rcb-label" for="rcb-info-lname">Last name *</label>
          <input
            class="rcb-input"
            id="rcb-info-lname"
            autocomplete="family-name"
            value="${escapeHtml(f.lastName || '')}"
          />
        </div>
      </div>

      <div class="rcb-field">
        <label class="rcb-label" for="rcb-info-email">Email (optional)</label>
        <input
          class="rcb-input"
          type="email"
          id="rcb-info-email"
          autocomplete="email"
          placeholder="you@example.com"
          value="${escapeHtml(f.email || '')}"
        />
      </div>

      <div class="rcb-field">
        <label class="rcb-label" for="rcb-info-besttime">Best time to reach you (optional)</label>
        <select class="rcb-input" id="rcb-info-besttime">
          <option value=""${!f.bestTime ? ' selected' : ''}>Any time</option>
          <option value="Morning"${f.bestTime === 'Morning' ? ' selected' : ''}>Morning</option>
          <option value="Afternoon"${f.bestTime === 'Afternoon' ? ' selected' : ''}>Afternoon</option>
          <option value="Evening"${f.bestTime === 'Evening' ? ' selected' : ''}>Evening</option>
        </select>
      </div>

      <div class="rcb-field">
        <label class="rcb-label" for="rcb-info-message">Anything else we should know? (optional)</label>
        <textarea
          class="rcb-input rcb-textarea"
          id="rcb-info-message"
          maxlength="1000"
          placeholder="e.g. I signed up for the Priority Comfort Club last fall"
        >${escapeHtml(f.message || '')}</textarea>
      </div>

      <button class="rcb-btn rcb-btn-primary rcb-btn-block" data-action="submit-info-form">
        Submit
      </button>
    `;
  }

  function renderNeedsInfoSending() {
    return `
      <div style="text-align:center; padding: 40px 0;">
        <div class="rcb-loading"></div>
        <p class="rcb-p" style="margin-top: 16px;">Sending your info…</p>
      </div>
    `;
  }

  function renderNeedsInfoSuccess() {
    const f = state.formFields || {};
    const heading = f.firstName
      ? `Thanks, ${escapeHtml(f.firstName)}!`
      : `Got it!`;
    return `
      <h1 class="rcb-h1">${heading}</h1>
      <div class="rcb-success">
        Our office will reach out to you shortly to confirm your membership
        and get your tune-up scheduled.
      </div>
      <p class="rcb-muted">
        Questions in the meantime? Call us at ${escapeHtml(CONFIG.companyPhone)}.
      </p>
    `;
  }

  // ─── STEP: multi-address picker ──────────────────────────────────
  function renderPickAddress() {
    const items = state.addresses.map((a, i) => `
      <label class="rcb-radio-item" data-action="pick-address" data-index="${i}">
        <input type="radio" name="rcb-addr" />
        <span>${escapeHtml(formatAddress(a))}</span>
      </label>
    `).join('');

    return `
      <h1 class="rcb-h1">Which address?</h1>
      <p class="rcb-p">We have a few addresses on file — which one is this tune-up for?</p>
      ${renderError()}
      <div class="rcb-radio-list">${items}</div>
    `;
  }

  // ─── STEP: confirm name + address ─────────────────────────────────
  function renderConfirmInfo() {
    const c = state.customer || {};
    const a = state.selectedAddress;

    return `
      <h1 class="rcb-h1">Just confirming…</h1>
      <p class="rcb-p">Make sure this is right and we'll get you on the schedule.</p>
      ${renderError()}

      <div class="rcb-summary">
        <div class="rcb-summary-row"><strong>Name:</strong> ${escapeHtml(c.fullName || 'On file')}</div>
        ${a ? `<div class="rcb-summary-row"><strong>Address:</strong> ${escapeHtml(formatAddress(a))}</div>` : ''}
        ${state.pccPlanName ? `<div class="rcb-summary-row"><strong>Membership:</strong> ${escapeHtml(state.pccPlanName)}</div>` : ''}
      </div>

      <div class="rcb-btn-row">
        <button class="rcb-btn rcb-btn-secondary" data-action="reset">That's not me</button>
        <button class="rcb-btn rcb-btn-primary" data-action="goto-calendar">Yes — pick a time</button>
      </div>
    `;
  }

  // ─── STEP: calendar with weather banner + late callback ──────────
  function renderCalendar() {
    const cmp = state.campaign || {};
    const days = state.availability?.availableDays || [];

    const weatherBanner = cmp.weatherCaveat
      ? `<div class="rcb-warn"><strong>☀️ Weather note: </strong>${escapeHtml(cmp.weatherCaveat)}</div>`
      : '';

    if (days.length === 0 && !state.loading) {
      return `
        <h1 class="rcb-h1">Pick a time</h1>
        ${weatherBanner}
        ${renderError()}
        <div class="rcb-warn">
          We don't have any open spots before our cutoff date. You can request an
          office callback below and we'll find a time that works.
        </div>
        ${renderLateCallbackPrompt()}
      `;
    }

    const dayButtons = days.map(d => {
      const sel = state.selectedDate === d.date ? 'rcb-day-selected' : '';
      const dowShort = (d.dayOfWeek || '').slice(0, 3);
      const dateShort = (d.displayDate || '').replace(/^\w+,\s*/, ''); // strip leading "Mon, "
      return `
        <button class="rcb-day ${sel}" data-action="pick-date" data-date="${escapeHtml(d.date)}">
          <div class="rcb-day-dow">${escapeHtml(dowShort)}</div>
          <div class="rcb-day-date">${escapeHtml(dateShort)}</div>
        </button>
      `;
    }).join('');

    let slotSection = '';
    if (state.selectedDate) {
      const day = days.find(d => d.date === state.selectedDate);
      if (day && day.slots.length) {
        const slotButtons = day.slots.map((s, idx) => {
          const sel = (state.selectedSlot && state.selectedSlot.start === s.start) ? 'rcb-slot-selected' : '';
          return `
            <button class="rcb-slot ${sel}" data-action="pick-slot" data-idx="${idx}">
              ${escapeHtml(s.formatted)}
            </button>
          `;
        }).join('');

        slotSection = `
          <h2 class="rcb-h2" style="margin-top:20px;">${escapeHtml(day.displayDate)}</h2>
          <div class="rcb-slot-list">${slotButtons}</div>
          ${state.selectedSlot ? `
            <button class="rcb-btn rcb-btn-primary rcb-btn-block" style="margin-top: 20px;" data-action="goto-confirm">
              Continue with ${escapeHtml(state.selectedSlot.formatted)}
            </button>
          ` : ''}
        `;
      }
    }

    return `
      <h1 class="rcb-h1">Pick a time</h1>
      ${weatherBanner}
      ${renderError()}
      <p class="rcb-muted" style="margin-bottom: 12px;">
        Available dates through ${escapeHtml(cmp.cutoffDate || 'the cutoff date')}:
      </p>
      <div class="rcb-day-list">${dayButtons}</div>
      ${slotSection}
      ${renderLateCallbackPrompt()}
    `;
  }

  function renderLateCallbackPrompt() {
    const cmp = state.campaign || {};
    if (!cmp.lateCallbackEnabled) return '';
    return `
      <div class="rcb-late-cb-prompt">
        ${escapeHtml(cmp.lateCallbackPrompt || '')}
        <br/>
        <button class="rcb-btn rcb-btn-link" data-action="goto-late-callback">
          ${escapeHtml(cmp.lateCallbackButtonText || 'Request office callback')} →
        </button>
      </div>
    `;
  }

  // ─── STEP: final confirmation ─────────────────────────────────────
  function renderConfirm() {
    const cmp = state.campaign || {};
    const c   = state.customer || {};
    const a   = state.selectedAddress;
    const slot = state.selectedSlot;

    if (!slot) {
      // Defensive — shouldn't happen but guard anyway
      state.step = STEP.CALENDAR;
      return renderCalendar();
    }

    const dateLabel = (state.availability?.availableDays || []).find(d => d.date === state.selectedDate)?.displayDate
      || state.selectedDate;

    const ackLabel = cmp.weatherAcknowledgementLabel
      || 'I understand the appointment may be rescheduled if weather is unsafe for outdoor work.';

    return `
      <h1 class="rcb-h1">Almost done</h1>
      <p class="rcb-p">Please review and confirm.</p>
      ${renderError()}

      <div class="rcb-summary">
        <div class="rcb-summary-row"><strong>Service:</strong> ${escapeHtml(cmp.pccLineItemName || 'AC Tune-Up')}</div>
        <div class="rcb-summary-row"><strong>When:</strong> ${escapeHtml(dateLabel)} at ${escapeHtml(slot.formatted)}</div>
        <div class="rcb-summary-row"><strong>Name:</strong> ${escapeHtml(c.fullName || '')}</div>
        ${a ? `<div class="rcb-summary-row"><strong>Address:</strong> ${escapeHtml(formatAddress(a))}</div>` : ''}
        <div class="rcb-summary-row"><strong>Cost:</strong> Included in your Priority Comfort Club membership — no charge.</div>
      </div>

      ${cmp.weatherCaveat ? `<div class="rcb-warn">${escapeHtml(cmp.weatherCaveat)}</div>` : ''}

      <label class="rcb-checkbox-row" data-action="toggle-weather">
        <input type="checkbox" id="rcb-weather-ack" ${state.weatherAcked ? 'checked' : ''} />
        <span>${escapeHtml(ackLabel)}</span>
      </label>

      <div class="rcb-btn-row">
        <button class="rcb-btn rcb-btn-secondary" data-action="back-to-calendar">Back</button>
        <button class="rcb-btn rcb-btn-primary" data-action="confirm-booking" ${state.weatherAcked ? '' : 'disabled'}>
          Book my tune-up
        </button>
      </div>
    `;
  }

  // ─── STEP: booking in progress ───────────────────────────────────
  function renderBooking() {
    return `
      <div style="text-align:center; padding: 40px 0;">
        <div class="rcb-loading"></div>
        <p class="rcb-p" style="margin-top: 16px;">Booking your tune-up…</p>
      </div>
    `;
  }

  // ─── STEP: success ───────────────────────────────────────────────
  function renderSuccess() {
    const c = state.confirmation || {};
    return `
      <h1 class="rcb-h1">You're all set! 🎉</h1>
      <div class="rcb-success">
        <div style="font-weight: 600; margin-bottom: 8px;">Confirmation</div>
        <div class="rcb-summary-row"><strong>${escapeHtml(c.service || 'Tune-Up')}</strong></div>
        <div class="rcb-summary-row">${escapeHtml(c.date || '')} at ${escapeHtml(c.time || '')}</div>
        <div class="rcb-summary-row">${escapeHtml(c.address || '')}</div>
      </div>
      <p class="rcb-p">${escapeHtml(c.priceText || 'Included in your membership.')}</p>
      <p class="rcb-muted">
        We'll send a reminder before your appointment. If the weather forecast doesn't
        cooperate, our office will reach out to reschedule. Questions?
        Call us at ${escapeHtml(CONFIG.companyPhone)}.
      </p>
    `;
  }

  // ─── STEP: late callback form ────────────────────────────────────
  function renderLateCallback() {
    const cmp = state.campaign || {};
    return `
      <h1 class="rcb-h1">Want a date after ${escapeHtml(cmp.cutoffDate || 'May 31')}?</h1>
      <p class="rcb-p">
        No problem. Leave a quick note (optional) and someone from our office
        will call you back to find a time that works.
      </p>
      ${renderError()}
      <div class="rcb-field">
        <label class="rcb-label" for="rcb-late-msg">Message (optional)</label>
        <textarea
          class="rcb-input rcb-textarea"
          id="rcb-late-msg"
          placeholder="e.g. I'd like to schedule for the first week of June, mornings preferred"
          maxlength="1000"
        >${escapeHtml(state.lateMessage)}</textarea>
      </div>
      <div class="rcb-btn-row">
        <button class="rcb-btn rcb-btn-secondary" data-action="back-to-calendar">Back</button>
        <button class="rcb-btn rcb-btn-primary" data-action="submit-late-callback">Request callback</button>
      </div>
    `;
  }

  function renderLateSending() {
    return `
      <div style="text-align:center; padding: 40px 0;">
        <div class="rcb-loading"></div>
        <p class="rcb-p" style="margin-top: 16px;">Sending your request…</p>
      </div>
    `;
  }

  function renderLateSuccess() {
    return `
      <h1 class="rcb-h1">Got it!</h1>
      <div class="rcb-success">
        Someone from our office will reach out to you shortly to coordinate
        a date that works.
      </div>
      <p class="rcb-muted">
        Questions in the meantime? Call us at ${escapeHtml(CONFIG.companyPhone)}.
      </p>
    `;
  }

  // ──────────────────────────────────────────────────────────────────
  // EVENTS
  // ──────────────────────────────────────────────────────────────────
  function bindEvents() {
    if (!root) return;

    // Live phone formatting
    const phoneEl = root.querySelector('#rcb-phone');
    if (phoneEl) {
      phoneEl.addEventListener('input', (e) => {
        state.phoneInput = formatPhoneInput(e.target.value);
        e.target.value = state.phoneInput;
      });
      phoneEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAction('submit-phone');
        }
      });
      try { phoneEl.focus(); } catch (_) {}
    }

    // Late-callback textarea
    const lateEl = root.querySelector('#rcb-late-msg');
    if (lateEl) {
      lateEl.addEventListener('input', (e) => {
        state.lateMessage = e.target.value;
      });
    }

    // v1.0.3 — contact form inputs (phone-not-in-HCP path)
    // Stored to state without re-render so typing doesn't get interrupted.
    const formFieldMap = [
      ['rcb-info-fname',    'firstName'],
      ['rcb-info-lname',    'lastName'],
      ['rcb-info-email',    'email'],
      ['rcb-info-besttime', 'bestTime'],
      ['rcb-info-message',  'message'],
    ];
    formFieldMap.forEach(([id, key]) => {
      const el = root.querySelector('#' + id);
      if (el) {
        const handler = (e) => { state.formFields[key] = e.target.value; };
        el.addEventListener('input',  handler);
        el.addEventListener('change', handler);
      }
    });

    // Weather acknowledgement checkbox (manual handling so render doesn't
    // re-run on every keystroke)
    const weatherEl = root.querySelector('#rcb-weather-ack');
    if (weatherEl) {
      weatherEl.addEventListener('change', () => {
        state.weatherAcked = !!weatherEl.checked;
        const btn = root.querySelector('[data-action="confirm-booking"]');
        if (btn) btn.disabled = !state.weatherAcked;
      });
    }

    // Generic action handler — single delegated listener
    root.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        const action = el.getAttribute('data-action');
        const idx    = el.getAttribute('data-idx');
        const date   = el.getAttribute('data-date');
        const index  = el.getAttribute('data-index');

        if (action === 'pick-address' || action === 'toggle-weather') {
          // Let the label fire its own input behavior; we still want to react
        } else {
          e.preventDefault();
        }
        handleAction(action, { idx, date, index });
      });
    });
  }

  async function handleAction(action, ctx = {}) {
    state.error = null;

    switch (action) {
      case 'submit-phone':           return submitPhone();
      case 'reset':                  return resetToPhone();
      case 'submit-info-form':       return submitInfoForm();
      case 'pick-address':           return pickAddress(ctx.index);
      case 'goto-calendar':          return gotoCalendar();
      case 'pick-date':              return pickDate(ctx.date);
      case 'pick-slot':              return pickSlot(ctx.idx);
      case 'goto-confirm':           return gotoConfirm();
      case 'back-to-calendar':       return backToCalendar();
      case 'toggle-weather':         return; // checkbox handler does the work
      case 'confirm-booking':        return confirmBooking();
      case 'goto-late-callback':     return gotoLateCallback();
      case 'submit-late-callback':   return submitLateCallback();
      default:                       return;
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────────
  async function submitPhone() {
    const phone = digitsOnly(state.phoneInput);
    if (phone.length !== 10) {
      state.error = 'Please enter a valid 10-digit phone number.';
      render();
      return;
    }

    state.step = STEP.LOOKING_UP;
    render();

    try {
      const res = await api('POST', '/lookup-customer', {
        sessionId: state.sessionId,
        phone,
      });

      if (res.notReady) {
        state.step = STEP.PHONE;
        state.error = res.message || 'Please enter a valid phone number.';
        render();
        return;
      }

      if (res.blocked) {
        // v1.0.3 — branch on blockReason:
        //   'needs_info'          → show contact form (phone NOT in HCP)
        //   'office_verification' → passive by-name message (phone IN HCP, no PCC tag)
        state.blockMessage = res.message;
        state.blockReason  = res.blockReason;

        if (res.blockReason === 'needs_info') {
          state.step = STEP.NEEDS_INFO_FORM;
        } else {
          // office_verification — save customer (contains firstName)
          state.customer = res.customer || null;
          state.step     = STEP.OFFICE_VERIFYING;
        }
        render();
        return;
      }

      // PCC member confirmed
      state.customer    = res.customer;
      state.pccPlanName = res.pccPlanName;
      state.addresses   = Array.isArray(res.addresses) ? res.addresses : [];
      state.selectedAddress = res.selectedAddress || null;

      if (state.addresses.length >= 2) {
        state.step = STEP.PICK_ADDRESS;
      } else {
        state.step = STEP.CONFIRM_INFO;
      }
      render();
    } catch (err) {
      console.error('[ClubBooking] lookup failed:', err);
      state.step  = STEP.PHONE;
      state.error = `Something went wrong. Please call ${CONFIG.companyPhone}.`;
      render();
    }
  }

  function resetToPhone() {
    // Don't try to update server — let the session expire / abandon
    state.customer        = null;
    state.pccPlanName     = null;
    state.addresses       = [];
    state.selectedAddress = null;
    state.availability    = null;
    state.selectedDate    = null;
    state.selectedSlot    = null;
    state.weatherAcked    = false;
    state.phoneInput      = '';
    state.error           = null;
    state.blockMessage    = null;
    state.blockReason     = null;
    state.formFields      = { firstName: '', lastName: '', email: '', bestTime: '', message: '' };
    state.step            = STEP.PHONE;
    render();
  }

  // v1.0.3 — submit contact form when phone not found in HCP
  async function submitInfoForm() {
    const f = state.formFields || {};
    const firstName = (f.firstName || '').trim();
    const lastName  = (f.lastName  || '').trim();

    if (!firstName || !lastName) {
      state.error = 'Please enter your first and last name.';
      render();
      return;
    }

    state.step = STEP.NEEDS_INFO_SENDING;
    render();

    try {
      const res = await api('POST', '/member-verification-form', {
        sessionId: state.sessionId,
        firstName,
        lastName,
        email:    (f.email    || '').trim(),
        bestTime: (f.bestTime || '').trim(),
        message:  (f.message  || '').trim(),
      });
      if (res.success) {
        state.step = STEP.NEEDS_INFO_SUCCESS;
      } else {
        state.step  = STEP.NEEDS_INFO_FORM;
        state.error = res.message || `Could not send. Please call ${CONFIG.companyPhone}.`;
      }
      render();
    } catch (err) {
      console.error('[ClubBooking] info-form failed:', err);
      state.step  = STEP.NEEDS_INFO_FORM;
      state.error = `Something went wrong. Please call ${CONFIG.companyPhone}.`;
      render();
    }
  }

  async function pickAddress(indexStr) {
    const idx = parseInt(indexStr, 10);
    if (!Number.isFinite(idx) || idx < 0 || idx >= state.addresses.length) return;

    try {
      const res = await api('POST', '/select-address', {
        sessionId:    state.sessionId,
        addressIndex: idx,
      });
      state.selectedAddress = res.selectedAddress || state.addresses[idx];
      state.step = STEP.CONFIRM_INFO;
      render();
    } catch (err) {
      console.error('[ClubBooking] select-address failed:', err);
      state.error = 'Could not save your address selection. Please try again.';
      render();
    }
  }

  async function gotoCalendar() {
    state.step = STEP.CALENDAR;
    state.loading = true;
    state.availability = null;
    render();

    try {
      const res = await apiGet('/availability', { sessionId: state.sessionId });
      state.availability = res;
      state.loading = false;
      render();
    } catch (err) {
      console.error('[ClubBooking] availability failed:', err);
      state.loading = false;
      state.error   = `Couldn't load availability. Please call ${CONFIG.companyPhone}.`;
      render();
    }
  }

  function pickDate(date) {
    state.selectedDate = date;
    state.selectedSlot = null;
    render();
  }

  function pickSlot(idxStr) {
    const idx = parseInt(idxStr, 10);
    const day = (state.availability?.availableDays || []).find(d => d.date === state.selectedDate);
    if (!day || !Number.isFinite(idx) || idx < 0 || idx >= day.slots.length) return;
    state.selectedSlot = day.slots[idx];
    render();
  }

  function gotoConfirm() {
    if (!state.selectedSlot) return;
    state.weatherAcked = false; // force re-acknowledgement
    state.step = STEP.CONFIRM;
    render();
  }

  function backToCalendar() {
    state.step = STEP.CALENDAR;
    render();
  }

  async function confirmBooking() {
    if (!state.weatherAcked) {
      state.error = 'Please acknowledge the weather notice to continue.';
      render();
      return;
    }
    if (!state.selectedSlot) {
      state.error = 'Please pick a time slot first.';
      render();
      return;
    }

    state.step = STEP.BOOKING;
    render();

    try {
      const res = await api('POST', '/confirm', {
        sessionId:           state.sessionId,
        selectedSlot:        state.selectedSlot,
        weatherAcknowledged: true,
      });
      if (res.success) {
        state.confirmation = res.confirmation;
        state.step = STEP.SUCCESS;
        render();
      } else {
        state.step  = STEP.CONFIRM;
        state.error = res.message || `Could not complete booking. Please call ${CONFIG.companyPhone}.`;
        render();
      }
    } catch (err) {
      console.error('[ClubBooking] confirm failed:', err);
      state.step  = STEP.CONFIRM;
      state.error = `Something went wrong. Please call ${CONFIG.companyPhone} to complete your booking.`;
      render();
    }
  }

  function gotoLateCallback() {
    state.step = STEP.LATE_CALLBACK;
    render();
  }

  async function submitLateCallback() {
    state.step = STEP.LATE_SENDING;
    render();

    try {
      const res = await api('POST', '/late-callback', {
        sessionId: state.sessionId,
        message:   state.lateMessage,
      });
      if (res.success) {
        state.step = STEP.LATE_SUCCESS;
      } else {
        state.step = STEP.LATE_CALLBACK;
        state.error = res.message || `Could not send request. Please call ${CONFIG.companyPhone}.`;
      }
      render();
    } catch (err) {
      console.error('[ClubBooking] late-callback failed:', err);
      state.step  = STEP.LATE_CALLBACK;
      state.error = `Something went wrong. Please call ${CONFIG.companyPhone}.`;
      render();
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // ABANDON DETECTION
  // ──────────────────────────────────────────────────────────────────
  // Skip abandon when:
  //   - a terminal SUCCESS step is showing (booking done, form sent, etc.)
  //   - an email has already fired for this session (OFFICE_VERIFYING —
  //     the server already emailed on lookup)
  //   - a request is currently in flight (SENDING / BOOKING states) —
  //     the server will set officeNotified when it finishes so we avoid
  //     a race where both abandon + form-submit both fire emails.
  //
  // Crucial: NEEDS_INFO_FORM is NOT in the skip list. If the customer
  // closes the tab while on the form, the abandon email WILL fire on
  // the server (since officeNotified stays false for that state).
  // That's our safety net — no leads get lost.
  function shouldSkipAbandon() {
    return state.step === STEP.SUCCESS
        || state.step === STEP.LATE_SUCCESS
        || state.step === STEP.NEEDS_INFO_SUCCESS
        || state.step === STEP.OFFICE_VERIFYING
        || state.step === STEP.BOOKING
        || state.step === STEP.LATE_SENDING
        || state.step === STEP.NEEDS_INFO_SENDING;
  }

  function setupAbandonHandlers() {
    window.addEventListener('beforeunload', () => {
      if (!state.sessionId) return;
      if (shouldSkipAbandon()) return;
      try {
        const payload = JSON.stringify({ sessionId: state.sessionId, reason: 'unload' });
        navigator.sendBeacon(
          `${CONFIG.serverUrl}/api/club-booking/abandon`,
          new Blob([payload], { type: 'application/json' })
        );
      } catch (_) { /* best effort */ }
    });

    // visibilitychange: mobile tab switched away for a long time
    let hiddenTimer = null;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.sessionId && !shouldSkipAbandon()) {
        hiddenTimer = setTimeout(() => {
          try {
            const payload = JSON.stringify({ sessionId: state.sessionId, reason: 'close' });
            navigator.sendBeacon(
              `${CONFIG.serverUrl}/api/club-booking/abandon`,
              new Blob([payload], { type: 'application/json' })
            );
          } catch (_) {}
        }, 60_000); // 1 minute hidden
      } else if (hiddenTimer) {
        clearTimeout(hiddenTimer);
        hiddenTimer = null;
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // INIT
  // ──────────────────────────────────────────────────────────────────
  async function init() {
    const container = document.getElementById(CONFIG.containerId);
    if (!container) {
      console.error(`[ClubBooking] Container #${CONFIG.containerId} not found`);
      return;
    }

    root = document.createElement('div');
    root.id = 'rox-club-booking-root';
    container.appendChild(root);

    injectStyles();

    // Show loading state immediately so the page isn't blank
    state.step = STEP.LOOKING_UP;
    render();

    try {
      const res = await fetch(`${CONFIG.serverUrl}/api/club-booking/start`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tenantId: CONFIG.tenantId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.sessionId = data.sessionId;
      state.campaign  = data.campaign || null;
      state.step      = STEP.PHONE;
      render();
      console.log('[ClubBooking] Session started:', state.sessionId);
    } catch (err) {
      console.error('[ClubBooking] Failed to start session:', err);
      state.step  = STEP.PHONE;
      state.error = `Trouble connecting. Please call ${CONFIG.companyPhone}.`;
      render();
    }

    setupAbandonHandlers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
