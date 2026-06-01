import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleMarkdownCodeCopyClick,
  handleMarkdownControlClick,
  hydrateMarkdownCodeBlocks,
  hydrateMarkdownControls,
  renderMarkdown,
} from '@/utils/markdown';
import { extractMarkdownImages, stripMarkdownImages } from '@/utils/markdown-images';

/**
 * Tests for the markdown renderer used in assistant messages.
 * The renderer hardens against XSS (html:false), highlights code via
 * highlight.js, marks external links target=_blank, and wraps tables for
 * horizontal scroll.
 */

const codeCopyLabels = {
  copy: 'Copy',
  copyImage: 'Copy image',
  copied: 'Copied',
  copyFailed: 'Copy failed',
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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
    expect(out).toContain('class="md-code-block"');
    expect(out).toContain('class="md-code-toolbar"');
    expect(out).toContain('data-md-code-copy');
    expect(out).toContain('class="hljs language-js"');
    expect(out).toContain('data-language="js"');
    // Some highlighted token wrapping should be present — exact classes vary
    // between hljs releases, but `<span class="hljs-` is invariant.
    expect(out).toMatch(/<span class="hljs-/);
  });

  it('does not nest the custom code block inside markdown-it default pre wrappers', () => {
    const out = renderMarkdown('```bash\nopencode run 实现 OAuth 刷新流程 --thinking\n```');
    expect(out).toMatch(/^<div class="md-code-block">/);
    expect(out).not.toMatch(/<pre><code><div class="md-code-block">/);
    expect(out).not.toMatch(/<pre[^>]*>\s*<code[^>]*>\s*<div class="md-code-block">/);
  });

  it('falls back to auto-detect when language is unknown', () => {
    const out = renderMarkdown('```\nfoo bar baz\n```');
    expect(out).toContain('<pre class="hljs">');
  });
});

describe('renderMarkdown — code copy controls', () => {
  it('hydrates copy buttons with localized labels', () => {
    const root = document.createElement('div');
    root.innerHTML = renderMarkdown('```ts\nconst answer = 42;\n```');

    hydrateMarkdownCodeBlocks(root, {
      copy: '复制',
      copied: '已复制',
      copyFailed: '复制失败',
    });

    const button = root.querySelector<HTMLButtonElement>('[data-md-code-copy]');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('aria-label')).toBe('复制');
    expect(button?.getAttribute('title')).toBe('复制');
    expect(button?.querySelector('[data-md-code-copy-label]')?.textContent).toBe('复制');
  });

  it('copies the decoded code text and resets the button label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const root = document.createElement('div');
    root.innerHTML = renderMarkdown('```html\n<div data-x="1">&amp;</div>\n```');
    const button = root.querySelector<HTMLButtonElement>('[data-md-code-copy]');
    if (!button) throw new Error('Expected markdown code copy button');

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: button });
    const handled = await handleMarkdownCodeCopyClick(event, codeCopyLabels);

    expect(handled).toBe(true);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('<div data-x="1">&amp;</div>'));
    expect(button.getAttribute('aria-label')).toBe('Copied');
    expect(button.classList.contains('is-copied')).toBe(true);

    await vi.advanceTimersByTimeAsync(1400);

    expect(button.getAttribute('aria-label')).toBe('Copy');
    expect(button.classList.contains('is-copied')).toBe(false);
  });
});

describe('renderMarkdown — image previews and copy controls', () => {
  it('wraps markdown images with a copy image button', () => {
    const out = renderMarkdown('![screen](data:image/png;base64,aGVsbG8=)');

    expect(out).toContain('class="md-image-frame"');
    expect(out).toContain('data-md-image-copy');
    expect(out).toContain('data-md-image-src="data:image/png;base64,aGVsbG8="');
    expect(out).toContain('alt="screen"');
  });

  it('rejects unsafe image schemes', () => {
    const out = renderMarkdown('![bad](javascript:alert(1))');

    expect(out).not.toContain('<img');
    expect(out).not.toContain('data-md-image-copy');
    expect(out).not.toContain('href="javascript:');
  });

  it('hydrates image copy buttons with localized labels', () => {
    const root = document.createElement('div');
    root.innerHTML = renderMarkdown('![screen](data:image/png;base64,aGVsbG8=)');

    hydrateMarkdownControls(root, {
      copy: '复制',
      copyImage: '复制图片',
      copied: '已复制',
      copyFailed: '复制失败',
    });

    const button = root.querySelector<HTMLButtonElement>('[data-md-image-copy]');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('aria-label')).toBe('复制图片');
    expect(button?.querySelector('[data-md-image-copy-label]')?.textContent).toBe('复制图片');
  });

  it('falls back to copying the image URL when binary clipboard is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const root = document.createElement('div');
    root.innerHTML = renderMarkdown('![screen](/assets/screen.png)');
    const button = root.querySelector<HTMLButtonElement>('[data-md-image-copy]');
    if (!button) throw new Error('Expected markdown image copy button');

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: button });
    const handled = await handleMarkdownControlClick(event, codeCopyLabels);

    expect(handled).toBe(true);
    expect(writeText).toHaveBeenCalledWith('/assets/screen.png');
    expect(button.getAttribute('aria-label')).toBe('Copied');
  });
});

describe('markdown image extraction helpers', () => {
  it('extracts safe markdown images for history previews', () => {
    const images = extractMarkdownImages('one ![a](/a.png) two ![bad](javascript:alert(1)) ![b](https://x.test/b.webp)');

    expect(images).toEqual([
      { alt: 'a', src: '/a.png' },
      { alt: 'b', src: 'https://x.test/b.webp' },
    ]);
  });

  it('strips markdown image payloads from text previews', () => {
    expect(stripMarkdownImages('hello\n\n![shot](data:image/png;base64,aGVsbG8=)\n\nworld')).toBe('hello\n\nworld');
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
