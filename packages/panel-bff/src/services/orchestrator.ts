/**
 * Autonomous Orchestrator — AI-driven multi-agent task decomposition & dispatch.
 *
 * Given a high-level requirement, the Orchestrator:
 * 1. Analyzes and decomposes into subtasks
 * 2. Assigns each subtask to the best-fit role
 * 3. Determines execution order (sequential / parallel)
 * 4. Auto-dispatches and collects results
 * 5. Evaluates completeness and suggests next steps
 */

import { randomUUID } from 'node:crypto';

interface SubTask {
  id: string;
  role: string;
  description: string;
  dependsOn: string[];
  status: 'pending' | 'running' | 'done' | 'failed';
  result?: string;
}

interface Plan {
  subtasks: SubTask[];
  reasoning: string;
}

/** Analyze a user request and generate a task plan */
export function generatePlan(request: string, availableRoles: string[]): Plan {
  const tasks: SubTask[] = [];

  // Detect requirement patterns and map to roles
  const needs = analyzeRequirements(request);

  if (needs.includes('architecture') && availableRoles.includes('architect')) {
    tasks.push({
      id: randomUUID(), role: 'architect',
      description: `设计系统架构方案：${request.slice(0, 200)}`,
      dependsOn: [], status: 'pending',
    });
  }

  if (needs.includes('security') && availableRoles.includes('security')) {
    const archTask = tasks.find(t => t.role === 'architect');
    tasks.push({
      id: randomUUID(), role: 'security',
      description: '审查安全性（依赖架构设计结果）',
      dependsOn: archTask ? [archTask.id] : [],
      status: 'pending',
    });
  }

  if (needs.includes('backend') && availableRoles.includes('backend')) {
    const archTask = tasks.find(t => t.role === 'architect');
    tasks.push({
      id: randomUUID(), role: 'backend',
      description: `实现后端 API：${request.slice(0, 200)}`,
      dependsOn: archTask ? [archTask.id] : [],
      status: 'pending',
    });
  }

  if (needs.includes('frontend') && availableRoles.includes('frontend')) {
    const archTask = tasks.find(t => t.role === 'architect');
    tasks.push({
      id: randomUUID(), role: 'frontend',
      description: `实现前端界面：${request.slice(0, 200)}`,
      dependsOn: archTask ? [archTask.id] : [],
      status: 'pending',
    });
  }

  if (needs.includes('testing') && availableRoles.includes('qa')) {
    const implTasks = tasks.filter(t => ['backend', 'frontend'].includes(t.role));
    tasks.push({
      id: randomUUID(), role: 'qa',
      description: '编写测试用例并执行测试',
      dependsOn: implTasks.map(t => t.id),
      status: 'pending',
    });
  }

  if (needs.includes('review') && availableRoles.includes('reviewer')) {
    const prevTasks = tasks.map(t => t.id);
    tasks.push({
      id: randomUUID(), role: 'reviewer',
      description: '代码审查所有变更',
      dependsOn: prevTasks,
      status: 'pending',
    });
  }

  if (needs.includes('design') && availableRoles.includes('uxdesigner')) {
    tasks.push({
      id: randomUUID(), role: 'uxdesigner',
      description: `设计用户体验方案：${request.slice(0, 200)}`,
      dependsOn: [], status: 'pending',
    });
  }

  if (needs.includes('content') && availableRoles.includes('writer')) {
    tasks.push({
      id: randomUUID(), role: 'writer',
      description: `撰写内容：${request.slice(0, 200)}`,
      dependsOn: [], status: 'pending',
    });
  }

  if (tasks.length === 0) {
    // Fallback: assign to first available role
    const role = availableRoles[0];
    if (role) {
      tasks.push({
        id: randomUUID(), role,
        description: `分析并处理：${request.slice(0, 200)}`,
        dependsOn: [], status: 'pending',
      });
    }
  }

  return {
    subtasks: tasks,
    reasoning: `检测到需求涉及：${needs.join('、')}，共规划 ${tasks.length} 个子任务`,
  };
}

/** Analyze a user request to determine what kind of work is needed */
function analyzeRequirements(request: string): string[] {
  const text = request.toLowerCase();
  const needs: string[] = [];

  // Code/development related
  if (/实现|开发|写|代码|api|接口|后端|服务端|server|backend|coding|implement/.test(text)) {
    needs.push('backend');
  }
  if (/前端|界面|ui|页面|组件|component|frontend|设计稿|样式|css|布局/.test(text)) {
    needs.push('frontend');
  }
  if (/架构|设计|选型|方案|重构|系统设计|architect/.test(text)) {
    needs.push('architecture');
  }
  if (/安全|漏洞|渗透|加密|认证|权限|security|auth|owasp/.test(text)) {
    needs.push('security');
  }
  if (/测试|test|qa|用例|覆盖|自动化测试/.test(text)) {
    needs.push('testing');
  }
  if (/审查|review|检查|代码质量|code review/.test(text)) {
    needs.push('review');
  }
  if (/部署|docker|ci|cd|devops|发布|上线|运维/.test(text)) {
    needs.push('devops');
  }

  // Content/writing related
  if (/文章|写作|博客|段落|作文|content|write|article|blog/.test(text)) {
    needs.push('content');
  }
  if (/视频|脚本|拍摄|剪辑|制作|video|script/.test(text)) {
    needs.push('content');
  }

  // Design related
  if (/设计|design|ux|原型|wireframe|mockup/.test(text)) {
    needs.push('design');
  }

  // Data related
  if (/数据|分析|报表|统计|etl|pipeline|ml|机器学习/.test(text)) {
    needs.push('backend');
    needs.push('testing');
  }

  // Research related
  if (/研究|调研|综述|论文|literature|research/.test(text)) {
    needs.push('content');
  }

  // Business related
  if (/商业|战略|市场|竞品|财务|估值|business|strategy|market/.test(text)) {
    needs.push('content');
  }

  return [...new Set(needs)];
}

/** Get next pending tasks that have all dependencies met */
export function getReadyTasks(plan: Plan): SubTask[] {
  const doneIds = new Set(plan.subtasks.filter(t => t.status === 'done').map(t => t.id));
  return plan.subtasks.filter(t =>
    t.status === 'pending' && t.dependsOn.every(d => doneIds.has(d)),
  );
}

/** Mark a task as done */
export function markTaskDone(plan: Plan, taskId: string, result: string): void {
  const task = plan.subtasks.find(t => t.id === taskId);
  if (task) { task.status = 'done'; task.result = result; }
}

/** Mark a task as failed */
export function markTaskFailed(plan: Plan, taskId: string, error: string): void {
  const task = plan.subtasks.find(t => t.id === taskId);
  if (task) { task.status = 'failed'; task.result = error; }
}

/** Check if the plan is fully complete */
export function isPlanComplete(plan: Plan): boolean {
  return plan.subtasks.every(t => t.status === 'done' || t.status === 'failed');
}

/** Format plan as readable text for display */
export function formatPlanSummary(plan: Plan): string {
  const lines = [plan.reasoning];
  for (const t of plan.subtasks) {
    const icon = t.status === 'done' ? '✅' : t.status === 'running' ? '⏳' : '📋';
    lines.push(`  ${icon} ${t.description} (${t.role})`);
  }
  return lines.join('\n');
}
