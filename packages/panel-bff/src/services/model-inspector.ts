import { estimateCost } from './usage-ledger.js';
import type { ModelState, ProviderInfo } from './hermes-providers.js';

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

export interface ModelInspectionResult {
  checkedAt: number;
  items: InspectedModel[];
}

export interface OpenRouterModelMeta {
  id: string;
  contextLength?: number;
  pricing?: ModelPricing;
}

function openRouterHeaders(apiKey?: string): Record<string, string> {
  return apiKey ? { authorization: `Bearer ${apiKey}` } : {};
}

function sameProvider(candidateProvider: string, modelProvider: string): boolean {
  if (!candidateProvider || !modelProvider) return false;
  return candidateProvider === modelProvider || modelProvider.split(':')[0] === candidateProvider;
}

function hasConfiguredCredential(candidate: CandidateModel, providers: ProviderInfo[], model: ModelState | null): boolean {
  if (candidate.requiresCredential === false) return true;
  if (providers.some(provider => provider.family === candidate.provider && provider.credentials.length > 0)) {
    return true;
  }
  if (!model) return false;
  return sameProvider(candidate.provider, model.provider) && (model.hasApiKey || !!model.activeCredential);
}

function staticPricing(modelId: string): ModelPricing | undefined {
  const input = estimateCost(modelId, 1000, 0);
  const output = estimateCost(modelId, 0, 1000);
  if (input === undefined || output === undefined) return undefined;
  return {
    inputPerMillion: Number((input * 1000).toFixed(6)),
    outputPerMillion: Number((output * 1000).toFixed(6)),
    currency: 'USD',
    source: 'static',
  };
}

export function normalizeOpenRouterModel(raw: unknown): OpenRouterModelMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as {
    id?: unknown;
    context_length?: unknown;
    contextLength?: unknown;
    pricing?: { prompt?: unknown; completion?: unknown };
  };
  if (typeof row.id !== 'string' || !row.id) return null;
  const prompt = Number(row.pricing?.prompt);
  const completion = Number(row.pricing?.completion);
  const contextLength = typeof row.context_length === 'number'
    ? row.context_length
    : typeof row.contextLength === 'number'
      ? row.contextLength
      : undefined;
  return {
    id: row.id,
    contextLength,
    pricing: Number.isFinite(prompt) && Number.isFinite(completion)
      ? {
          inputPerMillion: Number((prompt * 1_000_000).toFixed(6)),
          outputPerMillion: Number((completion * 1_000_000).toFixed(6)),
          currency: 'USD',
          source: 'openrouter',
        }
      : undefined,
  };
}

export function normalizeOpenRouterCredits(raw: unknown): ProviderBalance {
  const data = raw && typeof raw === 'object' && 'data' in raw
    ? (raw as { data?: unknown }).data
    : raw;
  const row = data && typeof data === 'object'
    ? data as { total_credits?: unknown; total_usage?: unknown }
    : {};
  const total = Number(row.total_credits);
  const used = Number(row.total_usage);
  if (!Number.isFinite(total) || !Number.isFinite(used)) {
    return {
      provider: 'openrouter',
      status: 'unknown',
      reason: 'UNEXPECTED_RESPONSE',
    };
  }
  return {
    provider: 'openrouter',
    status: 'available',
    currency: 'USD',
    total,
    used,
    remaining: Number((total - used).toFixed(6)),
    source: 'openrouter',
  };
}

export function buildModelInspection(input: {
  candidates: CandidateModel[];
  providers: ProviderInfo[];
  model: ModelState | null;
  openRouterModels?: Map<string, OpenRouterModelMeta>;
}): ModelInspectionResult {
  const items = input.candidates.map(candidate => {
    const configured = hasConfiguredCredential(candidate, input.providers, input.model);
    const openRouterMeta = input.openRouterModels?.get(candidate.id);
    const pricing = openRouterMeta?.pricing ?? staticPricing(candidate.id);
    const isCurrent = input.model?.default === candidate.id && sameProvider(candidate.provider, input.model.provider);
    return {
      id: candidate.id,
      label: candidate.label,
      provider: candidate.provider,
      baseUrl: candidate.baseUrl,
      isCurrent,
      credentialStatus: configured ? 'configured' as const : 'missing' as const,
      availability: configured ? 'ready' as const : 'missing_credentials' as const,
      availabilityReason: configured ? undefined : 'NO_PROVIDER_CREDENTIAL',
      pricing,
      contextLength: openRouterMeta?.contextLength,
    };
  });
  return {
    checkedAt: Date.now(),
    items,
  };
}

export async function fetchOpenRouterModels(apiKey?: string): Promise<Map<string, OpenRouterModelMeta>> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: openRouterHeaders(apiKey),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return new Map();
    const json = await res.json() as { data?: unknown[] };
    const rows = Array.isArray(json.data) ? json.data : [];
    const map = new Map<string, OpenRouterModelMeta>();
    for (const row of rows) {
      const normalized = normalizeOpenRouterModel(row);
      if (normalized) map.set(normalized.id, normalized);
    }
    return map;
  } catch {
    return new Map();
  }
}

export function resolveProviderEnvApiKey(provider: string): string | undefined {
  const normalized = provider.replace(/[^a-z0-9]/gi, '_').toUpperCase();
  return process.env[`${normalized}_API_KEY`];
}

export async function fetchOpenRouterBalance(apiKey?: string): Promise<ProviderBalance> {
  if (!apiKey) {
    return {
      provider: 'openrouter',
      status: 'unsupported',
      reason: 'NO_ACCESSIBLE_KEY',
    };
  }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: openRouterHeaders(apiKey),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      return {
        provider: 'openrouter',
        status: 'unavailable',
        reason: `HTTP_${res.status}`,
      };
    }
    return normalizeOpenRouterCredits(await res.json());
  } catch (err) {
    return {
      provider: 'openrouter',
      status: 'unavailable',
      reason: err instanceof Error ? err.message : 'FETCH_FAILED',
    };
  }
}

export function unsupportedBalance(provider: string): ProviderBalance {
  return {
    provider,
    status: 'unsupported',
    reason: 'PROVIDER_DOES_NOT_EXPOSE_SIMPLE_BALANCE',
  };
}
