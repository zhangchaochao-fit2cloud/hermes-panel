/**
 * Model Router — automatic model selection based on task complexity.
 *
 * Strategy: analyze the user prompt to estimate complexity, then route to
 * the cheapest model that can handle it. Uses a simple heuristic:
 *
 *   Simple (Haiku/Flash) — short prompts, single questions, translations
 *   Medium (Sonnet/GPT-4o-mini) — multi-step tasks, moderate code
 *   Complex (Opus/GPT-4o) — architecture decisions, large refactors, debugging
 *
 * The router also tracks accuracy: if a downgraded task results in a retry,
 * it bumps future similar tasks to a higher tier.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPanelHome } from './hermes-home.js';
import { logger } from '../lib/logger.js';

export type ComplexityTier = 'simple' | 'medium' | 'complex';

export interface RoutingDecision {
  tier: ComplexityTier;
  model: string;
  reason: string;
  confidence: number;
  savedVsDefault?: number;  // estimated USD savings vs always using expensive model
}

export interface RoutingConfig {
  enabled: boolean;
  models: {
    simple: string;
    medium: string;
    complex: string;
  };
  /** Prompt length thresholds (chars) */
  thresholds: {
    simpleMaxChars: number;
    complexMinChars: number;
  };
}

interface HistoryEntry {
  tier: ComplexityTier;
  retried: boolean;
  timestamp: number;
  keywords: string[];
}

// ─── Complexity Detection ──────────────────────────────────────────────────

const COMPLEX_SIGNALS = [
  /architect|设计方案|系统设计|技术选型/i,
  /refactor|重构|迁移|migration/i,
  /debug|调试|排查|troubleshoot/i,
  /性能优化|performance|bottleneck/i,
  /安全|security|vulnerability|漏洞/i,
  /多文件|跨模块|across.*files/i,
  /full.?stack|全栈/i,
  /比较.*方案|trade.?off|权衡/i,
];

const SIMPLE_SIGNALS = [
  /翻译|translate|translation/i,
  /解释|explain\s+(?:what|how|why)/i,
  /总结|summarize|summary/i,
  /格式化|format|prettier/i,
  /改名|rename|重命名/i,
  /typo|拼写|spelling/i,
  /一句话|one.?liner|简单/i,
  /查一下|look up|what is/i,
];

export function detectComplexity(prompt: string): { tier: ComplexityTier; reason: string; confidence: number } {
  const len = prompt.length;
  const config = getConfig();

  // Check explicit complex signals
  const complexMatches = COMPLEX_SIGNALS.filter(p => p.test(prompt));
  if (complexMatches.length >= 2) {
    return { tier: 'complex', reason: 'multiple_complex_signals', confidence: 0.85 };
  }
  if (complexMatches.length === 1 && len > 200) {
    return { tier: 'complex', reason: 'complex_signal_with_length', confidence: 0.75 };
  }

  // Check explicit simple signals
  const simpleMatches = SIMPLE_SIGNALS.filter(p => p.test(prompt));
  if (simpleMatches.length >= 1 && len < config.thresholds.simpleMaxChars) {
    return { tier: 'simple', reason: 'simple_signal_short_prompt', confidence: 0.8 };
  }

  // Length-based fallback
  if (len < config.thresholds.simpleMaxChars && complexMatches.length === 0) {
    return { tier: 'simple', reason: 'short_prompt_no_complexity', confidence: 0.6 };
  }
  if (len > config.thresholds.complexMinChars) {
    return { tier: 'complex', reason: 'very_long_prompt', confidence: 0.65 };
  }

  return { tier: 'medium', reason: 'default_medium', confidence: 0.7 };
}

// ─── Routing ───────────────────────────────────────────────────────────────

export function routeModel(prompt: string): RoutingDecision {
  const config = getConfig();
  if (!config.enabled) {
    return { tier: 'complex', model: config.models.complex, reason: 'routing_disabled', confidence: 1 };
  }

  const { tier, reason, confidence } = detectComplexity(prompt);
  const model = config.models[tier];

  // Estimate savings (rough: opus $15/M input, haiku $0.25/M, sonnet $3/M)
  const costPerMToken: Record<ComplexityTier, number> = { simple: 0.25, medium: 3, complex: 15 };
  const estimatedTokens = prompt.length / 4 * 3; // rough input+output estimate
  const savingsVsComplex = (costPerMToken.complex - costPerMToken[tier]) * (estimatedTokens / 1_000_000);

  logger.debug({ tier, model, reason, confidence, promptLen: prompt.length }, 'model router decision');

  return {
    tier,
    model,
    reason,
    confidence,
    savedVsDefault: Number(savingsVsComplex.toFixed(4)),
  };
}

// ─── Configuration Persistence ─────────────────────────────────────────────

const DEFAULT_CONFIG: RoutingConfig = {
  enabled: true,
  models: {
    simple: 'claude-haiku-4-5',
    medium: 'claude-sonnet-4-5',
    complex: 'claude-opus-4-7',
  },
  thresholds: {
    simpleMaxChars: 200,
    complexMinChars: 1500,
  },
};

function configPath(): string {
  const dir = getPanelHome();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return join(dir, 'model-router.json');
}

export function getConfig(): RoutingConfig {
  const p = configPath();
  if (!existsSync(p)) return DEFAULT_CONFIG;
  try {
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    return { ...DEFAULT_CONFIG, ...raw, models: { ...DEFAULT_CONFIG.models, ...raw.models }, thresholds: { ...DEFAULT_CONFIG.thresholds, ...raw.thresholds } };
  } catch { return DEFAULT_CONFIG; }
}

export function updateConfig(patch: Partial<RoutingConfig>): RoutingConfig {
  const current = getConfig();
  const next = {
    ...current,
    ...patch,
    models: { ...current.models, ...(patch.models ?? {}) },
    thresholds: { ...current.thresholds, ...(patch.thresholds ?? {}) },
  };
  writeFileSync(configPath(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

// ─── Learning from retries ──────────────────────────────────────────────────

function historyPath(): string {
  return join(getPanelHome(), 'model-router-history.json');
}

export function recordRouting(tier: ComplexityTier, retried: boolean, keywords: string[]): void {
  const p = historyPath();
  let history: HistoryEntry[] = [];
  if (existsSync(p)) {
    try { history = JSON.parse(readFileSync(p, 'utf8')); } catch { /**/ }
  }
  history.push({ tier, retried, timestamp: Date.now(), keywords });
  // Keep last 500 entries
  if (history.length > 500) history = history.slice(-500);
  try { writeFileSync(p, JSON.stringify(history), 'utf8'); } catch { /**/ }
}

export function getRoutingStats(): { total: number; retryRate: Record<ComplexityTier, number>; savings: number } {
  const p = historyPath();
  if (!existsSync(p)) return { total: 0, retryRate: { simple: 0, medium: 0, complex: 0 }, savings: 0 };
  let history: HistoryEntry[] = [];
  try { history = JSON.parse(readFileSync(p, 'utf8')); } catch { /**/ }

  const byTier: Record<ComplexityTier, { total: number; retried: number }> = {
    simple: { total: 0, retried: 0 },
    medium: { total: 0, retried: 0 },
    complex: { total: 0, retried: 0 },
  };
  for (const e of history) {
    byTier[e.tier].total++;
    if (e.retried) byTier[e.tier].retried++;
  }

  const retryRate: Record<ComplexityTier, number> = {
    simple: byTier.simple.total > 0 ? byTier.simple.retried / byTier.simple.total : 0,
    medium: byTier.medium.total > 0 ? byTier.medium.retried / byTier.medium.total : 0,
    complex: byTier.complex.total > 0 ? byTier.complex.retried / byTier.complex.total : 0,
  };

  // Rough savings estimate
  const savings = byTier.simple.total * 0.01 + byTier.medium.total * 0.005;

  return { total: history.length, retryRate, savings };
}
