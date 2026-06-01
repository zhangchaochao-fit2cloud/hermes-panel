import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const chatViewPath = join(process.cwd(), 'src/views/chat/index.vue');
const messageBubblePath = join(process.cwd(), 'src/components/chat/MessageBubble.vue');

describe('chat message experience polish', () => {
  it('uses wider dedicated conversation and composer columns', () => {
    const source = readFileSync(chatViewPath, 'utf8');

    expect(source).toContain('chat-conversation-column');
    expect(source).toContain('chat-composer-column');
    expect(source).toContain('width: min(100%, 940px)');
    expect(source).toContain('width: min(100%, 900px)');
  });

  it('keeps user message copy/edit actions clickable near the message', () => {
    const source = readFileSync(messageBubblePath, 'utf8');

    expect(source).toContain('user-message-actions');
    expect(source).toContain("t('chat.message.copy')");
    expect(source).toContain("t('chat.message.edit')");
    expect(source).toContain("t('chat.message.saveAndResend')");
    expect(source).not.toContain('message-toolbar absolute -top-7');
  });

  it('uses a wider themed editor for editing user messages', () => {
    const source = readFileSync(messageBubblePath, 'utf8');

    expect(source).toContain("isEditing ? 'justify-center' : 'justify-end'");
    expect(source).toContain("isEditing ? 'is-editing' : 'max-w-[min(82%,760px)]'");
    expect(source).toContain('rows="6"');
    expect(source).toContain('width: min(100%, 940px)');
    expect(source).toContain('max-width: min(100%, 940px)');
    expect(source).toContain('width: 100%');
    expect(source).toContain('min-height: 220px');
    expect(source).toContain('max-height: 520px');
    expect(source).toContain('message-edit-actions');
    expect(source).toContain('message-edit-button is-primary');
    expect(source).not.toContain('px-3 py-1 text-xs rounded-md bg-[var(--brand-500)]');
  });

  it('shows live thinking state and groups noisy tool activity', () => {
    const source = readFileSync(messageBubblePath, 'utf8');

    expect(source).toContain('shouldShowLiveStatus');
    expect(source).toContain("t('chat.activity.thinking')");
    expect(source).toContain('shouldGroupToolCalls');
    expect(source).toContain('hasSkillToolCalls');
    expect(source).toContain(':open="toolCallGroupOpen"');
  });

  it('shows themed assistant actions without fake feedback controls', () => {
    const source = readFileSync(messageBubblePath, 'utf8');

    expect(source).toContain('assistant-message-actions');
    expect(source).toContain('assistant-message-action');
    expect(source).toContain("t('chat.message.copy')");
    expect(source).toContain("t('chat.message.branch')");
    expect(source).not.toContain('thumbsUp');
    expect(source).not.toContain('thumbsDown');
    expect(source).not.toContain('toggleFeedback');
    expect(source).not.toContain('currentFeedback');
  });
});
