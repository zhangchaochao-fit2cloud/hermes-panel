import type { Ref } from 'vue';
import type { ChatMessage } from '@hermes-panel/shared';
import { useSessionStore } from '@/stores/session';
import { useSessionsStore } from '@/stores/sessions';
import { chatToMarkdown } from '@/utils/chat-to-md';
import { escapeHtml } from '@/utils/markdown-controls';
import { triggerDownload } from '@/utils/download';

/**
 * 把当前会话导出。多格式：
 *   - md         markdown 文件下载
 *   - json       原始 messages 数组 JSON 文件下载
 *   - html       markdown 渲染过的 HTML（带最小 inline 样式）下载
 *   - clipboard  markdown 文本复制到剪贴板
 *
 * 完全前端：直接读 session store，不走 BFF — 离线可用、不多过网络。
 */
export type ExportFormat = 'md' | 'json' | 'html' | 'clipboard';

interface ExportResult {
  ok: boolean;
  reason?: 'empty' | 'clipboard_failed';
  filename?: string;
  format: ExportFormat;
}

export function useChatExport(messages: Ref<ChatMessage[]>): {
  exportAs: (fmt: ExportFormat) => Promise<ExportResult>;
} {
  const session = useSessionStore();
  const sessionsList = useSessionsStore();

  function slug(): string {
    return session.sessionId
      ? session.sessionId.slice(0, 8)
      : new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  function currentTitle(): string | undefined {
    return sessionsList.items.find(s => s.id === session.sessionId)?.title;
  }

  async function asHtml(md: string, title: string | undefined): Promise<string> {
    const { renderMarkdown } = await import('@/utils/markdown-renderer');
    const body = renderMarkdown(md);
    const css = `body{font-family:-apple-system,system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1f2937}pre{background:#f3f4f6;padding:0.75rem;border-radius:6px;overflow-x:auto}code{background:#f3f4f6;padding:0.1rem 0.3rem;border-radius:3px;font-size:0.9em}h1,h2,h3{margin-top:1.5em}blockquote{border-left:3px solid #d1d5db;margin:0;padding-left:1em;color:#6b7280}`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title ?? 'Hermes Chat')}</title><style>${css}</style></head><body>${body}</body></html>`;
  }

  async function exportAs(fmt: ExportFormat): Promise<ExportResult> {
    if (messages.value.length === 0) return { ok: false, reason: 'empty', format: fmt };
    const title = currentTitle();
    const md = chatToMarkdown(messages.value, title);
    const base = `hermes-chat-${slug()}`;

    if (fmt === 'md') {
      triggerDownload(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `${base}.md`);
      return { ok: true, filename: `${base}.md`, format: fmt };
    }
    if (fmt === 'json') {
      const payload = {
        sessionId: session.sessionId,
        title,
        exportedAt: new Date().toISOString(),
        messages: messages.value,
      };
      triggerDownload(
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
        `${base}.json`,
      );
      return { ok: true, filename: `${base}.json`, format: fmt };
    }
    if (fmt === 'html') {
      triggerDownload(
        new Blob([await asHtml(md, title)], { type: 'text/html;charset=utf-8' }),
        `${base}.html`,
      );
      return { ok: true, filename: `${base}.html`, format: fmt };
    }
    // clipboard
    try {
      await navigator.clipboard.writeText(md);
      return { ok: true, format: fmt };
    } catch {
      return { ok: false, reason: 'clipboard_failed', format: fmt };
    }
  }

  return { exportAs };
}
