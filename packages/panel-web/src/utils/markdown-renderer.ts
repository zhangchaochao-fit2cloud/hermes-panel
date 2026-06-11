/**
 * Heavy markdown renderer. Keep this behind dynamic imports in UI components so
 * markdown-it and highlight.js do not become part of unrelated page startup.
 */
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/common';
import { LRUCache } from '@hermes-panel/shared';
import { sanitizeMarkdownImageSrc } from './markdown-images';
import { escapeHtml } from './markdown-controls';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
});

md.renderer.rules.fence = (tokens, idx): string => {
  const token = tokens[idx];
  const rawLanguage = token.info.trim().split(/\s+/)[0] ?? '';

  // Mermaid diagrams — render as a <pre class="mermaid"> block for client-side rendering
  if (rawLanguage === 'mermaid') {
    return `<div class="md-code-block md-mermaid-block">
      <div class="md-code-toolbar"><span class="md-code-lang">Mermaid</span></div>
      <pre class="mermaid">${escapeHtml(token.content)}</pre>
    </div>`;
  }

  // Diff — highlight +/- lines
  if (rawLanguage === 'diff') {
    const lines = token.content.split('\n').map(line => {
      const ch = line[0];
      if (ch === '+') return `<span class="diff-add">${escapeHtml(line)}</span>`;
      if (ch === '-') return `<span class="diff-del">${escapeHtml(line)}</span>`;
      if (ch === '@') return `<span class="diff-hunk">${escapeHtml(line)}</span>`;
      return escapeHtml(line);
    }).join('\n');
    return renderCodeBlock(`<code class="hljs">${lines}</code>`, 'diff');
  }

  const language = rawLanguage && hljs.getLanguage(rawLanguage) ? rawLanguage : '';

  if (language) {
    try {
      const out = hljs.highlight(token.content, { language, ignoreIllegals: true }).value;
      return renderCodeBlock(
        `<code class="hljs language-${escapeAttr(language)}">${out}</code>`,
        language,
      );
    } catch {
      /* fall through */
    }
  }

  try {
    const out = hljs.highlightAuto(token.content).value;
    return renderCodeBlock(`<code class="hljs">${out}</code>`);
  } catch {
    return renderCodeBlock(`<code>${escapeHtml(token.content)}</code>`);
  }
};

md.renderer.rules.code_block = (tokens, idx): string =>
  renderCodeBlock(`<code>${escapeHtml(tokens[idx].content)}</code>`);

const defaultLinkRender = md.renderer.rules.link_open
  ?? ((tokens, idx, options, _env, self): string => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const tok = tokens[idx];
  const href = tok.attrGet('href') ?? '';
  if (/^https?:\/\//i.test(href)) {
    tok.attrSet('target', '_blank');
    tok.attrSet('rel', 'noopener noreferrer');
  }
  return defaultLinkRender(tokens, idx, options, env, self);
};

const origTableOpen = md.renderer.rules.table_open
  ?? ((tokens, idx, options, _env, self): string => self.renderToken(tokens, idx, options));
const origTableClose = md.renderer.rules.table_close
  ?? ((tokens, idx, options, _env, self): string => self.renderToken(tokens, idx, options));
md.renderer.rules.table_open = (tokens, idx, options, env, self) =>
  `<div class="md-table-scroll">${origTableOpen(tokens, idx, options, env, self)}`;
md.renderer.rules.table_close = (tokens, idx, options, env, self) =>
  `${origTableClose(tokens, idx, options, env, self)}</div>`;

const defaultImageRender = md.renderer.rules.image
  ?? ((tokens, idx, options, _env, self): string => self.renderToken(tokens, idx, options));
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const safeSrc = sanitizeMarkdownImageSrc(token.attrGet('src'));
  if (!safeSrc) return '';
  token.attrSet('src', safeSrc);
  token.attrSet('loading', 'lazy');
  token.attrSet('decoding', 'async');

  const imageHtml = defaultImageRender(tokens, idx, options, env, self);
  const escapedSrc = escapeAttr(safeSrc);
  return `<span class="md-image-frame">
    ${imageHtml}
    <button type="button" class="md-image-copy" data-md-image-copy data-md-image-src="${escapedSrc}" aria-label="Copy image" title="Copy image">
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M5.5 5.5h6a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 4 12V7a1.5 1.5 0 0 1 1.5-1.5Z" />
        <path d="M2.5 10.5V4A1.5 1.5 0 0 1 4 2.5h6.5" />
      </svg>
      <span data-md-image-copy-label aria-live="polite">Copy image</span>
    </button>
  </span>`;
};

function escapeAttr(s: string): string {
  return s.replace(/[&"<>]/g, ch => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[ch] ?? ch);
}

function renderCodeBlock(codeHtml: string, language?: string): string {
  const langAttr = language ? ` data-language="${escapeAttr(language)}"` : '';
  const langLabel = language ? `<span class="md-code-lang">${escapeHtml(language)}</span>` : '';
  return `<div class="md-code-block">
    <div class="md-code-toolbar" aria-label="Code actions">
      ${langLabel}
      <button type="button" class="md-code-apply" data-md-code-apply aria-label="Apply code" title="Apply to file" style="display:none">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 8l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>Apply</span>
      </button>
      <button type="button" class="md-code-copy" data-md-code-copy aria-label="Copy code" title="Copy code">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M5.5 5.5h6a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 4 12V7a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path d="M2.5 10.5V4A1.5 1.5 0 0 1 4 2.5h6.5" />
        </svg>
        <span data-md-code-copy-label aria-live="polite">Copy</span>
      </button>
    </div>
    <pre class="hljs"${langAttr}>${codeHtml}</pre>
  </div>`;
}

const markdownCache = new LRUCache<string, string>({ maxSize: 100, maxAge: 600000 });

const FILE_PATH_RE = /(?:^|\s)(packages\/[\w/-]+\.\w{2,4})(?:\s|$)/gm;

function linkifyFilePaths(html: string): string {
  return html.replace(FILE_PATH_RE, (_m, path: string) =>
    ` <a href="#/files?path=${encodeURIComponent(path)}" class="file-path-link" title="在文件管理器中打开 ${escapeAttr(path)}">${escapeHtml(path)}</a> `,
  );
}

const URL_CARD_RE = /<p>\s*(https?:\/\/[^\s<>]+)\s*<\/p>/g;

function renderLinkCards(html: string): string {
  return html.replace(URL_CARD_RE, (_m, url: string) => {
    let host = '';
    try { host = new URL(url).hostname; } catch { /* invalid */ }
    if (!host) return _m;
    return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="md-link-card">
      <span class="md-link-card-icon">🔗</span>
      <div>
        <div class="text-xs text-[var(--text-2)] truncate max-w-[320px]">${escapeHtml(url)}</div>
        <div class="md-link-card-url">${escapeHtml(host)}</div>
      </div>
    </a>`;
  });
}

export function renderMarkdown(text: string): string {
  if (!text) return '';
  const cached = markdownCache.get(text);
  if (cached !== undefined) {
    return cached;
  }
  let html: string;
  try {
    html = md.render(text);
  } catch {
    html = `<p>${escapeHtml(text)}</p>`;
  }
  const protected_ = new Map<string, string>();
  let id = 0;
  html = html.replace(/(<pre[^>]*>[\s\S]*?<\/pre>|<a[^>]*>[\s\S]*?<\/a>)/g, m => {
    const key = `\x00PROTECTED${id++}\x00`;
    protected_.set(key, m);
    return key;
  });
  html = linkifyFilePaths(html);
  html = renderLinkCards(html);
  for (const [key, val] of protected_) { html = html.replace(key, val); }
  markdownCache.set(text, html);
  return html;
}
