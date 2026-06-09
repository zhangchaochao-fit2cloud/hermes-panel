import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const providersPath = join(process.cwd(), 'src/components/settings/SectionProviders.vue');
const providerOnboardingPath = join(process.cwd(), 'src/components/settings/ProviderOnboardingPath.vue');
const providerReadinessPath = join(process.cwd(), 'src/components/settings/ProviderReadinessSummary.vue');
const providerSetupWizardPath = join(process.cwd(), 'src/components/settings/ProviderSetupWizard.vue');
const providerAuthCommandsPath = join(process.cwd(), 'src/components/settings/ProviderAuthCommands.vue');
const providerModelDiscoveryPath = join(process.cwd(), 'src/components/settings/ProviderModelDiscovery.vue');
const enPath = join(process.cwd(), 'src/locales/en-US.ts');
const zhPath = join(process.cwd(), 'src/locales/zh-CN.ts');

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

    expect(source).toContain('ProviderOnboardingPath');
    expect(source.indexOf('<ProviderOnboardingPath')).toBeLessThan(source.indexOf('<ProviderReadinessSummary'));
    expect(source).toContain('ProviderReadinessSummary');
    expect(source.indexOf('<ProviderReadinessSummary')).toBeLessThan(source.indexOf('<ProviderSetupWizard'));
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

  it('puts a first-usable-model path above detailed provider setup', () => {
    const source = readFileSync(providersPath, 'utf8');
    const onboarding = readFileSync(providerOnboardingPath, 'utf8');
    const en = readFileSync(enPath, 'utf8');
    const zh = readFileSync(zhPath, 'utf8');

    expect(source).toContain('@add-credential="startAddFor"');
    expect(onboarding).toContain('primaryAction');
    expect(onboarding).toContain("baseUrl: 'http://localhost:11434/v1'");
    expect(onboarding).toContain("emit('add-credential', 'openrouter')");
    expect(onboarding).toContain('store.discoverModels');
    expect(onboarding).toContain('navigator.clipboard.writeText(command.value)');
    expect(onboarding).toContain("hermes config set model.default");
    expect(onboarding).toContain("localStorage.setItem('panel.chat.draft.new'");
    expect(onboarding).toContain("router.push({ path: '/chat'");
    expect(en).toContain('First usable model');
    expect(en).toContain('Use free local first');
    expect(en).toContain('Official handoff');
    expect(zh).toContain('第一个可用模型');
    expect(zh).toContain('优先用免费本地');
    expect(zh).toContain('官方交接命令');
  });

  it('summarizes active model readiness and free model next steps', () => {
    const source = readFileSync(providersPath, 'utf8');
    const readiness = readFileSync(providerReadinessPath, 'utf8');
    const en = readFileSync(enPath, 'utf8');
    const zh = readFileSync(zhPath, 'utf8');

    expect(source).toContain('@add-credential="startAddFor"');
    expect(readiness).toContain('settings.providers.readiness');
    expect(readiness).toContain('store.discoverModels');
    expect(readiness).toContain('store.setModel');
    expect(readiness).toContain("baseUrl: 'http://localhost:11434/v1'");
    expect(readiness).toContain("emit('add-credential', 'openrouter')");
    expect(readiness).toContain('hermes config set model.default');
    expect(readiness).toContain("localStorage.setItem('panel.chat.draft.new'");
    expect(readiness).toContain("router.push({ path: '/chat'");
    expect(en).toContain('Model readiness');
    expect(en).toContain('Use Ollama free preset');
    expect(en).toContain('Add free cloud key');
    expect(zh).toContain('模型就绪');
    expect(zh).toContain('使用 Ollama 免费预设');
    expect(zh).toContain('添加免费云 Key');
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
