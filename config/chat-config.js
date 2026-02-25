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

  // Widget appearance
  widget: {
    primaryColor: '#E63946',      // ROX red
    secondaryColor: '#1D3557',    // Dark navy
    accentColor: '#F1FAEE',       // Off-white
    textColor: '#1D3557',
    bubbleSize: 64,               // px - chat bubble button size
    position: 'bottom-right',     // bottom-right | bottom-left
    offsetX: 24,                  // px from edge
    offsetY: 24,                  // px from edge
    borderRadius: 16,             // px for chat window
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    
    // Chat window dimensions
    windowWidth: 400,             // px
    windowHeight: 600,            // px
    windowMaxHeight: '80vh',      // responsive cap
    
    // Greeting shown before user sends first message
    welcomeTitle: 'ROX Heating & Air',
    welcomeSubtitle: 'Hi there! 👋 How can we help you today?',
    
    // Placeholder in input field
    inputPlaceholder: 'Type a message or tap a button...',
    
    // Powered-by branding (for SaaS)
    showPoweredBy: false,
    poweredByText: 'Powered by ROX AI',
    poweredByUrl: null,

    // Avatar
    avatarEmoji: '🔧',           // Fallback if no image
    avatarUrl: null,              // URL to avatar image (overrides emoji)
  },

  // Chat behavior
  behavior: {
    // Auto-open after delay (ms). Set to 0 or null to disable.
    autoOpenDelay: null,
    
    // Show typing indicator (simulated delay for natural feel)
    typingDelayMs: 800,
    
    // Max messages before suggesting they call
    maxMessages: 50,
    
    // Persist chat across page navigations (uses sessionStorage)
    persistSession: true,
    
    // Session timeout (ms) - 30 min
    sessionTimeoutMs: 30 * 60 * 1000,
    
    // Show timestamps on messages
    showTimestamps: false,
    
    // Sound notification on new message
    soundEnabled: false,
  },

  // Initial quick replies shown on first load
  initialQuickReplies: [
    'Schedule a Repair',
    'Get an Estimate',
    'Maintenance / Tune-up',
    'I Have an Appointment'
  ],

  // Business info shown in widget header or info panel
  businessInfo: {
    phone: '(303) 555-0199',       // Replace with real number
    hours: 'Mon-Sat: 8am-5pm MST',
    serviceArea: 'Denver Metro Area',
    serviceFee: '$148 service call fee (waived with repair)',
  },

  // API endpoint (where the chat server runs)
  apiBaseUrl: '/api/chat',
};


// ============================================
// CONFIG ACCESSOR
// ============================================

/**
 * Get config for a tenant.
 * 
 * Standalone (ROX): Always returns DEFAULT_TENANT
 * Future SaaS: Look up by tenantId from DB/Redis cache
 * 
 * @param {string} tenantId - Tenant identifier (ignored in standalone mode)
 * @returns {Object} Tenant configuration
 */
function getConfig(tenantId = null) {
  // STANDALONE MODE: Always return ROX config
  // FUTURE SaaS: Replace with DB lookup
  // Example:
  //   const tenant = await db.tenants.findById(tenantId);
  //   return { ...DEFAULT_TENANT, ...tenant.config };
  
  return { ...DEFAULT_TENANT };
}

/**
 * Get widget config formatted for the frontend embed script
 * Only includes visual/behavioral settings (no server secrets)
 * 
 * @param {string} tenantId
 * @returns {Object} Client-safe widget config
 */
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
