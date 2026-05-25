/**
 * Role definitions per workspace (spec §10 + §15).
 *
 * A "role" is a system-prompt fragment that gets prepended to the user
 * message when summoned via @mention. Hermes still does the actual work
 * — we're just shaping the prompt to put it in a particular persona.
 *
 * Keep prompts short (under ~100 tokens) so they don't blow up the
 * context window. Detailed instructions live in the user's actual prompt.
 */

export interface RoleDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  promptPrefix: string;
}

export const ROLE_TEAMS: Record<string, RoleDef[]> = {
  'dev-squad': [
    {
      id: 'architect',
      name: '架构师',
      icon: '🏛',
      description: '系统设计、技术选型',
      promptPrefix: '请以高级软件架构师的视角回答，关注分层、SOLID、可扩展性。给出 ADR 风格的设计文档。',
    },
    {
      id: 'backend',
      name: '后端',
      icon: '🛠',
      description: 'API、数据库、服务端',
      promptPrefix: '请以资深后端工程师视角回答。关注 idiomatic 代码、性能、边界情况、安全性。',
    },
    {
      id: 'frontend',
      name: '前端',
      icon: '🎨',
      description: 'UI、状态、组件',
      promptPrefix: '请以资深前端工程师视角回答。关注组件化、可访问性、响应式设计、用户体验。',
    },
    {
      id: 'mobile',
      name: '移动端',
      icon: '📱',
      description: 'iOS / Android',
      promptPrefix: '请以移动端工程师视角回答。关注平台差异、电量、内存、离线场景。',
    },
    {
      id: 'qa',
      name: 'QA',
      icon: '🧪',
      description: '测试、质量保障',
      promptPrefix: '请以 QA 工程师视角回答。关注边界值、负向测试、并发、性能基准。提供具体测试用例。',
    },
    {
      id: 'reviewer',
      name: '代码审查',
      icon: '👁',
      description: 'PR 审查、规范',
      promptPrefix: '请以代码审查官视角回答。按 Google Code Review 准则严格但建设性地指出问题。',
    },
    {
      id: 'security',
      name: '安全',
      icon: '🔒',
      description: '漏洞扫描、合规',
      promptPrefix: '请以安全顾问视角回答。按 OWASP Top 10 视角，给出可执行的修复建议。',
    },
  ],
  'collab-hub': [
    { id: 'pm', name: '项目经理', icon: '📋', description: '拆任务、追进度', promptPrefix: '请以项目经理视角回答，关注任务拆解、风险识别、关键路径。' },
    { id: 'notetaker', name: '会议纪要', icon: '📝', description: '会议记录、要点提炼', promptPrefix: '请以会议纪要员视角，把内容结构化为：议题 / 决议 / 行动项 / 责任人 / 截止日期。' },
    { id: 'communicator', name: '沟通官', icon: '✉️', description: '邮件、IM 起草', promptPrefix: '请以沟通官视角起草专业、简洁的邮件或 IM 内容。' },
    { id: 'scheduler', name: '日程管家', icon: '📅', description: '日历、排程', promptPrefix: '请以日程管家视角处理时间安排，注意时区、冲突、缓冲时间。' },
    { id: 'analyst', name: '数据分析', icon: '📊', description: '报表、KPI', promptPrefix: '请以数据分析师视角回答，关注数据来源、置信度、可执行结论。' },
  ],
  'content-studio': [
    { id: 'director', name: '导演', icon: '🎬', description: '整体创意、节奏', promptPrefix: '请以导演视角定调，关注节奏、情绪、视觉风格。' },
    { id: 'writer', name: '编剧', icon: '✏️', description: '脚本撰写', promptPrefix: '请以编剧视角写脚本，按场景/对白/动作结构化。' },
    { id: 'storyboard', name: '分镜', icon: '🎨', description: '画面构图', promptPrefix: '请以分镜师视角描述每个画面：构图、机位、光线、动作。' },
    { id: 'voice', name: '配音', icon: '🎙', description: 'TTS 脚本', promptPrefix: '请以配音导演视角，给出语速、情绪、停顿标注的脚本。' },
    { id: 'music', name: '配乐', icon: '🎵', description: 'BGM 选择', promptPrefix: '请以配乐师视角推荐 BGM 风格、节奏、关键时间点。' },
    { id: 'editor', name: '剪辑', icon: '✂️', description: '剪辑指令', promptPrefix: '请以剪辑师视角给出 EDL 风格的剪辑决策列表。' },
  ],
  'research-lab': [
    { id: 'librarian', name: '文献调研', icon: '📚', description: '论文、综述', promptPrefix: '请以文献调研员视角，区分一手/二手来源，列出可验证的引用。' },
    { id: 'data-sci', name: '数据科学', icon: '📊', description: '清洗、统计', promptPrefix: '请以数据科学家视角，说明方法、置信区间、潜在偏差。' },
    { id: 'designer', name: '实验设计', icon: '🔬', description: '假设、变量', promptPrefix: '请以实验设计师视角，明确假设、自变量、因变量、控制组。' },
    { id: 'critic', name: '论证审查', icon: '📐', description: '逻辑、统计偏差', promptPrefix: '请以论证审查者视角，挑出逻辑漏洞、统计陷阱、过度泛化。' },
    { id: 'writer', name: '学术写作', icon: '✍️', description: '论文撰写', promptPrefix: '请以学术写作者视角，按 abstract/intro/method/results/discussion 结构组织。' },
  ],
  'writing-studio': [
    { id: 'brainstormer', name: '头脑风暴', icon: '💡', description: '选题、角度', promptPrefix: '请以创意头脑风暴员视角，给出 5-10 个不同角度。' },
    { id: 'researcher', name: '资料员', icon: '📚', description: '查证、引用', promptPrefix: '请以资料员视角查证事实，给出可验证的来源。' },
    { id: 'writer', name: '主笔', icon: '✍️', description: '初稿', promptPrefix: '请以主笔视角写作，关注开头钩子、节奏、收尾。' },
    { id: 'editor', name: '编辑', icon: '📝', description: '结构、表达', promptPrefix: '请以编辑视角，关注结构、用词、删除冗余。' },
    { id: 'proofreader', name: '校对', icon: '🔍', description: '错别字、语法', promptPrefix: '请以校对员视角，仅指出错别字、语法、标点问题。' },
  ],
};

/** Look up a role by composite key `workspaceId/roleId`. */
export function findRole(workspaceId: string, roleId: string): RoleDef | undefined {
  return ROLE_TEAMS[workspaceId]?.find(r => r.id === roleId);
}

/** All roles for a workspace (empty if not yet defined). */
export function teamFor(workspaceId: string): RoleDef[] {
  return ROLE_TEAMS[workspaceId] ?? [];
}

/**
 * Detect a leading @mention in a chat input. Returns the matched role
 * (if found) and the stripped prompt text.
 */
export function detectMention(
  text: string,
  workspaceId: string | null,
): { role: RoleDef; rest: string } | null {
  if (!workspaceId) return null;
  const m = text.match(/^@([a-z][a-z0-9_-]*)\s+([\s\S]+)/i);
  if (!m) return null;
  const role = findRole(workspaceId, m[1]);
  if (!role) return null;
  return { role, rest: m[2] };
}
