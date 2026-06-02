/**
 * Provider Billing Sync — fetch real usage/cost from provider APIs.
 *
 * Two billing models:
 *   1. API Pay-as-you-go (OpenAI/Anthropic API) — call billing API for real data
 *   2. Subscription/Code Plan (ChatGPT Plus, Claude Pro) — can't get API data,
 *      rely on Panel's own usage tracking + user-configured limits
 */

import { logger } from '../lib/logger.js';

export interface ProviderUsage {
  provider: string;
  currentCost: number;
  hardLimit: number;
  hardLimitSource: 'api' | 'user_configured' | 'estimated';
  billingCycleStart: string;
  billingCycleEnd: string;
  raw?: unknown; // Raw API response for debugging
  error?: string;
}

/**
 * Try to fetch billing data from OpenAI API.
 * Requires an API key with billing read permissions.
 */
async function fetchOpenAIBilling(apiKey: string): Promise<ProviderUsage> {
  try {
    // OpenAI Billing API: https://api.openai.com/v1/dashboard/billing/usage
    const startDate = new Date();
    startDate.setDate(1); // First of month
    const endDate = new Date();

    const res = await fetch(
      `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5000) },
    );

    if (!res.ok) {
      return {
        provider: 'openai', currentCost: 0, hardLimit: 0,
        hardLimitSource: 'user_configured', billingCycleStart: startDate.toISOString(), billingCycleEnd: endDate.toISOString(),
        error: `HTTP ${res.status}`,
      };
    }

    const data = await res.json() as { total_usage?: number; hard_limit_usd?: number };
    return {
      provider: 'openai',
      currentCost: (data.total_usage ?? 0) / 100, // OpenAI returns cents
      hardLimit: data.hard_limit_usd ?? 0,
      hardLimitSource: data.hard_limit_usd ? 'api' : 'user_configured',
      billingCycleStart: startDate.toISOString(),
      billingCycleEnd: endDate.toISOString(),
      raw: data,
    };
  } catch (err) {
    return {
      provider: 'openai', currentCost: 0, hardLimit: 0,
      hardLimitSource: 'estimated', billingCycleStart: '', billingCycleEnd: '',
      error: (err as Error).message,
    };
  }
}

/**
 * Try to fetch billing data from Anthropic API.
 * Anthropic's billing endpoint is less documented; fallback to user-configured.
 */
async function fetchAnthropicBilling(apiKey: string): Promise<ProviderUsage> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/organizations/usage', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return {
        provider: 'anthropic', currentCost: 0, hardLimit: 0,
        hardLimitSource: 'user_configured', billingCycleStart: '', billingCycleEnd: '',
        error: `HTTP ${res.status}`,
      };
    }

    const data = await res.json() as { total_cost?: number; hard_limit?: number };
    return {
      provider: 'anthropic',
      currentCost: data.total_cost ?? 0,
      hardLimit: data.hard_limit ?? 0,
      hardLimitSource: data.hard_limit ? 'api' : 'user_configured',
      billingCycleStart: '', billingCycleEnd: '',
      raw: data,
    };
  } catch (err) {
    return {
      provider: 'anthropic', currentCost: 0, hardLimit: 0,
      hardLimitSource: 'estimated', billingCycleStart: '', billingCycleEnd: '',
      error: (err as Error).message,
    };
  }
}

/**
 * Sync provider billing data. Returns usage for each configured provider.
 * Falls back to Panel's own tracking when API data is unavailable.
 */
export async function syncProviderBilling(
  providers: Array<{ name: string; apiKey: string; hardLimit: number; softLimit: number }>,
): Promise<ProviderUsage[]> {
  const results: ProviderUsage[] = [];

  for (const p of providers) {
    let usage: ProviderUsage;

    if (p.name === 'openai' && p.apiKey) {
      usage = await fetchOpenAIBilling(p.apiKey);
    } else if (p.name === 'anthropic' && p.apiKey) {
      usage = await fetchAnthropicBilling(p.apiKey);
    } else {
      // Code Plan / Subscription — can't fetch, rely on user config
      usage = {
        provider: p.name,
        currentCost: 0,
        hardLimit: p.hardLimit,
        hardLimitSource: 'user_configured',
        billingCycleStart: '', billingCycleEnd: '',
      };
    }

    // Override with user-configured limits if API didn't provide them
    if (usage.hardLimit === 0 && p.hardLimit > 0) {
      usage.hardLimit = p.hardLimit;
      usage.hardLimitSource = 'user_configured';
    }

    results.push(usage);
  }

  logger.info({ count: results.length }, 'provider billing synced');
  return results;
}

/**
 * Auto-optimization: analyze usage patterns and suggest model switches.
 * Returns recommendations for reducing token consumption.
 */
export interface OptimizationSuggestion {
  type: 'downgrade' | 'switch_provider' | 'reduce_context' | 'cache_prompts';
  title: string;
  description: string;
  estimatedSavingsTokens: number;
  estimatedSavingsUsd: number;
  confidence: number;
  autoApplicable: boolean; // Can this be applied automatically?
}

export function analyzeOptimizations(
  usageByModel: Record<string, { tokens: number; cost: number; runs: number }>,
  totalTokens: number,
  totalCost: number,
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  // Check for expensive model usage on simple tasks
  const modelTiers: Record<string, { tier: number; cheaper: string | null; costPer1k: number }> = {
    'claude-opus': { tier: 4, cheaper: 'claude-sonnet', costPer1k: 0.015 },
    'claude-sonnet': { tier: 3, cheaper: 'claude-haiku', costPer1k: 0.003 },
    'claude-haiku': { tier: 1, cheaper: null, costPer1k: 0.00025 },
    'gpt-4': { tier: 4, cheaper: 'gpt-4o', costPer1k: 0.03 },
    'gpt-4o': { tier: 3, cheaper: 'gpt-4o-mini', costPer1k: 0.0025 },
    'gpt-4o-mini': { tier: 1, cheaper: null, costPer1k: 0.00015 },
    'deepseek': { tier: 2, cheaper: null, costPer1k: 0.00014 },
  };

  for (const [model, data] of Object.entries(usageByModel)) {
    const tier = modelTiers[model];
    if (!tier || !tier.cheaper || data.runs < 5) continue;

    const cheaper = modelTiers[tier.cheaper];
    const potentialSavings = data.tokens * (tier.costPer1k - cheaper.costPer1k) / 1000;

    if (potentialSavings > 1) {
      suggestions.push({
        type: 'downgrade',
        title: `${model} → ${tier.cheaper}`,
        description: `${model} 消耗了 ${(data.tokens / 1000).toFixed(0)}K tokens，部分任务可用 ${tier.cheaper} 替代`,
        estimatedSavingsTokens: Math.round(data.tokens * 0.4),
        estimatedSavingsUsd: Math.round(potentialSavings * 100) / 100,
        confidence: data.runs > 20 ? 0.85 : 0.6,
        autoApplicable: true,
      });
    }
  }

  // Check if context compression could help (> 50% of tokens are in long sessions)
  const avgTokensPerRun = totalTokens / Math.max(1, Object.values(usageByModel).reduce((s, d) => s + d.runs, 0));
  if (avgTokensPerRun > 10_000) {
    suggestions.push({
      type: 'reduce_context',
      title: '启用上下文压缩',
      description: `平均每次运行消耗 ${(avgTokensPerRun / 1000).toFixed(0)}K tokens，压缩可节省 30-50%`,
      estimatedSavingsTokens: Math.round(totalTokens * 0.3),
      estimatedSavingsUsd: Math.round(totalCost * 0.3 * 100) / 100,
      confidence: 0.7,
      autoApplicable: false,
    });
  }

  // Check for repeated identical prompts (caching opportunity)
  const promptsPerModel = Object.values(usageByModel).reduce((s, d) => s + d.runs, 0);
  if (promptsPerModel > 50) {
    suggestions.push({
      type: 'cache_prompts',
      title: '启用 Prompt Caching',
      description: '高频重复的 system prompt 可使用 Anthropic/OpenAI 的缓存功能节省 90% 输入成本',
      estimatedSavingsTokens: Math.round(totalTokens * 0.15),
      estimatedSavingsUsd: Math.round(totalCost * 0.1 * 100) / 100,
      confidence: 0.5,
      autoApplicable: false,
    });
  }

  return suggestions.sort((a, b) => b.estimatedSavingsUsd - a.estimatedSavingsUsd);
}
