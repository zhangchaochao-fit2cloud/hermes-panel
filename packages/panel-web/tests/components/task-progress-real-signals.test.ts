import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import zhCN from '@/locales/zh-CN';
import enUS from '@/locales/en-US';

const taskPanelPath = join(process.cwd(), 'src/components/chat/TaskProgressPanel.vue');

describe('task progress panel real signals', () => {
  it('does not present inferred phases or queues as real backend tasks', () => {
    const source = readFileSync(taskPanelPath, 'utf8');

    expect(source).toContain('hasExplicitAgentMetadata');
    expect(source).not.toContain("step('scope'");
    expect(source).not.toContain("step('explore'");
    expect(source).not.toContain("step('implement'");
    expect(source).not.toContain("step('verify'");
    expect(source).not.toContain("step('summarize'");
    expect(zhCN.chat.taskPanel.tasks.title).toBe('工具事件');
    expect(enUS.chat.taskPanel.tasks.title).toBe('Tool events');
  });

  it('only treats explicit agent signals as subagents', () => {
    const source = readFileSync(taskPanelPath, 'utf8');

    expect(source).toContain('agent_id');
    expect(source).toContain('subagent_id');
    expect(source).toContain('worker_id');
    expect(source).toContain('agent\\.run');
    expect(source).not.toContain('agent|subagent|worker|explorer|spawn_agent|multi_agent');
    expect(zhCN.chat.taskPanel.subAgents.empty).toBe('当前没有真实子智能体事件');
    expect(enUS.chat.taskPanel.subAgents.empty).toBe('No real subagent events yet');
  });
});
