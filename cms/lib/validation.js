const Ajv = require('ajv');
const pino = require('pino');

const logger = pino();
const ajv = new Ajv({ formats: { uri: /.*/ } });

/**
 * JSON Schema for content structure
 */
const contentSchema = {
  type: 'object',
  required: ['projects', 'updates', 'blog', 'theme'],
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
          links: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'text', 'url'],
              properties: {
                type: { type: 'string', enum: ['github', 'website', 'demo', 'docs'] },
                text: { type: 'string' },
                url: { type: 'string' },
              },
            },
          },
          featured: { type: 'boolean' },
          dateCreated: { type: 'string' },
          order: { type: 'integer' },
        },
      },
    },
    updates: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'content', 'date'],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          content: { type: 'string', minLength: 1 },
          date: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    blog: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'content', 'date'],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          content: { type: 'string', minLength: 1 },
          excerpt: { type: 'string' },
          date: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          published: { type: 'boolean' },
        },
      },
    },
    theme: {
      type: 'object',
      required: ['primaryColor', 'accentColor'],
      properties: {
        primaryColor: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        accentColor: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        fontSize: { type: 'string' },
        fontFamily: { type: 'string' },
      },
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
