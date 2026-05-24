const sanitizeHtml = require('sanitize-html');
const pino = require('pino');

const logger = pino();

/**
 * Sanitization options - allows safe HTML for blog/update content
 */
const sanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'code', 'pre', 'blockquote'],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    code: ['class'],
    pre: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
};

/**
 * Sanitize HTML content to prevent XSS
 * @param {string} dirtyHtml - HTML to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeContent(dirtyHtml) {
  if (typeof dirtyHtml !== 'string') {
    return '';
  }
  
  try {
    const clean = sanitizeHtml(dirtyHtml, sanitizeOptions);
    logger.debug({ inputLength: dirtyHtml.length, outputLength: clean.length }, 'Content sanitized');
    return clean;
  } catch (error) {
    logger.error({ error }, 'Sanitization error');
    throw error;
  }
}

/**
 * Sanitize all HTML fields in content object
 * @param {Object} content - Content object with potentially unsafe HTML
 * @returns {Object} Content with sanitized HTML fields
 */
function sanitizeContentObject(content) {
  if (!content || typeof content !== 'object') {
    return content;
  }
  
  const sanitized = { ...content };
  
  // Sanitize blog posts
  if (Array.isArray(sanitized.blog)) {
    sanitized.blog = sanitized.blog.map(post => ({
      ...post,
      content: sanitizeContent(post.content),
      excerpt: post.excerpt ? sanitizeContent(post.excerpt) : post.excerpt,
    }));
  }
  
  // Sanitize updates
  if (Array.isArray(sanitized.updates)) {
    sanitized.updates = sanitized.updates.map(update => ({
      ...update,
      content: sanitizeContent(update.content),
    }));
  }
  
  // Sanitize project descriptions (optional - usually safe)
  if (Array.isArray(sanitized.projects)) {
    sanitized.projects = sanitized.projects.map(project => ({
      ...project,
      description: sanitizeContent(project.description),
    }));
  }
  
  logger.debug('Content object sanitized');
  return sanitized;
}

module.exports = {
  sanitizeContent,
  sanitizeContentObject,
};
