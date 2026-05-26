import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '@/utils/markdown';

/**
 * Tests for the markdown renderer used in assistant messages.
 * The renderer hardens against XSS (html:false), highlights code via
 * highlight.js, marks external links target=_blank, and wraps tables for
 * horizontal scroll.
 */

describe('renderMarkdown — headings + blocks', () => {
  it('renders # as <h1>', () => {
    const out = renderMarkdown('# Hello world');
    expect(out).toContain('<h1>');
    expect(out).toContain('Hello world');
    expect(out).toContain('</h1>');
  });

  it('renders ## as <h2>', () => {
    expect(renderMarkdown('## Sub')).toContain('<h2>');
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });
});

describe('renderMarkdown — code fences', () => {
  it('renders fenced code with a language hint via highlight.js', () => {
    const out = renderMarkdown('```js\nconst x = 1;\n```');
    // The hljs wrapper carries the language class and the highlighted span markup.
    expect(out).toContain('class="hljs language-js"');
    // Some highlighted token wrapping should be present — exact classes vary
    // between hljs releases, but `<span class="hljs-` is invariant.
    expect(out).toMatch(/<span class="hljs-/);
  });

  it('falls back to auto-detect when language is unknown', () => {
    const out = renderMarkdown('```\nfoo bar baz\n```');
    expect(out).toContain('<pre class="hljs">');
  });
});

describe('renderMarkdown — links', () => {
  it('external https link gets target=_blank rel=noopener', () => {
    const out = renderMarkdown('[hi](https://example.com)');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('local / anchor links do not get target=_blank', () => {
    const out = renderMarkdown('[anchor](#foo)');
    expect(out).not.toContain('target="_blank"');
  });
});

describe('renderMarkdown — tables', () => {
  it('wraps the table in .md-table-scroll for horizontal overflow', () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |\n';
    const out = renderMarkdown(md);
    expect(out).toContain('<div class="md-table-scroll">');
    expect(out).toContain('<table>');
    // close tags may be separated by whitespace from markdown-it
    expect(out).toMatch(/<\/table>\s*<\/div>/);
  });
});

describe('renderMarkdown — XSS hardening (html:false)', () => {
  it('does NOT render a raw <script> tag; escapes or strips it', () => {
    const out = renderMarkdown('<script>alert(1)</script>');
    // markdown-it with html:false escapes the angle brackets.
    expect(out).not.toMatch(/<script\b/i);
    expect(out).toContain('&lt;script&gt;');
  });

  it('does NOT render a raw <img onerror> tag', () => {
    const out = renderMarkdown('<img src=x onerror="alert(1)">');
    expect(out).not.toMatch(/<img\b[^>]*onerror/i);
  });

  it('does not honor a javascript: scheme URL on a markdown link (linkify renders it as text)', () => {
    // markdown-it default validation rejects javascript: as a link href and
    // emits it as plain text — so no anchor / href attribute is generated.
    const out = renderMarkdown('[click](javascript:alert(1))');
    expect(out).not.toMatch(/href="javascript:/i);
  });
});

describe('renderMarkdown — robustness', () => {
  it('does not throw on a malformed code fence', () => {
    expect(() => renderMarkdown('```js\nconst x = 1;')).not.toThrow();
  });

  it('does not throw on a half-open emphasis', () => {
    expect(() => renderMarkdown('**bold but never closed')).not.toThrow();
  });
});
