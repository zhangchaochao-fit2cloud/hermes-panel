import type { ToolCall } from '@hermes-panel/shared';

export type ToolCategory = 'shell' | 'edit' | 'read' | 'search' | 'write' | 'skill' | 'memory' | 'other';

export interface ToolCallFacts {
  category: ToolCategory;
  files: string[];
  skills: string[];
  lineCount: number | null;
}

export interface DiffLine {
  kind: 'add' | 'delete' | 'context';
  content: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface EditFileChange {
  path: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
  patchText: string;
  truncated: boolean;
}

export interface ToolEditSummary {
  files: EditFileChange[];
  additions: number;
  deletions: number;
}

const FILE_KEYS = [
  'path', 'file_path', 'filename', 'file', 'absolute_path', 'relative_path',
  'target_file', 'targetPath', 'target_path',
];

const SKILL_KEYS = ['skill', 'skills', 'skill_name', 'skillName', 'skillNames'];
const LINE_START_KEYS = ['start_line', 'startLine', 'line_start', 'lineStart', 'from_line'];
const LINE_END_KEYS = ['end_line', 'endLine', 'line_end', 'lineEnd', 'to_line'];
const LINE_COUNT_KEYS = ['line_count', 'lineCount', 'lines'];
const TEXT_KEYS = ['new_str', 'newString', 'content', 'text', 'body'];
const PATCH_KEYS = ['patch', 'diff'];

export function categorizeTool(name: string): ToolCategory {
  const n = name.toLowerCase();
  if (/^(bash|shell|exec|cmd|run_command|run_shell)/.test(n)) return 'shell';
  if (/^(edit|patch|apply_patch|apply_diff|str_replace|multi_edit)/.test(n)) return 'edit';
  if (/^(write|create_file|put_file)/.test(n)) return 'write';
  if (/^(read|view|cat|open)/.test(n)) return 'read';
  if (/^(search|grep|rg|find_files|glob|web_search)/.test(n)) return 'search';
  if (/memory|memories|citation/.test(n)) return 'memory';
  if (/^(skill|skills|use_skill|load_skill|plugin|mcp)/.test(n)) return 'skill';
  return 'other';
}

export function getToolCallFacts(toolCall: ToolCall): ToolCallFacts {
  const input = toRecord(toolCall.input);
  const preview = typeof toolCall.preview === 'string' ? toolCall.preview : undefined;
  return {
    category: categorizeTool(toolCall.name),
    files: unique([
      ...collectStrings(input, FILE_KEYS).map(shortPath),
      ...extractPatchFiles(input).map(shortPath),
      ...extractLabeledPreviewValues(preview, ['path', 'file', 'filename', 'file_path']).map(shortPath),
    ]),
    skills: unique([
      ...collectStrings(input, SKILL_KEYS),
      ...extractLabeledPreviewValues(preview, ['skill', 'skills']),
    ]),
    lineCount: inferLineCount(input, toolCall.output),
  };
}

export function pickToolString(toolCall: ToolCall, ...keys: string[]): string | null {
  const input = toRecord(toolCall.input);
  return pickString(input, keys);
}

export function getToolEditSummary(toolCall: ToolCall): ToolEditSummary | null {
  const input = toRecord(toolCall.input);
  const patchText = firstString(input, PATCH_KEYS);
  const parsed = patchText ? parsePatchText(patchText) : [];
  const files = parsed.length > 0 ? parsed : fallbackEditFiles(input, toolCall);
  if (files.length === 0) return null;
  return {
    files,
    additions: files.reduce((sum, file) => sum + file.additions, 0),
    deletions: files.reduce((sum, file) => sum + file.deletions, 0),
  };
}

export function shortPath(path: string): string {
  const home = '/Users/';
  let value = path;
  if (value.startsWith(home)) {
    const slash = value.indexOf('/', home.length);
    value = '~' + (slash >= 0 ? value.slice(slash) : '');
  }
  return value.length > 60 ? '…' + value.slice(-58) : value;
}

function inferLineCount(input: Record<string, unknown>, output: unknown): number | null {
  const explicit = firstNumber(input, LINE_COUNT_KEYS);
  if (explicit != null && explicit > 0) return Math.round(explicit);

  const start = firstNumber(input, LINE_START_KEYS);
  const end = firstNumber(input, LINE_END_KEYS);
  if (start != null && end != null) return Math.max(1, Math.abs(Math.round(end - start)) + 1);

  const patchLines = countPatchChangedLines(input);
  if (patchLines > 0) return patchLines;

  for (const key of TEXT_KEYS) {
    const value = input[key];
    if (typeof value === 'string' && value.length > 0) return countLines(value);
  }

  if (typeof output === 'string' && output.length > 0) return countLines(output);
  return null;
}

function extractPatchFiles(input: Record<string, unknown>): string[] {
  const result: string[] = [];
  for (const key of PATCH_KEYS) {
    const value = input[key];
    if (typeof value !== 'string') continue;
    for (const line of value.split(/\r?\n/)) {
      const match = line.match(/^\*\*\* (?:Add|Update|Delete) File:\s+(.+)$/);
      if (match?.[1]) result.push(match[1].trim());
    }
  }
  return result;
}

function parsePatchText(patchText: string): EditFileChange[] {
  const files: EditFileChange[] = [];
  let current: EditFileChange | null = null;
  let oldLine: number | null = null;
  let newLine: number | null = null;

  function ensureFile(path: string): EditFileChange {
    if (!current || current.path !== path) {
      current = {
        path: shortPath(path),
        additions: 0,
        deletions: 0,
        lines: [],
        patchText: '',
        truncated: false,
      };
      files.push(current);
    }
    return current;
  }

  for (const rawLine of patchText.split(/\r?\n/)) {
    const applyPatchFile = rawLine.match(/^\*\*\* (?:Add|Update|Delete) File:\s+(.+)$/);
    if (applyPatchFile?.[1]) {
      current = ensureFile(applyPatchFile[1].trim());
      oldLine = null;
      newLine = null;
      continue;
    }

    const gitFile = rawLine.match(/^\+\+\+ b\/(.+)$/);
    if (gitFile?.[1]) {
      current = ensureFile(gitFile[1].trim());
      oldLine = null;
      newLine = null;
      continue;
    }

    if (!current) continue;

    current.patchText += `${rawLine}\n`;

    const hunk = rawLine.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      pushDiffLine(current, 'context', rawLine, null, null);
      continue;
    }

    if (/^\+(?!\+\+)/.test(rawLine)) {
      current.additions += 1;
      pushDiffLine(current, 'add', rawLine.slice(1), null, newLine);
      if (newLine != null) newLine += 1;
      continue;
    }
    if (/^-(?!--)/.test(rawLine)) {
      current.deletions += 1;
      pushDiffLine(current, 'delete', rawLine.slice(1), oldLine, null);
      if (oldLine != null) oldLine += 1;
      continue;
    }
    if (/^ /.test(rawLine)) {
      pushDiffLine(current, 'context', rawLine.slice(1), oldLine, newLine);
      if (oldLine != null) oldLine += 1;
      if (newLine != null) newLine += 1;
    }
  }

  return files
    .filter(file => file.additions > 0 || file.deletions > 0)
    .map(limitDiffLines);
}

function fallbackEditFiles(input: Record<string, unknown>, toolCall: ToolCall): EditFileChange[] {
  const path = collectStrings(input, FILE_KEYS)[0];
  if (!path) return [];

  const oldText = firstString(input, ['old_str', 'oldString', 'old_text', 'oldText', 'before']);
  const newText = firstString(input, ['new_str', 'newString', 'new_text', 'newText', 'content', 'text', 'body', 'after']);
  const outputText = typeof toolCall.output === 'string' ? toolCall.output : null;
  const additions = newText ? countLines(newText) : outputText ? countLines(outputText) : 0;
  const deletions = oldText ? countLines(oldText) : 0;
  if (additions === 0 && deletions === 0) return [];

  const startLine = firstNumber(input, LINE_START_KEYS);
  const lines: DiffLine[] = [];
  if (oldText) {
    oldText.split(/\r?\n/).forEach((line, index) => {
      lines.push({
        kind: 'delete',
        content: line,
        oldLine: startLine != null ? Math.round(startLine) + index : null,
        newLine: null,
      });
    });
  }
  if (newText) {
    newText.split(/\r?\n/).forEach((line, index) => {
      lines.push({
        kind: 'add',
        content: line,
        oldLine: null,
        newLine: startLine != null ? Math.round(startLine) + index : null,
      });
    });
  }

  const patchText = [
    oldText ? oldText.split(/\r?\n/).map(line => `-${line}`).join('\n') : '',
    newText ? newText.split(/\r?\n/).map(line => `+${line}`).join('\n') : '',
  ].filter(Boolean).join('\n');

  return [limitDiffLines({
    path: shortPath(path),
    additions,
    deletions,
    lines,
    patchText,
    truncated: false,
  })];
}

function pushDiffLine(file: EditFileChange, kind: DiffLine['kind'], content: string, oldLine: number | null, newLine: number | null): void {
  file.lines.push({ kind, content, oldLine, newLine });
}

function limitDiffLines(file: EditFileChange): EditFileChange {
  const maxLines = 180;
  if (file.lines.length <= maxLines) return file;
  return { ...file, lines: file.lines.slice(0, maxLines), truncated: true };
}

function countPatchChangedLines(input: Record<string, unknown>): number {
  let count = 0;
  for (const key of PATCH_KEYS) {
    const value = input[key];
    if (typeof value !== 'string') continue;
    for (const line of value.split(/\r?\n/)) {
      if (/^[+-](?![+-]{2})/.test(line)) count += 1;
    }
  }
  return count;
}

function firstString(input: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

function extractLabeledPreviewValues(preview: string | undefined, labels: string[]): string[] {
  if (!preview) return [];
  const values: string[] = [];
  const labelPattern = labels.map(escapeRegExp).join('|');
  const re = new RegExp(`\\b(?:${labelPattern})\\b\\s*[:=]\\s*["']?([^"',\\n]+)`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = re.exec(preview)) !== null) {
    const value = match[1]?.trim();
    if (value) values.push(value);
  }
  return values;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectStrings(input: Record<string, unknown>, keys: string[]): string[] {
  const result: string[] = [];
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) {
      result.push(...splitList(value));
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) result.push(item.trim());
      }
    }
  }
  return result;
}

function pickString(input: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return null;
}

function firstNumber(input: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function countLines(value: string): number {
  return value.length === 0 ? 0 : value.split(/\r?\n/).length;
}

function splitList(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
