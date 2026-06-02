/**
 * Intent-Driven Development — Webhook → Goal automation.
 *
 * Automatically converts external events (GitHub Issues, Slack messages,
 * monitoring alerts) into Goals, then dispatches to the Orchestrator.
 *
 * Panel's unique advantage: Channel integration + Webhook system + Goal Engine.
 * Neither Codex (no webhooks) nor Claude (no channels) can do this.
 */

import { createGoal } from './goal-engine.js';
import { generatePlan, getParallelGroups, formatPlanSummary } from './orchestrator.js';
import { addChatRoomMessage } from './panel-db.js';
import { randomUUID } from 'node:crypto';
import { logger } from '../lib/logger.js';

export interface ExternalEvent {
  source: 'github' | 'slack' | 'webhook' | 'monitoring' | 'cron';
  title: string;
  body: string;
  labels?: string[];
  repo?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, string>;
}

export interface IntentResult {
  classification: 'bug' | 'feature' | 'refactor' | 'security' | 'docs' | 'other';
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTokens: number;
  estimatedCost: number;
  suggestedRoles: string[];
  suggestedBudgetK: number;
  plan?: ReturnType<typeof generatePlan>;
  goalId?: string;
}

/** Classify an external event into a development intent */
export function classifyIntent(event: ExternalEvent): IntentResult {
  const text = `${event.title}\n${event.body}`.toLowerCase();
  let classification: IntentResult['classification'] = 'other';
  let complexity: IntentResult['complexity'] = 'medium';
  const suggestedRoles: string[] = [];

  // Classification
  if (/bug|fix|broken|crash|error|exception|fail/.test(text)) {
    classification = 'bug';
    suggestedRoles.push('backend', 'qa');
    complexity = 'simple';
  } else if (/feature|add|implement|create|new|enhance/.test(text)) {
    classification = 'feature';
    suggestedRoles.push('architect', 'backend', 'frontend', 'qa', 'reviewer');
    complexity = 'complex';
  } else if (/refactor|clean|improve|optimize|simplify/.test(text)) {
    classification = 'refactor';
    suggestedRoles.push('backend', 'qa');
    complexity = 'medium';
  } else if (/security|vuln|exploit|attack|auth|permission/.test(text)) {
    classification = 'security';
    suggestedRoles.push('security');
    complexity = 'medium';
  } else if (/doc|readme|document|comment/.test(text)) {
    classification = 'docs';
    suggestedRoles.push('writer');
    complexity = 'simple';
  }

  // Complexity adjustment
  if (/urgent|critical|p0|blocker|production/.test(text)) {
    complexity = 'complex';
  }
  if (event.priority === 'critical') complexity = 'complex';

  // Token estimation
  const estimatedTokens = complexity === 'simple' ? 30_000 : complexity === 'medium' ? 80_000 : 150_000;
  const suggestedBudgetK = Math.ceil(estimatedTokens / 1000) * 1.2; // +20% buffer
  const estimatedCost = estimatedTokens * 0.000004; // ~$0.004/1K tokens average

  return {
    classification, complexity, estimatedTokens, estimatedCost: Math.round(estimatedCost * 100) / 100,
    suggestedRoles, suggestedBudgetK,
  };
}

/** Create a Goal from an external event and optionally dispatch to orchestrator */
export async function processIntent(
  event: ExternalEvent,
  roomId: string,
  availableRoles: string[],
): Promise<IntentResult> {
  const result = classifyIntent(event);

  // Create goal
  const goal = createGoal({
    objective: `[${event.source.toUpperCase()}] ${event.title}`,
    scopeBoundary: event.repo ? `仅修改 ${event.repo} 仓库相关代码` : '不修改与问题无关的文件',
    doneWhen: [
      ...(result.classification === 'bug' ? ['Bug 不再可复现', '添加回归测试'] : []),
      ...(result.classification === 'feature' ? ['功能完整可用', '测试通过', '代码审查通过'] : []),
      ...(result.classification === 'security' ? ['漏洞已修复', '安全扫描通过'] : []),
    ],
    tokenBudgetK: result.suggestedBudgetK,
    turnBudget: result.complexity === 'simple' ? 3 : result.complexity === 'medium' ? 6 : 10,
  });

  // Generate plan
  const plan = generatePlan(`${event.title}\n\n${event.body}`, availableRoles);

  // Post plan to chat room
  addChatRoomMessage({
    id: randomUUID(), room_id: roomId,
    role: 'agent', agent_name: 'intent-engine', agent_icon: '🔮',
    content: `🔮 自动分析结果:\n- 类型: ${result.classification}\n- 复杂度: ${result.complexity}\n- 预估 Token: ${result.estimatedTokens.toLocaleString()}\n- 预估成本: $${result.estimatedCost}\n- 建议角色: ${result.suggestedRoles.join(', ')}\n\n${formatPlanSummary(plan)}`,
  });

  // Auto-dispatch first parallel group
  const groups = getParallelGroups(plan);
  const firstGroup = groups[0];
  if (firstGroup) {
    for (const task of firstGroup) {
      addChatRoomMessage({
        id: randomUUID(), room_id: roomId,
        role: 'agent', agent_name: task.role, agent_icon: '🤖',
        content: `⏳ ${task.description}`,
      });
    }
  }

  result.plan = plan;
  result.goalId = goal.id;

  logger.info({ event: event.title, classification: result.classification, budgetK: result.suggestedBudgetK }, 'intent processed');
  return result;
}
