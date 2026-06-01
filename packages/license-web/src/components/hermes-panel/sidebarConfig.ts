export interface SidebarChild {
  title: string;
  path: string;
}

export interface SidebarSection {
  title: string;
  icon: string;
  path?: string;
  children?: SidebarChild[];
}

export const sidebarSections: SidebarSection[] = [
  {
    title: '产品首页',
    path: '/hermes-panel',
    icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
  },
  {
    title: '快速开始',
    icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
    children: [
      { title: '产品简介', path: '/hermes-panel/docs/intro' },
      { title: '安装部署', path: '/hermes-panel/docs/installation' },
      { title: '三分钟上手', path: '/hermes-panel/docs/quick-start' },
      { title: '版本对比', path: '/hermes-panel/docs/editions' },
    ],
  },
  {
    title: '使用手册',
    icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>',
    children: [
      { title: '对话系统 (Chat)', path: '/hermes-panel/docs/chat' },
      { title: '会话管理', path: '/hermes-panel/docs/sessions' },
      { title: '仪表盘 & 统计', path: '/hermes-panel/docs/dashboard' },
      { title: '用量账本', path: '/hermes-panel/docs/usage-ledger' },
      { title: '系统健康监控', path: '/hermes-panel/docs/health' },
      { title: '通知中心', path: '/hermes-panel/docs/notifications' },
      { title: '用户管理', path: '/hermes-panel/docs/user-management' },
      { title: '工作区', path: '/hermes-panel/docs/workspaces' },
      { title: '定时任务 (Cron)', path: '/hermes-panel/docs/cron' },
      { title: 'MCP 工具集成', path: '/hermes-panel/docs/mcp-tools' },
      { title: '技能 (Skills)', path: '/hermes-panel/docs/skills' },
      { title: '插件系统', path: '/hermes-panel/docs/plugins' },
      { title: '记忆管理', path: '/hermes-panel/docs/memory' },
      { title: '文件管理', path: '/hermes-panel/docs/files' },
      { title: 'Draft 跨端桥接', path: '/hermes-panel/docs/draft' },
    ],
  },
  {
    title: '进阶配置',
    icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
    children: [
      { title: '模型供应商', path: '/hermes-panel/docs/model-providers' },
      { title: '备份管理', path: '/hermes-panel/docs/backup' },
      { title: '密钥管理', path: '/hermes-panel/docs/secrets' },
      { title: '诊断工具 (Doctor)', path: '/hermes-panel/docs/doctor' },
      { title: '日志查看', path: '/hermes-panel/docs/logs' },
      { title: '沙箱隔离', path: '/hermes-panel/docs/sandbox' },
      { title: '网关配置', path: '/hermes-panel/docs/gateway' },
      { title: 'Webhook', path: '/hermes-panel/docs/webhook' },
      { title: '偏好设置', path: '/hermes-panel/docs/preferences' },
    ],
  },
  {
    title: '开发者',
    icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>',
    children: [
      { title: 'API Playground', path: '/hermes-panel/docs/api-playground' },
      { title: 'VS Code 扩展', path: '/hermes-panel/docs/vscode-extension' },
      { title: 'Hermes 端点配置', path: '/hermes-panel/docs/hermes-endpoints' },
      { title: '功能探测', path: '/hermes-panel/docs/capabilities' },
    ],
  },
  {
    title: 'FAQ',
    path: '/hermes-panel/docs/faq',
    icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  },
];
