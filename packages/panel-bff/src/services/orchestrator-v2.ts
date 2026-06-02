/**
 * Orchestrator V2 — LLM-driven multi-agent task decomposition & iterative execution.
 *
 * V2: LLM analyzes requirements → generates structured plan → executes in parallel batches
 * Falls back to keyword-based decomposition when LLM is unavailable.
 */

import { randomUUID } from 'node:crypto';
import { logger } from '../lib/logger.js';

export interface OrchestrationTask {
  id: string; role: string; description: string; prompt: string;
  dependsOn: string[]; status: 'pending' | 'running' | 'done' | 'failed';
  result?: string; tokensUsed?: number;
}

export interface OrchestrationPlan {
  id: string; objective: string; tasks: OrchestrationTask[];
  reasoning: string; status: 'planning' | 'running' | 'completed' | 'failed' | 'budget_limited';
  progress: { done: number; total: number; failed: number };
}

export interface OrchestrationConfig {
  objective: string; availableRoles: string[]; tokenBudgetK: number; turnBudget: number;
  scopeBoundary?: string; doneWhen?: string[]; stopIf?: string[];
}

// LLM decomposition prompt
function buildDecompositionPrompt(config: OrchestrationConfig): string {
  return [
    '你是一个项目管理 AI，将需求分解为可执行的子任务。',
    `需求：${config.objective}`,
    `可用角色：${config.availableRoles.join(', ')}`,
    config.scopeBoundary ? `范围：${config.scopeBoundary}` : '',
    '输出 JSON：{"reasoning":"思路","tasks":[{"role":"id","description":"描述","prompt":"完整prompt","dependsOn":[0]}]}',
    '无依赖的任务可并行。只输出 JSON。',
  ].filter(Boolean).join('\n');
}

// Fallback: keyword-based decomposition
function fallbackDecompose(config: OrchestrationConfig): OrchestrationPlan {
  const text = config.objective.toLowerCase();
  const roles = config.availableRoles;
  const tasks: OrchestrationTask[] = [];
  const patterns: Array<{ regex: RegExp; role: string; desc: string }> = [
    { regex: /安全|漏洞|security|auth/, role: 'security', desc: '审查安全性' },
    { regex: /架构|设计|architect/, role: 'architect', desc: '设计系统架构' },
    { regex: /前端|界面|ui|页面|组件|frontend|样式|css/, role: 'frontend', desc: '实现前端' },
    { regex: /实现|开发|api|接口|后端|backend|coding/, role: 'backend', desc: '实现后端' },
    { regex: /测试|test|qa|用例/, role: 'qa', desc: '编写测试' },
    { regex: /审查|review|检查|代码质量/, role: 'reviewer', desc: '代码审查' },
    { regex: /部署|docker|ci|cd|devops/, role: 'devops', desc: '部署配置' },
  ];
  for (const p of patterns) {
    if (p.regex.test(text) && roles.includes(p.role)) {
      tasks.push({ id: randomUUID(), role: p.role, description: `${p.desc}: ${config.objective.slice(0, 100)}`, prompt: config.objective, dependsOn: [], status: 'pending' });
    }
  }
  if (tasks.length === 0 && roles.length > 0) {
    tasks.push({ id: randomUUID(), role: roles[0], description: `处理：${config.objective.slice(0, 100)}`, prompt: config.objective, dependsOn: [], status: 'pending' });
  }
  return { id: randomUUID(), objective: config.objective, tasks, reasoning: `匹配到 ${tasks.length} 个任务`, status: 'planning', progress: { done: 0, total: tasks.length, failed: 0 } };
}

// Parse LLM output into tasks
function parseDecomposition(raw: string, config: OrchestrationConfig): OrchestrationPlan {
  try {
    const json = JSON.parse((raw.match(/\{[\s\S]*\}/)?.[0] ?? raw)) as { reasoning?: string; tasks?: Array<{ role: string; description: string; prompt: string; dependsOn?: number[] }> };
    const tasks: OrchestrationTask[] = (json.tasks ?? []).map(t => ({
      id: randomUUID(), role: t.role, description: t.description, prompt: t.prompt,
      dependsOn: (t.dependsOn ?? []).map(String), status: 'pending' as const,
    }));
    return { id: randomUUID(), objective: config.objective, tasks, reasoning: json.reasoning ?? '', status: 'planning', progress: { done: 0, total: tasks.length, failed: 0 } };
  } catch { return fallbackDecompose(config); }
}

// Decompose via LLM (or fallback)
export async function decompose(
  config: OrchestrationConfig,
  callLLM: (prompt: string, model?: string) => Promise<string>,
): Promise<OrchestrationPlan> {
  try {
    const raw = await callLLM(buildDecompositionPrompt(config), 'claude-haiku-4-5');
    const plan = parseDecomposition(raw, config);
    if (plan.tasks.length > 0) return plan;
  } catch (err) { logger.warn({ err }, 'LLM decomposition failed, using fallback'); }
  return fallbackDecompose(config);
}

// Execute plan iteratively
export async function execute(
  plan: OrchestrationPlan,
  config: OrchestrationConfig,
  callLLM: (prompt: string, model?: string) => Promise<string>,
  onProgress?: (plan: OrchestrationPlan) => void,
): Promise<OrchestrationPlan> {
  plan.status = 'running';
  let totalTokens = 0;

  while (plan.status === 'running') {
    const doneIds = new Set(plan.tasks.filter(t => t.status === 'done').map(t => t.id));
    const ready = plan.tasks.filter(t => t.status === 'pending' && t.dependsOn.every(d => doneIds.has(d)));

    if (ready.length === 0) {
      plan.status = plan.tasks.every(t => t.status === 'done' || t.status === 'failed') ? 'completed' : 'failed';
      break;
    }

    const batch = ready.slice(0, 3);
    for (const t of batch) t.status = 'running';
    onProgress?.(plan);

    await Promise.allSettled(batch.map(async t => {
      try {
        const r = await callLLM(t.prompt); t.result = r; t.status = 'done';
        t.tokensUsed = Math.ceil(r.length / 3); totalTokens += t.tokensUsed ?? 0;
        plan.progress.done++;
      } catch (err) { t.result = (err as Error).message; t.status = 'failed'; plan.progress.failed++; }
    }));

    if (totalTokens >= config.tokenBudgetK * 1000) { plan.status = 'budget_limited'; break; }
    onProgress?.(plan);
  }

  logger.info({ id: plan.id, status: plan.status, tokens: totalTokens }, 'orchestration complete');
  return plan;
}
