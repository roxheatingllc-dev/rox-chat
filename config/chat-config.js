/**
 * ROX Chat - Tenant Configuration
 * Multi-tenant ready: swap this config per business
 */

module.exports = {
  // ========================================
  // TENANT IDENTITY
  // ========================================
  tenantId: process.env.TENANT_ID || 'rox-heating',
  
  // ========================================
  // COMPANY INFO
  // ========================================
  company: {
    name: 'ROX Heating & Air',
    phone: '(720) 468-0689',
    email: 'office@roxheating.com',
    website: 'https://www.roxheating.com',
    timezone: 'America/Denver'
  },

  // ========================================
  // BRANDING — colors used by server-side
  // responses and widget config endpoint
  // ========================================
  branding: {
    primary: '#F78C26',       // ROX orange
    primaryDark: '#E07520',
    primaryLight: '#FFA54F',
    dark: '#1A1A1A',
    light: '#FFFFFF',
    avatarText: 'ROX',
    logoUrl: null              // Optional: URL to company logo
  },

  // ========================================
  // CHAT BEHAVIOR
  // ========================================
  chat: {
    greeting: null,            // null = let engine generate greeting
    maxSessionAge: 30 * 60 * 1000,  // 30 minutes
    typingDelay: 600,          // ms delay before showing bot response (feels natural)
    maxMessageLength: 500,
    rateLimitPerMinute: 20
  },

  // ========================================
  // CORS — allowed origins for widget embed
  // ========================================
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['*']  // Allow all in dev; restrict in production
  },

  // ========================================
  // QUICK REPLY DEFAULTS
  // These are shown when the engine doesn't
  // provide its own quick replies
  // ========================================
  defaultQuickReplies: {
    initial: [
      { label: '🔧 Repair', value: 'I need to schedule a repair' },
      { label: '📊 Estimate', value: "I'd like an estimate for a new system" },
      { label: '🛠️ Maintenance', value: 'I need to schedule maintenance' },
      { label: '📅 My Appointment', value: 'I have a question about my appointment' }
    ]
  }
};
