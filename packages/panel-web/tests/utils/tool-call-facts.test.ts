import { describe, expect, it } from 'vitest';
import type { ToolCall } from '@hermes-panel/shared';
import { categorizeTool, getToolCallFacts, getToolEditSummary } from '@/utils/tool-call-facts';

function tool(input: Partial<ToolCall>): ToolCall {
  return {
    id: 'tc_1',
    name: 'read_file',
    input: {},
    status: 'done',
    startedAt: 1,
    ...input,
  };
}

describe('tool-call-facts', () => {
  it('categorizes common tool names', () => {
    expect(categorizeTool('apply_patch')).toBe('edit');
    expect(categorizeTool('web_search')).toBe('search');
    expect(categorizeTool('use_skill')).toBe('skill');
  });

  it('extracts files and line ranges from tool input', () => {
    const facts = getToolCallFacts(tool({
      name: 'read_file',
      input: { path: '/Users/chaochao/project/src/App.vue', start_line: 12, end_line: 20 },
    }));

    expect(facts.files).toEqual(['~/project/src/App.vue']);
    expect(facts.lineCount).toBe(9);
  });

  it('counts edited content lines when no range is provided', () => {
    const facts = getToolCallFacts(tool({
      name: 'edit_file',
      input: { file_path: 'src/App.vue', new_str: 'a\nb\nc' },
    }));

    expect(facts.category).toBe('edit');
    expect(facts.lineCount).toBe(3);
  });

  it('extracts file and changed line count from apply_patch payloads', () => {
    const facts = getToolCallFacts(tool({
      name: 'apply_patch',
      input: {
        patch: [
          '*** Begin Patch',
          '*** Update File: packages/panel-web/src/App.vue',
          '@@',
          '-old',
          '+new',
          '+another',
          '*** End Patch',
        ].join('\n'),
      },
    }));

    expect(facts.files).toEqual(['packages/panel-web/src/App.vue']);
    expect(facts.lineCount).toBe(3);
  });

  it('summarizes edited files with additions and deletions', () => {
    const summary = getToolEditSummary(tool({
      name: 'apply_patch',
      input: {
        patch: [
          '*** Begin Patch',
          '*** Update File: packages/panel-web/src/App.vue',
          '@@ -10,3 +10,4 @@',
          ' const a = 1;',
          '-const b = 2;',
          '+const b = 3;',
          '+const c = 4;',
          '*** End Patch',
        ].join('\n'),
      },
    }));

    expect(summary?.additions).toBe(2);
    expect(summary?.deletions).toBe(1);
    expect(summary?.files[0]?.path).toBe('packages/panel-web/src/App.vue');
    expect(summary?.files[0]?.lines.map(line => line.kind)).toContain('add');
  });

  it('collects skill metadata', () => {
    const facts = getToolCallFacts(tool({
      name: 'use_skill',
      input: { skills: ['frontend-design', 'verification-before-completion'] },
    }));

    expect(facts.skills).toEqual(['frontend-design', 'verification-before-completion']);
  });

  it('extracts labeled file and skill values from preview text', () => {
    const facts = getToolCallFacts(tool({
      name: 'use_skill',
      preview: 'skill: frontend-design, file: packages/panel-web/src/App.vue',
    }));

    expect(facts.files).toEqual(['packages/panel-web/src/App.vue']);
    expect(facts.skills).toEqual(['frontend-design']);
  });
});
