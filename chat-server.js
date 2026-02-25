/**
 * ROX Chat Server
 * 
 * Express server that powers the chat widget.
 * Can run standalone or be mounted into your existing server.js.
 * 
 * STANDALONE: node chat-server.js (runs on PORT)
 * INTEGRATED: Mount chatRoutes in your existing Express app
 * 
 * Usage in existing server.js:
 *   const chatRoutes = require('./rox-chat/routes/chat-routes');
 *   app.use('/api/chat', chatRoutes);
 *   app.use(express.static('./rox-chat/public'));
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const chatRoutes = require('./routes/chat-routes');

const app = express();
const PORT = process.env.CHAT_PORT || process.env.PORT || 3001;


// ============================================
// MIDDLEWARE
// ============================================

// CORS - allow widget to call from any domain
// MULTI-TENANT: In production, restrict to tenant's registered domains
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : '*',   // Allow all in development
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-Tenant-ID'],
}));

// Parse JSON bodies
app.use(express.json({ limit: '10kb' }));  // Small limit - chat messages are short

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });
}


// ============================================
// ROUTES
// ============================================

// Chat API
app.use('/api/chat', chatRoutes);

// Serve widget files (JS, CSS)
app.use('/widget', express.static(path.join(__dirname, 'widget'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0',
  setHeaders: (res, filePath) => {
    // Set proper MIME types
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  },
}));

// Serve demo page
app.use(express.static(path.join(__dirname, 'public')));

// Root endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});


// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});


// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   ROX CHAT - Website Chat Widget Server               ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║   🌐 Server:  http://localhost:${PORT}                    ║`);
  console.log(`║   💬 Widget:  http://localhost:${PORT}/widget/chat-widget.js ║`);
  console.log(`║   🎨 Demo:    http://localhost:${PORT}                    ║`);
  console.log(`║   📡 API:     http://localhost:${PORT}/api/chat/health    ║`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║   Engine:  ${process.env.ROX_ENGINE_PATH || '../rox-ai-answering'}  ║`);
  console.log(`║   Mode:    ${process.env.NODE_ENV || 'development'}                          ║`);
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
