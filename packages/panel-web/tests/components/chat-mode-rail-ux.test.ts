import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const chatViewPath = join(process.cwd(), 'src/views/chat/index.vue');
const railPath = join(process.cwd(), 'src/components/chat/ChatModeRail.vue');
const enPath = join(process.cwd(), 'src/locales/en-US.ts');
const zhPath = join(process.cwd(), 'src/locales/zh-CN.ts');

describe('chat mode rail UX', () => {
  it('keeps conversation path choices visible next to the composer', () => {
    const view = readFileSync(chatViewPath, 'utf8');
    const rail = readFileSync(railPath, 'utf8');

    expect(view).toContain('ChatModeRail');
    expect(view.indexOf('<ChatModelContextBar')).toBeLessThan(view.indexOf('<ChatModeRail'));
    expect(view.indexOf('<ChatModeRail')).toBeLessThan(view.indexOf('<div class="chat-context-bar">'));
    expect(view).toContain('@pick-prompt="onReadinessPrompt"');
    expect(view).toContain('@open-route="onModeRailRoute"');
    expect(rail).toContain("key: 'direct'");
    expect(rail).toContain("key: 'room'");
    expect(rail).toContain("key: 'cron'");
    expect(rail).toContain("key: 'cli'");
    expect(rail).toContain(":aria-label=\"t('chat.modeRail.ariaLabel')\"");
  });

  it('routes advanced conversation paths without adding new CLI execution paths', () => {
    const view = readFileSync(chatViewPath, 'utf8');
    const rail = readFileSync(railPath, 'utf8');

    expect(view).toContain('function onModeRailRoute');
    expect(view).toContain("sessionStorage.setItem('panel.pendingCronPrompt'");
    expect(view).toContain('composerRef.value?.setText(payload.prompt)');
    expect(view).toContain('void router.push(payload.route)');
    expect(rail).toContain("route: '/chat-room'");
    expect(rail).toContain("route: '/cron'");
    expect(rail).toContain("storage: 'cron'");
    expect(rail).toContain("route: '/developer#cli-parity'");
    expect(rail).not.toContain('runHermes');
    expect(rail).not.toContain('/api/cli/commands/');
  });

  it('explains direct, room, scheduled, and CLI parity modes in both locales', () => {
    const en = readFileSync(enPath, 'utf8');
    const zh = readFileSync(zhPath, 'utf8');

    expect(en).toContain('Conversation path');
    expect(en).toContain('Direct chat');
    expect(en).toContain('Role room');
    expect(en).toContain('Scheduled run');
    expect(en).toContain('CLI parity');
    expect(zh).toContain('对话路径');
    expect(zh).toContain('直接对话');
    expect(zh).toContain('角色房间');
    expect(zh).toContain('定时运行');
    expect(zh).toContain('CLI 覆盖');
  });
});
