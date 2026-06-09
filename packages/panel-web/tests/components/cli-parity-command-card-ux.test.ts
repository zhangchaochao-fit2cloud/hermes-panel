import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const cardPath = join(process.cwd(), 'src/components/developer/CliParityCommandCard.vue');
const gapGuidancePath = join(process.cwd(), 'src/components/developer/CliParityGapGuidance.vue');

describe('CLI parity command card experience', () => {
  it('shows the mapped UI target without requiring users to click Open', () => {
    const source = readFileSync(cardPath, 'utf8');

    expect(source).toContain("t('developer.cliParity.uiTarget')");
    expect(source).toContain("cmd.route ?? t('developer.cliParity.noUi')");
    expect(source).toContain('class="ui-target"');
    expect(source).toContain("cmd.route ? t('developer.cliParity.open') : t('developer.cliParity.copyPrompt')");
  });

  it('turns missing UI targets into safe CLI prompt fallbacks', () => {
    const source = readFileSync(cardPath, 'utf8');

    expect(source).toContain('fallbackPrompt');
    expect(source).toContain("t('developer.cliParity.promptFallbackText'");
    expect(source).toContain('async function copyPromptFallback(): Promise<void>');
    expect(source).toContain('navigator.clipboard.writeText(fallbackPrompt.value)');
    expect(source).toContain("message.success(t('developer.cliParity.copiedPrompt'))");
    expect(source).toContain('@click="cmd.route ? go(cmd.route) : copyPromptFallback()"');
  });

  it('explains incomplete command risk and the official CLI fallback', () => {
    const source = readFileSync(cardPath, 'utf8');
    const guidance = readFileSync(gapGuidancePath, 'utf8');

    expect(source).toContain('CliParityGapGuidance');
    expect(source).toContain('<CliParityGapGuidance :cmd="cmd" />');
    expect(guidance).toContain("cmd.coverage !== 'ready'");
    expect(guidance).toContain("props.cmd.fallback ?? `hermes ${props.cmd.command} --help`");
    expect(guidance).toContain('developer.cliParity.risks');
    expect(guidance).toContain('developer.cliParity.benchmarks');
    expect(guidance).toContain('developer.cliParity.nextActions');
    expect(guidance).toContain("t('developer.cliParity.officialFallback')");
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

  it('keeps command actions usable on narrow screens', () => {
    const source = readFileSync(cardPath, 'utf8');

    expect(source).toContain('@media (max-width: 720px)');
    expect(source).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(source).toContain('flex-wrap: wrap');
    expect(source).toContain('flex: 1 1 120px');
  });
});
