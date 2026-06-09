import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

export type ExecutionMode = 'suggest' | 'auto-edit' | 'full-auto';

const STORAGE_KEY = 'panel.chat.executionMode';

const mode = ref<ExecutionMode>((localStorage.getItem(STORAGE_KEY) as ExecutionMode) || 'suggest');

export function useExecutionMode() {
  const { t } = useI18n();

  function setMode(m: ExecutionMode): void {
    mode.value = m;
    localStorage.setItem(STORAGE_KEY, m);
  }

  const permissionPrompt = computed((): string => {
    switch (mode.value) {
      case 'suggest':
        return 'Permission mode: suggest. Before any file write, delete, or command execution, explain what you intend to do and wait for explicit approval.';
      case 'auto-edit':
        return 'Permission mode: auto-edit. You may read and edit files freely. Before running shell commands, explain the command and wait for approval.';
      case 'full-auto':
        return 'Permission mode: full-auto. You may read files, edit files, and run necessary commands within this task scope. Keep changes minimal and safe. Report a summary when done.';
    }
  });

  const modeLabel = computed((): string => {
    switch (mode.value) {
      case 'suggest': return t('chat.executionMode.suggest.label');
      case 'auto-edit': return t('chat.executionMode.autoEdit.label');
      case 'full-auto': return t('chat.executionMode.fullAuto.label');
    }
  });

  const modeIcon = computed((): string => {
    switch (mode.value) {
      case 'suggest': return '🛡️';
      case 'auto-edit': return '✏️';
      case 'full-auto': return '⚡';
    }
  });

  return { mode, setMode, permissionPrompt, modeLabel, modeIcon };
}
