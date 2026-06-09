import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const capabilityMapPath = join(process.cwd(), 'src/components/dashboard/CapabilityMap.vue');
const enPath = join(process.cwd(), 'src/locales/en-US.ts');
const zhPath = join(process.cwd(), 'src/locales/zh-CN.ts');

describe('Capability map UX', () => {
  it('surfaces the live CLI parity backlog from the dashboard', () => {
    const source = readFileSync(capabilityMapPath, 'utf8');
    const en = readFileSync(enPath, 'utf8');
    const zh = readFileSync(zhPath, 'utf8');

    expect(source).toContain("{ key: 'cliParity', state: 'ready', route: '/developer#cli-parity' }");
    expect(source).toContain('dashboard.capabilityMap.items');
    expect(en).toContain('CLI Coverage Backlog');
    expect(en).toContain('local hermes --help');
    expect(en).toContain('missing UI targets');
    expect(zh).toContain('CLI 覆盖清单');
    expect(zh).toContain('hermes --help');
    expect(zh).toContain('缺失 UI 入口');
  });
});
