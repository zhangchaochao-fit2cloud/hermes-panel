import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { i18n } from '@/locales';
import { bffFetch, type BffApiError } from '@/api/bff';

export interface ModelState {
  default: string;
  provider: string;
  baseUrl?: string;
  hasApiKey: boolean;
  /** Mirrors BFF ModelState.activeCredential. Undefined when not derivable. */
  activeCredential?: { label: string; type: string; source: string };
}

export interface ProviderCredential {
  label: string;
  type: 'api_key' | 'oauth' | string;
  source: string;
  active: boolean;
}

export interface ProviderInfo {
  id: string;
  family: string;
  credentials: ProviderCredential[];
}

export interface ProvidersState {
  model: ModelState | null;
  providers: ProviderInfo[];
  error?: string;
}

export interface SetModelInput {
  name: string;
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface AddCredentialInput {
  provider: string;
  apiKey: string;
  label?: string;
}

export interface CandidateModel {
  id: string;
  label?: string;
  provider: string;
  baseUrl?: string;
  requiresCredential?: boolean;
}

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  currency: 'USD';
  source: 'static' | 'openrouter';
}

export interface InspectedModel {
  id: string;
  label?: string;
  provider: string;
  baseUrl?: string;
  isCurrent: boolean;
  credentialStatus: 'configured' | 'missing' | 'unknown';
  availability: 'ready' | 'missing_credentials' | 'unknown';
  availabilityReason?: string;
  pricing?: ModelPricing;
  contextLength?: number;
}

export interface ModelInspectionResult {
  checkedAt: number;
  items: InspectedModel[];
}

export interface ProviderBalance {
  provider: string;
  status: 'available' | 'unsupported' | 'unavailable' | 'unknown';
  currency?: 'USD';
  total?: number;
  used?: number;
  remaining?: number;
  source?: 'openrouter';
  reason?: string;
}

export interface DiscoveredModel {
  id: string;
  label?: string;
  provider?: string;
  source: 'hermes-api';
}

export interface ModelDiscoveryResult {
  checkedAt: number;
  source: string;
  models: DiscoveredModel[];
  error?: string;
}

export interface ProviderCliCommandResult {
  ok: boolean;
  source: string;
  stdout: string;
  stderr?: string;
  error?: string;
}

export const useProvidersStore = defineStore('providers', () => {
  const model = ref<ModelState | null>(null);
  const providers = ref<ProviderInfo[]>([]);
  const loading = ref(false);
  const initialized = ref(false);
  const settingModel = ref(false);
  const addingCredential = ref(false);
  const providerLoginLoading = ref(false);
  const providerLogoutLoading = ref(false);
  const inspectionLoading = ref(false);
  const discoveryLoading = ref(false);
  const balanceLoading = ref(false);
  const inspectionCheckedAt = ref<number | null>(null);
  const discoveryCheckedAt = ref<number | null>(null);
  const inspectedModels = ref<Record<string, InspectedModel>>({});
  const discoveredModels = ref<DiscoveredModel[]>([]);
  const discoveryError = ref<string | null>(null);
  const providerBalances = ref<Record<string, ProviderBalance>>({});
  const error = ref<string | null>(null);

  const currentModelId = computed(() => model.value?.default ?? '');
  const currentProvider = computed(() => model.value?.provider ?? '');

  /**
   * Short user-facing string for the active credential, suitable for the
   * ModelSwitcher trigger. Returns an empty string when no credential info
   * is available so callers can `v-if` it out.
   *
   * Source format from the BFF mirrors `hermes auth list`:
   *   "env:OPENROUTER_API_KEY"    → "OPENROUTER_API_KEY (env)"
   *   "config:Api.deepseek.com"   → "Api.deepseek.com (config)"
   *   "oauth"                     → "OAuth"
   *   anything else               → "<source> (unknown)" as a safe fallback
   * The "(env)" / "(config)" / "OAuth" / "unknown" tokens are i18n'd via the
   * model.switcher.credential.{env,config,oauth,unknown} keys.
   */
  const activeCredentialLabel = computed(() => {
    const cred = model.value?.activeCredential;
    if (!cred) return '';
    const src = cred.source.trim();
    if (!src) return '';
    const t = i18n.global.t;
    // OAuth is a type, not a prefixed source — surface it on either signal.
    if (cred.type === 'oauth' || src.toLowerCase() === 'oauth') {
      return t('model.switcher.credential.oauth');
    }
    const colon = src.indexOf(':');
    if (colon > 0) {
      const prefix = src.slice(0, colon).toLowerCase();
      const rest = src.slice(colon + 1);
      if (prefix === 'env') return `${rest} (${t('model.switcher.credential.env')})`;
      if (prefix === 'config') return `${rest} (${t('model.switcher.credential.config')})`;
    }
    return `${src} (${t('model.switcher.credential.unknown')})`;
  });

  function modelKey(provider: string, id: string): string {
    return `${provider}:${id}`;
  }

  function inspectionFor(provider: string, id: string): InspectedModel | undefined {
    return inspectedModels.value[modelKey(provider, id)];
  }

  function balanceFor(provider: string): ProviderBalance | undefined {
    return providerBalances.value[provider];
  }

  async function load(opts: { initial?: boolean } = {}): Promise<void> {
    if (opts.initial) loading.value = true;
    error.value = null;
    try {
      const r = await bffFetch<ProvidersState>('/api/providers/state');
      model.value = r.model;
      providers.value = r.providers;
      if (r.error) error.value = r.error;
    } catch (err) {
      error.value = (err as Error).message ?? 'failed to load providers';
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  async function setModel(input: SetModelInput): Promise<{
    ok: boolean;
    error?: string;
    restartedGateway?: boolean;
    restartError?: string;
  }> {
    settingModel.value = true;
    try {
      const r = await bffFetch<{
        ok: boolean;
        restartedGateway?: boolean;
        restartError?: string;
      }>('/api/model', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await load();
      return {
        ok: true,
        restartedGateway: r.restartedGateway,
        restartError: r.restartError,
      };
    } catch (err) {
      const e = err as BffApiError;
      return { ok: false, error: e.code ?? e.message ?? 'SET_MODEL_FAILED' };
    } finally {
      settingModel.value = false;
    }
  }

  async function addCredential(input: AddCredentialInput): Promise<{ ok: boolean; error?: string }> {
    addingCredential.value = true;
    try {
      await bffFetch<{ ok: boolean }>('/api/providers/credentials', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await load();
      return { ok: true };
    } catch (err) {
      const e = err as BffApiError;
      return { ok: false, error: e.code ?? e.message ?? 'ADD_CREDENTIAL_FAILED' };
    } finally {
      addingCredential.value = false;
    }
  }

  async function runProviderAuthCommand(
    action: 'login' | 'logout',
    provider: string,
  ): Promise<ProviderCliCommandResult> {
    const loadingRef = action === 'login' ? providerLoginLoading : providerLogoutLoading;
    loadingRef.value = true;
    try {
      const r = await bffFetch<ProviderCliCommandResult>(`/api/providers/${action}`, {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      if (r.ok) await load();
      return r;
    } catch (err) {
      const e = err as BffApiError;
      return {
        ok: false,
        source: `hermes ${action} ${provider}`,
        stdout: '',
        error: e.code ?? e.message ?? 'PROVIDER_AUTH_COMMAND_FAILED',
      };
    } finally {
      loadingRef.value = false;
    }
  }

  function loginProvider(provider: string): Promise<ProviderCliCommandResult> {
    return runProviderAuthCommand('login', provider);
  }

  function logoutProvider(provider: string): Promise<ProviderCliCommandResult> {
    return runProviderAuthCommand('logout', provider);
  }

  async function inspectModels(candidates: CandidateModel[]): Promise<void> {
    if (candidates.length === 0) return;
    inspectionLoading.value = true;
    try {
      const r = await bffFetch<ModelInspectionResult>('/api/models/inspect', {
        method: 'POST',
        body: JSON.stringify({ models: candidates }),
        silent: true,
      });
      inspectedModels.value = Object.fromEntries(
        r.items.map(item => [modelKey(item.provider, item.id), item]),
      );
      inspectionCheckedAt.value = r.checkedAt;
    } catch (err) {
      error.value = (err as Error).message ?? 'failed to inspect models';
    } finally {
      inspectionLoading.value = false;
    }
  }

  async function discoverModels(): Promise<void> {
    discoveryLoading.value = true;
    discoveryError.value = null;
    try {
      const r = await bffFetch<ModelDiscoveryResult>('/api/models/discover', { silent: true });
      discoveredModels.value = r.models;
      discoveryCheckedAt.value = r.checkedAt;
      discoveryError.value = r.error ?? null;
    } catch (err) {
      discoveredModels.value = [];
      discoveryError.value = (err as Error).message ?? 'failed to discover models';
    } finally {
      discoveryLoading.value = false;
    }
  }

  async function loadProviderBalance(provider: string): Promise<void> {
    if (!provider) return;
    balanceLoading.value = true;
    try {
      const r = await bffFetch<ProviderBalance>(
        `/api/providers/balance?provider=${encodeURIComponent(provider)}`,
        { silent: true },
      );
      providerBalances.value = {
        ...providerBalances.value,
        [provider]: r,
      };
    } catch (err) {
      providerBalances.value = {
        ...providerBalances.value,
        [provider]: {
          provider,
          status: 'unavailable',
          reason: (err as Error).message ?? 'BALANCE_CHECK_FAILED',
        },
      };
    } finally {
      balanceLoading.value = false;
    }
  }

  return {
    model, providers, loading, initialized, settingModel, addingCredential,
    providerLoginLoading, providerLogoutLoading,
    inspectionLoading, discoveryLoading, balanceLoading, inspectionCheckedAt,
    discoveryCheckedAt, discoveredModels, discoveryError, error,
    currentModelId, currentProvider, activeCredentialLabel,
    inspectionFor, balanceFor,
    load, setModel, addCredential, loginProvider, logoutProvider,
    inspectModels, discoverModels, loadProviderBalance,
  };
});
