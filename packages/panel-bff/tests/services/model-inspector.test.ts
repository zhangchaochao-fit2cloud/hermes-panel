import { describe, expect, it } from 'vitest';
import {
  buildModelInspection,
  normalizeOpenRouterModel,
  normalizeOpenRouterCredits,
  type CandidateModel,
} from '../../src/services/model-inspector.js';
import type { ModelState, ProviderInfo } from '../../src/services/hermes-providers.js';

const candidates: CandidateModel[] = [
  { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini (via OR)', provider: 'openrouter' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { id: 'deepseek-chat', label: 'DeepSeek Chat', provider: 'custom', baseUrl: 'https://api.deepseek.com' },
];

describe('model-inspector', () => {
  it('marks models with configured providers as ready and missing providers honestly', () => {
    const providers: ProviderInfo[] = [
      {
        id: 'openrouter',
        family: 'openrouter',
        credentials: [{ label: 'OR env', type: 'api_key', source: 'env:OPENROUTER_API_KEY', active: true }],
      },
    ];
    const model: ModelState = {
      default: 'openai/gpt-5-mini',
      provider: 'openrouter',
      hasApiKey: false,
      activeCredential: { label: 'OR env', type: 'api_key', source: 'env:OPENROUTER_API_KEY' },
    };

    const result = buildModelInspection({ candidates, providers, model });

    expect(result.items.find(item => item.id === 'openai/gpt-5-mini')).toMatchObject({
      provider: 'openrouter',
      isCurrent: true,
      credentialStatus: 'configured',
      availability: 'ready',
    });
    expect(result.items.find(item => item.id === 'gpt-4o')).toMatchObject({
      provider: 'openai',
      isCurrent: false,
      credentialStatus: 'missing',
      availability: 'missing_credentials',
    });
  });

  it('adds local pricing for known non-OpenRouter models without pretending it is live billing', () => {
    const result = buildModelInspection({ candidates, providers: [], model: null });
    const gpt4o = result.items.find(item => item.id === 'gpt-4o');

    expect(gpt4o?.pricing).toMatchObject({
      inputPerMillion: 2.5,
      outputPerMillion: 10,
      currency: 'USD',
      source: 'static',
    });
  });

  it('normalizes OpenRouter pricing from per-token strings to per-million-token dollars', () => {
    const normalized = normalizeOpenRouterModel({
      id: 'openai/gpt-5-mini',
      context_length: 128000,
      pricing: {
        prompt: '0.00000015',
        completion: '0.0000006',
      },
    });

    expect(normalized).toEqual({
      id: 'openai/gpt-5-mini',
      contextLength: 128000,
      pricing: {
        inputPerMillion: 0.15,
        outputPerMillion: 0.6,
        currency: 'USD',
        source: 'openrouter',
      },
    });
  });

  it('normalizes OpenRouter credits into used and remaining dollar amounts', () => {
    expect(normalizeOpenRouterCredits({
      data: {
        total_credits: 25,
        total_usage: 7.5,
      },
    })).toEqual({
      provider: 'openrouter',
      status: 'available',
      currency: 'USD',
      total: 25,
      used: 7.5,
      remaining: 17.5,
      source: 'openrouter',
    });
  });
});
