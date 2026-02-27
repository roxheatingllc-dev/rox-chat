/**
 * ROX Booking Widget v1.0 - Self-Service Scheduling Wizard
 * 
 * Embed on any website:
 * <script>
 *   window.ROX_BOOKING_CONFIG = {
 *     serverUrl: "https://rox-chat-production.up.railway.app",
 *     theme: "rox-default",         // optional - loads from theme API
 *     containerId: "rox-booking",   // optional - target element ID
 *     companyName: "ROX Heating & Air",
 *     companyPhone: "(720) 468-0689"
 *   };
 * </script>
 * <div id="rox-booking"></div>
 * <script src="https://rox-chat-production.up.railway.app/widget/booking-widget.js"></script>
 * 
 * Multi-tenant ready: pass tenantId in config for SaaS deployment
 */

(function() {
  'use strict';

  // ============================================
  // INITIALIZATION GUARD
  // ============================================
  if (window.__ROX_BOOKING_INIT__) return;
  window.__ROX_BOOKING_INIT__ = true;

  // ============================================
  // CONFIG
  // ============================================
  const CONFIG = Object.assign({
    serverUrl: '',
    theme: 'rox-default',
    containerId: 'rox-booking',
    tenantId: 'rox-heating',
    companyName: 'ROX Heating & Air',
    companyPhone: '(720) 468-0689'
  }, window.ROX_BOOKING_CONFIG || {});

  // ============================================
  // DEFAULT THEME (fallback if server theme fails)
  // ============================================
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

  // ============================================
  // STATE MACHINE
  // ============================================
  const STEPS = {
    // Shared steps (all customers)
    SERVICE_TYPE: 'service_type',
    CUSTOMER_TYPE: 'customer_type',
    // Existing customer path
    PHONE_LOOKUP: 'phone_lookup',
    // New customer path (also used by existing after lookup)
    SYSTEM_AGE: 'system_age',
    CALENDAR: 'calendar',
    DESCRIBE_ISSUE: 'describe_issue',
    // New customer only
    ADDRESS: 'address',
    CONTACT_INFO: 'contact_info',
    // Final
    CONFIRM: 'confirm',
    SUCCESS: 'success'
  };

  // Step order for each path
  const STEP_FLOW = {
    new: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.SYSTEM_AGE,
      STEPS.CALENDAR, STEPS.DESCRIBE_ISSUE, STEPS.ADDRESS,
      STEPS.CONTACT_INFO, STEPS.CONFIRM
    ],
    existing: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.PHONE_LOOKUP,
      STEPS.SYSTEM_AGE, STEPS.CALENDAR, STEPS.DESCRIBE_ISSUE,
      STEPS.CONFIRM
    ]
  };

  // State
  let state = {
    sessionId: null,
    currentStep: STEPS.SERVICE_TYPE,
    path: null, // 'new' or 'existing'
    data: {
      serviceType: null,
      customerType: null,
      systemAge: null,
      selectedDate: null,
      selectedSlot: null,
      issue: '',
      name: '',
      phone: '',
      email: '',
      address: { street: '', city: '', state: 'CO', zip: '' },
      customer: null // existing customer from lookup
    },
    availability: null,
    loading: false,
    error: null,
    confirmation: null
  };

  // ============================================
  // API HELPERS
  // ============================================
  async function api(method, path, body = null) {
    const url = `${CONFIG.serverUrl}/api/booking${path}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
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
  // THEME LOADER
  // ============================================
  async function loadTheme() {
    if (!CONFIG.serverUrl || !CONFIG.theme) return;
    try {
      const res = await fetch(`${CONFIG.serverUrl}/api/themes/${CONFIG.theme}`);
      if (res.ok) {
        const themeData = await res.json();
        // Merge booking-specific defaults with loaded theme colors
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

    // Load font
    if (F.importUrl) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = F.importUrl;
      document.head.appendChild(link);
    }

    const style = document.createElement('style');
    style.textContent = `
      /* ======== RESET ======== */
      #rox-booking-root * { box-sizing: border-box; margin: 0; font-family: ${F.family}; }

      /* ======== CONTAINER ======== */
      #rox-booking-root {
        max-width: 640px;
        margin: 0 auto;
        color: ${C.text};
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
      }

      /* ======== HEADER ======== */
      .rxb-header {
        text-align: center;
        margin-bottom: 28px;
      }
      .rxb-header h2 {
        font-size: 26px;
        font-weight: 700;
        color: ${C.text};
        margin-bottom: 6px;
        letter-spacing: -0.3px;
      }
      .rxb-header p {
        font-size: 15px;
        color: ${C.textSecondary};
      }

      /* ======== PROGRESS BAR ======== */
      .rxb-progress {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 32px;
        padding: 0 4px;
      }
      .rxb-progress-segment {
        flex: 1;
        height: 4px;
        border-radius: 2px;
        background: ${C.progressBg};
        transition: background 0.4s ease;
      }
      .rxb-progress-segment.active {
        background: ${C.progressFill};
      }

      /* ======== STEP CARD ======== */
      .rxb-card {
        background: ${C.cardBg};
        border: 1px solid ${C.cardBorder};
        border-radius: ${R}px;
        padding: 32px 28px;
        box-shadow: ${THEME.cardShadow};
        animation: rxbFadeIn 0.35s ease;
      }
      @keyframes rxbFadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .rxb-card-title {
        font-size: 18px;
        font-weight: 600;
        color: ${C.text};
        margin-bottom: 6px;
      }
      .rxb-card-subtitle {
        font-size: 14px;
        color: ${C.textSecondary};
        margin-bottom: 24px;
      }

      /* ======== STEP BUTTONS ======== */
      .rxb-options {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .rxb-option-btn {
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        padding: 16px 20px;
        background: ${C.stepBtnBg};
        border: 1.5px solid ${C.stepBtnBorder};
        border-radius: ${R}px;
        cursor: pointer;
        text-align: left;
        font-size: 15px;
        font-weight: 500;
        color: ${C.text};
        transition: all 0.2s ease;
      }
      .rxb-option-btn:hover {
        border-color: ${C.stepBtnHoverBorder};
        background: ${C.stepBtnHoverBg};
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .rxb-option-btn.selected {
        border-color: ${C.primary};
        background: ${C.primaryLight};
        color: ${C.primary};
        font-weight: 600;
      }
      .rxb-option-icon {
        font-size: 22px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${C.primaryLight};
        border-radius: 10px;
        flex-shrink: 0;
      }
      .rxb-option-label { font-weight: 600; }
      .rxb-option-desc {
        font-size: 13px;
        color: ${C.textMuted};
        font-weight: 400;
        margin-top: 2px;
      }

      /* ======== FORM INPUTS ======== */
      .rxb-field {
        margin-bottom: 18px;
      }
      .rxb-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: ${C.textSecondary};
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .rxb-input, .rxb-textarea {
        width: 100%;
        padding: 12px 16px;
        font-size: 15px;
        border: 1.5px solid ${C.inputBorder};
        border-radius: ${R - 2}px;
        background: ${C.inputBg};
        color: ${C.text};
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .rxb-input:focus, .rxb-textarea:focus {
        border-color: ${C.inputFocus};
        box-shadow: 0 0 0 3px ${C.primaryLight};
      }
      .rxb-input::placeholder, .rxb-textarea::placeholder {
        color: ${C.textMuted};
      }
      .rxb-textarea {
        min-height: 100px;
        resize: vertical;
        font-family: ${F.family};
      }
      .rxb-input-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      @media (max-width: 480px) {
        .rxb-input-row { grid-template-columns: 1fr; }
      }

      /* ======== CALENDAR ======== */
      .rxb-calendar {
        margin-bottom: 20px;
      }
      .rxb-cal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }
      .rxb-cal-title {
        font-size: 16px;
        font-weight: 600;
      }
      .rxb-cal-nav {
        display: flex;
        gap: 6px;
      }
      .rxb-cal-nav-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid ${C.cardBorder};
        border-radius: 8px;
        background: ${C.cardBg};
        cursor: pointer;
        font-size: 14px;
        color: ${C.textSecondary};
        transition: all 0.15s ease;
      }
      .rxb-cal-nav-btn:hover { border-color: ${C.primary}; color: ${C.primary}; }
      .rxb-cal-nav-btn:disabled { opacity: 0.3; cursor: default; }
      .rxb-cal-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        text-align: center;
      }
      .rxb-cal-dow {
        font-size: 11px;
        font-weight: 600;
        color: ${C.textMuted};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 8px 0;
      }
      .rxb-cal-day {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 500;
        border-radius: 10px;
        border: none;
        background: transparent;
        color: ${C.textMuted};
        cursor: default;
        transition: all 0.15s ease;
      }
      .rxb-cal-day.empty { visibility: hidden; }
      .rxb-cal-day.today {
        background: ${C.calendarToday};
        color: ${C.text};
      }
      .rxb-cal-day.available {
        background: ${C.primaryLight};
        color: ${C.primary};
        font-weight: 600;
        cursor: pointer;
      }
      .rxb-cal-day.available:hover {
        background: ${C.primary};
        color: #fff;
        transform: scale(1.08);
      }
      .rxb-cal-day.selected {
        background: ${C.calendarSelected};
        color: #fff;
        font-weight: 700;
        box-shadow: 0 2px 8px ${hexToRgba(C.primary, 0.35)};
      }
      .rxb-cal-day.past { opacity: 0.3; }

      /* ======== TIME SLOTS ======== */
      .rxb-slots {
        margin-top: 20px;
        animation: rxbFadeIn 0.3s ease;
      }
      .rxb-slots-title {
        font-size: 14px;
        font-weight: 600;
        color: ${C.textSecondary};
        margin-bottom: 12px;
      }
      .rxb-slots-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 8px;
      }
      .rxb-slot-btn {
        padding: 10px 12px;
        font-size: 14px;
        font-weight: 500;
        border: 1.5px solid ${C.cardBorder};
        border-radius: ${R - 2}px;
        background: ${C.cardBg};
        color: ${C.text};
        cursor: pointer;
        text-align: center;
        transition: all 0.2s ease;
      }
      .rxb-slot-btn:hover {
        border-color: ${C.primary};
        background: ${C.primaryLight};
        color: ${C.primary};
      }
      .rxb-slot-btn.selected {
        border-color: ${C.primary};
        background: ${C.primary};
        color: #fff;
        font-weight: 600;
      }

      /* ======== NAVIGATION ======== */
      .rxb-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 28px;
        padding-top: 20px;
        border-top: 1px solid ${C.cardBorder};
      }
      .rxb-back-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 18px;
        font-size: 14px;
        font-weight: 500;
        color: ${C.textSecondary};
        background: transparent;
        border: 1.5px solid ${C.cardBorder};
        border-radius: ${R - 2}px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .rxb-back-btn:hover { border-color: ${C.textSecondary}; color: ${C.text}; }
      .rxb-next-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 12px 28px;
        font-size: 15px;
        font-weight: 600;
        color: #fff;
        background: ${C.primary};
        border: none;
        border-radius: ${R - 2}px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px ${hexToRgba(C.primary, 0.3)};
      }
      .rxb-next-btn:hover {
        background: ${C.primaryHover};
        transform: translateY(-1px);
        box-shadow: 0 4px 14px ${hexToRgba(C.primary, 0.4)};
      }
      .rxb-next-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      /* ======== CONFIRMATION ======== */
      .rxb-summary {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .rxb-summary-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid ${C.cardBorder};
        font-size: 14px;
      }
      .rxb-summary-label { color: ${C.textSecondary}; font-weight: 500; }
      .rxb-summary-value { font-weight: 600; color: ${C.text}; text-align: right; }

      /* ======== SUCCESS ======== */
      .rxb-success {
        text-align: center;
        padding: 20px 0;
      }
      .rxb-success-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: ${C.successBg};
        border: 2px solid ${C.successBorder};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        margin: 0 auto 20px;
        animation: rxbPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      @keyframes rxbPop {
        0% { transform: scale(0); }
        100% { transform: scale(1); }
      }
      .rxb-success h3 {
        font-size: 22px;
        font-weight: 700;
        color: ${C.successText};
        margin-bottom: 8px;
      }
      .rxb-success p {
        font-size: 15px;
        color: ${C.textSecondary};
        margin-bottom: 4px;
      }

      /* ======== LOADING ======== */
      .rxb-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 0;
        gap: 16px;
      }
      .rxb-spinner {
        width: 36px;
        height: 36px;
        border: 3px solid ${C.progressBg};
        border-top-color: ${C.primary};
        border-radius: 50%;
        animation: rxbSpin 0.8s linear infinite;
      }
      @keyframes rxbSpin { to { transform: rotate(360deg); } }
      .rxb-loading-text {
        font-size: 14px;
        color: ${C.textSecondary};
      }

      /* ======== ERROR ======== */
      .rxb-error {
        padding: 14px 18px;
        background: ${C.errorBg};
        border: 1px solid ${C.errorBorder};
        border-radius: ${R - 2}px;
        color: ${C.errorText};
        font-size: 14px;
        margin-bottom: 16px;
      }

      /* ======== CUSTOMER FOUND CARD ======== */
      .rxb-customer-card {
        padding: 16px 20px;
        background: ${C.successBg};
        border: 1px solid ${C.successBorder};
        border-radius: ${R - 2}px;
        margin-bottom: 20px;
      }
      .rxb-customer-card h4 {
        font-size: 15px;
        font-weight: 600;
        color: ${C.successText};
        margin-bottom: 4px;
      }
      .rxb-customer-card p {
        font-size: 13px;
        color: ${C.textSecondary};
      }

      /* ======== PHONE INPUT WITH FORMATTING ======== */
      .rxb-phone-wrapper {
        position: relative;
      }
      .rxb-phone-prefix {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        color: ${C.textMuted};
        font-size: 15px;
        pointer-events: none;
      }

      /* ======== RESPONSIVE ======== */
      @media (max-width: 480px) {
        .rxb-card { padding: 24px 18px; }
        .rxb-header h2 { font-size: 22px; }
        .rxb-slots-grid { grid-template-columns: repeat(2, 1fr); }
      }
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

    const stepIdx = getStepIndex();
    const totalSteps = getTotalSteps();

    let html = '';

    // Header
    html += `
      <div class="rxb-header">
        <h2>Book an Appointment</h2>
        <p>Schedule your service with ${CONFIG.companyName}</p>
      </div>
    `;

    // Progress bar (hide on success)
    if (state.currentStep !== STEPS.SUCCESS) {
      html += '<div class="rxb-progress">';
      for (let i = 0; i < totalSteps; i++) {
        html += `<div class="rxb-progress-segment${i <= stepIdx ? ' active' : ''}"></div>`;
      }
      html += '</div>';
    }

    // Step content
    html += renderStep();

    root.innerHTML = html;
    attachEvents();
  }

  function renderStep() {
    switch (state.currentStep) {
      case STEPS.SERVICE_TYPE: return renderServiceType();
      case STEPS.CUSTOMER_TYPE: return renderCustomerType();
      case STEPS.PHONE_LOOKUP: return renderPhoneLookup();
      case STEPS.SYSTEM_AGE: return renderSystemAge();
      case STEPS.CALENDAR: return renderCalendar();
      case STEPS.DESCRIBE_ISSUE: return renderDescribeIssue();
      case STEPS.ADDRESS: return renderAddress();
      case STEPS.CONTACT_INFO: return renderContactInfo();
      case STEPS.CONFIRM: return renderConfirm();
      case STEPS.SUCCESS: return renderSuccess();
      default: return '<p>Unknown step</p>';
    }
  }

  // ============================================
  // STEP RENDERERS
  // ============================================

  function renderServiceType() {
    const options = [
      { value: 'repair', icon: '🔧', label: 'Repair Service', desc: 'Fix a broken or malfunctioning system' },
      { value: 'estimate', icon: '📋', label: 'Free Estimate', desc: 'Get a quote for a new system installation' },
      { value: 'maintenance', icon: '🛡️', label: 'Maintenance', desc: 'Annual tune-up and system check' }
    ];

    return `
      <div class="rxb-card">
        <div class="rxb-card-title">What do you need help with?</div>
        <div class="rxb-card-subtitle">Select the service you're looking for</div>
        <div class="rxb-options">
          ${options.map(o => `
            <button class="rxb-option-btn${state.data.serviceType === o.value ? ' selected' : ''}" data-action="select-service" data-value="${o.value}">
              <div class="rxb-option-icon">${o.icon}</div>
              <div>
                <div class="rxb-option-label">${o.label}</div>
                <div class="rxb-option-desc">${o.desc}</div>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderCustomerType() {
    const options = [
      { value: 'existing', icon: '👤', label: 'Existing Customer', desc: 'I\'ve used ROX before' },
      { value: 'new', icon: '👋', label: 'New Customer', desc: 'This is my first time' }
    ];

    return `
      <div class="rxb-card">
        <div class="rxb-card-title">Have you worked with us before?</div>
        <div class="rxb-card-subtitle">This helps us look up your account</div>
        <div class="rxb-options">
          ${options.map(o => `
            <button class="rxb-option-btn${state.data.customerType === o.value ? ' selected' : ''}" data-action="select-customer-type" data-value="${o.value}">
              <div class="rxb-option-icon">${o.icon}</div>
              <div>
                <div class="rxb-option-label">${o.label}</div>
                <div class="rxb-option-desc">${o.desc}</div>
              </div>
            </button>
          `).join('')}
        </div>
        ${renderNav(true, false)}
      </div>
    `;
  }

  function renderPhoneLookup() {
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    const customerHtml = state.data.customer ? `
      <div class="rxb-customer-card">
        <h4>✓ Welcome back, ${state.data.customer.firstName || state.data.name}!</h4>
        <p>${state.data.customer.address ? `${state.data.customer.address.street}, ${state.data.customer.address.city}` : 'Account found'}</p>
      </div>
    ` : '';

    if (state.loading) {
      return `
        <div class="rxb-card">
          <div class="rxb-loading">
            <div class="rxb-spinner"></div>
            <div class="rxb-loading-text">Looking up your account...</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="rxb-card">
        <div class="rxb-card-title">Let's find your account</div>
        <div class="rxb-card-subtitle">Enter the phone number on your account</div>
        ${errorHtml}
        ${customerHtml}
        <div class="rxb-field">
          <label class="rxb-label">Phone Number</label>
          <input type="tel" class="rxb-input" id="rxb-phone" placeholder="(720) 555-1234" 
            value="${formatPhone(state.data.phone)}" maxlength="14" autocomplete="tel">
        </div>
        ${!state.data.customer ? `
          <button class="rxb-next-btn" style="width:100%" data-action="lookup-phone" ${!state.data.phone || state.data.phone.length < 10 ? 'disabled' : ''}>
            Look Up Account
          </button>
        ` : ''}
        ${renderNav(true, !!state.data.customer)}
      </div>
    `;
  }

  function renderSystemAge() {
    const options = [
      { value: '0-2', icon: '🆕', label: '0–2 Years', desc: 'Nearly new system' },
      { value: '3-5', icon: '✅', label: '3–5 Years', desc: 'Moderate use' },
      { value: '6-10', icon: '⚠️', label: '6–10 Years', desc: 'Aging system' },
      { value: '10+', icon: '🔴', label: '10+ Years', desc: 'May need replacement' }
    ];

    return `
      <div class="rxb-card">
        <div class="rxb-card-title">How old is your system?</div>
        <div class="rxb-card-subtitle">This helps us send the right technician</div>
        <div class="rxb-options">
          ${options.map(o => `
            <button class="rxb-option-btn${state.data.systemAge === o.value ? ' selected' : ''}" data-action="select-age" data-value="${o.value}">
              <div class="rxb-option-icon">${o.icon}</div>
              <div>
                <div class="rxb-option-label">${o.label}</div>
                <div class="rxb-option-desc">${o.desc}</div>
              </div>
            </button>
          `).join('')}
        </div>
        ${renderNav(true, false)}
      </div>
    `;
  }

  function renderCalendar() {
    if (state.loading) {
      return `
        <div class="rxb-card">
          <div class="rxb-loading">
            <div class="rxb-spinner"></div>
            <div class="rxb-loading-text">Checking available times...</div>
          </div>
        </div>
      `;
    }

    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    
    if (!state.availability || state.availability.availableDays.length === 0) {
      return `
        <div class="rxb-card">
          <div class="rxb-card-title">Pick a Date & Time</div>
          ${errorHtml}
          <div style="text-align:center; padding: 30px 0;">
            <p style="font-size: 16px; margin-bottom: 12px;">No available times found in the next 14 days.</p>
            <p style="font-size: 14px; color: ${THEME.colors.textSecondary}">
              Please call us at <strong>${CONFIG.companyPhone}</strong> and we'll find a time that works.
            </p>
          </div>
          ${renderNav(true, false)}
        </div>
      `;
    }

    // Build calendar month view
    const availDates = new Set(state.availability.availableDays.map(d => d.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Use the first available date's month, or current month
    const calMonth = state._calMonth || today.getMonth();
    const calYear = state._calYear || today.getFullYear();
    
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();
    
    const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let daysHtml = '';
    // Day of week headers
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
      daysHtml += `<div class="rxb-cal-dow">${d}</div>`;
    });

    // Empty cells before first day
    for (let i = 0; i < startDow; i++) {
      daysHtml += '<div class="rxb-cal-day empty"></div>';
    }

    // Day cells
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

    // Time slots for selected date
    let slotsHtml = '';
    if (state.data.selectedDate) {
      const dayData = state.availability.availableDays.find(d => d.date === state.data.selectedDate);
      if (dayData && dayData.slots.length > 0) {
        slotsHtml = `
          <div class="rxb-slots">
            <div class="rxb-slots-title">Available times for ${dayData.displayDate}</div>
            <div class="rxb-slots-grid">
              ${dayData.slots.map((s, i) => `
                <button class="rxb-slot-btn${state.data.selectedSlot && state.data.selectedSlot.start === s.start ? ' selected' : ''}" 
                  data-action="select-slot" data-idx="${i}">
                  ${s.formatted}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    // Can user go to prev/next month?
    const canPrev = calMonth > today.getMonth() || calYear > today.getFullYear();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 21);
    const canNext = new Date(calYear, calMonth + 1, 1) <= maxDate;

    return `
      <div class="rxb-card">
        <div class="rxb-card-title">Pick a Date & Time</div>
        <div class="rxb-card-subtitle">Select an available day, then choose a time slot</div>
        ${errorHtml}
        <div class="rxb-calendar">
          <div class="rxb-cal-header">
            <button class="rxb-cal-nav-btn" data-action="cal-prev" ${!canPrev ? 'disabled' : ''}>‹</button>
            <div class="rxb-cal-title">${monthName}</div>
            <button class="rxb-cal-nav-btn" data-action="cal-next" ${!canNext ? 'disabled' : ''}>›</button>
          </div>
          <div class="rxb-cal-grid">${daysHtml}</div>
        </div>
        ${slotsHtml}
        ${renderNav(true, !!state.data.selectedSlot)}
      </div>
    `;
  }

  function renderDescribeIssue() {
    return `
      <div class="rxb-card">
        <div class="rxb-card-title">Describe Your Issue</div>
        <div class="rxb-card-subtitle">Help our technician prepare for your visit</div>
        <div class="rxb-field">
          <label class="rxb-label">What's going on?</label>
          <textarea class="rxb-textarea" id="rxb-issue" placeholder="e.g., My AC is blowing warm air, making a loud noise, furnace won't turn on...">${state.data.issue || ''}</textarea>
        </div>
        ${renderNav(true, true)}
      </div>
    `;
  }

  function renderAddress() {
    const a = state.data.address;
    return `
      <div class="rxb-card">
        <div class="rxb-card-title">Service Address</div>
        <div class="rxb-card-subtitle">Where should we send the technician?</div>
        <div class="rxb-field">
          <label class="rxb-label">Street Address</label>
          <input type="text" class="rxb-input" id="rxb-street" placeholder="123 Main St" value="${a.street}" autocomplete="street-address">
        </div>
        <div class="rxb-input-row">
          <div class="rxb-field">
            <label class="rxb-label">City</label>
            <input type="text" class="rxb-input" id="rxb-city" placeholder="Denver" value="${a.city}" autocomplete="address-level2">
          </div>
          <div class="rxb-field">
            <label class="rxb-label">Zip Code</label>
            <input type="text" class="rxb-input" id="rxb-zip" placeholder="80202" value="${a.zip}" maxlength="5" autocomplete="postal-code">
          </div>
        </div>
        ${renderNav(true, true)}
      </div>
    `;
  }

  function renderContactInfo() {
    return `
      <div class="rxb-card">
        <div class="rxb-card-title">Your Contact Info</div>
        <div class="rxb-card-subtitle">So we can reach you about your appointment</div>
        <div class="rxb-field">
          <label class="rxb-label">Full Name</label>
          <input type="text" class="rxb-input" id="rxb-name" placeholder="John Smith" value="${state.data.name}" autocomplete="name">
        </div>
        <div class="rxb-field">
          <label class="rxb-label">Phone Number</label>
          <input type="tel" class="rxb-input" id="rxb-contact-phone" placeholder="(720) 555-1234" 
            value="${formatPhone(state.data.phone)}" maxlength="14" autocomplete="tel">
        </div>
        <div class="rxb-field">
          <label class="rxb-label">Email (optional)</label>
          <input type="email" class="rxb-input" id="rxb-email" placeholder="john@example.com" value="${state.data.email}" autocomplete="email">
        </div>
        ${renderNav(true, true)}
      </div>
    `;
  }

  function renderConfirm() {
    if (state.loading) {
      return `
        <div class="rxb-card">
          <div class="rxb-loading">
            <div class="rxb-spinner"></div>
            <div class="rxb-loading-text">Confirming your appointment...</div>
          </div>
        </div>
      `;
    }

    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    const d = state.data;
    const slotDay = state.availability?.availableDays?.find(day => day.date === d.selectedDate);
    const dateDisplay = slotDay ? slotDay.displayDate : d.selectedDate;
    const timeDisplay = d.selectedSlot?.formatted || '';

    const serviceLabels = { repair: 'Repair Service', estimate: 'Free Estimate', maintenance: 'Maintenance' };
    const ageLabels = { '0-2': '0–2 Years', '3-5': '3–5 Years', '6-10': '6–10 Years', '10+': '10+ Years' };

    let addressStr = '';
    if (d.address && d.address.street) {
      addressStr = `${d.address.street}, ${d.address.city}, ${d.address.state} ${d.address.zip}`;
    } else if (d.customer?.address) {
      const ca = d.customer.address;
      addressStr = `${ca.street}, ${ca.city}`;
    }

    return `
      <div class="rxb-card">
        <div class="rxb-card-title">Review & Confirm</div>
        <div class="rxb-card-subtitle">Make sure everything looks right</div>
        ${errorHtml}
        <div class="rxb-summary">
          <div class="rxb-summary-row">
            <span class="rxb-summary-label">Service</span>
            <span class="rxb-summary-value">${serviceLabels[d.serviceType] || d.serviceType}</span>
          </div>
          <div class="rxb-summary-row">
            <span class="rxb-summary-label">Date & Time</span>
            <span class="rxb-summary-value">${dateDisplay} at ${timeDisplay}</span>
          </div>
          <div class="rxb-summary-row">
            <span class="rxb-summary-label">System Age</span>
            <span class="rxb-summary-value">${ageLabels[d.systemAge] || d.systemAge}</span>
          </div>
          ${d.issue ? `
            <div class="rxb-summary-row">
              <span class="rxb-summary-label">Issue</span>
              <span class="rxb-summary-value" style="max-width:60%">${escapeHtml(d.issue)}</span>
            </div>
          ` : ''}
          <div class="rxb-summary-row">
            <span class="rxb-summary-label">Name</span>
            <span class="rxb-summary-value">${escapeHtml(d.name)}</span>
          </div>
          ${d.phone ? `
            <div class="rxb-summary-row">
              <span class="rxb-summary-label">Phone</span>
              <span class="rxb-summary-value">${formatPhone(d.phone)}</span>
            </div>
          ` : ''}
          ${addressStr ? `
            <div class="rxb-summary-row">
              <span class="rxb-summary-label">Address</span>
              <span class="rxb-summary-value" style="max-width:60%">${escapeHtml(addressStr)}</span>
            </div>
          ` : ''}
        </div>
        <div class="rxb-nav" style="border-top:none; margin-top:24px; padding-top:0;">
          <button class="rxb-back-btn" data-action="back">← Back</button>
          <button class="rxb-next-btn" data-action="confirm-booking">Confirm Booking ✓</button>
        </div>
      </div>
    `;
  }

  function renderSuccess() {
    const c = state.confirmation;
    return `
      <div class="rxb-card">
        <div class="rxb-success">
          <div class="rxb-success-icon">✓</div>
          <h3>You're All Set!</h3>
          <p>Your appointment has been confirmed.</p>
          ${c ? `
            <div style="margin-top:20px; text-align:left;">
              <div class="rxb-summary">
                <div class="rxb-summary-row">
                  <span class="rxb-summary-label">Service</span>
                  <span class="rxb-summary-value">${escapeHtml(c.service)}</span>
                </div>
                <div class="rxb-summary-row">
                  <span class="rxb-summary-label">Date</span>
                  <span class="rxb-summary-value">${escapeHtml(c.date)}</span>
                </div>
                <div class="rxb-summary-row">
                  <span class="rxb-summary-label">Time</span>
                  <span class="rxb-summary-value">${escapeHtml(c.time)}</span>
                </div>
              </div>
            </div>
          ` : ''}
          <p style="margin-top:24px; font-size:13px; color:${THEME.colors.textMuted}">
            Questions? Call us at <strong>${CONFIG.companyPhone}</strong>
          </p>
        </div>
      </div>
    `;
  }

  // ============================================
  // NAV HELPER
  // ============================================
  function renderNav(showBack, showNext) {
    // Don't show back on first step
    const isFirst = state.currentStep === STEPS.SERVICE_TYPE;
    
    return `
      <div class="rxb-nav">
        ${showBack && !isFirst ? '<button class="rxb-back-btn" data-action="back">← Back</button>' : '<div></div>'}
        ${showNext ? '<button class="rxb-next-btn" data-action="next">Continue →</button>' : '<div></div>'}
      </div>
    `;
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================
  function attachEvents() {
    root.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', handleAction);
    });

    // Phone input formatting
    const phoneInput = root.querySelector('#rxb-phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        const digits = e.target.value.replace(/\D/g, '').substring(0, 10);
        state.data.phone = digits;
        e.target.value = formatPhone(digits);
        // Enable/disable lookup button
        const btn = root.querySelector('[data-action="lookup-phone"]');
        if (btn) btn.disabled = digits.length < 10;
      });
    }

    const contactPhone = root.querySelector('#rxb-contact-phone');
    if (contactPhone) {
      contactPhone.addEventListener('input', (e) => {
        const digits = e.target.value.replace(/\D/g, '').substring(0, 10);
        state.data.phone = digits;
        e.target.value = formatPhone(digits);
      });
    }
  }

  async function handleAction(e) {
    const action = e.currentTarget.dataset.action;
    const value = e.currentTarget.dataset.value;

    switch (action) {
      case 'select-service':
        state.data.serviceType = value;
        goToStep(STEPS.CUSTOMER_TYPE);
        break;

      case 'select-customer-type':
        state.data.customerType = value;
        state.path = value; // 'new' or 'existing'
        if (value === 'existing') {
          goToStep(STEPS.PHONE_LOOKUP);
        } else {
          goToStep(STEPS.SYSTEM_AGE);
        }
        break;

      case 'lookup-phone':
        await lookupCustomer();
        break;

      case 'select-age':
        state.data.systemAge = value;
        // Send all accumulated data so engine can calculate tech tag
        await updateSession({
          serviceType: state.data.serviceType,
          customerType: state.data.customerType,
          systemAge: value
        });
        goToStep(STEPS.CALENDAR);
        loadAvailability();
        break;

      case 'select-date':
        state.data.selectedDate = value;
        state.data.selectedSlot = null; // Reset slot when date changes
        render();
        break;

      case 'select-slot':
        const dayData = state.availability.availableDays.find(d => d.date === state.data.selectedDate);
        if (dayData) {
          const idx = parseInt(e.currentTarget.dataset.idx);
          state.data.selectedSlot = dayData.slots[idx];
          render();
        }
        break;

      case 'cal-prev':
        if (!state._calMonth && state._calMonth !== 0) {
          state._calMonth = new Date().getMonth();
          state._calYear = new Date().getFullYear();
        }
        state._calMonth--;
        if (state._calMonth < 0) { state._calMonth = 11; state._calYear--; }
        render();
        break;

      case 'cal-next':
        if (!state._calMonth && state._calMonth !== 0) {
          state._calMonth = new Date().getMonth();
          state._calYear = new Date().getFullYear();
        }
        state._calMonth++;
        if (state._calMonth > 11) { state._calMonth = 0; state._calYear++; }
        render();
        break;

      case 'back':
        goBack();
        break;

      case 'next':
        goNext();
        break;

      case 'confirm-booking':
        await confirmBooking();
        break;
    }
  }

  // ============================================
  // NAVIGATION
  // ============================================
  function goToStep(step) {
    state.currentStep = step;
    state.error = null;
    render();
    // Scroll to top of widget
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function goBack() {
    const flow = STEP_FLOW[state.path || 'new'];
    const idx = flow.indexOf(state.currentStep);
    if (idx > 0) {
      // Special case: if going back from system_age for existing, go to phone_lookup
      state.currentStep = flow[idx - 1];
      state.error = null;
      render();
    }
  }

  function goNext() {
    // Save form data before advancing
    saveFormData();

    const flow = STEP_FLOW[state.path || 'new'];
    const idx = flow.indexOf(state.currentStep);
    
    // Validation
    if (!validateStep()) return;

    if (idx < flow.length - 1) {
      const nextStep = flow[idx + 1];
      state.currentStep = nextStep;
      state.error = null;

      // Auto-load availability when reaching calendar
      if (nextStep === STEPS.CALENDAR && !state.availability) {
        loadAvailability();
      }

      render();
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function saveFormData() {
    const issue = root.querySelector('#rxb-issue');
    if (issue) state.data.issue = issue.value.trim();

    const street = root.querySelector('#rxb-street');
    if (street) state.data.address.street = street.value.trim();
    const city = root.querySelector('#rxb-city');
    if (city) state.data.address.city = city.value.trim();
    const zip = root.querySelector('#rxb-zip');
    if (zip) state.data.address.zip = zip.value.trim();

    const name = root.querySelector('#rxb-name');
    if (name) state.data.name = name.value.trim();
    const email = root.querySelector('#rxb-email');
    if (email) state.data.email = email.value.trim();
    const contactPhone = root.querySelector('#rxb-contact-phone');
    if (contactPhone) state.data.phone = contactPhone.value.replace(/\D/g, '');
  }

  function validateStep() {
    switch (state.currentStep) {
      case STEPS.PHONE_LOOKUP:
        if (!state.data.customer && !state.data.phone) {
          state.error = 'Please enter your phone number.';
          render();
          return false;
        }
        return !!state.data.customer;

      case STEPS.CALENDAR:
        if (!state.data.selectedSlot) {
          state.error = 'Please select a date and time slot.';
          render();
          return false;
        }
        return true;

      case STEPS.ADDRESS:
        if (!state.data.address.street || !state.data.address.city || !state.data.address.zip) {
          state.error = 'Please fill in your complete address.';
          render();
          return false;
        }
        if (state.data.address.zip.length < 5) {
          state.error = 'Please enter a valid 5-digit zip code.';
          render();
          return false;
        }
        return true;

      case STEPS.CONTACT_INFO:
        if (!state.data.name) {
          state.error = 'Please enter your name.';
          render();
          return false;
        }
        if (!state.data.phone || state.data.phone.length < 10) {
          state.error = 'Please enter a valid phone number.';
          render();
          return false;
        }
        return true;

      default:
        return true;
    }
  }

  // ============================================
  // API ACTIONS
  // ============================================
  async function startSession() {
    try {
      const result = await api('POST', '/start', { tenantId: CONFIG.tenantId });
      state.sessionId = result.sessionId;
      console.log('[ROX Booking] Session started:', state.sessionId);
    } catch (err) {
      console.error('[ROX Booking] Failed to start session:', err.message);
    }
  }

  async function lookupCustomer() {
    state.loading = true;
    state.error = null;
    render();

    try {
      const result = await api('POST', '/lookup-customer', {
        sessionId: state.sessionId,
        phone: state.data.phone
      });

      state.loading = false;

      if (result.found) {
        state.data.customer = result.customer;
        state.data.name = result.customer.name || '';
        state.data.email = result.customer.email || '';
        if (result.customer.address) {
          state.data.address = result.customer.address;
        }
        render();
      } else {
        // Customer not found - offer to continue as new
        state.error = result.message || 'No account found with that number.';
        render();
      }
    } catch (err) {
      state.loading = false;
      state.error = 'Failed to look up account. Please try again.';
      render();
    }
  }

  async function loadAvailability() {
    state.loading = true;
    state.error = null;
    render();

    try {
      // Compute tech tag locally as fallback
      let tag = 'service tech';
      if (state.data.serviceType === 'maintenance') tag = 'maintenance tech';
      else if (state.data.serviceType === 'estimate') tag = 'sales tech';
      else if (state.data.systemAge === '10+') tag = 'sales tech';

      const result = await apiGet('/availability', {
        sessionId: state.sessionId,
        tag: tag,
        days: '14'
      });

      state.availability = result;
      state.loading = false;

      // Set calendar month to first available date
      if (result.availableDays && result.availableDays.length > 0) {
        const firstDate = new Date(result.availableDays[0].date + 'T12:00:00');
        state._calMonth = firstDate.getMonth();
        state._calYear = firstDate.getFullYear();
      }

      render();
    } catch (err) {
      state.loading = false;
      state.error = 'Failed to load available times. Please try again or call ' + CONFIG.companyPhone;
      render();
    }
  }

  async function updateSession(updates) {
    try {
      await api('POST', '/update-session', {
        sessionId: state.sessionId,
        updates,
        step: state.currentStep
      });
    } catch (err) {
      console.warn('[ROX Booking] Session update failed:', err.message);
    }
  }

  async function confirmBooking() {
    saveFormData();
    state.loading = true;
    state.error = null;
    render();

    try {
      // Final session update with all data
      await updateSession({
        serviceType: state.data.serviceType,
        customerType: state.data.customerType,
        systemAge: state.data.systemAge,
        selectedDate: state.data.selectedDate,
        selectedSlot: state.data.selectedSlot,
        issue: state.data.issue,
        name: state.data.name,
        phone: state.data.phone,
        email: state.data.email,
        address: state.data.address
      });

      const result = await api('POST', '/confirm', { sessionId: state.sessionId });

      state.loading = false;

      if (result.success) {
        state.confirmation = result.confirmation;
        state.currentStep = STEPS.SUCCESS;
        render();
      } else {
        state.error = result.message || 'Failed to confirm booking. Please call ' + CONFIG.companyPhone;
        render();
      }
    } catch (err) {
      state.loading = false;
      state.error = 'Something went wrong. Please call ' + CONFIG.companyPhone + ' to complete your booking.';
      render();
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  function formatPhone(digits) {
    if (!digits) return '';
    const d = digits.replace(/\D/g, '').substring(0, 10);
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
    // Find or create container
    const container = document.getElementById(CONFIG.containerId);
    if (!container) {
      console.error(`[ROX Booking] Container #${CONFIG.containerId} not found`);
      return;
    }

    // Create inner root
    root = document.createElement('div');
    root.id = 'rox-booking-root';
    container.appendChild(root);

    // Load theme and inject styles
    await loadTheme();
    injectStyles();

    // Start session
    await startSession();

    // Initial render
    render();

    console.log('[ROX Booking] Widget initialized');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
