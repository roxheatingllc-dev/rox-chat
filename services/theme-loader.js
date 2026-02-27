/**
 * Theme Loader
 * 
 * Reads theme JSON files from the /themes directory.
 * In multi-tenant SaaS, this would pull from a database instead.
 * 
 * Usage:
 *   const themeLoader = require('./services/theme-loader');
 *   const theme = themeLoader.getTheme('rox-default');
 *   const allThemes = themeLoader.listThemes();
 */

const fs = require('fs');
const path = require('path');

const THEMES_DIR = path.join(__dirname, '..', 'themes');

// Cache loaded themes in memory
const themeCache = new Map();
let themesLoaded = false;

/**
 * Load all themes from the /themes directory
 */
function loadAllThemes() {
  themeCache.clear();

  if (!fs.existsSync(THEMES_DIR)) {
    console.warn(`[ThemeLoader] Themes directory not found: ${THEMES_DIR}`);
    return;
  }

  const files = fs.readdirSync(THEMES_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const filePath = path.join(THEMES_DIR, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const theme = JSON.parse(raw);

      if (!theme.id) {
        console.warn(`[ThemeLoader] Skipping ${file} — missing "id" field`);
        continue;
      }

      themeCache.set(theme.id, theme);
      console.log(`[ThemeLoader] Loaded theme: ${theme.id} (${theme.name})`);
    } catch (err) {
      console.error(`[ThemeLoader] Error loading ${file}:`, err.message);
    }
  }

  themesLoaded = true;
  console.log(`[ThemeLoader] ${themeCache.size} themes loaded`);
}

/**
 * Get a theme by ID
 * Falls back to 'rox-default' if not found
 */
function getTheme(themeId) {
  if (!themesLoaded) loadAllThemes();

  if (themeCache.has(themeId)) {
    return themeCache.get(themeId);
  }

  console.warn(`[ThemeLoader] Theme "${themeId}" not found, falling back to rox-default`);
  return themeCache.get('rox-default') || null;
}

/**
 * List all available themes (summary only, not full config)
 */
function listThemes() {
  if (!themesLoaded) loadAllThemes();

  const list = [];
  for (const theme of themeCache.values()) {
    list.push({
      id: theme.id,
      name: theme.name,
      description: theme.description || '',
      primaryColor: theme.colors?.primary || '#000'
    });
  }
  return list;
}

/**
 * Reload themes from disk (useful after adding new theme files)
 */
function reloadThemes() {
  console.log('[ThemeLoader] Reloading themes...');
  loadAllThemes();
}

// Load on first require
loadAllThemes();

module.exports = {
  getTheme,
  listThemes,
  reloadThemes
};
