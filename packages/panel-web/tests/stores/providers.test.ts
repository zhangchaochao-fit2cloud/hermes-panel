import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/api/bff', () => ({
  bffFetch: vi.fn(),
  BffApiError: class extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

import { bffFetch, BffApiError } from '@/api/bff';
import { useProvidersStore } from '@/stores/providers';

const mockedBffFetch = bffFetch as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  setActivePinia(createPinia());
  mockedBffFetch.mockReset();
});

describe('providers.load', () => {
  it('populates model + providers from BFF response', async () => {
    mockedBffFetch.mockResolvedValueOnce({
      model: {
        default: 'claude-opus-4-7',
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        hasApiKey: true,
      },
      providers: [
        { id: 'anthropic', family: 'claude', credentials: [] },
        { id: 'openai', family: 'gpt', credentials: [] },
      ],
    });
    const store = useProvidersStore();
    await store.load({ initial: true });
    expect(store.model?.default).toBe('claude-opus-4-7');
    expect(store.currentModelId).toBe('claude-opus-4-7');
    expect(store.currentProvider).toBe('anthropic');
    expect(store.providers).toHaveLength(2);
    expect(store.initialized).toBe(true);
    expect(store.error).toBeNull();
  });

  it('captures BFF-reported error from r.error field', async () => {
    mockedBffFetch.mockResolvedValueOnce({
      model: null,
      providers: [],
      error: 'HERMES_CLI_NOT_FOUND',
    });
    const store = useProvidersStore();
    await store.load({ initial: true });
    expect(store.error).toBe('HERMES_CLI_NOT_FOUND');
  });

  it('captures network error', async () => {
    mockedBffFetch.mockRejectedValueOnce(new Error('BFF unreachable'));
    const store = useProvidersStore();
    await store.load({ initial: true });
    expect(store.error).toBe('BFF unreachable');
    expect(store.initialized).toBe(true);
  });
});

describe('providers.setModel', () => {
  it('returns ok:true with restartedGateway when BFF reports it', async () => {
    // First call is the setModel POST; second is the internal load() refresh.
    mockedBffFetch
      .mockResolvedValueOnce({ ok: true, restartedGateway: true })
      .mockResolvedValueOnce({
        model: { default: 'gpt-5', provider: 'openai', hasApiKey: true },
        providers: [],
      });
    const store = useProvidersStore();
    const r = await store.setModel({ name: 'gpt-5', provider: 'openai' });
    expect(r.ok).toBe(true);
    expect(r.restartedGateway).toBe(true);
    expect(store.currentModelId).toBe('gpt-5');
    expect(mockedBffFetch).toHaveBeenCalledTimes(2);
  });

  it('returns ok:false with BFF error code on failure', async () => {
    mockedBffFetch.mockRejectedValueOnce(new BffApiError('INVALID_MODEL', 'no such model', 400));
    const store = useProvidersStore();
    const r = await store.setModel({ name: 'fake-model' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('INVALID_MODEL');
    expect(store.settingModel).toBe(false);
  });

  it('clears settingModel flag even when load() also rejects', async () => {
    mockedBffFetch
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error('reload boom'));
    const store = useProvidersStore();
    const r = await store.setModel({ name: 'gpt-5' });
    // setModel itself returns ok:true; the reload error is stored on `error`.
    expect(r.ok).toBe(true);
    expect(store.settingModel).toBe(false);
    expect(store.error).toBe('reload boom');
  });
});

describe('providers.addCredential', () => {
  it('returns ok:true and reloads', async () => {
    mockedBffFetch
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ model: null, providers: [] });
    const store = useProvidersStore();
    const r = await store.addCredential({ provider: 'openai', apiKey: 'sk-xxx' });
    expect(r.ok).toBe(true);
    expect(store.addingCredential).toBe(false);
    expect(mockedBffFetch).toHaveBeenCalledTimes(2);
  });

  it('returns the BFF error code on failure', async () => {
    mockedBffFetch.mockRejectedValueOnce(new BffApiError('INVALID_API_KEY', 'bad key', 400));
    const store = useProvidersStore();
    const r = await store.addCredential({ provider: 'openai', apiKey: 'bad' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('INVALID_API_KEY');
  });
});

describe('providers model inspection', () => {
  it('loads candidate model inspection metadata from the BFF', async () => {
    mockedBffFetch.mockResolvedValueOnce({
      checkedAt: 123,
      items: [
        {
          id: 'openai/gpt-5-mini',
          provider: 'openrouter',
          credentialStatus: 'configured',
          availability: 'ready',
          isCurrent: false,
          pricing: {
            inputPerMillion: 0.15,
            outputPerMillion: 0.6,
            currency: 'USD',
            source: 'openrouter',
          },
        },
      ],
    });
    const store = useProvidersStore();

    await store.inspectModels([
      { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini', provider: 'openrouter' },
    ]);

    expect(store.inspectionLoading).toBe(false);
    expect(store.inspectionCheckedAt).toBe(123);
    expect(store.inspectionFor('openrouter', 'openai/gpt-5-mini')?.availability).toBe('ready');
    expect(mockedBffFetch).toHaveBeenCalledWith('/api/models/inspect', {
      method: 'POST',
      body: JSON.stringify({
        models: [{ id: 'openai/gpt-5-mini', label: 'GPT-5 Mini', provider: 'openrouter' }],
      }),
      silent: true,
    });
  });

  it('loads provider balance without inventing a value for unsupported providers', async () => {
    mockedBffFetch.mockResolvedValueOnce({
      provider: 'anthropic',
      status: 'unsupported',
      reason: 'PROVIDER_DOES_NOT_EXPOSE_SIMPLE_BALANCE',
    });
    const store = useProvidersStore();

    await store.loadProviderBalance('anthropic');

    expect(store.balanceFor('anthropic')).toMatchObject({
      provider: 'anthropic',
      status: 'unsupported',
    });
    expect(store.balanceLoading).toBe(false);
  });
});
