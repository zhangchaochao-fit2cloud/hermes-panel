/**
 * Cost Intelligence Engine — proactive cost optimization.
 *
 * Analyzes historical usage data and suggests model switches to save money.
 * Panel's unique advantage: Dashboard has multi-model Usage Ledger that
 * neither Codex (GPT-only) nor Claude (Claude-only) can offer.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPanelHome } from './hermes-home.js';
import { logger } from '../lib/logger.js';
import type { UsageEntry } from './usage-ledger.js';

export interface CostSuggestion {
  id: string;
  type: 'downgrade' | 'upgrade' | 'auto';
  title: string;
  description: string;
  estimatedSavingsUsd: number;
  estimatedSavingsPct: number;
  currentModel: string;
  suggestedModel: string;
  affectedRuns: number;
  confidence: number;
}

export interface CostBreakdown {
  byModel: Record<string, { runs: number; cost: number; tokens: number; pct: number }>;
  totalCost: number;
  totalTokens: number;
  dailyAvg: number;
  projectedMonthly: number;
}

export interface CostIntelligence {
  breakdown: CostBreakdown;
  suggestions: CostSuggestion[];
  monthlyBudget: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  dailyRate: number;
  willExceedBudget: boolean;
}

// Model tiers for auto-suggestion
const MODEL_TIERS: Record<string, { tier: number; label: string }> = {
  'claude-opus': { tier: 4, label: 'Premium (Opus)' },
  'claude-sonnet': { tier: 3, label: 'Standard (Sonnet)' },
  'claude-haiku': { tier: 1, label: 'Budget (Haiku)' },
  'gpt-4': { tier: 4, label: 'Premium (GPT-4)' },
  'gpt-4o': { tier: 3, label: 'Standard (GPT-4o)' },
  'gpt-4o-mini': { tier: 1, label: 'Budget (GPT-4o-mini)' },
  'deepseek': { tier: 2, label: 'Value (DeepSeek)' },
  'hermes-agent': { tier: 2, label: 'Default' },
};

function classifyModel(model: string): { tier: number; label: string } {
  const lower = model.toLowerCase();
  for (const [key, val] of Object.entries(MODEL_TIERS)) {
    if (lower.includes(key)) return val;
  }
  return { tier: 2, label: 'Unknown' };
}

function findCheaperModel(model: string): string | null {
  const current = classifyModel(model);
  if (current.tier <= 1) return null; // Already cheapest

  // Suggest one tier down
  for (const [key, val] of Object.entries(MODEL_TIERS)) {
    if (val.tier === current.tier - 1) return key;
  }
  return null;
}

function readRawEntries(): UsageEntry[] {
  const path = join(getPanelHome(), 'usage.jsonl');
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, 'utf-8');
    const entries: UsageEntry[] = [];
    for (const line of raw.split('\n')) {
      if (!line) continue;
      try { entries.push(JSON.parse(line) as UsageEntry); } catch { /* skip */ }
    }
    return entries;
  } catch { return []; }
}

export function analyzeCosts(monthlyBudget = 50): CostIntelligence {
  const entries = readRawEntries();
  if (entries.length === 0) {
    return {
      breakdown: { byModel: {}, totalCost: 0, totalTokens: 0, dailyAvg: 0, projectedMonthly: 0 },
      suggestions: [],
      monthlyBudget, monthlyUsed: 0, monthlyRemaining: monthlyBudget,
      dailyRate: 0, willExceedBudget: false,
    };
  }

  // Calculate breakdown
  const byModel: Record<string, { runs: number; cost: number; tokens: number; pct: number }> = {};
  let totalCost = 0;
  let totalTokens = 0;
  const now = Date.now();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

  for (const e of entries) {
    const key = e.model || 'unknown';
    if (!byModel[key]) byModel[key] = { runs: 0, cost: 0, tokens: 0, pct: 0 };
    byModel[key].runs++;
    byModel[key].cost += e.cost ?? 0;
    byModel[key].tokens += e.total;
    totalCost += e.cost ?? 0;
    totalTokens += e.total;
  }

  for (const k of Object.keys(byModel)) {
    byModel[k].pct = totalCost > 0 ? Math.round((byModel[k].cost / totalCost) * 100) : 0;
  }

  // Calculate daily rate and projection
  const monthEntries = entries.filter(e => e.ts >= monthStart);
  const monthCost = monthEntries.reduce((s, e) => s + (e.cost ?? 0), 0);
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const daysElapsed = Math.max(1, Math.floor((now - monthStart) / 86400000));
  const dailyRate = monthCost / daysElapsed;
  const projectedMonthly = dailyRate * daysInMonth;

  // Generate suggestions
  const suggestions: CostSuggestion[] = [];
  for (const [model, data] of Object.entries(byModel)) {
    if (data.pct < 10) continue; // Skip minor models
    const cheaper = findCheaperModel(model);
    if (!cheaper) continue;
    const estimatedSavings = data.cost * 0.4; // Estimate ~40% savings by downgrading
    suggestions.push({
      id: `downgrade-${model}`,
      type: 'downgrade',
      title: `将 ${model} 降级到 ${cheaper}`,
      description: `${model} 消耗了 ${data.pct}% 的成本，其中部分任务可用 ${cheaper} 替代`,
      estimatedSavingsUsd: Math.round(estimatedSavings * 100) / 100,
      estimatedSavingsPct: Math.round(40),
      currentModel: model,
      suggestedModel: cheaper,
      affectedRuns: data.runs,
      confidence: data.pct > 30 ? 0.85 : 0.6,
    });
  }

  logger.info({ totalCost, projectedMonthly, suggestionCount: suggestions.length }, 'cost intelligence analyzed');
  return {
    breakdown: { byModel, totalCost, totalTokens, dailyAvg: Math.round(totalCost / Math.max(1, entries.length) * 100) / 100, projectedMonthly },
    suggestions: suggestions.sort((a, b) => b.estimatedSavingsUsd - a.estimatedSavingsUsd),
    monthlyBudget, monthlyUsed: monthCost, monthlyRemaining: monthlyBudget - monthCost,
    dailyRate, willExceedBudget: projectedMonthly > monthlyBudget,
  };
}
