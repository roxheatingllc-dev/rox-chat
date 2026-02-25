/**
 * Chat Widget Configuration
 * 
 * MULTI-TENANT READY: This config is structured so each tenant
 * gets their own settings. For ROX standalone, we use a single
 * default config. For SaaS, load from database by tenant ID.
 * 
 * Future SaaS: Replace getConfig() to fetch from DB/cache
 */

// ============================================
// DEFAULT TENANT CONFIG (ROX Heating & Air)
// ============================================
const DEFAULT_TENANT = {
  // Tenant identification
  tenantId: 'rox-heating',
  businessName: 'ROX Heating & Air',
  businessNameShort: 'ROX',

  // Widget appearance (matched to roxheating.com)
  widget: {
    primaryColor: '#F78C26',      // ROX orange
    secondaryColor: '#1A1A1A',    // Black
    accentColor: '#FFFFFF',       // White
    textColor: '#1A1A1A',
    bubbleSize: 64,
    position: 'bottom-right',
    offsetX: 24,
    offsetY: 24,
    borderRadius: 16,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    
    windowWidth: 400,
    windowHeight: 600,
    windowMaxHeight: '80vh',
    
    welcomeTitle: 'ROX Heating & Air',
    welcomeSubtitle: "Hi there! 👋 How can we help you today?",
    inputPlaceholder: 'Type a message or tap a button...',
    
    showPoweredBy: false,
    poweredByText: 'Powered by ROX AI',
    poweredByUrl: null,

    avatarEmoji: '🔧',
    avatarUrl: null,
  },

  // Chat behavior
  behavior: {
    autoOpenDelay: null,
    typingDelayMs: 800,
    maxMessages: 50,
    persistSession: true,
    sessionTimeoutMs: 30 * 60 * 1000,
    showTimestamps: false,
    soundEnabled: false,
  },

  // Initial quick replies shown on first load
  initialQuickReplies: [
    'Schedule a Repair',
    'Get an Estimate',
    'Maintenance / Tune-up',
    'I Have an Appointment'
  ],

  // Business info
  businessInfo: {
    phone: '(720) 468-0689',
    hours: 'Mon-Sat: 8am-5pm MST',
    serviceArea: 'Denver Metro Area',
    serviceFee: '$148 service call fee (waived with repair)',
  },

  apiBaseUrl: '/api/chat',
};


// ============================================
// CONFIG ACCESSOR
// ============================================

function getConfig(tenantId = null) {
  return { ...DEFAULT_TENANT };
}

function getWidgetConfig(tenantId = null) {
  const config = getConfig(tenantId);
  
  return {
    tenantId: config.tenantId,
    businessName: config.businessName,
    widget: config.widget,
    behavior: config.behavior,
    initialQuickReplies: config.initialQuickReplies,
    businessInfo: config.businessInfo,
    apiBaseUrl: config.apiBaseUrl,
  };
}

module.exports = {
  getConfig,
  getWidgetConfig,
  DEFAULT_TENANT,
};
