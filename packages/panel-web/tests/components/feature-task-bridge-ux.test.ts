import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const bridgePath = join(process.cwd(), 'src/components/shared/FeatureTaskBridge.vue');
const toolsPath = join(process.cwd(), 'src/views/tools/index.vue');
const memoryPath = join(process.cwd(), 'src/views/memory/index.vue');
const costPath = join(process.cwd(), 'src/views/cost/index.vue');
const enPath = join(process.cwd(), 'src/locales/en-US.ts');
const zhPath = join(process.cwd(), 'src/locales/zh-CN.ts');

describe('feature task bridge UX', () => {
  it('lets confusing feature pages feed a concrete task back into Chat', () => {
    const bridge = readFileSync(bridgePath, 'utf8');
    const tools = readFileSync(toolsPath, 'utf8');
    const memory = readFileSync(memoryPath, 'utf8');
    const cost = readFileSync(costPath, 'utf8');
    const en = readFileSync(enPath, 'utf8');
    const zh = readFileSync(zhPath, 'utf8');

    expect(bridge).toContain("import { useTaskDraft }");
    expect(bridge).toContain('openChatDraft(props.prompt)');
    expect(bridge).toContain('openRoute(props.secondaryTo)');
    expect(bridge).toContain('ControlCenterIcon');
    expect(bridge).toContain('bridge-command');
    expect(bridge).toContain('bridge-action is-primary');

    expect(tools).toContain('FeatureTaskBridge');
    expect(tools).toContain('icon="tools"');
    expect(tools).toContain("command=\"hermes tools list\"");
    expect(tools).toContain("secondary-to=\"/developer#cli-parity\"");
    expect(memory).toContain('FeatureTaskBridge');
    expect(memory).toContain('icon="memory"');
    expect(memory).toContain("command=\"hermes memory\"");
    expect(memory).toContain("secondary-to=\"/tools\"");
    expect(cost).toContain('FeatureTaskBridge');
    expect(cost).toContain('icon="cost"');
    expect(cost).toContain('ErrorBanner');
    expect(cost).toContain("command=\"hermes insights\"");
    expect(cost).toContain("secondary-to=\"/settings#providers\"");
    expect(cost).toContain('const error = ref<string | null>(null)');
    expect(cost).toContain('@retry="loadCostOverview"');

    expect(en).toContain('Use tools in Chat');
    expect(en).toContain('Use memory in Chat');
    expect(en).toContain('Plan with cost in Chat');
    expect(zh).toContain('在 Chat 使用工具');
    expect(zh).toContain('在 Chat 使用记忆');
    expect(zh).toContain('在 Chat 做成本规划');
  });
});
