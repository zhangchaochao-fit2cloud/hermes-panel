/**
 * Intent Classifier — analyzes webhook payloads to determine intent
 * and auto-create goals for the Goal Engine.
 */

import { randomUUID } from 'node:crypto';
import { logger } from '../lib/logger.js';

export type IntentType = 'bug' | 'feature' | 'refactor' | 'security' | 'docs' | 'unknown';
export type ComplexityLevel = 'trivial' | 'simple' | 'moderate' | 'complex';

export interface ClassifiedIntent {
  id: string;
  type: IntentType;
  title: string;
  description: string;
  complexity: ComplexityLevel;
  estimatedTokens: number;
  estimatedCostUsd: number;
  suggestedRoles: string[];
  source: { platform: string; eventType: string; url?: string; author?: string };
  createdAt: number;
}

export interface WebhookPayload {
  event?: string;
  action?: string;
  issue?: { title?: string; body?: string; labels?: Array<{ name: string }>; html_url?: string; user?: { login?: string } };
  pull_request?: { title?: string; body?: string; html_url?: string; user?: { login?: string } };
  repository?: { full_name?: string };
  [key: string]: unknown;
}

const TYPE_PATTERNS: Array<{ type: IntentType; patterns: RegExp[] }> = [
  { type: 'bug', patterns: [/bug|error|crash|fix|broken|不工作|报错|崩溃/i] },
  { type: 'security', patterns: [/security|vulnerability|CVE|exploit|安全|漏洞/i] },
  { type: 'feature', patterns: [/feature|enhancement|add|implement|new|功能|新增|实现/i] },
  { type: 'refactor', patterns: [/refactor|cleanup|improve|optimize|重构|优化/i] },
  { type: 'docs', patterns: [/doc|readme|documentation|文档/i] },
];

const COMPLEXITY_HEURISTICS: Array<{ level: ComplexityLevel; condition: (text: string) => boolean }> = [
  { level: 'complex', condition: (t) => t.length > 1000 || /multiple|across|architect|设计|跨模块/i.test(t) },
  { level: 'moderate', condition: (t) => t.length > 300 || /test|api|database|接口/i.test(t) },
  { level: 'simple', condition: (t) => t.length > 80 },
  { level: 'trivial', condition: () => true },
];

const ROLE_MAP: Record<IntentType, string[]> = {
  bug: ['backend', 'qa'],
  feature: ['architect', 'backend', 'frontend'],
  refactor: ['architect', 'backend'],
  security: ['security', 'backend'],
  docs: ['backend'],
  unknown: ['backend'],
};

const TOKEN_ESTIMATES: Record<ComplexityLevel, number> = {
  trivial: 5000,
  simple: 15000,
  moderate: 50000,
  complex: 100000,
};

const COST_PER_1K = 0.003; // avg blended cost

export function classifyWebhookPayload(payload: WebhookPayload, platform: string = 'github'): ClassifiedIntent {
  const title = payload.issue?.title ?? payload.pull_request?.title ?? 'Untitled';
  const body = payload.issue?.body ?? payload.pull_request?.body ?? '';
  const fullText = `${title} ${body}`;
  const labels = (payload.issue?.labels ?? []).map(l => l.name).join(' ');
  const combined = `${fullText} ${labels}`;

  // Classify type
  let intentType: IntentType = 'unknown';
  for (const { type, patterns } of TYPE_PATTERNS) {
    if (patterns.some(p => p.test(combined))) { intentType = type; break; }
  }

  // Estimate complexity
  let complexity: ComplexityLevel = 'trivial';
  for (const { level, condition } of COMPLEXITY_HEURISTICS) {
    if (condition(fullText)) { complexity = level; break; }
  }

  const estimatedTokens = TOKEN_ESTIMATES[complexity];
  const estimatedCostUsd = Number((estimatedTokens / 1000 * COST_PER_1K).toFixed(3));

  const result: ClassifiedIntent = {
    id: randomUUID(),
    type: intentType,
    title,
    description: body.slice(0, 500),
    complexity,
    estimatedTokens,
    estimatedCostUsd,
    suggestedRoles: ROLE_MAP[intentType],
    source: {
      platform,
      eventType: payload.event ?? payload.action ?? 'unknown',
      url: payload.issue?.html_url ?? payload.pull_request?.html_url,
      author: payload.issue?.user?.login ?? payload.pull_request?.user?.login,
    },
    createdAt: Date.now(),
  };

  logger.info({ id: result.id, type: intentType, complexity, title: title.slice(0, 60) }, 'webhook intent classified');
  return result;
}

/**
 * Build a Goal creation payload from a classified intent.
 */
export function intentToGoalPayload(intent: ClassifiedIntent): {
  objective: string;
  scopeBoundary: string;
  doneWhen: string[];
  stopIf: string[];
  tokenBudgetK: number;
  turnBudget: number;
} {
  const typeLabel = { bug: 'Fix', feature: 'Implement', refactor: 'Refactor', security: 'Patch', docs: 'Document', unknown: 'Handle' }[intent.type];

  return {
    objective: `[${intent.type.toUpperCase()}] ${typeLabel}: ${intent.title}`,
    scopeBoundary: `Only modify files related to: ${intent.title}. Source: ${intent.source.url ?? 'webhook'}`,
    doneWhen: [
      intent.type === 'bug' ? 'Bug is fixed and tests pass' : `${typeLabel} is complete`,
      'No new lint errors introduced',
      'Changes are minimal and focused',
    ],
    stopIf: [
      'Scope creep detected (touching unrelated files)',
      'Security risk identified',
      `Token budget exceeded (${intent.estimatedTokens / 1000}K)`,
    ],
    tokenBudgetK: Math.ceil(intent.estimatedTokens / 1000),
    turnBudget: intent.complexity === 'complex' ? 12 : intent.complexity === 'moderate' ? 8 : 5,
  };
}
