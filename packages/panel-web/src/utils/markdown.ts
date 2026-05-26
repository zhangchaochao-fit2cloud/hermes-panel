/**
 * Lightweight markdown renderer for assistant messages.
 *
 * Constraints:
 * - SAFE: assistant text is treated as untrusted (model output). We must
 *   NOT enable HTML pass-through, and we must protect against XSS via
 *   markdown-it's default `html: false`.
 * - STREAMING-FRIENDLY: callers may feed partial markdown (half a code
 *   fence, dangling list item). markdown-it is resilient to this — it
 *   just leaves the unclosed token as literal text — but we still
 *   shouldn't crash on weird input.
 * - SYNTAX HIGHLIGHT: code fences run through highlight.js with auto-
 *   detection. A language hint after the fence wins.
 * - LINKS: external links get target=_blank rel=noopener for safety.
 */
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/common';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
  highlight(code, lang): string {
    const language = (lang || '').trim();
    if (language && hljs.getLanguage(language)) {
      try {
        const out = hljs.highlight(code, { language, ignoreIllegals: true }).value;
        return `<pre class="hljs"><code class="hljs language-${escapeAttr(language)}">${out}</code></pre>`;
      } catch {
        /* fall through */
      }
    }
    try {
      const out = hljs.highlightAuto(code).value;
      return `<pre class="hljs"><code class="hljs">${out}</code></pre>`;
    } catch {
      return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
    }
  },
});

// Open external links in a new tab; do nothing for anchors / file: links.
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

// Tables get a wrapper so we can scroll horizontally on small viewports.
const origTableOpen = md.renderer.rules.table_open
  ?? ((tokens, idx, options, _env, self): string => self.renderToken(tokens, idx, options));
const origTableClose = md.renderer.rules.table_close
  ?? ((tokens, idx, options, _env, self): string => self.renderToken(tokens, idx, options));
md.renderer.rules.table_open = (tokens, idx, options, env, self) =>
  `<div class="md-table-scroll">${origTableOpen(tokens, idx, options, env, self)}`;
md.renderer.rules.table_close = (tokens, idx, options, env, self) =>
  `${origTableClose(tokens, idx, options, env, self)}</div>`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s: string): string {
  return s.replace(/[&"<>]/g, ch => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[ch] ?? ch);
}

export function renderMarkdown(text: string): string {
  if (!text) return '';
  try {
    return md.render(text);
  } catch {
    // Fall back to escaped plain text on any parser blow-up.
    return `<p>${escapeHtml(text)}</p>`;
  }
}
