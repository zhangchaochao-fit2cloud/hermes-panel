import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const cardPath = join(process.cwd(), 'src/components/developer/CliParityCommandCard.vue');

describe('CLI parity command card experience', () => {
  it('shows the mapped UI target without requiring users to click Open', () => {
    const source = readFileSync(cardPath, 'utf8');

    expect(source).toContain("t('developer.cliParity.uiTarget')");
    expect(source).toContain("cmd.route ?? t('developer.cliParity.noUi')");
    expect(source).toContain('class="ui-target"');
    expect(source).toContain(':disabled="!cmd.route"');
  });

  it('does not show the empty help state when command help returns an error', () => {
    const source = readFileSync(cardPath, 'utf8');

    expect(source).toContain('v-if="commandHelpError"');
    expect(source).toContain('v-else-if="commandHelpLoading"');
    expect(source).toContain('v-else-if="commandHelpOutput"');
    expect(source).toContain("t('developer.cliParity.helpEmpty')");
  });

  it('lets users close raw CLI help after opening it', () => {
    const source = readFileSync(cardPath, 'utf8');

    expect(source).toContain('function closeCommandHelp(): void');
    expect(source).toContain('commandHelpOpen.value = false');
    expect(source).toContain('@click="closeCommandHelp"');
    expect(source).toContain("t('developer.cliParity.closeHelp')");
    expect(source).toContain('class="command-help-close"');
  });
});
