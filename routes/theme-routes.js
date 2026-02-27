/**
 * Theme API Routes
 * 
 * GET  /api/themes          - List all available themes
 * GET  /api/themes/:id      - Get full theme config by ID
 * POST /api/themes/reload   - Reload themes from disk (admin)
 */

const express = require('express');
const router = express.Router();
const themeLoader = require('../services/theme-loader');

// List all themes (summaries)
router.get('/', (req, res) => {
  res.json({
    themes: themeLoader.listThemes()
  });
});

// Get a specific theme by ID
router.get('/:id', (req, res) => {
  const theme = themeLoader.getTheme(req.params.id);

  if (!theme) {
    return res.status(404).json({ error: 'Theme not found' });
  }

  res.json(theme);
});

// Reload themes from disk (admin endpoint)
router.post('/reload', (req, res) => {
  themeLoader.reloadThemes();
  res.json({
    status: 'ok',
    themes: themeLoader.listThemes()
  });
});

module.exports = router;
