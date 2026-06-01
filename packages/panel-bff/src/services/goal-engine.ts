/**
 * Goal Engine — Codex/Claude-style autonomous agent loop.
 *
 * Design inspired by Codex CLI's /goal and Claude Code's /goal:
 *   1. Outcome-based: "Done when X verified" instead of "Do A, B, C"
 *   2. Token budget: hard cap + soft-stop wrap-up
 *   3. Scope boundary: explicit "stop if" conditions
 *   4. Completion audit: evidence-based verification
 *   5. Harness pattern: engine manages state, model does work
 *
 * Architecture:
 *   User defines Goal → Engine enters Loop → Each Turn: Plan → Act → Review
 *   → Soft-stop when budget exhausted → Completion audit → Done/Failed
 */

import { randomUUID } from 'node:crypto';
import { logger } from '../lib/logger.js';

// ─── Types ────────────────────────────────────────────────────────────────

export type GoalStatus = 'active' | 'paused' | 'budget_limited' | 'completed' | 'failed';

export interface Goal {
  id: string;
  /** What to achieve (one sentence, outcome-focused) */
  objective: string;
  /** What NOT to change / which boundaries to respect */
  scopeBoundary: string;
  /** Verifiable completion criteria (will be audited) */
  doneWhen: string[];
  /** Hard stop conditions to prevent runaway */
  stopIf: string[];
  /** Max estimated token budget (in thousands). Soft-stop at 100% */
  tokenBudgetK: number;
  /** Tokens consumed so far */
  tokensUsed: number;
  /** Max turns (0 = unlimited) */
  turnBudget: number;
  /** Turns executed */
  turnsUsed: number;
  status: GoalStatus;
  /** Audit trail: what was done each turn */
  auditLog: AuditEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface AuditEntry {
  turn: number;
  action: string;
  result: string;
  tokensThisTurn: number;
  timestamp: number;
}

export interface GoalProgress {
  goal: Goal;
  /** What the model should do next */
  nextAction: string;
  /** Whether the goal is complete based on audit */
  isComplete: boolean;
  /** Whether budget limits are approaching */
  budgetWarning: boolean;
}

// ─── In-memory store (could be persisted to panel.db later) ────────────────

const goals = new Map<string, Goal>();

export function createGoal(opts: {
  objective: string;
  scopeBoundary?: string;
  doneWhen?: string[];
  stopIf?: string[];
  tokenBudgetK?: number;
  turnBudget?: number;
}): Goal {
  const goal: Goal = {
    id: randomUUID(),
    objective: opts.objective,
    scopeBoundary: opts.scopeBoundary ?? '不要修改与目标无关的文件',
    doneWhen: opts.doneWhen ?? [],
    stopIf: opts.stopIf ?? [],
    tokenBudgetK: opts.tokenBudgetK ?? 100,
    tokensUsed: 0,
    turnBudget: opts.turnBudget ?? 10,
    turnsUsed: 0,
    status: 'active',
    auditLog: [],
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  };
  goals.set(goal.id, goal);
  return goal;
}

export function getGoal(id: string): Goal | null {
  return goals.get(id) ?? null;
}

export function pauseGoal(id: string): void {
  const g = goals.get(id);
  if (g) { g.status = 'paused'; g.updatedAt = Math.floor(Date.now() / 1000); }
}

export function resumeGoal(id: string): void {
  const g = goals.get(id);
  if (g && g.status === 'paused') { g.status = 'active'; g.updatedAt = Math.floor(Date.now() / 1000); }
}

export function clearGoal(id: string): void {
  goals.delete(id);
}

/** Generate the system prompt for the next turn based on goal progress */
export function getContinuationPrompt(g: Goal): GoalProgress {
  const budgetPct = (g.tokensUsed / Math.max(1, g.tokenBudgetK * 1000)) * 100;
  const budgetWarning = budgetPct >= 70;

  // Generate the next action instruction
  let nextAction: string;

  if (budgetPct >= 100) {
    g.status = 'budget_limited';
    nextAction = `⚠️ Token 预算已耗尽 (${g.tokenBudgetK}K / ${g.tokenBudgetK * 1000})。请立即输出已完成的工作摘要，然后停止。\n不要开始新的工作。`;
  } else if (g.turnBudget > 0 && g.turnsUsed >= g.turnBudget) {
    g.status = 'budget_limited';
    nextAction = `⚠️ 已达到回合上限 (${g.turnBudget} 轮)。请输出进度总结并停止。`;
  } else {
    nextAction = buildNextActionPrompt(g);
  }

  const isComplete = auditCompletion(g);

  return { goal: g, nextAction, isComplete, budgetWarning };
}

function buildNextActionPrompt(g: Goal): string {
  const parts: string[] = [];

  parts.push(`## 目标：${g.objective}`);
  parts.push(`## 当前进度：第 ${g.turnsUsed}/${g.turnBudget || '无限'} 轮，Token 已用 ${g.tokensUsed.toLocaleString()}`);

  if (g.scopeBoundary) {
    parts.push(`## 范围限制：${g.scopeBoundary}`);
  }

  if (g.doneWhen.length) {
    parts.push(`## 验收标准：`);
    g.doneWhen.forEach((d, i) => { parts.push(`${i + 1}. ${d}`); });
  }

  if (g.stopIf.length) {
    parts.push(`## 停止条件（满足任一立即停止）：`);
    g.stopIf.forEach((s, i) => { parts.push(`${i + 1}. ${s}`); });
  }

  // Check stop conditions
  const shouldStop = checkStopConditions(g);
  if (shouldStop) {
    g.status = 'failed';
    parts.push(`\n## ⛔ 停止条件触发：${shouldStop}`);
    parts.push('请输出当前已完成的工作摘要，然后停止。');
  } else {
    parts.push(`\n请继续完成目标。完成一步后，评估是否需要下一步。`);
    parts.push(`如果目标已达成，请输出 "✅ GOAL_COMPLETE" 并提供验证证据。`);
  }

  return parts.join('\n');
}

function checkStopConditions(g: Goal): string | null {
  for (const condition of g.stopIf) {
    // Simple keyword-based stop detection
    // In production, this could call a cheap evaluator model
    const lastEntries = g.auditLog.slice(-3);
    const lastResults = lastEntries.map(e => e.result.toLowerCase()).join(' ');
    for (const kw of condition.toLowerCase().split(/[,;]/)) {
      if (kw.trim() && lastResults.includes(kw.trim())) {
        return condition;
      }
    }
  }
  return null;
}

function auditCompletion(g: Goal): boolean {
  if (!g.doneWhen.length) return false;

  // Simple completion audit: check if each criteria has been addressed
  // In production, this would call a cheap evaluator model
  const auditText = g.auditLog.map(e => `${e.action}: ${e.result}`).join('\n').toLowerCase();
  let met = 0;
  for (const criterion of g.doneWhen) {
    if (auditText.includes(criterion.toLowerCase())) met++;
  }
  return met >= g.doneWhen.length;
}

export function recordAudit(g: Goal, entry: Omit<AuditEntry, 'turn'>): void {
  g.turnsUsed++;
  g.tokensUsed += entry.tokensThisTurn;
  g.updatedAt = Math.floor(Date.now() / 1000);
  g.auditLog.push({ ...entry, turn: g.turnsUsed });
  logger.info({ goalId: g.id, turn: g.turnsUsed, tokens: entry.tokensThisTurn }, 'goal audit recorded');
}

export function listGoals(): Goal[] {
  return Array.from(goals.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}
