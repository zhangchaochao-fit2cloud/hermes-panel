import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardPath = join(process.cwd(), 'src/views/dashboard/index.vue');
const quickStartPath = join(process.cwd(), 'src/components/dashboard/DashboardQuickStart.vue');
const firstRunPath = join(process.cwd(), 'src/components/dashboard/DashboardFirstRunPath.vue');
const enPath = join(process.cwd(), 'src/locales/en-US.ts');
const zhPath = join(process.cwd(), 'src/locales/zh-CN.ts');

describe('Dashboard quick start UX', () => {
  it('puts task-oriented next actions at the top of the dashboard', () => {
    const dashboard = readFileSync(dashboardPath, 'utf8');
    const quickStart = readFileSync(quickStartPath, 'utf8');
    const firstRun = readFileSync(firstRunPath, 'utf8');
    const en = readFileSync(enPath, 'utf8');
    const zh = readFileSync(zhPath, 'utf8');

    expect(dashboard).toContain('DashboardQuickStart');
    expect(dashboard.indexOf('<DashboardQuickStart')).toBeLessThan(dashboard.indexOf('<CapabilityMap'));
    expect(quickStart).toContain("route: '/settings#providers'");
    expect(quickStart).toContain("route: '/chat'");
    expect(quickStart).toContain("route: '/chat-room'");
    expect(quickStart).toContain("route: '/channels'");
    expect(quickStart).toContain("'/settings#system-health'");
    expect(quickStart).toContain("'/developer#doctor'");
    expect(quickStart).toContain('firstRunActions');
    expect(quickStart).toContain("key: 'freeLocal'");
    expect(quickStart).toContain("draftKey: 'dashboard.quickStart.firstRun.freeLocal.prompt'");
    expect(quickStart).toContain("localStorage.setItem('panel.chat.draft.new'");
    expect(quickStart).toContain('DashboardFirstRunPath');
    expect(firstRun).toContain('first-run-path');
    expect(firstRun).toContain('select: [action: FirstRunAction]');
    expect(quickStart).toContain('summaryKey');
    expect(en).toContain('Fastest path to the first reply');
    expect(en).toContain('Try free local');
    expect(en).toContain('Configure cloud model');
    expect(en).toContain('Choose conversation');
    expect(en).toContain('Choose the next action');
    expect(zh).toContain('最快获得第一条回复');
    expect(zh).toContain('试用免费本地');
    expect(zh).toContain('配置云端模型');
    expect(zh).toContain('选择对话方式');
    expect(zh).toContain('选择下一步操作');
  });
});
