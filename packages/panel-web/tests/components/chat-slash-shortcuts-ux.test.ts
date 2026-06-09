import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const composerPath = join(process.cwd(), 'src/components/chat/Composer.vue');
const shortcutsPath = join(process.cwd(), 'src/components/chat/SlashPromptShortcuts.vue');

describe('chat slash prompt shortcuts', () => {
  it('shows a slash shortcut picker from the composer draft', () => {
    const composer = readFileSync(composerPath, 'utf8');

    expect(composer).toContain('SlashPromptShortcuts');
    expect(composer).toContain('slashCommandQuery');
    expect(composer).toContain('showSlashCommands');
    expect(composer).toContain('@pick="selectSlashPrompt"');
    expect(composer).toContain("value.startsWith('/')");
  });

  it('keeps shortcuts as prompt fill-ins instead of pretending to execute CLI commands', () => {
    const shortcuts = readFileSync(shortcutsPath, 'utf8');

    expect(shortcuts).toContain("t('chat.slash.title')");
    expect(shortcuts).toContain("'help', 'model', 'local', 'tools', 'review', 'plan'");
    expect(shortcuts).toContain("emit('pick', item.prompt)");
    expect(shortcuts).not.toContain('bffFetch');
    expect(shortcuts).not.toContain('runHermes');
  });
});
