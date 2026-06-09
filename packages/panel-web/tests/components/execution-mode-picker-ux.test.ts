import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pickerPath = join(process.cwd(), 'src/components/chat/ExecutionModePicker.vue');
const executionModePath = join(process.cwd(), 'src/composables/useExecutionMode.ts');

describe('execution mode picker UX', () => {
  it('uses localized labels and accessible hints for chat modes', () => {
    const picker = readFileSync(pickerPath, 'utf8');
    const composable = readFileSync(executionModePath, 'utf8');

    expect(picker).toContain('useI18n');
    expect(picker).toContain("labelKey: 'chat.executionMode.suggest.label'");
    expect(picker).toContain("hintKey: 'chat.executionMode.autoEdit.hint'");
    expect(picker).toContain("hintKey: 'chat.executionMode.fullAuto.hint'");
    expect(picker).toContain(":aria-label=\"t('chat.executionMode.title')\"");
    expect(picker).toContain(':aria-label="`${t(m.labelKey)} - ${t(m.hintKey)}`"');
    expect(composable).toContain("t('chat.executionMode.suggest.label')");
    expect(composable).toContain("t('chat.executionMode.autoEdit.label')");
    expect(composable).toContain("t('chat.executionMode.fullAuto.label')");
    expect(picker).not.toContain("label: 'Suggest'");
    expect(picker).not.toContain("label: 'Auto Edit'");
    expect(picker).not.toContain("label: 'Full Auto'");
  });
});
