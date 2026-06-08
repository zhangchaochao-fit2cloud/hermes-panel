import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const panelPath = join(process.cwd(), 'src/components/developer/CliParityPanel.vue');

describe('CLI parity panel experience', () => {
  it('lets users focus a backlog command without combining filters manually', () => {
    const source = readFileSync(panelPath, 'utf8');

    expect(source).toContain('function focusCommand(cmd: CliCommandInventoryItem): void');
    expect(source).toContain('query.value = cmd.command');
    expect(source).toContain('coverageFilter.value = cmd.coverage');
    expect(source).toContain('groupFilter.value = cmd.group');
    expect(source).toContain("@click=\"focusCommand(cmd)\"");
    expect(source).toContain("t('developer.cliParity.focusCommand')");
  });
});
