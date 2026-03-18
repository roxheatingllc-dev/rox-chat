/**
 * ROX Booking Widget v1.3 - Self-Service Scheduling Wizard
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
 * <script src="https://rox-chat-production.up.railway.app/widget/booking-widget.js"></script>
 * 
 * v1.3 Changes:
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
    PCC_TYPE: 'pcc_type'
  };

  const STEP_FLOW = {
    new: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.QUICK_INFO,
      STEPS.SYSTEM_AGE, STEPS.CALENDAR, STEPS.DESCRIBE_ISSUE,
      STEPS.ADDRESS, STEPS.CONTACT_INFO, STEPS.CONFIRM
    ],
    existing: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.PHONE_LOOKUP,
      STEPS.SYSTEM_AGE, STEPS.CALENDAR, STEPS.DESCRIBE_ISSUE,
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
      STEPS.PCC_ASK, STEPS.PCC_TYPE, STEPS.CALENDAR,
      STEPS.ADDRESS, STEPS.CONTACT_INFO, STEPS.CONFIRM
    ],
    pcc_existing: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.PHONE_LOOKUP,
      STEPS.PCC_ASK, STEPS.PCC_TYPE, STEPS.CALENDAR, STEPS.CONFIRM
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
      address: { street: '', city: '', state: 'CO', zip: '' },
      isPccMember: null,
      pccType: null, // 'cooling' or 'heating'
      _addrSuggestions: [],
      _addrPicked: false,
      _addrLoading: false,
      _zipConfirmed: false,
      customer: null
    },
    availability: null, loading: false, error: null, confirmation: null
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
      .rxb-cal-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; border-radius: 10px; border: none; background: transparent; color: ${C.textMuted}; cursor: default; transition: all 0.15s ease; }
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
    const stepIdx = getStepIndex();
    const totalSteps = getTotalSteps();
    const isMessage = state.data.serviceType === 'message';
    const headerTitle = isMessage ? 'Send a Message' : 'Book an Appointment';
    const headerSub = isMessage ? `Send a message to ${CONFIG.companyName}` : `Schedule your service with ${CONFIG.companyName}`;
    let html = `<div class="rxb-header"><h2>${headerTitle}</h2><p>${headerSub}</p></div>`;
    if (state.currentStep !== STEPS.SUCCESS) {
      html += '<div class="rxb-progress">';
      for (let i = 0; i < totalSteps; i++) {
        html += `<div class="rxb-progress-segment${i <= stepIdx ? ' active' : ''}"></div>`;
      }
      html += '</div>';
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
      case STEPS.CALENDAR: return renderCalendar();
      case STEPS.DESCRIBE_ISSUE: return renderDescribeIssue();
      case STEPS.MESSAGE: return renderMessage();
      case STEPS.PCC_ASK: return renderPccAsk();
      case STEPS.PCC_TYPE: return renderPccType();
      case STEPS.ADDRESS: return renderAddress();
      case STEPS.CONTACT_INFO: return renderContactInfo();
      case STEPS.CONFIRM: return renderConfirm();
      case STEPS.SUCCESS: return renderSuccess();
      default: return '<p>Unknown step</p>';
    }
  }

  function renderServiceType() {
    const options = [
      { value: 'repair', icon: '\uD83D\uDD27', label: 'Repair Service', desc: 'Fix a broken or malfunctioning system' },
      { value: 'estimate', icon: '\uD83D\uDCCB', label: 'Free Estimate', desc: 'Get a quote for a new system installation' },
      { value: 'maintenance', icon: '\uD83D\uDEE1\uFE0F', label: 'Maintenance', desc: 'Annual tune-up and system check' },
      { value: 'message', icon: '\uD83D\uDCE9', label: 'Send a Message', desc: 'Send a message or request to our office' }
    ];
    return `<div class="rxb-card"><div class="rxb-card-title">What do you need help with?</div><div class="rxb-card-subtitle">Select the service you're looking for</div><div class="rxb-options">${options.map(o => `<button class="rxb-option-btn${state.data.serviceType === o.value ? ' selected' : ''}" data-action="select-service" data-value="${o.value}"><div class="rxb-option-icon">${o.icon}</div><div><div class="rxb-option-label">${o.label}</div><div class="rxb-option-desc">${o.desc}</div></div></button>`).join('')}</div></div>`;
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
    return `<div class="rxb-card"><div class="rxb-card-title">Quick Info</div><div class="rxb-card-subtitle">In case we get disconnected, we'd love to be able to reach you</div>${errorHtml}<div class="rxb-field"><label class="rxb-label">Full Name</label><input type="text" class="rxb-input" id="rxb-name" placeholder="John Smith" value="${state.data.name}" autocomplete="name"></div><div class="rxb-field"><label class="rxb-label">Phone Number</label><input type="tel" class="rxb-input" id="rxb-contact-phone" placeholder="(720) 555-1234" value="${formatPhone(state.data.phone)}" maxlength="14" autocomplete="tel"></div>${renderNav(true, true)}</div>`;
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

  // ── Pricing banner for calendar step ──
  // MULTI-TENANT: Move fee amounts to tenantConfig.fees in SaaS version
  function getPricingBanner() {
    const svc = state.data.serviceType;
    const isPcc = state.data.isPccMember;

    if (svc === 'repair') {
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
      daysHtml += `<button class="${cls}" ${clickable ? `data-action="select-date" data-value="${dateStr}"` : 'disabled'}>${d}</button>`;
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

        const shortLabel = (s) => {
          try {
            const st = new Date(s.start);
            const en = new Date(s.end);
            const fmt = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Denver' });
            return fmt(st) + ' - ' + fmt(en);
          } catch (e) { return s.formatted; }
        };
        slotsHtml = `<div class="rxb-slots"><div class="rxb-slots-title">Available times for ${dayData.displayDate}</div><div class="rxb-slots-grid">${uniqueSlots.map(s => `<button class="rxb-slot-btn${state.data.selectedSlot && state.data.selectedSlot.start === s.start ? ' selected' : ''}" data-action="select-slot" data-idx="${s.originalIdx}">${shortLabel(s)}</button>`).join('')}</div></div>`;
      }
    }

    const canPrev = calMonth > today.getMonth() || calYear > today.getFullYear();
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 28);
    const canNext = new Date(calYear, calMonth + 1, 1) <= maxDate;

    const furtherOutHtml = `<div style="text-align:center; margin-top:16px; padding-top:12px; border-top:1px solid ${THEME.colors.cardBorder};"><button data-action="book-further-out" style="background:none; border:none; color:${THEME.colors.primary}; font-size:13px; cursor:pointer; padding:8px 0;">Need to book further out? Send us a request \u2192</button></div>`;
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
    return `<div class="rxb-card"><div class="rxb-card-title">${title}</div><div class="rxb-card-subtitle">${subtitle}</div>${errorHtml}${zipWarning}<div class="rxb-field"><label class="rxb-label">Full Name</label><input type="text" class="rxb-input" id="rxb-name" placeholder="John Smith" value="${escapeHtml(state.data.name || '')}" autocomplete="name"></div><div class="rxb-field"><label class="rxb-label">Phone Number</label><input type="tel" class="rxb-input" id="rxb-contact-phone" placeholder="(720) 555-1234" value="${formatPhone(state.data.phone)}" maxlength="14" autocomplete="tel"></div><div class="rxb-field"><label class="rxb-label">Email Address</label><input type="email" class="rxb-input" id="rxb-email" placeholder="john@example.com" value="${escapeHtml(state.data.email || '')}" autocomplete="email"></div>${zipField}${renderNav(true, true)}</div>`;
  }

  function renderMessage() {
    if (state.loading) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Sending your message...</div></div></div>`;
    }
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    return `<div class="rxb-card"><div class="rxb-card-title">Your Message</div><div class="rxb-card-subtitle">What would you like to tell our office?</div>${errorHtml}<div class="rxb-field"><label class="rxb-label">Message</label><textarea class="rxb-textarea" id="rxb-message" placeholder="Type your message or request here..." style="min-height: 120px;">${state.data.message || ''}</textarea></div><div class="rxb-nav" style="border-top:none; margin-top:24px; padding-top:0;"><button class="rxb-back-btn" data-action="back">\u2190 Back</button><button class="rxb-next-btn" data-action="submit-message">Send Message \u2709</button></div></div>`;
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
    const serviceLabels = { repair: 'Repair Service', estimate: 'Free Estimate', maintenance: 'Maintenance' };
    let serviceDisplay = serviceLabels[d.serviceType] || d.serviceType;
    if (d.isPccMember && d.pccType) {
      serviceDisplay = d.pccType === 'cooling' ? 'PCC A/C Maintenance (included)' : 'PCC Furnace Maintenance (included)';
    }
    const ageLabels = { '0-2': '0\u20132 Years', '3-10': '3\u201310 Years', '10+': '10+ Years' };
    let addressStr = '';
    if (d.address && d.address.street) { addressStr = `${d.address.street}, ${d.address.city}, ${d.address.state} ${d.address.zip}`; }
    else if (d.customer?.address) { const ca = d.customer.address; addressStr = `${ca.street}, ${ca.city}`; }

    return `<div class="rxb-card"><div class="rxb-card-title">Review & Confirm</div><div class="rxb-card-subtitle">Make sure everything looks right</div>${errorHtml}<div class="rxb-summary"><div class="rxb-summary-row"><span class="rxb-summary-label">Service</span><span class="rxb-summary-value">${serviceLabels[d.serviceType] || d.serviceType}</span></div><div class="rxb-summary-row"><span class="rxb-summary-label">Date & Time</span><span class="rxb-summary-value">${dateDisplay} at ${timeDisplay}</span></div><div class="rxb-summary-row"><span class="rxb-summary-label">System Age</span><span class="rxb-summary-value">${ageLabels[d.systemAge] || d.systemAge}</span></div>${d.issue ? `<div class="rxb-summary-row"><span class="rxb-summary-label">Issue</span><span class="rxb-summary-value" style="max-width:60%">${escapeHtml(d.issue)}</span></div>` : ''}<div class="rxb-summary-row"><span class="rxb-summary-label">Name</span><span class="rxb-summary-value">${escapeHtml(d.name)}</span></div>${d.phone ? `<div class="rxb-summary-row"><span class="rxb-summary-label">Phone</span><span class="rxb-summary-value">${formatPhone(d.phone)}</span></div>` : ''}${addressStr ? `<div class="rxb-summary-row"><span class="rxb-summary-label">Address</span><span class="rxb-summary-value" style="max-width:60%">${escapeHtml(addressStr)}</span></div>` : ''}</div><div class="rxb-nav" style="border-top:none; margin-top:24px; padding-top:0;"><button class="rxb-back-btn" data-action="back">\u2190 Back</button><button class="rxb-next-btn" data-action="confirm-booking">Confirm Booking \u2714</button></div></div>`;
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

  // ============================================
  // EVENT HANDLERS
  // ============================================
  function attachEvents() {
    root.querySelectorAll('[data-action]').forEach(el => { el.addEventListener('click', handleAction); });
    const phoneInput = root.querySelector('#rxb-phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        const digits = e.target.value.replace(/\D/g, '').substring(0, 10);
        state.data.phone = digits;
        e.target.value = formatPhone(digits);
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
        goToStep(STEPS.CALENDAR);
        loadAvailability();
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
      case 'next': goNext(); break;
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
        state.data.systemAge = '3-10'; // Default for maintenance tech routing
        await updateSession({ serviceType: 'maintenance', customerType: state.data.customerType, systemAge: '3-10', pccType: value, isPccMember: true });
        goToStep(STEPS.CALENDAR);
        loadAvailability();
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

  function goNext() {
    saveFormData();
    const flow = STEP_FLOW[state.path || 'new'];
    const idx = flow.indexOf(state.currentStep);
    if (!validateStep()) return;
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
        if (!state.data.customer && !state.data.phone) { state.error = 'Please enter your phone number.'; render(); return false; }
        return !!state.data.customer;
      case STEPS.QUICK_INFO:
        if (!state.data.name || state.data.name.trim().length < 2) { state.error = 'Please enter your name.'; render(); return false; }
        if (!state.data.phone || state.data.phone.length < 10) { state.error = 'Please enter a valid phone number.'; render(); return false; }
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
        if (!state.data.name) { state.error = 'Please enter your name.'; render(); return false; }
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
      console.log('[ROX Booking] Session started:', state.sessionId);
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

  async function loadAvailability() {
    state.loading = true; state.error = null; render();
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
    try { await api('POST', '/update-session', { sessionId: state.sessionId, updates, step: state.currentStep }); }
    catch (err) { console.warn('[ROX Booking] Session update failed:', err.message); }
  }

  async function confirmBooking() {
    saveFormData(); state.loading = true; state.error = null; render();
    try {
      await updateSession({ serviceType: state.data.serviceType, customerType: state.data.customerType, systemAge: state.data.systemAge, selectedDate: state.data.selectedDate, selectedSlot: state.data.selectedSlot, issue: state.data.issue, name: state.data.name, phone: state.data.phone, email: state.data.email, address: state.data.address, isPccMember: state.data.isPccMember || false, pccType: state.data.pccType || null });
      const result = await api('POST', '/confirm', { sessionId: state.sessionId });
      state.loading = false;
      if (result.success) { state.confirmation = result.confirmation; state.currentStep = STEPS.SUCCESS; render(); }
      else { state.error = result.message || 'Failed to confirm booking. Please call ' + CONFIG.companyPhone; render(); }
    } catch (err) { state.loading = false; state.error = 'Something went wrong. Please call ' + CONFIG.companyPhone + ' to complete your booking.'; render(); }
  }

  async function submitMessage() {
    saveFormData();
    if (!state.data.message || state.data.message.length < 3) { state.error = 'Please enter your message.'; render(); return; }
    state.loading = true; state.error = null; render();
    try {
      const result = await api('POST', '/message', {
        sessionId: state.sessionId,
        name: state.data.name,
        phone: state.data.phone,
        email: state.data.email,
        zip: state.data.address.zip,
        message: state.data.message,
        customerType: state.data.customerType,
        customerId: state.data.customer?.id || null
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
    const container = document.getElementById(CONFIG.containerId);
    if (!container) { console.error(`[ROX Booking] Container #${CONFIG.containerId} not found`); return; }
    root = document.createElement('div');
    root.id = 'rox-booking-root';
    container.appendChild(root);
    await loadTheme();
    injectStyles();
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
            <input type="text" id="rxb-exit-name" placeholder="Your name" value="${state.data.name || ''}" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;font-size:14px;box-sizing:border-box;">
            <input type="tel" id="rxb-exit-phone" placeholder="Phone number" value="${state.data.phone ? formatPhone(state.data.phone) : ''}" maxlength="14" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:16px;font-size:14px;box-sizing:border-box;">
            <button id="rxb-exit-submit" style="width:100%;padding:14px;background:${THEME.colors.primary};color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-bottom:10px;">Have Us Call You</button>
            <button id="rxb-exit-close" style="width:100%;padding:10px;background:none;border:none;color:#999;font-size:13px;cursor:pointer;">No thanks, I'll call later</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      overlay.querySelector('#rxb-exit-submit').addEventListener('click', async () => {
        const nameEl = overlay.querySelector('#rxb-exit-name');
        const phoneEl = overlay.querySelector('#rxb-exit-phone');
        const name = nameEl.value.trim();
        const phone = phoneEl.value.replace(/\D/g, '');
        if (!name || phone.length < 10) {
          nameEl.style.borderColor = !name ? '#e74c3c' : '#ddd';
          phoneEl.style.borderColor = phone.length < 10 ? '#e74c3c' : '#ddd';
          return;
        }
        // Save to state
        state.data.name = name;
        state.data.phone = phone;
        // Send message to office
        try {
          await api('POST', '/message', {
            sessionId: state.sessionId,
            name, phone,
            email: state.data.email || '',
            zip: state.data.address?.zip || '',
            message: 'Customer was browsing the booking page and left before completing. Please follow up.',
            customerType: state.data.customerType || 'new',
            customerId: state.data.customer?.id || null
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
