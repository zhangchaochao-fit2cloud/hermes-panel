/**
 * Convert an in-memory chat (ChatMessage[]) into a self-contained
 * Markdown document suitable for sharing or archiving.
 *
 * Pure & deterministic — no Date.now(), no DOM access, no I/O. Given the
 * same inputs you always get the same output, which makes this a friendly
 * target for a future unit test.
 *
 * Output shape:
 *
 *   # <title or "Untitled session">
 *
 *   ## User
 *
 *   <verbatim user content, already markdown>
 *
 *   ## Assistant
 *
 *   > 🧠 Reasoning
 *   > <reasoning if present>
 *
 *   <verbatim assistant content>
 *
 *   ```toolcall <name>
 *   Input:
 *   <json input>
 *   Output:
 *   <text-or-json output>
 *   ```
 *
 * Streaming state (the blinking cursor, `completed: false`) is intentionally
 * dropped — the export is a snapshot, not a replay.
 */
import type { ChatMessage, ToolCall } from '@hermes-panel/shared';

function headingForRole(role: ChatMessage['role']): string {
  switch (role) {
    case 'user': return '## User';
    case 'assistant': return '## Assistant';
    case 'system': return '## System';
    case 'tool': return '## Tool';
  }
}

function formatReasoningBlock(reasoning: string): string {
  // Each line becomes its own `> ` prefixed line so multi-line reasoning
  // renders as a single blockquote (GFM joins consecutive `>` lines).
  const lines = reasoning.split('\n').map(l => `> ${l}`);
  return ['> 🧠 Reasoning', ...lines].join('\n');
}

function stringifyToolValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    // Circular or otherwise non-serializable — fall back to String().
    return String(value);
  }
}

function formatToolCall(tc: ToolCall): string {
  const lines: string[] = [];
  lines.push('```toolcall ' + tc.name);
  lines.push('Input:');
  // Empty object input is common (preview-only); still render an empty line
  // so the section structure is consistent.
  const inputStr = stringifyToolValue(tc.input);
  lines.push(inputStr === '' ? '{}' : inputStr);
  lines.push('Output:');
  if (tc.status === 'error' && tc.errorMessage) {
    lines.push(`Error: ${tc.errorMessage}`);
  } else if (tc.output !== undefined) {
    lines.push(stringifyToolValue(tc.output));
  } else if (tc.preview) {
    lines.push(tc.preview);
  } else {
    lines.push('');
  }
  lines.push('```');
  return lines.join('\n');
}

export function chatToMarkdown(messages: ChatMessage[], title?: string): string {
  const parts: string[] = [];
  const heading = title && title.trim().length > 0 ? title.trim() : 'Untitled session';
  parts.push(`# ${heading}`);

  for (const msg of messages) {
    // Skip messages with nothing to show. An assistant message with tool
    // calls but no text content is still meaningful, so we only skip if
    // there is truly no payload at all.
    const hasContent = msg.content.trim().length > 0;
    const hasReasoning = !!(msg.reasoning && msg.reasoning.trim().length > 0);
    const hasToolCalls = !!(msg.toolCalls && msg.toolCalls.length > 0);
    if (!hasContent && !hasReasoning && !hasToolCalls) continue;

    parts.push('');
    parts.push(headingForRole(msg.role));

    if (msg.role === 'assistant' && hasReasoning) {
      parts.push('');
      parts.push(formatReasoningBlock(msg.reasoning as string));
    }

    if (hasContent) {
      parts.push('');
      parts.push(msg.content);
    }

    if (hasToolCalls) {
      for (const tc of msg.toolCalls as ToolCall[]) {
        parts.push('');
        parts.push(formatToolCall(tc));
      }
    }
  }

  // Always end with a single trailing newline so concatenating exports or
  // piping through tools (`cat foo.md bar.md`) behaves.
  return parts.join('\n') + '\n';
}
