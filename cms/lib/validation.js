const Ajv = require('ajv');
const pino = require('pino');

const logger = pino();
const ajv = new Ajv({ formats: { uri: /.*/ } });

const hexColor = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };
const linkSchema = {
  type: 'object',
  required: ['text', 'url'],
  properties: {
    type: {
      type: 'string',
      enum: ['github', 'website', 'demo', 'docs', 'video', 'article', 'project', 'announcement', 'photo'],
    },
    text: { type: 'string', minLength: 1 },
    url: { type: 'string', minLength: 1 },
  },
  additionalProperties: true,
};

/**
 * JSON Schema for the content structure rendered by content-manager.js.
 * It accepts both the original `theme` object and the newer `themeSettings`
 * object so older content can still be loaded, edited, and saved.
 */
const contentSchema = {
  type: 'object',
  required: ['projects'],
  properties: {
    projects: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'description'],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1 },
          icon: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          links: { type: 'array', items: linkSchema },
          featured: { type: 'boolean' },
          dateCreated: { type: 'string' },
          order: { type: 'integer' },
        },
        additionalProperties: true,
      },
    },
    certifications: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title'],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          issuer: { type: 'string' },
          date: { type: 'string' },
          pdfPath: { type: 'string' },
          icon: { type: 'string' },
          order: { type: 'integer' },
        },
        additionalProperties: true,
      },
    },
    updates: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'date'],
        anyOf: [
          { required: ['description'] },
          { required: ['content'] },
        ],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          content: { type: 'string' },
          date: { type: 'string' },
          tag: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          links: { type: 'array', items: linkSchema },
          featured: { type: 'boolean' },
          order: { type: 'integer' },
        },
        additionalProperties: true,
      },
    },
    blog: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'content'],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          content: { type: 'string' },
          excerpt: { type: 'string' },
          date: { type: 'string' },
          publishDate: { type: 'string' },
          author: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          links: { type: 'array', items: linkSchema },
          images: { type: 'array' },
          published: { type: 'boolean' },
          status: { type: 'string' },
        },
        additionalProperties: true,
      },
    },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'description'],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1 },
          icon: { type: 'string' },
          order: { type: 'integer' },
        },
        additionalProperties: true,
      },
    },
    personalInfo: {
      type: 'object',
      additionalProperties: true,
    },
    theme: {
      type: 'object',
      required: ['primaryColor', 'accentColor'],
      properties: {
        primaryColor: hexColor,
        accentColor: hexColor,
        fontSize: { type: 'string' },
        fontFamily: { type: 'string' },
      },
      additionalProperties: true,
    },
    themeSettings: {
      type: 'object',
      properties: {
        primaryColor: hexColor,
        secondaryColor: hexColor,
        accentColor: hexColor,
        backgroundStartColor: hexColor,
        backgroundEndColor: hexColor,
        mediaHeaderStartColor: hexColor,
        mediaHeaderEndColor: hexColor,
        updateDateStartColor: hexColor,
        updateDateEndColor: hexColor,
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};

const validateContent = ajv.compile(contentSchema);

/**
 * Validate content structure
 * @param {Object} data - Content to validate
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateContentStructure(data) {
  const valid = validateContent(data);
  
  if (!valid) {
    logger.warn({ errors: validateContent.errors }, 'Content validation failed');
    return {
      valid: false,
      errors: validateContent.errors.map(err => ({
        path: err.instancePath || '/',
        message: err.message,
        data: err.data,
      })),
    };
  }
  
  logger.debug('Content validation passed');
  return { valid: true, errors: [] };
}

module.exports = {
  validateContentStructure,
  contentSchema,
};
