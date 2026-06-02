/**
 * Cost Manager — multi-provider, multi-workspace budget control.
 *
 * Three-tier model:
 *   Layer 1: Provider-level (OpenAI/Anthropic/DeepSeek billing)
 *   Layer 2: Workspace-level (per-workspace monthly budget)
 *   Layer 3: Goal-level (per-goal token budget)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPanelHome } from './hermes-home.js';
import { analyzeCosts, type CostIntelligence } from './cost-intelligence.js';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ProviderLimit {
  provider: string;
  hardLimit: number;         // USD
  softLimit: number;         // USD (warn at this threshold)
  currentUsage: number;      // from last sync
  billingCycleDay: number;   // day of month billing resets
  rateLimitRPM?: number;
  rateLimitTPM?: number;
  apiKey?: string;           // masked
  lastSyncAt?: number;
  status: 'ok' | 'warning' | 'exceeded' | 'unknown';
}

export interface WorkspaceBudget {
  workspaceId: string;
  monthlyBudget: number;
  currentUsage: number;
  roleQuotas: Record<string, { maxMonthlyCost: number; maxPerRequestCost: number; allowedModels: string[] }>;
  exceedStrategy: 'warn' | 'downgrade' | 'block';
  downgradeTarget?: string;
  alertThreshold: number;    // 0-100 percentage
}

export interface CostOverview {
  providers: ProviderLimit[];
  workspaces: WorkspaceBudget[];
  intelligence: CostIntelligence;
  totalMonthlyBudget: number;
  totalUsed: number;
  totalRemaining: number;
  dailyBudget: number;
  projectedOverage: number;
  alerts: CostAlert[];
}

export interface CostAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  source: string;
  timestamp: number;
}

// ─── Persistence ───────────────────────────────────────────────────────────

function configPath(): string {
  const dir = getPanelHome();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return join(dir, 'cost-config.json');
}

function loadConfig(): { providers: ProviderLimit[]; workspaces: Record<string, WorkspaceBudget> } {
  const p = configPath();
  if (!existsSync(p)) return { providers: [], workspaces: {} };
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch { return { providers: [], workspaces: {} }; }
}

function saveConfig(config: { providers: ProviderLimit[]; workspaces: Record<string, WorkspaceBudget> }): void {
  writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf8');
}

// ─── Provider Management ──────────────────────────────────────────────────

export function getProviders(): ProviderLimit[] {
  return loadConfig().providers;
}

export function setProviderLimit(provider: string, limits: Partial<ProviderLimit>): ProviderLimit {
  const config = loadConfig();
  const existing = config.providers.find(p => p.provider === provider) ?? {
    provider, hardLimit: 50, softLimit: 40, currentUsage: 0, billingCycleDay: 1, status: 'unknown',
  };
  Object.assign(existing, limits);
  existing.status = existing.currentUsage >= existing.hardLimit ? 'exceeded'
    : existing.currentUsage >= existing.softLimit ? 'warning' : 'ok';
  const idx = config.providers.findIndex(p => p.provider === provider);
  if (idx >= 0) config.providers[idx] = existing;
  else config.providers.push(existing);
  saveConfig(config);
  return existing;
}

// ─── Workspace Budgets ────────────────────────────────────────────────────

export function getWorkspaceBudgets(): WorkspaceBudget[] {
  return Object.values(loadConfig().workspaces);
}

export function setWorkspaceBudget(workspaceId: string, budget: Partial<WorkspaceBudget>): WorkspaceBudget {
  const config = loadConfig();
  const existing = config.workspaces[workspaceId] ?? {
    workspaceId, monthlyBudget: 200, currentUsage: 0, roleQuotas: {},
    exceedStrategy: 'warn', alertThreshold: 80,
  };
  Object.assign(existing, budget);
  config.workspaces[workspaceId] = existing;
  saveConfig(config);
  return existing;
}

// ─── Overview & Alerts ────────────────────────────────────────────────────

export function getCostOverview(): CostOverview {
  const config = loadConfig();
  const intelligence = analyzeCosts();

  const providers = config.providers.map(p => {
    // Update usage from intelligence data
    const modelData = intelligence.breakdown.byModel;
    let providerCost = 0;
    for (const [model, data] of Object.entries(modelData)) {
      if (model.toLowerCase().includes(p.provider.toLowerCase())) {
        providerCost += data.cost;
      }
    }
    return { ...p, currentUsage: Math.round(providerCost * 100) / 100 };
  });

  const workspaces = Object.values(config.workspaces);
  const totalMonthlyBudget = workspaces.reduce((s, w) => s + w.monthlyBudget, 0);
  const totalUsed = intelligence.breakdown.totalCost;

  // Generate alerts
  const alerts: CostAlert[] = [];
  const now = Math.floor(Date.now() / 1000);

  for (const p of providers) {
    const pct = p.hardLimit > 0 ? (p.currentUsage / p.hardLimit) * 100 : 0;
    if (pct >= 100) alerts.push({ level: 'critical', message: `${p.provider} 已超出月限额 ($${p.currentUsage.toFixed(2)} / $${p.hardLimit})`, source: 'provider', timestamp: now });
    else if (pct >= p.softLimit) alerts.push({ level: 'warning', message: `${p.provider} 接近月限额 (${pct.toFixed(0)}%)`, source: 'provider', timestamp: now });
  }

  for (const w of workspaces) {
    const pct = w.monthlyBudget > 0 ? (w.currentUsage / w.monthlyBudget) * 100 : 0;
    if (pct >= 100) alerts.push({ level: 'critical', message: `Workspace ${w.workspaceId} 已超出预算`, source: 'workspace', timestamp: now });
    else if (pct >= w.alertThreshold) alerts.push({ level: 'warning', message: `Workspace ${w.workspaceId} 接近预算上限 (${pct.toFixed(0)}%)`, source: 'workspace', timestamp: now });
  }

  if (intelligence.willExceedBudget) {
    alerts.push({ level: 'warning', message: `按当前速率将超出月度预算，建议检查使用情况`, source: 'forecast', timestamp: now });
  }

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const daysElapsed = new Date().getDate();
  const remainingDays = daysInMonth - daysElapsed;
  const dailyBudget = remainingDays > 0 ? (totalMonthlyBudget - totalUsed) / remainingDays : 0;

  return {
    providers, workspaces, intelligence,
    totalMonthlyBudget, totalUsed,
    totalRemaining: totalMonthlyBudget - totalUsed,
    dailyBudget: Math.round(dailyBudget * 100) / 100,
    projectedOverage: Math.max(0, intelligence.breakdown.projectedMonthly - totalMonthlyBudget),
    alerts,
  };
}

export { analyzeCosts } from './cost-intelligence.js';
