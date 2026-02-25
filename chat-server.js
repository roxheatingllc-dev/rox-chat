/**
 * ROX Chat Server v3.0
 * Express server for the embeddable chat widget.
 * 
 * Serves:
 *   - Widget JS file (for embedding on any website)
 *   - Chat API routes (start session, send message, health check)
 *   - Demo page for testing
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const chatConfig = require('./config/chat-config');
const chatRoutes = require('./routes/chat-routes');

const app = express();
const PORT = process.env.CHAT_PORT || process.env.PORT || 3001;

// ========================================
// CORS - Allow widget to be embedded anywhere
// ========================================
const allowedOrigins = chatConfig.cors.allowedOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow all if wildcard is set
    if (allowedOrigins.includes('*')) return callback(null, true);
    // Check allowed list
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// ========================================
// MIDDLEWARE
// ========================================
app.use(express.json({ limit: '16kb' }));

// ========================================
// STATIC FILES
// ========================================
// Serve widget JS with proper headers for embedding
app.use('/widget', express.static(path.join(__dirname, 'widget'), {
  maxAge: '5m',  // Short cache so updates deploy fast
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }
}));

// Serve demo page
app.use(express.static(path.join(__dirname, 'public')));

// ========================================
// API ROUTES
// ========================================
app.use('/api/chat', chatRoutes);

// ========================================
// ROOT - Demo page
// ========================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

// ========================================
// CONFIG ENDPOINT (for multi-tenant widget config)
// ========================================
app.get('/api/config/:tenantId', (req, res) => {
  // In multi-tenant SaaS, this would pull from a database
  // For now, return the default config
  res.json({
    tenantId: req.params.tenantId,
    company: chatConfig.company,
    branding: chatConfig.branding
  });
});

// ========================================
// START SERVER
// ========================================
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║       ROX CHAT - EMBEDDABLE WIDGET SERVER    ║');
    console.log('║       Version: 3.0.0                         ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`🔗 Engine: ${process.env.ENGINE_API_URL || 'http://localhost:3000/api/engine'}`);
    console.log(`🌐 Demo: http://localhost:${PORT}`);
    console.log(`📦 Widget: http://localhost:${PORT}/widget/chat-widget.js`);
    console.log();
  });
}

module.exports = app;
