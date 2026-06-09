import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const modelSwitcherPath = join(process.cwd(), 'src/components/shared/ModelSwitcher.vue');

describe('model switcher experience', () => {
  it('checks models and balances before letting users switch blindly', () => {
    const source = readFileSync(modelSwitcherPath, 'utf8');

    expect(source).toContain('refreshModelChecks');
    expect(source).toContain('store.discoverModels');
    expect(source).toContain('store.inspectModels');
    expect(source).toContain('store.loadProviderBalance');
    expect(source).toContain('model-health-chip');
    expect(source).toContain('model-price-pill');
    expect(source).toContain('model-tag-pill');
    expect(source).toContain('requiresCredential: m.requiresCredential');
    expect(source).toContain('provider-balance-panel');
    expect(source).toContain("t('model.switcher.missingCredentialWarning')");
  });

  it('routes missing-credential choices into provider setup instead of a dead disabled row', () => {
    const source = readFileSync(modelSwitcherPath, 'utf8');

    expect(source).toContain('addCredentialForBlockedModel');
    expect(source).toContain("router.push({ path: '/settings', hash: '#providers' })");
    expect(source).toContain(':disabled="settingModel"');
    expect(source).not.toContain(':disabled="settingModel || isBlocked(m)"');
  });

  it('shows runtime-discovered Hermes models without overwriting provider config', () => {
    const source = readFileSync(modelSwitcherPath, 'utf8');

    expect(source).toContain('discoveredGroups');
    expect(source).toContain('model-discovery-status');
    expect(source).toContain('discoveryStatusText');
    expect(source).toContain("t('model.switcher.discoveryFound',");
    expect(source).toContain("t('model.switcher.discoveryKnownOnly',");
    expect(source).toContain("t('model.switcher.discoveryFallback')");
    expect(source).toContain('RUNTIME_PROVIDER');
    expect(source).toContain("t('model.switcher.discoveredGroup')");
    expect(source).toContain("t('model.switcher.discoveredReady')");
    expect(source).toContain("t('model.switcher.runtimeSource')");
    expect(source).toContain('await store.setModel({ name: m.id })');
    expect(source).toContain("provider: item.provider || RUNTIME_PROVIDER");
  });

  it('keeps the default picker compact until the user searches', () => {
    const source = readFileSync(modelSwitcherPath, 'utf8');

    expect(source).toContain('compactGroups');
    expect(source).toContain('slice(0, 2)');
    expect(source).toContain(':width="520"');
    expect(source).toContain('max-h-[320px]');
    expect(source).not.toContain(':width="680"');
    expect(source).not.toContain('max-h-[480px]');
  });

  it('uses a single-line trigger so model and credential text cannot collide', () => {
    const source = readFileSync(modelSwitcherPath, 'utf8');

    expect(source).toContain('triggerTitle');
    expect(source).toContain('model-trigger-provider');
    expect(source).toContain('model-trigger-name');
    expect(source).toContain('whitespace-nowrap');
    expect(source).toContain(':title="triggerTitle"');
    expect(source).not.toContain("activeCredentialLabel ? 'max-h-14' : 'h-8'");
    expect(source).not.toContain('flex flex-col items-start');
  });
});
