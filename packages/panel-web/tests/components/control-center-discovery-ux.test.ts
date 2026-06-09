import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const topbarPath = join(process.cwd(), 'src/components/shared/AppTopbar.vue');
const controlCenterPath = join(process.cwd(), 'src/components/shared/ControlCenter.vue');
const registryPath = join(process.cwd(), 'src/commands/registry.ts');
const enPath = join(process.cwd(), 'src/locales/en-US.ts');
const zhPath = join(process.cwd(), 'src/locales/zh-CN.ts');

describe('control center discovery UX', () => {
  it('makes the command center visible from the topbar without requiring shortcut discovery', () => {
    const topbar = readFileSync(topbarPath, 'utf8');
    const controlCenter = readFileSync(controlCenterPath, 'utf8');

    expect(topbar).toContain('function openControlCenter');
    expect(topbar).toContain("window.dispatchEvent(new Event('panel:open-control-center'))");
    expect(topbar).toContain("t('controlCenter.open')");
    expect(topbar).toContain('topbar-command-button');
    expect(controlCenter).toContain('function onExternalOpen');
    expect(controlCenter).toContain("window.addEventListener('panel:open-control-center', onExternalOpen)");
    expect(controlCenter).toContain("window.removeEventListener('panel:open-control-center', onExternalOpen)");
  });

  it('registers core AI, setup, and CLI parity destinations for search', () => {
    const registry = readFileSync(registryPath, 'utf8');

    expect(registry).toContain("id: 'start-direct-chat'");
    expect(registry).toContain("action: { type: 'route', to: '/chat?new=command' }");
    expect(registry).toContain("id: 'start-role-room'");
    expect(registry).toContain("action: { type: 'route', to: '/chat-room' }");
    expect(registry).toContain("id: 'start-scheduled-run'");
    expect(registry).toContain("action: { type: 'route', to: '/cron' }");
    expect(registry).toContain("id: 'open-external-channels'");
    expect(registry).toContain("id: 'setup-models'");
    expect(registry).toContain("action: { type: 'route', to: '/settings#providers' }");
    expect(registry).toContain("id: 'setup-free-local'");
    expect(registry).toContain("id: 'setup-runtime-health'");
    expect(registry).toContain("action: { type: 'route', to: '/settings#system-health' }");
    expect(registry).toContain("id: 'open-cli-parity'");
    expect(registry).toContain("action: { type: 'route', to: '/developer#cli-parity' }");
    expect(registry).not.toContain('runHermes');
    expect(registry).not.toContain('/api/cli/commands/');
  });

  it('explains command groups in both locales', () => {
    const en = readFileSync(enPath, 'utf8');
    const zh = readFileSync(zhPath, 'utf8');

    expect(en).toContain('Command center');
    expect(en).toContain('AI work');
    expect(en).toContain('Use a free/local model');
    expect(en).toContain('Open official CLI coverage');
    expect(zh).toContain('指令中心');
    expect(zh).toContain('AI 工作');
    expect(zh).toContain('使用免费/本地模型');
    expect(zh).toContain('打开官方 CLI 覆盖');
  });
});
