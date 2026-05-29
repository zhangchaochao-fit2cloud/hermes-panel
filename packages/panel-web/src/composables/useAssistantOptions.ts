import { computed, type ComputedRef, type Ref } from 'vue';
import type { ChatMessage } from '@hermes-panel/shared';

/**
 * 从 assistant 最近一条已完成消息里识别 A/B/C 形式的选项。
 *
 * 触发条件：
 *   - 最后一条 assistant 已完成
 *   - 它后面没有用户消息（即用户还没回话）
 *   - 至少能识别出 2 个选项
 *
 * 解析规则：行首匹配 `<编号><分隔><空格><内容>`
 *   - 编号：A-Z / 中文一二三十 / 数字 1-99
 *   - 分隔：. 、 ) ）
 *
 * 解析结果通过 pickOption 调用 composer.setText 写到输入框 — 用户
 * 看到选项后点 ⏎ 直接发，或者补充再发。
 */
export interface ParsedOption {
  label: string;   // e.g. "A" / "1"
  content: string; // 选项后的文字
  raw: string;     // 原始行
}

const OPTION_LINE_RE = /^\s*([A-Z]|[一二三四五六七八九十]|\d{1,2})[.、)）]\s*(.+?)\s*$/;

export function parseOptions(text: string): ParsedOption[] {
  const lines = text.split('\n');
  const out: ParsedOption[] = [];
  for (const raw of lines) {
    const m = raw.match(OPTION_LINE_RE);
    if (!m) continue;
    const label = m[1];
    const content = m[2];
    if (content.length < 2 || content.length > 200) continue;
    out.push({ label, content, raw });
    if (out.length >= 8) break;
  }
  return out.length >= 2 ? out : [];
}

interface ComposerHandle {
  setText?: (v: string) => void;
}

export function useAssistantOptions(
  messages: Ref<ChatMessage[]>,
  composerRef: Ref<ComposerHandle | null>,
): {
  options: ComputedRef<ParsedOption[]>;
  pick: (opt: ParsedOption) => void;
} {
  const options = computed<ParsedOption[]>(() => {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const m = messages.value[i];
      if (m.role === 'assistant' && m.completed) {
        return parseOptions(m.content);
      }
      if (m.role === 'user') break; // 用户已接话，跳过
    }
    return [];
  });

  function pick(opt: ParsedOption): void {
    composerRef.value?.setText?.(opt.label);
  }

  return { options, pick };
}
