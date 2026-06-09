import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const capabilityMapPath = join(process.cwd(), 'src/components/dashboard/CapabilityMap.vue');
const capabilityMapItemPath = join(process.cwd(), 'src/components/dashboard/CapabilityMapItem.vue');
const enPath = join(process.cwd(), 'src/locales/en-US.ts');
const zhPath = join(process.cwd(), 'src/locales/zh-CN.ts');

describe('Capability map UX', () => {
  it('surfaces the live CLI parity backlog from the dashboard', () => {
    const source = readFileSync(capabilityMapPath, 'utf8');
    const item = readFileSync(capabilityMapItemPath, 'utf8');
    const en = readFileSync(enPath, 'utf8');
    const zh = readFileSync(zhPath, 'utf8');

    expect(source).toContain("{ key: 'cliParity', state: 'ready', route: '/developer#cli-parity' }");
    expect(source).toContain('dashboard.capabilityMap.items');
    expect(source).toContain('CapabilityMapItem');
    expect(source).toContain("useRoute: '/chat'");
    expect(source).toContain("pendingKey: 'panel.pendingGoalObjective'");
    expect(source).toContain("pendingKey: 'panel.pendingCronPrompt'");
    expect(source).toContain("pendingKey: 'panel.pendingRoomPrompt'");
    expect(source).toContain("localStorage.setItem('panel.chat.draft.new'");
    expect(source).toContain('sessionStorage.setItem(item.pendingKey, prompt)');
    expect(item).toContain("$emit('open')");
    expect(item).toContain("$emit('use')");
    expect(item).toContain('capability-actions');
    expect(item).toContain('v-if="canUse"');
    expect(item).toContain('v-if="canOpen"');
    expect(item).not.toContain(':disabled="!canUse"');
    expect(en).toContain('CLI Coverage Backlog');
    expect(en).toContain('local hermes --help');
    expect(en).toContain('missing UI targets');
    expect(en).toContain('Use in task');
    expect(en).toContain('Turn this into a long-running Hermes goal');
    expect(zh).toContain('CLI 覆盖清单');
    expect(zh).toContain('hermes --help');
    expect(zh).toContain('缺失 UI 入口');
    expect(zh).toContain('用于任务');
    expect(zh).toContain('把这个任务转成长线 Hermes 目标');
  });
});
