import { describe, expect, it } from 'vitest';
import { formatCliParityReport } from '@/utils/cli-parity';

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
