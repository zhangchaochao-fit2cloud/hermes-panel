<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { NDropdown } from 'naive-ui';
import ContextRing from './ContextRing.vue';
import ThinkingStrategyPicker from './ThinkingStrategyPicker.vue';
import ExecutionModePicker from './ExecutionModePicker.vue';
import SlashPromptShortcuts from './SlashPromptShortcuts.vue';
import ComposerTaskActions, { type ComposerTaskActionPayload } from './ComposerTaskActions.vue';
import ComposerTaskAdvisor from './ComposerTaskAdvisor.vue';
import { useExecutionMode } from '@/composables/useExecutionMode';
import { useSmartSuggestion } from '@/composables/useSmartSuggestion';
import { isInlineComposerTaskAction } from '@/data/task-capability-actions';
import { useHotkeysStore, chordToDisplayTokens } from '@/stores/hotkeys';
import { useSessionStore } from '@/stores/session';
import { useWorkspacesStore } from '@/stores/workspaces';
import { useBreakpoint } from '@/composables/use-breakpoint';
import { teamFor, type RoleDef } from '@/data/roles';

const { t } = useI18n();
const hotkeys = useHotkeysStore();
const session = useSessionStore();
const workspaces = useWorkspacesStore();
const { isMobile } = useBreakpoint();
const { permissionPrompt: executionModePrompt } = useExecutionMode();

const props = defineProps<{
  model: string;
  thinkingSpeed: 'fast' | 'extended' | 'auto' | 'route';
  sending: boolean;
  lastSentText?: string;
}>();

const emit = defineEmits<{
  (e: 'send', text: string): void;
  (e: 'stop'): void;
  (e: 'update:model', v: string): void;
  (e: 'update:thinkingSpeed', v: 'fast' | 'extended' | 'auto' | 'route'): void;
  (e: 'restoreText', text: string): void;
  (e: 'taskAction', payload: ComposerTaskActionPayload): void;
}>();

// Suppress "unused" warning for `model` — kept on the prop signature for
// backward compatibility with parent v-model:model bindings even though the
// composer itself no longer renders a model switcher.
void props.model;
void emit;

const text = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const { suggestion, dismiss: dismissSuggestion } = useSmartSuggestion(text);

type PermissionMode = 'default' | 'auto-review' | 'full-access';

interface ComposerAttachment {
  id: string;
  kind: 'text' | 'image';
  name: string;
  size: number;
  content: string | null;
  dataUrl?: string;
  mime?: string;
  truncated: boolean;
  error?: string;
}

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_CHARS = 200_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const permissionMode = ref<PermissionMode>('default');
const attachments = ref<ComposerAttachment[]>([]);
const canSend = computed(() => (text.value.trim().length > 0 || attachments.value.length > 0) && !props.sending);

// 草稿持久化：按 sessionId 在 localStorage 隔离。新会话用 'new' 作 key。
// virtual session（cron 合并视图，id 形如 virtual:cron:*）只读，不存草稿。
const DRAFT_KEY_PREFIX = 'panel.chat.draft.';
function draftKey(sid: string | null): string | null {
  if (!sid) return DRAFT_KEY_PREFIX + 'new';
  if (sid.startsWith('virtual:')) return null;
  return DRAFT_KEY_PREFIX + sid;
}
function loadDraft(sid: string | null): void {
  const key = draftKey(sid);
  if (!key) {
    text.value = '';
    return;
  }
  try {
    const v = localStorage.getItem(key) ?? '';
    text.value = v;
  } catch {
    text.value = '';
  }
}
let draftTimer: ReturnType<typeof setTimeout> | null = null;
function persistDraft(): void {
  const key = draftKey(session.sessionId);
  if (!key) return;
  try {
    if (text.value.trim()) localStorage.setItem(key, text.value);
    else localStorage.removeItem(key);
  } catch {
    /* quota exceeded, ignore */
  }
}
watch(text, () => {
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = setTimeout(persistDraft, 400);
});
// session 切换前先 flush 当前草稿；再 load 新 session 的草稿。
// 注意 watch 拿到的 oldId 是切换前那条，新 sessionId 已经更新了，所以要
// 用 oldId 临时反推：拿当前 text 写到 oldId 对应的 key。
watch(() => session.sessionId, (newId, oldId) => {
  if (draftTimer) {
    clearTimeout(draftTimer);
    draftTimer = null;
  }
  const oldKey = draftKey(oldId ?? null);
  if (oldKey) {
    try {
      if (text.value.trim()) localStorage.setItem(oldKey, text.value);
      else localStorage.removeItem(oldKey);
    } catch { /* quota */ }
  }
  loadDraft(newId);
}, { immediate: false });

/**
 * Auto-grow: starts ~2 rows, grows up to ~8, then scrolls. We measure
 * `scrollHeight` of an offscreen-shrunk textarea each tick the value changes
 * and clamp to MAX_PX. Doing it imperatively (rather than via rows="…") keeps
 * the textarea a single source of truth and avoids layout jumps from
 * row→pixel rounding.
 */
const LINE_HEIGHT_PX = 20; // matches text-sm (14px) * leading-snug; see <textarea> class
const MIN_ROWS = 2;
const MAX_ROWS = 8;
const VERTICAL_PADDING_PX = 24; // p-3 = 12px top + 12px bottom
const MIN_PX = LINE_HEIGHT_PX * MIN_ROWS + VERTICAL_PADDING_PX;
const MAX_PX = LINE_HEIGHT_PX * MAX_ROWS + VERTICAL_PADDING_PX;

function resize(): void {
  const el = textareaRef.value;
  if (!el) return;
  // Collapse first so scrollHeight reflects content height, not the previous
  // (larger) box height.
  el.style.height = 'auto';
  const next = Math.min(MAX_PX, Math.max(MIN_PX, el.scrollHeight));
  el.style.height = `${next}px`;
  // Show scrollbar only when clamped at the max.
  el.style.overflowY = el.scrollHeight > MAX_PX ? 'auto' : 'hidden';
}

watch(text, () => { void nextTick(resize); });
onMounted(() => {
  loadDraft(session.sessionId);
  resize();
});

const charCount = computed(() => text.value.length);
const showCharCount = computed(() => charCount.value > 50);
const promptPlaceholder = computed(() => {
  const workspace = workspaces.activeWorkspace?.name;
  if (workspace) {
    return t('chat.composer.placeholderWithWorkspace', { workspace });
  }
  return t('chat.composer.placeholder');
});

// @mention autocomplete
const mentionedRoles = computed<RoleDef[]>(() => {
  const atIdx = text.value.lastIndexOf('@');
  if (atIdx < 0) return [];
  const afterAt = text.value.slice(atIdx + 1);
  if (afterAt.includes(' ')) return [];
  const wsId = workspaces.activeId;
  if (!wsId) return [];
  const roles = teamFor(wsId);
  if (!afterAt) return roles;
  const q = afterAt.toLowerCase();
  return roles.filter(r => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
});
const showMentions = computed(() => mentionedRoles.value.length > 0);
const slashCommandQuery = computed(() => {
  const value = text.value.trimStart();
  if (!value.startsWith('/')) return null;
  const query = value.slice(1);
  if (/\s/.test(query)) return null;
  return query.toLowerCase();
});
const showSlashCommands = computed(() => slashCommandQuery.value !== null);

function selectMention(role: RoleDef): void {
  const atIdx = text.value.lastIndexOf('@');
  if (atIdx < 0) return;
  text.value = text.value.slice(0, atIdx) + `@${role.id} `;
  void nextTick(() => {
    textareaRef.value?.focus();
    resize();
  });
}

function selectSlashPrompt(prompt: string): void {
  text.value = prompt;
  focus();
}

const sendChord = computed(() => hotkeys.bindings.send);
const sendChordTokens = computed(() => chordToDisplayTokens(sendChord.value));

function restoreLastSent(): boolean {
  if (!props.lastSentText) return false;
  text.value = props.lastSentText;
  void nextTick(resize);
  return true;
}

function onKeydown(e: KeyboardEvent): void {
  if (e.isComposing) return;

  if (e.key === 'ArrowUp' && !text.value) { e.preventDefault(); if (restoreLastSent()) return; }
  if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && !text.value) { e.preventDefault(); if (restoreLastSent()) return; }

  if (hotkeys.matches(e, 'newline')) {
    return;
  }
  if (hotkeys.matches(e, 'send')) {
    e.preventDefault();
    submit();
  }
}

function submit(): void {
  if (!canSend.value) return;
  emit('send', composeOutgoingText());
  text.value = '';
  attachments.value = [];
  void nextTick(resize);
}

function onStop(): void {
  emit('stop');
}

// ─── Drag & drop files ───
const dragOver = ref(false);

function onDragOver(e: DragEvent): void {
  e.preventDefault();
  dragOver.value = true;
}
function onDragLeave(): void {
  dragOver.value = false;
}
async function onDrop(e: DragEvent): Promise<void> {
  e.preventDefault();
  dragOver.value = false;
  const files = e.dataTransfer?.files;
  if (!files?.length) return;
  for (const file of files) {
    if (file.type.startsWith('text/') || file.name.match(/\.(ts|js|json|yaml|yml|md|txt|vue|css|html|py|rs|go|toml)$/i)) {
      const content = await file.text();
      text.value += `\n\n// ${file.name}\n${content.slice(0, 8000)}`;
      void nextTick(resize);
    }
  }
}

/** Prepend an @role mention so the user can keep typing the request. */
function prependMention(roleId: string): void {
  const prefix = `@${roleId} `;
  text.value = prefix + text.value.replace(/^@[\w-]+\s+/, '');
  focus();
}

/** Externally populate the composer (e.g. from VS Code draft, sample prompts). */
function setText(v: string): void {
  text.value = v;
  focus();
}

/** Append selected context without replacing the user's current draft. */
function appendText(v: string): void {
  const selected = v.trim();
  if (!selected) return;
  const prefix = text.value.trim().length > 0 ? '\n\n' : '';
  text.value = `${text.value}${prefix}${selected}`;
  focus();
}

function focus(): void {
  // Wait a tick so the new value is rendered before we move the cursor
  setTimeout(() => {
    const el = textareaRef.value;
    if (!el) return;
    resize();
    el.focus();
    // Place caret at the end so the user can keep typing
    el.setSelectionRange(text.value.length, text.value.length);
  }, 0);
}

const permissionOptions = computed(() => [
  { key: 'default', label: t('chat.composer.permission.default') },
  { key: 'auto-review', label: t('chat.composer.permission.autoReview') },
  { key: 'full-access', label: t('chat.composer.permission.fullAccess') },
]);

const permissionLabel = computed(() => {
  if (permissionMode.value === 'auto-review') return t('chat.composer.permission.autoReview');
  if (permissionMode.value === 'full-access') return t('chat.composer.permission.fullAccess');
  return t('chat.composer.permission.default');
});

function onPermissionSelect(key: string | number): void {
  if (key === 'default' || key === 'auto-review' || key === 'full-access') {
    permissionMode.value = key;
  }
}

function openFilePicker(): void {
  fileInputRef.value?.click();
}

function onTaskAction(payload: ComposerTaskActionPayload): void {
  if (isInlineComposerTaskAction(payload.action)) {
    text.value = payload.prompt;
    focus();
    return;
  }
  emit('taskAction', payload);
}

async function onFilesSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  const next = await readAttachments(files);
  attachments.value = [...attachments.value, ...next].slice(0, MAX_ATTACHMENTS);
  input.value = '';
}

async function onPaste(event: ClipboardEvent): Promise<void> {
  const items = Array.from(event.clipboardData?.items ?? []);
  const imageFiles = items
    .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
    .map(item => item.getAsFile())
    .filter((file): file is File => file != null);
  if (!imageFiles.length) return;
  event.preventDefault();
  const next = await readAttachments(imageFiles, true);
  attachments.value = [...attachments.value, ...next].slice(0, MAX_ATTACHMENTS);
}

async function readAttachments(files: File[], fromPaste = false): Promise<ComposerAttachment[]> {
  const remaining = MAX_ATTACHMENTS - attachments.value.length;
  const accepted = files.slice(0, remaining);
  const next: ComposerAttachment[] = [];
  for (const [index, file] of accepted.entries()) {
    const name = fromPaste && !file.name
      ? t('chat.composer.pastedImageName', { n: imageAttachmentCount() + index + 1 })
      : file.name;
    const id = `${name}_${file.size}_${file.lastModified}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      if (file.type.startsWith('image/')) {
        if (file.size > MAX_IMAGE_BYTES) {
          next.push({
            id,
            kind: 'image',
            name,
            size: file.size,
            content: null,
            truncated: false,
            mime: file.type,
            error: t('chat.composer.imageTooLarge', { size: formatFileSize(MAX_IMAGE_BYTES) }),
          });
          continue;
        }
        const dataUrl = await readFileAsDataUrl(file);
        next.push({
          id,
          kind: 'image',
          name,
          size: file.size,
          content: null,
          dataUrl,
          mime: file.type,
          truncated: false,
        });
        continue;
      }
      const raw = await file.text();
      next.push({
        id,
        kind: 'text',
        name,
        size: file.size,
        content: raw.slice(0, MAX_ATTACHMENT_CHARS),
        truncated: raw.length > MAX_ATTACHMENT_CHARS,
      });
    } catch (err) {
      next.push({
        id,
        kind: file.type.startsWith('image/') ? 'image' : 'text',
        name,
        size: file.size,
        content: null,
        truncated: false,
        mime: file.type || undefined,
        error: (err as Error).message,
      });
    }
  }
  return next;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

function imageAttachmentCount(): number {
  return attachments.value.filter(file => file.kind === 'image').length;
}

function removeAttachment(id: string): void {
  attachments.value = attachments.value.filter(file => file.id !== id);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function composeOutgoingText(): string {
  const sections: string[] = [];
  const permission = permissionInstruction();
  if (permission) sections.push(permission);
  if (attachments.value.length) {
    sections.push([
      t('chat.composer.attachmentsPromptHeader'),
      ...attachments.value.map(file => {
        if (file.kind === 'image') {
          if (!file.dataUrl) {
            return `\n--- ${file.name} (${formatFileSize(file.size)}) ---\n${t('chat.composer.fileReadFailed')}: ${file.error ?? ''}`;
          }
          return `\n--- ${file.name} (${formatFileSize(file.size)}) ---\n![${file.name}](${file.dataUrl})`;
        }
        if (file.content == null) {
          return `\n--- ${file.name} (${formatFileSize(file.size)}) ---\n${t('chat.composer.fileReadFailed')}: ${file.error ?? ''}`;
        }
        const suffix = file.truncated ? `\n${t('chat.composer.fileTruncated')}` : '';
        return `\n--- ${file.name} (${formatFileSize(file.size)}) ---\n${file.content}${suffix}`;
      }),
    ].join('\n'));
  }
  const body = text.value.trim();
  if (body) sections.push(body);
  return sections.join('\n\n');
}

function permissionInstruction(): string {
  // Execution mode prompt always applies; legacy dropdown adds extra constraints.
  const parts: string[] = [];
  parts.push(executionModePrompt.value);
  if (permissionMode.value === 'auto-review') parts.push(t('chat.composer.permissionPrompt.autoReview'));
  if (permissionMode.value === 'full-access') parts.push(t('chat.composer.permissionPrompt.fullAccess'));
  return parts.join('\n');
}

/**
 * Public API exposed to parent via template ref. Import this type as
 * `Ref<ComposerExposed | null>` to avoid re-declaring inline shapes.
 */
export interface ComposerExposed {
  prependMention: (roleId: string) => void;
  setText: (v: string) => void;
  appendText: (v: string) => void;
  focus: () => void;
}
defineExpose<ComposerExposed>({ prependMention, setText, appendText, focus });
</script>

<template>
  <!--
    Codex-style composer: pill-rounded card, textarea on top, a single
    horizontal toolbar at the bottom (no internal divider), with a
    circular Send button anchored bottom-right.
  -->
  <div
    class="composer-shell rounded-3xl bg-[var(--bg-card)] border transition-all duration-200 focus-within:border-[var(--text-3)]"
    :class="dragOver ? 'border-[var(--brand-500)] ring-2 ring-[color-mix(in_srgb,var(--brand-500)_15%,transparent)]' : 'border-[var(--border)]'"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Slash prompt shortcuts -->
    <SlashPromptShortcuts
      v-if="showSlashCommands"
      :query="slashCommandQuery ?? ''"
      @pick="selectSlashPrompt"
    />

    <!-- @mention suggestions -->
    <div v-if="showMentions" class="composer-mentions flex flex-wrap gap-1.5 px-5 pt-3 pb-0">
      <button
        v-for="role in mentionedRoles"
        :key="role.id"
        type="button"
        class="composer-mention-chip"
        @click="selectMention(role)"
      >
        <span class="text-sm">{{ role.icon }}</span>
        <span class="text-xs font-medium">@{{ role.id }}</span>
        <span class="text-xs text-[var(--text-3)]">{{ role.name }}</span>
      </button>
    </div>

    <!-- Smart suggestion hint -->
    <div
      v-if="suggestion.show"
      class="smart-suggestion-hint flex items-center gap-2 px-3 py-1.5 mb-2 rounded-md text-xs"
      style="background: color-mix(in srgb, var(--brand-500) 8%, transparent); color: var(--brand-600);"
      role="status"
    >
      <svg class="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M8 1.8a4.7 4.7 0 0 0-2.7 8.5c.5.36.7.73.7 1.24V12h4v-.46c0-.5.22-.88.7-1.24A4.7 4.7 0 0 0 8 1.8Z" />
        <path d="M6.5 14h3M6.9 12h2.2" />
      </svg>
      <span class="flex-1">{{ t(suggestion.messageKey) }}</span>
      <button
        type="button"
        class="opacity-60 hover:opacity-100 transition-opacity"
        @click="dismissSuggestion"
        :aria-label="t('common.dismiss')"
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
          <path d="M1.5 1.5l6 6m0-6-6 6" />
        </svg>
      </button>
    </div>

    <ComposerTaskAdvisor
      :draft="text"
      :disabled="sending"
      @select="onTaskAction"
    />

    <!-- Textarea -->
    <div class="composer-textarea-wrap px-5 pt-4 pb-1">
      <textarea
        ref="textareaRef"
        v-model="text"
        :placeholder="promptPlaceholder"
        class="composer-textarea block w-full resize-none outline-none bg-transparent text-[15px] font-sans"
        rows="2"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
        @keydown="onKeydown"
        @paste="onPaste"
      />
    </div>

    <!-- Bottom toolbar: + button · speed · meter · meta · send -->
    <div class="composer-toolbar">
      <input
        ref="fileInputRef"
        class="hidden"
        type="file"
        multiple
        accept=".txt,.md,.markdown,.json,.yaml,.yml,.xml,.html,.css,.js,.jsx,.ts,.tsx,.vue,.py,.java,.go,.rs,.sh,.sql,text/*,image/png,image/jpeg,image/webp,image/gif,image/*"
        @change="onFilesSelected"
      >
      <div class="composer-toolbar-left">
        <button
          type="button"
          class="composer-icon-btn cursor-pointer"
          :title="t('chat.composer.attach')"
          :aria-label="t('chat.composer.attach')"
          :disabled="attachments.length >= MAX_ATTACHMENTS || sending"
          @click="openFilePicker"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </button>

        <ComposerTaskActions
          :draft="text"
          :disabled="sending"
          @select="onTaskAction"
        />

        <NDropdown
          :options="permissionOptions"
          trigger="click"
          placement="top-start"
          @select="onPermissionSelect"
        >
          <button
            type="button"
            class="composer-permission-btn"
            :title="t('chat.composer.permission.title')"
            :aria-label="t('chat.composer.permission.title')"
            :disabled="sending"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 1.8 13 4v3.7c0 3.1-2 5.6-5 6.5-3-.9-5-3.4-5-6.5V4l5-2.2Z" />
              <path d="m5.8 8.2 1.5 1.5 3-3" />
            </svg>
            <span>{{ permissionLabel }}</span>
          </button>
        </NDropdown>

        <!-- Thinking-speed segmented chips -->
        <ThinkingStrategyPicker
          :value="thinkingSpeed"
          :disabled="sending"
          @update:value="(v: 'fast' | 'auto' | 'extended' | 'route') => emit('update:thinkingSpeed', v)"
        />

        <!-- Execution mode selector -->
        <ExecutionModePicker />
      </div>

      <!-- spacer -->
      <span class="flex-1" />

      <div class="composer-toolbar-right">
        <!-- Inline context meter (click opens breakdown popover) -->
        <ContextRing
          :used="session.tokenUsage.total"
          :input="session.tokenUsage.input"
          :output="session.tokenUsage.output"
          :model="model"
        />

        <!-- Char count + hotkey hint, desktop only -->
        <span
          v-if="showCharCount"
          class="composer-char-count"
        >
          {{ t('chat.composer.chars', { n: charCount }) }}
        </span>
        <span
          v-if="!isMobile"
          class="hidden md:inline-flex items-center gap-1 text-[var(--text-3)] text-xs"
        >
          <template v-for="(tok, i) in sendChordTokens" :key="`${tok}-${i}`">
            <kbd class="composer-kbd">{{ tok }}</kbd>
            <span v-if="i < sendChordTokens.length - 1" class="opacity-50">+</span>
          </template>
        </span>

        <!-- Circular Send / Stop button -->
        <button
          v-if="sending"
          type="button"
          class="composer-send-btn is-stop cursor-pointer"
          :title="t('chat.composer.stop')"
          :aria-label="t('chat.composer.stop')"
          @click="onStop"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <rect x="3" y="3" width="10" height="10" rx="1.5" />
          </svg>
        </button>
        <button
          v-else
          type="button"
          class="composer-send-btn cursor-pointer"
          :disabled="!canSend"
          :title="t('chat.composer.send')"
          :aria-label="t('chat.composer.send')"
          @click="submit"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 13V3M3 8l5-5 5 5" />
          </svg>
        </button>
      </div>
    </div>

    <div
      v-if="attachments.length"
      class="composer-attachments px-3 pb-3 -mt-1 flex flex-wrap gap-1.5"
    >
      <span
        v-for="file in attachments"
        :key="file.id"
        class="composer-attachment-chip"
        :class="{ 'composer-attachment-chip--image': file.kind === 'image' }"
        :title="`${file.name} · ${formatFileSize(file.size)}`"
      >
        <img
          v-if="file.kind === 'image' && file.dataUrl"
          class="composer-attachment-thumb"
          :src="file.dataUrl"
          :alt="file.name"
        >
        <svg v-else width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 1.8h4.5L13 5.3V14H5a2 2 0 0 1-2-2V3.8a2 2 0 0 1 2-2Z" />
          <path d="M9.5 1.8V5.3H13" />
        </svg>
        <span class="truncate max-w-[150px]">{{ file.name }}</span>
        <span class="opacity-50">{{ formatFileSize(file.size) }}</span>
        <button
          type="button"
          class="composer-attachment-remove"
          :title="t('common.remove')"
          :aria-label="t('common.remove')"
          @click="removeAttachment(file.id)"
        >
          ×
        </button>
      </span>
    </div>
  </div>
</template>

<style scoped>
/*
 * Auto-grown textarea: explicit min/max so the inline style.height stays
 * within the documented bounds even if JS hasn't run yet (first paint).
 * Padding here matches VERTICAL_PADDING_PX in the script so scrollHeight
 * measurement and rendered box agree.
 */
/*
 * Wrap exists so we can paint a soft top/bottom mask once content
 * exceeds max-height: the scrolling textarea fades into the toolbar
 * instead of slamming into it with a hard edge.
 */
.composer-textarea-wrap {
  position: relative;
}

.composer-shell {
  overflow: hidden;
  box-shadow:
    0 16px 38px color-mix(in srgb, var(--text-1) 8%, transparent),
    0 1px 2px color-mix(in srgb, var(--text-1) 7%, transparent);
}

.composer-shell:focus-within {
  box-shadow:
    0 18px 44px color-mix(in srgb, var(--text-1) 10%, transparent),
    0 0 0 3px color-mix(in srgb, var(--brand-500) 9%, transparent);
}

.composer-toolbar {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 12px;
}

.composer-toolbar-left,
.composer-toolbar-right {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.composer-toolbar-left {
  flex: 1 1 auto;
}

.composer-toolbar-right {
  flex: 0 0 auto;
  justify-content: flex-end;
}

.composer-char-count {
  flex-shrink: 0;
  color: var(--text-3);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

/*
 * Reset the browser UA styling on textarea — by default it ships with
 * a 1px border, system monospace font, beige bg and an inset shadow on
 * focus. Without these declarations the field looks "raw HTML" no
 * matter what classes Tailwind adds on top.
 */
.composer-textarea {
  /* Layout */
  min-height: 52px;
  max-height: 220px;
  padding: 0;
  margin: 0;
  /* Kill UA chrome */
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  box-shadow: none;
  background-clip: padding-box;
  /* Typography */
  font-family: inherit;
  font-size: inherit;
  font-weight: 400;
  line-height: 1.55;
  color: var(--text-1);
  /* Use a slightly soft brand-tinted caret so the cursor stands out in
   * every theme without resorting to the OS default. */
  caret-color: var(--brand-500);
  /* Hide scrollbar until we explicitly toggle overflow-y in resize() */
  overflow-y: hidden;
  /* Word break: prevent URL-style content from blowing the toolbar out. */
  overflow-wrap: anywhere;
  word-break: break-word;
}
.composer-textarea:focus,
.composer-textarea:focus-visible {
  /* The shell already gives a focus ring; the textarea itself stays
   * borderless and outlineless inside. */
  outline: none;
  border: 0;
  box-shadow: none;
}

.composer-textarea::placeholder {
  color: var(--text-3);
  /* placeholder should slightly fade out as the user starts typing —
   * lower opacity makes it less competing for attention. */
  opacity: 0.85;
}

/* Selection color mirrors the brand so highlighted text doesn't look
 * out of place on dark / glass themes (default browser selection is a
 * jarring system blue). */
.composer-textarea::selection {
  background: color-mix(in srgb, var(--brand-500) 28%, transparent);
  color: var(--text-1);
}

/* Slim Codex-style scrollbar — only visible once the textarea exceeds
 * max-height. Hidden by default; revealed when the resize() helper
 * flips overflow-y to auto. */
.composer-textarea::-webkit-scrollbar {
  width: 6px;
}
.composer-textarea::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--text-3) 35%, transparent);
  border-radius: 999px;
}
.composer-textarea::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--text-3) 55%, transparent);
}
.composer-textarea::-webkit-scrollbar-track {
  background: transparent;
}
/* Firefox */
.composer-textarea {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--text-3) 35%, transparent) transparent;
}

.composer-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  line-height: 1;
  font-weight: 600;
  color: var(--text-2);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 4px;
}

/* Codex-style icon button: transparent default, soft elevate hover, no
 * outer border — sits inline with text-style chips next to it. Used for
 * the leading "+" attach slot and the trailing mic placeholder. */
.composer-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: 32px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--text-2);
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}
.composer-icon-btn:hover {
  background: var(--bg-elevate);
  color: var(--text-1);
}
.composer-icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.composer-permission-btn {
  display: inline-flex;
  max-width: 138px;
  min-width: 0;
  height: 30px;
  align-items: center;
  gap: 5px;
  border: 0;
  border-radius: 999px;
  padding: 0 9px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  font-size: 12px;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}
.composer-permission-btn span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.composer-permission-btn:hover {
  background: var(--bg-elevate);
  color: var(--text-1);
}
.composer-permission-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.composer-attachment-chip {
  display: inline-flex;
  min-width: 0;
  height: 26px;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0 5px 0 8px;
  background: color-mix(in srgb, var(--bg-elevate) 72%, transparent);
  color: var(--text-2);
  font-size: 12px;
}
.composer-attachment-chip--image {
  height: 32px;
  padding-left: 4px;
  background: color-mix(in srgb, var(--bg-elevate) 82%, var(--brand-500) 3%);
}
.composer-attachment-thumb {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 999px;
  object-fit: cover;
  background: var(--md-image-bg);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--border) 86%, transparent);
}
.composer-attachment-remove {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  line-height: 1;
}
.composer-attachment-remove:hover {
  background: color-mix(in srgb, var(--text-1) 8%, transparent);
  color: var(--text-1);
}

/* Round 32px send button — dark filled circle with white arrow, matching
 * the Codex-style reference. Stop variant uses the error color. */
.composer-send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: 32px;
  border-radius: 999px;
  background: var(--text-1);
  color: var(--bg-card);
  border: none;
  transition:
    background-color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease),
    opacity var(--dur-fast) var(--ease);
}
.composer-send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.composer-send-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.composer-send-btn.is-stop {
  background: var(--color-error);
  color: #ffffff;
}

.composer-toolbar-left :deep(.strategy-picker) {
  min-width: 0;
}

.composer-toolbar-left :deep(.strategy-chip) {
  max-width: 112px;
}

.composer-toolbar-left :deep(.strategy-chip span:last-child) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 767.98px) {
  .composer-textarea-wrap {
    padding: 14px 16px 2px;
  }

  .composer-toolbar {
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 6px;
    padding: 4px 10px 10px;
  }

  .composer-toolbar-left {
    order: 1;
    flex: 1 1 100%;
    overflow-x: auto;
    padding-bottom: 1px;
    scrollbar-width: none;
  }

  .composer-toolbar-left::-webkit-scrollbar {
    display: none;
  }

  .composer-toolbar-right {
    order: 2;
    margin-left: auto;
  }

  .composer-permission-btn {
    max-width: 120px;
  }

  .composer-toolbar-left :deep(.strategy-chip) {
    max-width: 92px;
    padding-inline: 9px;
  }

  .composer-char-count {
    display: none;
  }

  .composer-attachments {
    padding-inline: 10px;
  }

  .composer-attachment-chip {
    max-width: 100%;
  }
}

/* ─── @mention chips ─── */
.composer-mention-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-elevate) 48%, transparent);
  cursor: pointer;
  transition: background var(--dur-fast), border-color var(--dur-fast);
}
.composer-mention-chip:hover {
  background: color-mix(in srgb, var(--brand-500) 8%, transparent);
  border-color: color-mix(in srgb, var(--brand-500) 28%, var(--border));
}
</style>
