export type ComposerTaskAction =
  | 'model'
  | 'tools'
  | 'memory'
  | 'cost'
  | 'goal'
  | 'cron'
  | 'room'
  | 'sandbox'
  | 'lessons'
  | 'audit'
  | 'proactive'
  | 'intent';

export type ComposerTaskActionGroup = 'setup' | 'workflow' | 'context' | 'review';

export type ComposerTaskActionBehavior = 'inline' | 'route' | 'pending';

export interface ComposerTaskActionConfig {
  key: ComposerTaskAction;
  group: ComposerTaskActionGroup;
  behavior: ComposerTaskActionBehavior;
  icon: string;
  score: number;
  keywords: RegExp;
}

export const composerTaskActionGroups: ComposerTaskActionGroup[] = ['setup', 'workflow', 'context', 'review'];

export const composerTaskActions: ComposerTaskActionConfig[] = [
  {
    key: 'model',
    group: 'setup',
    behavior: 'route',
    icon: 'M12 3v18M3 8h18M5 16h14M7 3l-2 5 2 5m10-10 2 5-2 5',
    score: 100,
    keywords: /(免费|本地|模型|渠道|provider|openrouter|ollama|deepseek|api\s*key|apikey|余额|free|local|model|provider|credential)/i,
  },
  {
    key: 'tools',
    group: 'setup',
    behavior: 'inline',
    icon: 'M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5L15 12l-3-3 2.7-2.7Z',
    score: 96,
    keywords: /(工具|mcp|技能|插件|搜索|读取|文件|仓库|文档|tool|skill|plugin|file|repo|docs|search|scan|read)/i,
  },
  {
    key: 'cost',
    group: 'setup',
    behavior: 'inline',
    icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    score: 90,
    keywords: /(成本|费用|token|省钱|预算|便宜|余额|cost|spend|token|budget|cheap|quota)/i,
  },
  {
    key: 'goal',
    group: 'workflow',
    behavior: 'pending',
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
    score: 84,
    keywords: /(长期|持续|分阶段|里程碑|目标|计划|优化|重构|完善|追踪|long[-\s]?running|roadmap|milestone|plan|refactor|optimi[sz]e|improve)/i,
  },
  {
    key: 'cron',
    group: 'workflow',
    behavior: 'pending',
    icon: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2',
    score: 92,
    keywords: /(每天|每周|每月|定时|周期|重复|提醒|监控|daily|weekly|monthly|schedule|recurring|every\s+(day|week|month))/i,
  },
  {
    key: 'room',
    group: 'workflow',
    behavior: 'pending',
    icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a4 4 0 0 0-3-3.87',
    score: 76,
    keywords: /(前端|后端|架构|产品|设计|评审|审查|角色|团队|协作|frontend|backend|architect|product|design|review|team|roles?)/i,
  },
  {
    key: 'sandbox',
    group: 'workflow',
    behavior: 'inline',
    icon: 'M4 4h16v16H4V4Zm4 5 3 3-3 3m5 0h4',
    score: 82,
    keywords: /(沙箱|隔离|危险|删除|安装|命令|终端|高风险|sandbox|isolate|risky|delete|install|command|terminal|shell)/i,
  },
  {
    key: 'memory',
    group: 'context',
    behavior: 'inline',
    icon: 'M12 3a3 3 0 0 0-3 3v12a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM6 8a3 3 0 0 0 0 6m12-6a3 3 0 0 1 0 6M9 18H7a3 3 0 0 1-3-3v-1m11 4h2a3 3 0 0 0 3-3v-1',
    score: 88,
    keywords: /(记忆|上下文|偏好|历史|知识|memory|context|preference|history|knowledge)/i,
  },
  {
    key: 'lessons',
    group: 'context',
    behavior: 'inline',
    icon: 'M12 3a3 3 0 0 0-3 3v12a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z',
    score: 74,
    keywords: /(经验|规则|复盘|避免重复|lesson|rule|retrospective|repeat mistake)/i,
  },
  {
    key: 'audit',
    group: 'review',
    behavior: 'inline',
    icon: 'M9 12l2 2 4-4M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
    score: 72,
    keywords: /(审计|安全|记录|失败|拒绝|风险|audit|security|log|failed|denied|risk)/i,
  },
  {
    key: 'proactive',
    group: 'review',
    behavior: 'inline',
    icon: 'M13 2 3 14h9l-1 8 10-12h-9l1-8Z',
    score: 70,
    keywords: /(预见|主动|待办|隐患|扫描|发现|proactive|todo|risk|scan|discover|detect)/i,
  },
  {
    key: 'intent',
    group: 'review',
    behavior: 'inline',
    icon: 'M4 4h16v16H4V4Zm4 4h8m-8 4h8m-8 4h5',
    score: 66,
    keywords: /(意图|路由|怎么用|不知道|选择|工作流|intent|route|workflow|which feature|how to use)/i,
  },
];

export const inlineComposerTaskActions = new Set<ComposerTaskAction>(
  composerTaskActions.filter(action => action.behavior === 'inline').map(action => action.key),
);

export function isInlineComposerTaskAction(action: ComposerTaskAction): boolean {
  return inlineComposerTaskActions.has(action);
}
