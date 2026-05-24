/**
 * Unit tests for validation
 */
const { validateContentStructure } = require('../cms/lib/validation');

describe('Validation', () => {
  const validContent = {
    projects: [
      {
        id: 'proj1',
        title: 'Test Project',
        description: 'A test project',
        tags: ['test'],
        featured: true,
        dateCreated: '2024-01-01',
      }
    ],
    updates: [
      {
        id: 'upd1',
        title: 'Update 1',
        content: 'Update content',
        date: '2024-01-01T00:00:00Z',
      }
    ],
    blog: [
      {
        id: 'blog1',
        title: 'Blog Post',
        content: 'Blog content',
        date: '2024-01-01T00:00:00Z',
        published: true,
      }
    ],
    theme: {
      primaryColor: '#000000',
      accentColor: '#ffffff',
    },
  };

  test('validateContentStructure accepts valid content', () => {
    const result = validateContentStructure(validContent);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validateContentStructure rejects missing required fields', () => {
    const invalid = { ...validContent };
    delete invalid.projects;

    const result = validateContentStructure(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validateContentStructure rejects invalid project structure', () => {
    const invalid = {
      ...validContent,
      projects: [{ id: 'proj1' }], // missing title and description
    };

    const result = validateContentStructure(invalid);
    expect(result.valid).toBe(false);
  });

  test('validateContentStructure validates color format', () => {
    const invalid = {
      ...validContent,
      theme: { primaryColor: 'not-a-color', accentColor: '#ffffff' },
    };

    const result = validateContentStructure(invalid);
    expect(result.valid).toBe(false);
  });

  test('validateContentStructure rejects invalid link URL', () => {
    const invalid = {
      ...validContent,
      projects: [
        {
          ...validContent.projects[0],
          links: [{ type: 'github', text: 'Link', url: 123 }], // non-string URL
        }
      ],
    };

    const result = validateContentStructure(invalid);
    expect(result.valid).toBe(false);
  });

  test('validateContentStructure rejects invalid enum value', () => {
    const invalid = {
      ...validContent,
      projects: [
        {
          ...validContent.projects[0],
          links: [{ type: 'invalid-type', text: 'Link', url: 'https://example.com' }],
        }
      ],
    };

    const result = validateContentStructure(invalid);
    expect(result.valid).toBe(false);
  });

  test('validateContentStructure provides detailed error info', () => {
    const invalid = {
      ...validContent,
      theme: { primaryColor: '#fff', accentColor: '#fff' }, // too short
    };

    const result = validateContentStructure(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toHaveProperty('path');
    expect(result.errors[0]).toHaveProperty('message');
  });
});
