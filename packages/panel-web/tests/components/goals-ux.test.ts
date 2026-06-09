import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const goalsPath = join(process.cwd(), 'src/views/goals/index.vue');
const templatePickerPath = join(process.cwd(), 'src/components/goals/GoalTemplatePicker.vue');
const templateDataPath = join(process.cwd(), 'src/data/goalTemplates.ts');
const enPath = join(process.cwd(), 'src/locales/en-US.ts');
const zhPath = join(process.cwd(), 'src/locales/zh-CN.ts');

describe('goals UX', () => {
  it('offers quick-start templates without adding a new backend contract', () => {
    const goals = readFileSync(goalsPath, 'utf8');
    const picker = readFileSync(templatePickerPath, 'utf8');
    const data = readFileSync(templateDataPath, 'utf8');

    expect(goals).toContain('GoalTemplatePicker');
    expect(goals).toContain('buildGoalTemplates(t)');
    expect(goals).toContain('ErrorBanner');
    expect(goals).toContain('loadError.value = errorMessage(err)');
    expect(goals).toContain(':retry-label="t(\'common.retry\')"');
    expect(data).toContain('export function buildGoalTemplates');
    expect(data).toContain("key: 'releaseReview'");
    expect(data).toContain("key: 'bugTriage'");
    expect(data).toContain("key: 'docsCleanup'");
    expect(goals).toContain('function applyTemplate(template: GoalTemplate): void');
    expect(goals).toContain("doneWhen: template.doneWhen.join('\\n')");
    expect(goals).toContain("stopIf: template.stopIf.join('\\n')");
    expect(goals).toContain('showCreate.value = true');
    expect(goals).toContain("bffFetch<Goal[]>('/api/goals')");
    expect(goals).toContain("bffFetch('/api/goals',");
    expect(goals).not.toContain('/api/goal-templates');

    expect(picker).toContain("defineEmits<{");
    expect(picker).toContain('select: [template: GoalTemplate]');
    expect(picker).toContain("{{ $t('goals.templates.use') }}");
  });

  it('localizes each template and its acceptance criteria', () => {
    const en = readFileSync(enPath, 'utf8');
    const zh = readFileSync(zhPath, 'utf8');

    for (const source of [en, zh]) {
      expect(source).toContain('releaseReview');
      expect(source).toContain('bugTriage');
      expect(source).toContain('docsCleanup');
      expect(source).toContain('doneWhen: {');
      expect(source).toContain('stopIf: {');
    }

    expect(en).toContain('Start from a proven workflow');
    expect(zh).toContain('从成熟工作流开始');
  });
});
