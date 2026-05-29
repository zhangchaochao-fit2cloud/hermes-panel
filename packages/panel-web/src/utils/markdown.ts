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
});

md.renderer.rules.fence = (tokens, idx): string => {
  const token = tokens[idx];
  const rawLanguage = token.info.trim().split(/\s+/)[0] ?? '';
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

export function escapeHtml(s: string): string {
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

function renderCodeBlock(codeHtml: string, language?: string): string {
  const langAttr = language ? ` data-language="${escapeAttr(language)}"` : '';
  // language chip 由 .prose-md pre[data-language]::before 渲染（CSS attr 注入），
  // 这里只插入低干扰的 Copy 按钮（右上角，hover/focus 显示）。
  return `<div class="md-code-block">
    <div class="md-code-toolbar" aria-label="Code actions">
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

export interface MarkdownCodeCopyLabels {
  copy: string;
  copied: string;
  copyFailed: string;
}

const copyResetTimers = new WeakMap<HTMLButtonElement, number>();

export function hydrateMarkdownCodeBlocks(root: HTMLElement | null, labels: MarkdownCodeCopyLabels): void {
  if (!root) return;
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-md-code-copy]')) {
    setCopyButtonState(button, labels.copy, false);
  }
}

export async function handleMarkdownCodeCopyClick(
  event: MouseEvent,
  labels: MarkdownCodeCopyLabels,
): Promise<boolean> {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const button = target.closest<HTMLButtonElement>('[data-md-code-copy]');
  if (!button) return false;
  event.preventDefault();
  event.stopPropagation();

  const code = button
    .closest('.md-code-block')
    ?.querySelector('pre code')
    ?.textContent ?? '';
  if (!code) return true;

  const ok = await copyText(code);
  setCopyButtonState(button, ok ? labels.copied : labels.copyFailed, ok);

  const prev = copyResetTimers.get(button);
  if (prev) window.clearTimeout(prev);
  const timer = window.setTimeout(() => {
    setCopyButtonState(button, labels.copy, false);
    copyResetTimers.delete(button);
  }, ok ? 1400 : 1800);
  copyResetTimers.set(button, timer);
  return true;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}

function setCopyButtonState(button: HTMLButtonElement, label: string, copied: boolean): void {
  const text = button.querySelector<HTMLElement>('[data-md-code-copy-label]');
  if (text) text.textContent = label;
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.classList.toggle('is-copied', copied);
}

// LRU memo: 长会话场景下同一条已完成消息会被多次 re-render（cron 合并视图加载、
// 主题切换重绘、locale 切换等），缓存避免重新跑 markdown-it。
// key 用 text 本身（短消息存全文 OK，长消息也只增加~几 KB，cap=200 限总 footprint）。
// 流式中 text 不断变 → 不命中 → 流畅渲染最新 token。流式结束 text 稳定 → 后续重渲染都命中。
const MARKDOWN_CACHE_MAX = 200;
const markdownCache = new Map<string, string>();

export function renderMarkdown(text: string): string {
  if (!text) return '';
  const cached = markdownCache.get(text);
  if (cached !== undefined) {
    // 触摸：把命中项挪到 Map 末尾（LRU 顺序），淘汰时删除最早的 key
    markdownCache.delete(text);
    markdownCache.set(text, cached);
    return cached;
  }
  let html: string;
  try {
    html = md.render(text);
  } catch {
    html = `<p>${escapeHtml(text)}</p>`;
  }
  if (markdownCache.size >= MARKDOWN_CACHE_MAX) {
    // 删最早一项（Map 保持插入顺序）
    const firstKey = markdownCache.keys().next().value;
    if (firstKey !== undefined) markdownCache.delete(firstKey);
  }
  markdownCache.set(text, html);
  return html;
}
