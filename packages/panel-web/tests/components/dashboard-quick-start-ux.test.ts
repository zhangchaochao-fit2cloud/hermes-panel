import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardPath = join(process.cwd(), 'src/views/dashboard/index.vue');
const quickStartPath = join(process.cwd(), 'src/components/dashboard/DashboardQuickStart.vue');
const enPath = join(process.cwd(), 'src/locales/en-US.ts');
const zhPath = join(process.cwd(), 'src/locales/zh-CN.ts');

describe('Dashboard quick start UX', () => {
  it('puts task-oriented next actions at the top of the dashboard', () => {
    const dashboard = readFileSync(dashboardPath, 'utf8');
    const quickStart = readFileSync(quickStartPath, 'utf8');
    const en = readFileSync(enPath, 'utf8');
    const zh = readFileSync(zhPath, 'utf8');

    expect(dashboard).toContain('DashboardQuickStart');
    expect(dashboard.indexOf('<DashboardQuickStart')).toBeLessThan(dashboard.indexOf('<CapabilityMap'));
    expect(quickStart).toContain("route: '/settings#providers'");
    expect(quickStart).toContain("route: '/chat'");
    expect(quickStart).toContain("route: '/channels'");
    expect(quickStart).toContain("'/settings#system-health'");
    expect(quickStart).toContain("'/developer#doctor'");
    expect(quickStart).toContain('summaryKey');
    expect(en).toContain('Choose the next action');
    expect(zh).toContain('选择下一步操作');
  });
});
