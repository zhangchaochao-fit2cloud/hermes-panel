import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const providersPath = join(process.cwd(), 'src/components/settings/SectionProviders.vue');
const providerSetupWizardPath = join(process.cwd(), 'src/components/settings/ProviderSetupWizard.vue');
const providerAuthCommandsPath = join(process.cwd(), 'src/components/settings/ProviderAuthCommands.vue');
const providerModelDiscoveryPath = join(process.cwd(), 'src/components/settings/ProviderModelDiscovery.vue');

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

  it('offers a guided model setup path before raw provider rows', () => {
    const source = readFileSync(providersPath, 'utf8');
    const wizard = readFileSync(providerSetupWizardPath, 'utf8');

    expect(source).toContain('ProviderSetupWizard');
    expect(source).toContain('@add-credential="startAddFor"');
    expect(wizard).toContain("id: 'portal'");
    expect(wizard).toContain("provider: 'nous'");
    expect(wizard).toContain('hermes setup --portal');
    expect(wizard).toContain('store.loginProvider');
    expect(wizard).toContain('copyCommand');
    expect(wizard).toContain("id: 'local'");
    expect(wizard).toContain("id: 'free-cloud'");
    expect(wizard).toContain("id: 'api-key'");
    expect(wizard).toContain("id: 'custom'");
    expect(wizard).toContain('store.setModel');
    expect(wizard).toContain("emit('add-credential'");
    expect(wizard).toContain("router.push('/chat')");
  });

  it('surfaces active Hermes gateway model discovery in provider setup', () => {
    const source = readFileSync(providersPath, 'utf8');
    const discovery = readFileSync(providerModelDiscoveryPath, 'utf8');

    expect(source).toContain('ProviderModelDiscovery');
    expect(discovery).toContain('store.discoverModels');
    expect(discovery).toContain('discoveredModels');
    expect(discovery).toContain("store.setModel({ name: item.id })");
    expect(discovery).toContain("router.push('/chat')");
    expect(discovery).toContain("t('settings.providers.discovery.fallback')");
    expect(discovery).toContain('hermes config set model.default &lt;model-id&gt;');
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
