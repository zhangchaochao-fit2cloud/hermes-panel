/**
 * 12 built-in workspace templates (spec §15).
 *
 * A "workspace" is a panel-only concept that bundles a curated set of tools,
 * skills and role prompts for a particular scenario. It is NOT the same as a
 * hermes profile (which isolates data/config/auth). v0.1 keeps these two
 * orthogonal — activating a workspace only writes a UI preference to
 * localStorage; profile switching is a separate, real action.
 */

export interface RoleDef {
  /** Short id used in @-mentions (no spaces). */
  id: string;
  /** Display name (zh-CN). */
  name: string;
  icon: string;
  /** One-line job description shown under the name. */
  description: string;
  /** System prompt prefix that gets prepended when @-summoned. */
  promptPrefix: string;
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  icon: string;
  /** Hex color for the card accent / left ribbon. */
  color: string;
  description: string;
  roles: number;
  suggestedTools: string[];
  suggestedSkills: string[];
  /** Concrete role definitions (matches `roles` count). */
  team?: RoleDef[];
}

export const BUILT_IN_WORKSPACES: readonly WorkspaceTemplate[] = [
  {
    id: 'dev-squad',
    name: '开发团队',
    icon: '💻',
    color: '#6366f1',
    description: '全栈项目开发',
    roles: 7,
    suggestedTools: ['terminal', 'file', 'code_execution', 'web', 'browser'],
    suggestedSkills: ['claude-code', 'hermes-agent', 'kubernetes-watch-debugging'],
  },
  {
    id: 'collab-hub',
    name: '协作中心',
    icon: '🤝',
    color: '#52c41a',
    description: '团队沟通、会议、规划',
    roles: 5,
    suggestedTools: ['web', 'file', 'memory'],
    suggestedSkills: ['apple-notes', 'apple-reminders'],
  },
  {
    id: 'content-studio',
    name: '内容创作工作室',
    icon: '🎬',
    color: '#eb2f96',
    description: '视频、播客、自媒体内容',
    roles: 6,
    suggestedTools: ['image_gen', 'vision', 'tts', 'file'],
    suggestedSkills: ['p5js', 'manim-video', 'songwriting-and-ai-music'],
  },
  {
    id: 'research-lab',
    name: '研究实验室',
    icon: '🔬',
    color: '#13c2c2',
    description: '学术研究、深度调研',
    roles: 5,
    suggestedTools: ['web', 'browser', 'file', 'memory'],
    suggestedSkills: ['ideation'],
  },
  {
    id: 'writing-studio',
    name: '写作工坊',
    icon: '✍️',
    color: '#722ed1',
    description: '文章、小说、技术写作',
    roles: 5,
    suggestedTools: ['web', 'file', 'memory'],
    suggestedSkills: ['ideation'],
  },
  {
    id: 'design-studio',
    name: '设计工作室',
    icon: '🎨',
    color: '#fa541c',
    description: 'UI/UX/视觉设计',
    roles: 5,
    suggestedTools: ['image_gen', 'vision', 'browser'],
    suggestedSkills: ['excalidraw', 'popular-web-designs'],
  },
  {
    id: 'education-hub',
    name: '教育中心',
    icon: '🎓',
    color: '#1677ff',
    description: '教学、学习、出题',
    roles: 4,
    suggestedTools: ['web', 'file', 'memory'],
    suggestedSkills: ['ideation'],
  },
  {
    id: 'business-suite',
    name: '商业套件',
    icon: '💼',
    color: '#0960bd',
    description: '创业、商业分析、市场',
    roles: 6,
    suggestedTools: ['web', 'file', 'memory'],
    suggestedSkills: [],
  },
  {
    id: 'life-assistant',
    name: '生活管家',
    icon: '🏠',
    color: '#11a8cd',
    description: '日程、购物、健康',
    roles: 5,
    suggestedTools: ['memory', 'web'],
    suggestedSkills: ['apple-reminders', 'findmy'],
  },
  {
    id: 'data-lab',
    name: '数据实验室',
    icon: '📊',
    color: '#8c8c8c',
    description: '数据分析、可视化',
    roles: 4,
    suggestedTools: ['code_execution', 'file', 'terminal'],
    suggestedSkills: ['jupyter-live-kernel'],
  },
  {
    id: 'legal-desk',
    name: '法律工作台',
    icon: '⚖️',
    color: '#f5222d',
    description: '合同审查、法规解读',
    roles: 4,
    suggestedTools: ['file', 'web', 'memory'],
    suggestedSkills: [],
  },
  {
    id: 'customer-success',
    name: '客服中心',
    icon: '📞',
    color: '#52c41a',
    description: '客户支持、工单处理',
    roles: 4,
    suggestedTools: ['memory', 'web'],
    suggestedSkills: [],
  },
] as const;

/** Lookup helper. */
export function findWorkspace(id: string): WorkspaceTemplate | undefined {
  return BUILT_IN_WORKSPACES.find(w => w.id === id);
}
