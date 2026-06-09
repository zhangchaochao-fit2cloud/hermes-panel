import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const chatViewPath = join(process.cwd(), 'src/views/chat/index.vue');
const readinessPath = join(process.cwd(), 'src/components/chat/ChatReadinessCard.vue');

describe('chat readiness onboarding', () => {
  it('surfaces model and mode readiness in the empty chat state', () => {
    const view = readFileSync(chatViewPath, 'utf8');
    const card = readFileSync(readinessPath, 'utf8');

    expect(view).toContain('ChatReadinessCard');
    expect(view).toContain('@pick-prompt="onReadinessPrompt"');
    expect(card).toContain('useProvidersStore');
    expect(card).toContain('useExecutionMode');
    expect(card).toContain("t('chat.readiness.modelTitle')");
    expect(card).toContain("t('chat.readiness.modeTitle')");
    expect(card).toContain("t('chat.readiness.promptTitle')");
  });

  it('keeps model setup and local free onboarding within three actions', () => {
    const card = readFileSync(readinessPath, 'utf8');

    expect(card).toContain("router.push({ path: '/settings', hash: '#providers' })");
    expect(card).toContain("emit('pick-prompt', t('chat.readiness.localPrompt'))");
    expect(card).toContain("t('chat.readiness.configureModel')");
    expect(card).toContain("t('chat.readiness.tryLocal')");
    expect(card).toContain('providersStore.load({ initial: true })');
  });
});
