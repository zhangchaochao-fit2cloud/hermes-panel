import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const providersPath = join(process.cwd(), 'src/components/settings/SectionProviders.vue');
const providerAuthCommandsPath = join(process.cwd(), 'src/components/settings/ProviderAuthCommands.vue');

describe('providers config UX', () => {
  it('makes hermes config set discoverable from provider settings', () => {
    const source = readFileSync(providersPath, 'utf8');

    expect(source).toContain('configExamples');
    expect(source).toContain('hermes config set model.default');
    expect(source).toContain('hermes config set model.provider');
    expect(source).toContain('hermes config set model.base_url');
    expect(source).toContain("t('settings.providers.configEyebrow')");
    expect(source).toContain("t('settings.providers.copyConfigCommand')");
  });

  it('surfaces empty and error states for CLI-backed config loading', () => {
    const source = readFileSync(providersPath, 'utf8');

    expect(source).toContain('ErrorBanner');
    expect(source).toContain("t('settings.providers.configEmpty')");
    expect(source).toContain("t('settings.providers.configErrorPrefix')");
    expect(source).toContain('@retry="store.load()"');
  });

  it('makes official provider login and logout commands discoverable', () => {
    const source = readFileSync(providerAuthCommandsPath, 'utf8');

    expect(source).toContain('authCommandExamples');
    expect(source).toContain('hermes login');
    expect(source).toContain('hermes logout');
    expect(source).toContain('runProviderLogin');
    expect(source).toContain('logoutConfirm');
    expect(source).toContain("t('settings.providers.authErrorPrefix')");
  });
});
