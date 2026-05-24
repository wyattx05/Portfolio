/**
 * Unit tests for sanitization
 */
const { sanitizeContent, sanitizeContentObject } = require('../cms/lib/sanitization');

describe('Sanitization', () => {
  test('sanitizeContent removes script tags', () => {
    const dirty = '<p>Hello</p><script>alert("xss")</script>';
    const clean = sanitizeContent(dirty);
    
    expect(clean).not.toContain('script');
    expect(clean).toContain('<p>Hello</p>');
  });

  test('sanitizeContent removes onerror attributes', () => {
    const dirty = '<img src="x" onerror="alert(\'xss\')" />';
    const clean = sanitizeContent(dirty);
    
    expect(clean).not.toContain('onerror');
  });

  test('sanitizeContent preserves safe HTML', () => {
    const safe = '<p>Hello <strong>world</strong></p>';
    const clean = sanitizeContent(safe);
    
    expect(clean).toContain('<strong>');
    expect(clean).toContain('world');
  });

  test('sanitizeContent preserves safe links', () => {
    const safe = '<a href="https://example.com">Click here</a>';
    const clean = sanitizeContent(safe);
    
    expect(clean).toContain('href');
    expect(clean).toContain('example.com');
  });

  test('sanitizeContent removes javascript: URLs', () => {
    const dirty = '<a href="javascript:alert(\'xss\')">Click</a>';
    const clean = sanitizeContent(dirty);
    
    expect(clean).not.toContain('javascript:');
  });

  test('sanitizeContentObject sanitizes blog posts', () => {
    const content = {
      blog: [
        { id: '1', title: 'Test', content: '<script>alert("xss")</script><p>Safe</p>' }
      ],
      updates: [],
      projects: [],
      theme: {},
    };

    const sanitized = sanitizeContentObject(content);
    
    expect(sanitized.blog[0].content).not.toContain('script');
    expect(sanitized.blog[0].content).toContain('<p>');
  });

  test('sanitizeContentObject sanitizes updates', () => {
    const content = {
      blog: [],
      updates: [
        { id: '1', title: 'Update', content: '<img onerror="alert(\'xss\')" />', date: '2024-01-01' }
      ],
      projects: [],
      theme: {},
    };

    const sanitized = sanitizeContentObject(content);
    
    expect(sanitized.updates[0].content).not.toContain('onerror');
  });

  test('sanitizeContent handles non-string input', () => {
    expect(sanitizeContent(null)).toBe('');
    expect(sanitizeContent(undefined)).toBe('');
    expect(sanitizeContent(123)).toBe('');
  });
});
