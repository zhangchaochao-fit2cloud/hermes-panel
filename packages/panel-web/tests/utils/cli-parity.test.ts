import { describe, expect, it } from 'vitest';
import { formatCliParityBacklogPlan, formatCliParityReport, selectCliParityBacklog } from '@/utils/cli-parity';

const generatedAt = new Date('2026-06-08T10:00:00.000Z');

describe('formatCliParityReport', () => {
  it('formats an empty filtered report', () => {
    expect(formatCliParityReport([], generatedAt)).toContain('No commands match the current filters.');
  });

  it('summarizes coverage and backlog commands', () => {
    const report = formatCliParityReport([
      {
        command: 'chat',
        description: 'Chat with Hermes',
        displayDescription: 'Localized chat description',
        group: 'core',
        coverage: 'ready',
        route: '/chat',
        example: 'hermes chat -q "hello"',
      },
      {
        command: 'update',
        description: 'Update Hermes',
        group: 'ops',
        coverage: 'missing',
        example: 'hermes update',
      },
      {
        command: 'config',
        description: 'Config | with pipe',
        group: 'config',
        coverage: 'partial',
        route: '/settings',
        example: 'hermes config set model gpt-4',
      },
    ], generatedAt);

    expect(report).toContain('Commands: 3 total, 1 covered, 1 partial, 1 missing');
    expect(report).toContain('- [missing] hermes update -> No UI (hermes update)');
    expect(report).toContain('- [partial] hermes config -> /settings (hermes config set model gpt-4)');
    expect(report).toContain('| hermes chat | ready | core | /chat | hermes chat -q "hello" | Localized chat description |');
    expect(report).toContain('Config \\| with pipe');
  });
});

describe('selectCliParityBacklog', () => {
  it('keeps CLI order while selecting incomplete commands', () => {
    expect(selectCliParityBacklog([
      {
        command: 'chat',
        description: 'Chat',
        group: 'core',
        coverage: 'ready',
        route: '/chat',
        example: 'hermes chat',
      },
      {
        command: 'setup',
        description: 'Setup',
        group: 'config',
        coverage: 'partial',
        route: '/settings',
        example: 'hermes setup',
      },
      {
        command: 'update',
        description: 'Update',
        group: 'ops',
        coverage: 'missing',
        example: 'hermes update',
      },
      {
        command: 'completion',
        description: 'Completion',
        group: 'advanced',
        coverage: 'missing',
        example: 'hermes completion zsh',
      },
    ], 2).map(cmd => cmd.command)).toEqual(['setup', 'update']);
  });
});

describe('formatCliParityBacklogPlan', () => {
  it('turns incomplete commands into a source-of-truth implementation plan', () => {
    const plan = formatCliParityBacklogPlan([
      {
        command: 'chat',
        description: 'Chat',
        group: 'core',
        coverage: 'ready',
        route: '/chat',
        example: 'hermes chat',
      },
      {
        command: 'update',
        description: 'Update Hermes',
        displayDescription: 'Localized update note',
        group: 'ops',
        coverage: 'missing',
        example: 'hermes update',
        risk: 'guarded',
        fallback: 'hermes update --help',
      },
    ], generatedAt);

    expect(plan).toContain('# Hermes CLI Parity Backlog Plan');
    expect(plan).toContain('Generated: 2026-06-08T10:00:00.000Z');
    expect(plan).toContain('1. hermes update');
    expect(plan).toContain('Coverage: missing');
    expect(plan).toContain('Risk: guarded');
    expect(plan).toContain('UI target: No UI');
    expect(plan).toContain('Official fallback: hermes update --help');
    expect(plan).toContain('inspect `hermes update --help`');
    expect(plan).toContain('UX benchmark: match desktop/web control panels');
    expect(plan).toContain('Localized update note');
    expect(plan).not.toContain('hermes chat');
  });

  it('formats an empty backlog plan', () => {
    expect(formatCliParityBacklogPlan([], generatedAt)).toContain('No open CLI parity gaps');
  });
});
