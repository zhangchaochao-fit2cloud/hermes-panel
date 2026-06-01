import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const chatViewPath = join(process.cwd(), 'src/views/chat/index.vue');

describe('chat header actions', () => {
  it('uses themed low-noise controls for title actions and export', () => {
    const source = readFileSync(chatViewPath, 'utf8');

    expect(source).toContain('chat-header');
    expect(source).toContain('chat-header-title-wrap');
    expect(source).toContain('chat-header-actions');
    expect(source).toContain('chat-header-pill');
    expect(source).toContain('chat-header-icon-button');
    expect(source).toContain('chat-export-button');
    expect(source).toContain("t('chat.export.label')");
    expect(source).not.toContain('ml-2 inline-flex items-center gap-1 px-2 h-7 rounded-md');
  });
});
