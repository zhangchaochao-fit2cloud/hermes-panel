import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const chatViewPath = join(process.cwd(), 'src/views/chat/index.vue');
const contextPath = join(process.cwd(), 'src/components/chat/ChatModelContextBar.vue');
const enPath = join(process.cwd(), 'src/locales/en-US.ts');
const zhPath = join(process.cwd(), 'src/locales/zh-CN.ts');

describe('chat model context UX', () => {
  it('keeps model switching visible next to the composer', () => {
    const view = readFileSync(chatViewPath, 'utf8');
    const context = readFileSync(contextPath, 'utf8');

    expect(view).toContain('ChatModelContextBar');
    expect(view.indexOf('<ChatModelContextBar')).toBeLessThan(view.indexOf('<div class="chat-context-bar">'));
    expect(view).toContain('v-model:model="model"');
    expect(view).toContain('@pick-prompt="onReadinessPrompt"');
    expect(context).toContain('ModelSwitcher');
    expect(context).toContain('providersStore.load({ initial: true })');
    expect(context).toContain("emit('update:model', next)");
    expect(context).toContain("router.push({ path: '/settings', hash: '#providers' })");
    expect(context).toContain("t('chat.modelContext.checkPrompt')");
  });

  it('explains runtime, free local, credential, and setup model states', () => {
    const context = readFileSync(contextPath, 'utf8');
    const en = readFileSync(enPath, 'utf8');
    const zh = readFileSync(zhPath, 'utf8');

    expect(context).toContain("sourceKey.value === 'runtime'");
    expect(context).toContain("sourceKey.value === 'local'");
    expect(context).toContain("sourceKey.value === 'credential'");
    expect(context).toContain('activeCredentialLabel || runtimeLabel');
    expect(en).toContain('Active model');
    expect(en).toContain('Free/local');
    expect(en).toContain('Needs setup');
    expect(zh).toContain('当前模型');
    expect(zh).toContain('免费/本地');
    expect(zh).toContain('需配置');
  });
});
