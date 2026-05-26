import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { bffFetch, type BffApiError } from '@/api/bff';

export interface ModelState {
  default: string;
  provider: string;
  baseUrl?: string;
  hasApiKey: boolean;
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

  async function setModel(input: SetModelInput): Promise<{ ok: boolean; error?: string }> {
    settingModel.value = true;
    try {
      await bffFetch<{ ok: boolean }>('/api/model', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await load();
      return { ok: true };
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
    currentModelId, currentProvider,
    load, setModel, addCredential,
  };
});
