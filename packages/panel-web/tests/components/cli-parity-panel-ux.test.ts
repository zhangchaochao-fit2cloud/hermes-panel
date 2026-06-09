import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const panelPath = join(process.cwd(), 'src/components/developer/CliParityPanel.vue');
const backlogPath = join(process.cwd(), 'src/components/developer/CliParityBacklogPanel.vue');
const completionPath = join(process.cwd(), 'src/components/developer/CliCompletionPanel.vue');
const headerPath = join(process.cwd(), 'src/components/developer/CliParityHeader.vue');
const gapGuidancePath = join(process.cwd(), 'src/components/developer/CliParityGapGuidance.vue');
const guardedOperationsPath = join(process.cwd(), 'src/components/developer/CliGuardedOperationsPanel.vue');

describe('CLI parity panel experience', () => {
  it('lets users focus a backlog command without combining filters manually', () => {
    const source = readFileSync(panelPath, 'utf8');
    const backlog = readFileSync(backlogPath, 'utf8');

    expect(source).toContain('function focusCommand(cmd: CliCommandInventoryItem): void');
    expect(source).toContain('query.value = cmd.command');
    expect(source).toContain('coverageFilter.value = cmd.coverage');
    expect(source).toContain('groupFilter.value = cmd.group');
    expect(source).toContain('@focus-command="focusCommand"');
    expect(backlog).toContain("@click=\"$emit('focusCommand', cmd)\"");
    expect(backlog).toContain("$t('developer.cliParity.focusCommand')");
  });

  it('lets users copy backlog examples without opening the full command card', () => {
    const source = readFileSync(panelPath, 'utf8');
    const backlog = readFileSync(backlogPath, 'utf8');

    expect(source).toContain('async function copyBacklogExample(cmd: CliCommandInventoryItem): Promise<void>');
    expect(source).toContain('navigator.clipboard.writeText(cmd.example)');
    expect(source).toContain("message.success(t('developer.cliParity.copiedExample'))");
    expect(source).toContain('@copy-example="copyBacklogExample"');
    expect(backlog).toContain("@click=\"$emit('copyExample', cmd)\"");
    expect(backlog).toContain("$t('developer.cliParity.copyExample')");
  });

  it('extracts backlog guidance and lets users copy a CLI gap plan', () => {
    const source = readFileSync(panelPath, 'utf8');
    const backlog = readFileSync(backlogPath, 'utf8');
    const guidance = readFileSync(gapGuidancePath, 'utf8');

    expect(source).toContain('CliParityBacklogPanel');
    expect(source).toContain('formatCliParityBacklogPlan');
    expect(source).toContain('async function copyBacklogPlan(): Promise<void>');
    expect(source).toContain('navigator.clipboard.writeText(formatCliParityBacklogPlan(backlogItems.value))');
    expect(source).toContain("message.success(t('developer.cliParity.copiedBacklogPlan'))");
    expect(source).toContain('@copy-plan="copyBacklogPlan"');
    expect(backlog).toContain("$t('developer.cliParity.copyBacklogPlan')");
    expect(backlog).toContain("filterCoverage: [coverage: CliCommandCoverage]");
    expect(backlog).toContain("focusCommand: [command: BacklogCommand]");
    expect(backlog).toContain('CliParityGapGuidance');
    expect(guidance).toContain('benchmark-badge');
  });

  it('surfaces guarded operations without auto-running update or uninstall', () => {
    const source = readFileSync(panelPath, 'utf8');
    const guardedOperations = readFileSync(guardedOperationsPath, 'utf8');

    expect(source).toContain('CliGuardedOperationsPanel');
    expect(source).toContain(':commands="commands"');
    expect(source).toContain('@focus-command="focusCommand"');
    expect(guardedOperations).toContain("props.commands.find(cmd => cmd.command === 'update')");
    expect(guardedOperations).toContain("props.commands.find(cmd => cmd.command === 'uninstall')");
    expect(guardedOperations).toContain("bffFetch<HealthStatus>('/api/system/health'");
    expect(guardedOperations).toContain("fallbackFor(updateCommand, 'hermes update --help')");
    expect(guardedOperations).toContain("fallbackFor(uninstallCommand, 'hermes uninstall --help')");
    expect(guardedOperations).toContain('v-model="uninstallAcknowledged"');
    expect(guardedOperations).toContain(':disabled="!uninstallAcknowledged"');
    expect(guardedOperations).not.toContain("bffFetch('/api/cli/update");
    expect(guardedOperations).not.toContain("bffFetch('/api/cli/uninstall");
  });

  it('shows recovery steps when CLI inventory fails', () => {
    const source = readFileSync(panelPath, 'utf8');

    expect(source).toContain("t('developer.cliParity.error', { error })");
    expect(source).toContain("t('developer.cliParity.errorHintTitle')");
    expect(source).toContain('hermes --help');
    expect(source).toContain("t('developer.cliParity.errorHintShell')");
    expect(source).toContain("t('developer.cliParity.errorHintBin')");
    expect(source).toContain('error-command w-fit');
  });

  it('lets users generate official shell completion scripts', () => {
    const source = readFileSync(panelPath, 'utf8');
    const completion = readFileSync(completionPath, 'utf8');

    expect(source).toContain("type CompletionShell = 'zsh' | 'bash' | 'fish' | 'powershell'");
    expect(source).toContain("const completionShells: CompletionShell[] = ['zsh', 'bash', 'fish', 'powershell']");
    expect(source).toContain('async function loadCompletionScript(): Promise<void>');
    expect(source).toContain('/api/cli/completion/${shell}');
    expect(source).toContain('CliCompletionPanel');
    expect(completion).toContain("$t('developer.cliParity.completionGenerate')");
    expect(completion).toContain("$t('developer.cliParity.completionError', { error: completionError })");
    expect(completion).toContain('<CodeBlock');
  });

  it('keeps header counts and report actions in a focused component', () => {
    const source = readFileSync(panelPath, 'utf8');
    const header = readFileSync(headerPath, 'utf8');

    expect(source).toContain('CliParityHeader');
    expect(source).toContain('@copy-report="copyReport"');
    expect(source).toContain('@reload="loadInventory"');
    expect(source).toContain('@filter-coverage="coverageFilter = $event"');
    expect(header).toContain("filterCoverage: [coverage: CliCommandCoverage | 'all']");
    expect(header).toContain("$t('developer.cliParity.copyReport')");
    expect(header).toContain("$t('developer.cliParity.coverage.missing')");
  });
});
