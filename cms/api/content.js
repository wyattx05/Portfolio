const fs = require('fs').promises;
const express = require('express');
const path = require('path');
const pino = require('pino');
const basicAuth = require('express-basic-auth');
const crypto = require('crypto');
const { atomicWrite, readFile, createBackup, rotateBackups, listBackups, restoreFromBackup } = require('../lib/file-utils');
const { validateContentStructure } = require('../lib/validation');
const { sanitizeContentObject } = require('../lib/sanitization');

const logger = pino();
const router = express.Router();

// Auth middleware for protected endpoints
const basicAuthMiddleware = basicAuth({
  users: {
    [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'admin123',
  },
  challenge: true,
  realm: 'Portfolio CMS Admin',
});

function getAuthCookieValue() {
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS || 'admin123';
  const secret = process.env.SESSION_SECRET || pass;

  return crypto
    .createHmac('sha256', secret)
    .update(`${user}:${pass}`)
    .digest('hex');
}

function hasValidAuthCookie(req) {
  const cookies = (req.headers.cookie || '')
    .split(';')
    .map(cookie => cookie.trim().split('='))
    .reduce((acc, [key, value]) => {
      if (key) acc[key] = value;
      return acc;
    }, {});

  return cookies.cms_auth === getAuthCookieValue();
}

function isSameOriginAdminRequest(req) {
  const referer = req.get('referer') || '';
  const fetchSite = req.get('sec-fetch-site');

  if (referer.includes('/cms/admin')) {
    return !fetchSite || ['same-origin', 'same-site', 'none'].includes(fetchSite);
  }

  return fetchSite === 'same-origin';
}

function requireAuth(req, res, next) {
  if (hasValidAuthCookie(req) || isSameOriginAdminRequest(req)) {
    return next();
  }

  return basicAuthMiddleware(req, res, next);
}

const CONTENT_FILE = path.join(__dirname, '../../data/content.json');
const BACKUP_DIR = path.join(__dirname, '../../data/backups');
const BACKUP_COUNT = parseInt(process.env.BACKUP_COUNT, 10) || 10;

function createDefaultContent() {
  return {
    projects: [],
    certifications: [],
    updates: [],
    blog: [],
    skills: [],
    personalInfo: {},
    themeSettings: {},
  };
}

function normalizeContentShape(content) {
  const normalized = {
    ...createDefaultContent(),
    ...(content && typeof content === 'object' ? content : {}),
  };

  normalized.projects = Array.isArray(normalized.projects) ? normalized.projects : [];
  normalized.certifications = Array.isArray(normalized.certifications) ? normalized.certifications : [];
  normalized.updates = Array.isArray(normalized.updates) ? normalized.updates : [];
  normalized.blog = Array.isArray(normalized.blog) ? normalized.blog : [];
  normalized.skills = Array.isArray(normalized.skills) ? normalized.skills : [];
  normalized.personalInfo = normalized.personalInfo && typeof normalized.personalInfo === 'object' ? normalized.personalInfo : {};
  normalized.themeSettings = normalized.themeSettings && typeof normalized.themeSettings === 'object' ? normalized.themeSettings : {};

  return normalized;
}

/**
 * GET /api/content - Retrieve current content
 */
router.get('/content', async (req, res) => {
  try {
    const content = await readFile(CONTENT_FILE);
    res.json(normalizeContentShape(JSON.parse(content)));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return res.json(createDefaultContent());
    }

    logger.error({ error }, 'Failed to read content');
    res.status(500).json({ error: 'Failed to read content' });
  }
});

/**
 * POST /api/content - Update content (requires auth)
 */
router.post('/content', requireAuth, async (req, res) => {
  try {
    const normalized = normalizeContentShape(req.body);
    const { valid, errors } = validateContentStructure(normalized);
    
    if (!valid) {
      logger.warn({ errors }, 'Invalid content structure');
      return res.status(400).json({ error: 'Invalid content structure', details: errors });
    }
    
    // Sanitize before saving
    const sanitized = sanitizeContentObject(normalized);
    
    // Create backup before saving (if content file exists)
    try {
      await createBackup(CONTENT_FILE, BACKUP_DIR);
      await rotateBackups(BACKUP_DIR, BACKUP_COUNT);
    } catch (backupError) {
      logger.warn({ backupError }, 'Backup creation failed, continuing anyway');
    }
    
    // Save content
    await atomicWrite(CONTENT_FILE, JSON.stringify(sanitized, null, 2));
    
    logger.info('Content updated successfully');
    res.json({ success: true, message: 'Content updated' });
  } catch (error) {
    logger.error({ error }, 'Failed to update content');
    res.status(500).json({ error: 'Failed to update content' });
  }
});

/**
 * GET /api/backups - List available backups (requires auth)
 */
router.get('/backups', requireAuth, async (req, res) => {
  try {
    const backups = await listBackups(BACKUP_DIR);
    res.json({ backups });
  } catch (error) {
    logger.error({ error }, 'Failed to list backups');
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

/**
 * POST /api/restore/:backupFile - Restore from a backup (requires auth)
 */
router.post('/restore/:backupFile', requireAuth, async (req, res) => {
  try {
    const backupFile = path.resolve(BACKUP_DIR, req.params.backupFile);
    const backupDir = path.resolve(BACKUP_DIR);
    
    // Security: ensure the backup file is within BACKUP_DIR
    if (!backupFile.startsWith(`${backupDir}${path.sep}`) || !backupFile.endsWith('.bak')) {
      return res.status(400).json({ error: 'Invalid backup file' });
    }
    
    const content = await restoreFromBackup(backupFile, CONTENT_FILE);
    
    logger.info({ backupFile }, 'Content restored');
    res.json({ success: true, message: 'Content restored', content: JSON.parse(content) });
  } catch (error) {
    logger.error({ error }, 'Failed to restore backup');
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

/**
 * GET /api/theme - Retrieve theme settings
 */
router.get('/theme', async (req, res) => {
  try {
    const content = await readFile(CONTENT_FILE);
    const data = JSON.parse(content);
    res.json(data.themeSettings || data.theme || {});
  } catch (error) {
    logger.error({ error }, 'Failed to read theme');
    res.status(500).json({ error: 'Failed to read theme' });
  }
});

/**
 * POST /api/theme - Update theme (requires auth)
 */
router.post('/theme', requireAuth, async (req, res) => {
  try {
    const content = await readFile(CONTENT_FILE);
    const data = JSON.parse(content);
    
    // Validate theme update
    if (!req.body.primaryColor || !req.body.accentColor) {
      return res.status(400).json({ error: 'Missing theme colors' });
    }
    
    data.themeSettings = {
      ...data.themeSettings,
      primaryColor: req.body.primaryColor,
      accentColor: req.body.accentColor,
      fontSize: req.body.fontSize || data.themeSettings?.fontSize,
      fontFamily: req.body.fontFamily || data.themeSettings?.fontFamily,
    };
    
    // Create backup before saving (if content file exists)
    try {
      await createBackup(CONTENT_FILE, BACKUP_DIR);
      await rotateBackups(BACKUP_DIR, BACKUP_COUNT);
    } catch (backupError) {
      logger.warn({ backupError }, 'Backup creation failed, continuing anyway');
    }
    
    // Save
    await atomicWrite(CONTENT_FILE, JSON.stringify(data, null, 2));
    
    logger.info('Theme updated');
    res.json({ success: true, message: 'Theme updated' });
  } catch (error) {
    logger.error({ error }, 'Failed to update theme');
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

module.exports = router;
