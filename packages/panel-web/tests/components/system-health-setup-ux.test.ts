import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const systemHealthPath = join(process.cwd(), 'src/components/settings/SectionSystemHealth.vue');

describe('system health setup UX', () => {
  it('makes the official hermes setup command discoverable', () => {
    const source = readFileSync(systemHealthPath, 'utf8');

    expect(source).toContain("const setupCommand = 'hermes setup'");
    expect(source).toContain('copySetupCommand');
    expect(source).toContain("t('settings.systemHealth.setup.eyebrow')");
    expect(source).toContain("t('settings.systemHealth.setup.commandHint')");
    expect(source).toContain('navigator.clipboard.writeText(setupCommand)');
  });

  it('offers setup checkpoints for doctor, providers, and gateway recovery', () => {
    const source = readFileSync(systemHealthPath, 'utf8');

    expect(source).toContain('setupSteps');
    expect(source).toContain('#/developer#doctor');
    expect(source).toContain('#/settings#providers');
    expect(source).toContain('#/settings#system-health');
    expect(source).toContain('ErrorBanner');
    expect(source).toContain("t('settings.systemHealth.setup.errorPrefix')");
  });
});
