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
});
