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

export const useProvidersStore = defineStore('providers', () => {
  const model = ref<ModelState | null>(null);
  const providers = ref<ProviderInfo[]>([]);
  const loading = ref(false);
  const initialized = ref(false);
  const settingModel = ref(false);
  const addingCredential = ref(false);
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

  return {
    model, providers, loading, initialized, settingModel, addingCredential, error,
    currentModelId, currentProvider, activeCredentialLabel,
    load, setModel, addCredential,
  };
});
