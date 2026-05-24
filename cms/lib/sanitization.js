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

function sanitizePlainText(value) {
  return sanitizeContent(value).replace(/&amp;/g, '&');
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

  const sanitizeStringField = (object, field, allowHtml = false) => {
    if (typeof object[field] === 'string') {
      object[field] = allowHtml ? sanitizeContent(object[field]) : sanitizePlainText(object[field]);
    }
  };
  
  const sanitized = { ...content };
  
  // Sanitize blog posts
  if (Array.isArray(sanitized.blog)) {
    sanitized.blog = sanitized.blog.map(post => {
      const cleanPost = { ...post };
      sanitizeStringField(cleanPost, 'title');
      sanitizeStringField(cleanPost, 'content', true);
      sanitizeStringField(cleanPost, 'excerpt');
      sanitizeStringField(cleanPost, 'author');
      return cleanPost;
    });
  }
  
  // Sanitize updates
  if (Array.isArray(sanitized.updates)) {
    sanitized.updates = sanitized.updates.map(update => {
      const cleanUpdate = { ...update };
      sanitizeStringField(cleanUpdate, 'title');
      sanitizeStringField(cleanUpdate, 'description');
      sanitizeStringField(cleanUpdate, 'content');
      sanitizeStringField(cleanUpdate, 'tag');
      return cleanUpdate;
    });
  }
  
  // Sanitize project descriptions (optional - usually safe)
  if (Array.isArray(sanitized.projects)) {
    sanitized.projects = sanitized.projects.map(project => {
      const cleanProject = { ...project };
      sanitizeStringField(cleanProject, 'title');
      sanitizeStringField(cleanProject, 'description');
      return cleanProject;
    });
  }

  if (Array.isArray(sanitized.certifications)) {
    sanitized.certifications = sanitized.certifications.map(certification => {
      const cleanCertification = { ...certification };
      sanitizeStringField(cleanCertification, 'title');
      sanitizeStringField(cleanCertification, 'issuer');
      sanitizeStringField(cleanCertification, 'date');
      return cleanCertification;
    });
  }

  if (Array.isArray(sanitized.skills)) {
    sanitized.skills = sanitized.skills.map(skill => {
      const cleanSkill = { ...skill };
      sanitizeStringField(cleanSkill, 'title');
      sanitizeStringField(cleanSkill, 'description');
      return cleanSkill;
    });
  }

  if (sanitized.personalInfo && typeof sanitized.personalInfo === 'object') {
    const cleanPersonalInfo = { ...sanitized.personalInfo };
    sanitizeStringField(cleanPersonalInfo, 'name');
    sanitizeStringField(cleanPersonalInfo, 'title');
    sanitizeStringField(cleanPersonalInfo, 'email');
    sanitizeStringField(cleanPersonalInfo, 'profileImage');
    sanitizeStringField(cleanPersonalInfo, 'resumePath');

    if (Array.isArray(cleanPersonalInfo.aboutText)) {
      cleanPersonalInfo.aboutText = cleanPersonalInfo.aboutText.map(item => (
        typeof item === 'string' ? sanitizePlainText(item) : item
      ));
    }

    sanitized.personalInfo = cleanPersonalInfo;
  }
  
  logger.debug('Content object sanitized');
  return sanitized;
}

module.exports = {
  sanitizeContent,
  sanitizeContentObject,
};
