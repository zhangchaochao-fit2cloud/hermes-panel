/**
 * Pre-defined workflow chains per workspace.
 *
 * When a role completes, the system suggests the next role in the chain.
 * Users can click to continue, or the chain auto-advances.
 */

export interface WorkflowStep {
  role: string;         // Role ID
  trigger: string;      // Prompt template for the next step
  description: string;  // Human-readable description
}

export interface WorkflowChain {
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export const WORKFLOWS: Record<string, WorkflowChain> = {
  /** Dev Squad: standard software development lifecycle */
  'dev-squad': {
    name: '标准开发流程',
    description: '架构设计 → 安全审查 → 并行开发(后端+前端) → 测试 → 审查',
    steps: [
      { role: 'architect', trigger: '请设计以下需求的系统架构，给出完整的设计方案。需求：\n\n{{input}}', description: '架构设计' },
      { role: 'security', trigger: '请审查以下架构设计的安全性，按 OWASP Top 10 逐项检查。架构方案：\n\n{{output}}', description: '安全审查' },
      { role: 'backend', trigger: '请根据架构设计实现后端 API。架构方案：\n\n{{output}}', description: '后端实现' },
      { role: 'frontend', trigger: '请根据架构设计和后端 API 实现前端界面。\n\n架构：{{output}}', description: '前端实现' },
      { role: 'qa', trigger: '请为以下实现编写测试用例和测试代码。注意边界值、异常路径、并发场景。\n\n实现：{{output}}', description: '编写测试' },
      { role: 'reviewer', trigger: '请审查以上所有代码，给出综合评审意见。\n\n代码：{{output}}', description: '代码审查' },
    ],
  },

  /** Content Studio: content creation pipeline */
  'content-studio': {
    name: '内容创作流程',
    description: '导演定调 → 编剧脚本 → 分镜 → 配音 → 配乐 → 剪辑',
    steps: [
      { role: 'director', trigger: '请为以下内容项目定调，给出创意方向和风格参考。需求：\n\n{{input}}', description: '创意定调' },
      { role: 'scriptwriter', trigger: '请根据导演的创意方向撰写脚本。\n\n创意方向：{{output}}', description: '撰写脚本' },
      { role: 'storyboard', trigger: '请根据脚本绘制分镜。\n\n脚本：{{output}}', description: '分镜绘制' },
      { role: 'voiceover', trigger: '请为分镜编写配音指导。\n\n分镜：{{output}}', description: '配音指导' },
      { role: 'music', trigger: '请为以上内容推荐配乐方案。\n\n内容：{{output}}', description: '配乐推荐' },
      { role: 'editor', trigger: '请给出完整的剪辑指令。\n\n素材：{{output}}', description: '剪辑输出' },
    ],
  },

  /** Writing Studio: writing pipeline */
  'writing-studio': {
    name: '写作流程',
    description: '头脑风暴 → 资料调研 → 主笔初稿 → 编辑打磨 → 校对',
    steps: [
      { role: 'brainstormer', trigger: '请为主题生成 10 个选题角度并评估。主题：\n\n{{input}}', description: '选题头脑风暴' },
      { role: 'researcher', trigger: '请为选定角度收集素材和证据。角度：\n\n{{output}}', description: '资料调研' },
      { role: 'writer', trigger: '请根据调研素材撰写初稿。\n\n素材：{{output}}', description: '撰写初稿' },
      { role: 'editor', trigger: '请编辑润色这篇初稿，精简 20% 冗余。\n\n初稿：{{output}}', description: '编辑润色' },
      { role: 'proofreader', trigger: '请校对这篇稿件，检查错别字和语法。\n\n稿件：{{output}}', description: '最终校对' },
    ],
  },

  /** Research Lab: research pipeline */
  'research-lab': {
    name: '研究流程',
    description: '文献调研 → 数据科学 → 实验设计 → 论证审查 → 学术写作',
    steps: [
      { role: 'librarian', trigger: '请对以下研究课题进行文献调研。课题：\n\n{{input}}', description: '文献调研' },
      { role: 'datascientist', trigger: '请分析相关数据。文献综述：\n\n{{output}}', description: '数据分析' },
      { role: 'experiment', trigger: '请设计实验方案。\n\n数据背景：{{output}}', description: '实验设计' },
      { role: 'critic', trigger: '请审查以上研究的逻辑和方法论。\n\n方案：{{output}}', description: '方法审查' },
      { role: 'academicwriter', trigger: '请根据以上研究撰写学术论文。\n\n材料：{{output}}', description: '论文撰写' },
    ],
  },

  /** Business Suite: business analysis pipeline */
  'business-suite': {
    name: '商业分析流程',
    description: '策略分析 → 市场调研 → 财务建模',
    steps: [
      { role: 'strategist', trigger: '请用 SWOT/PEST 框架分析以下商业场景。需求：\n\n{{input}}', description: '策略分析' },
      { role: 'marketanalyst', trigger: '请基于策略分析进行市场调研。\n\n策略：{{output}}', description: '市场调研' },
      { role: 'financial', trigger: '请根据市场分析建立财务模型。\n\n市场数据：{{output}}', description: '财务建模' },
    ],
  },

  /** Data Lab: data pipeline */
  'data-lab': {
    name: '数据流程',
    description: '数据管道 → 数据分析 → ML 建模',
    steps: [
      { role: 'dataengineer', trigger: '请设计数据处理管道。需求：\n\n{{input}}', description: '数据管道' },
      { role: 'analyst', trigger: '请分析处理后的数据。\n\n管道输出：{{output}}', description: '数据分析' },
      { role: 'mle', trigger: '请根据分析结果开发 ML 模型。\n\n数据洞察：{{output}}', description: 'ML 建模' },
    ],
  },

  /** Design Studio: design pipeline */
  'design-studio': {
    name: '设计流程',
    description: 'UX 设计 → UI 设计 → 品牌设计',
    steps: [
      { role: 'uxdesigner', trigger: '请进行用户研究和交互设计。需求：\n\n{{input}}', description: 'UX 设计' },
      { role: 'uidesigner', trigger: '请根据 UX 设计出 UI 设计规范。\n\nUX 设计：{{output}}', description: 'UI 设计' },
      { role: 'branddesigner', trigger: '请定义品牌视觉系统。\n\n设计规范：{{output}}', description: '品牌设计' },
    ],
  },
};

/** Get the workflow chain for a workspace, or null if not defined. */
export function getWorkflow(workspaceId: string): WorkflowChain | null {
  return WORKFLOWS[workspaceId] ?? null;
}

/** Get suggested next roles based on the current role and workspace. */
export function getNextSteps(workspaceId: string, currentRoleId: string): WorkflowStep[] {
  const wf = WORKFLOWS[workspaceId];
  if (!wf) return [];
  const idx = wf.steps.findIndex(s => s.role === currentRoleId);
  if (idx < 0 || idx >= wf.steps.length - 1) return [];
  return [wf.steps[idx + 1]];
}
