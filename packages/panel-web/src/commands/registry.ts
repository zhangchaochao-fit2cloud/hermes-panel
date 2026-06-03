export type CommandIconKey =
  | 'dashboard'
  | 'chat'
  | 'sessions'
  | 'tools'
  | 'settings'
  | 'new'
  | 'refresh'
  | 'sun'
  | 'moon'
  | 'auto'
  | 'language'
  | 'workspaces'
  | 'cron'
  | 'memory'
  | 'cost'
  | 'goals'
  | 'lessons'
  | 'sandbox'
  | 'audit'
  | 'proactive'
  | 'intent'
  | 'channels'
  | 'chatRoom'
  | 'developer';

export type CommandAction =
  | { type: 'route'; to: string }
  | { type: 'reload' }
  | { type: 'theme'; mode: 'light' | 'dark' | 'auto' }
  | { type: 'locale'; locale: 'zh-CN' | 'en-US' };

export interface CommandDefinition {
  id: string;
  groupKey: string;
  icon: CommandIconKey;
  labelKey: string;
  hint?: string;
  action: CommandAction;
}

export interface RecentSessionCommandInput {
  id: string;
  title: string;
  updatedAtHint: string;
}

export interface RecentSessionCommandDefinition {
  id: string;
  groupKey: string;
  icon: CommandIconKey;
  label: string;
  hint: string;
  action: CommandAction;
}

export const PANEL_COMMANDS = [
  {
    id: 'nav-dashboard',
    groupKey: 'controlCenter.group.nav',
    icon: 'dashboard',
    labelKey: 'nav.dashboard',
    hint: '/dashboard',
    action: { type: 'route', to: '/dashboard' },
  },
  {
    id: 'nav-chat',
    groupKey: 'controlCenter.group.nav',
    icon: 'chat',
    labelKey: 'nav.chat',
    hint: '/chat',
    action: { type: 'route', to: '/chat' },
  },
  {
    id: 'nav-sessions',
    groupKey: 'controlCenter.group.nav',
    icon: 'sessions',
    labelKey: 'nav.sessions',
    hint: '/sessions',
    action: { type: 'route', to: '/sessions' },
  },
  {
    id: 'nav-tools',
    groupKey: 'controlCenter.group.nav',
    icon: 'tools',
    labelKey: 'nav.tools',
    hint: '/tools',
    action: { type: 'route', to: '/tools' },
  },
  { id: 'nav-workspaces', groupKey: 'controlCenter.group.nav', icon: 'workspaces', labelKey: 'nav.workspaces', hint: '/workspaces', action: { type: 'route', to: '/workspaces' } },
  { id: 'nav-cron', groupKey: 'controlCenter.group.nav', icon: 'cron', labelKey: 'nav.cron', hint: '/cron', action: { type: 'route', to: '/cron' } },
  { id: 'nav-memory', groupKey: 'controlCenter.group.nav', icon: 'memory', labelKey: 'nav.memory', hint: '/memory', action: { type: 'route', to: '/memory' } },
  { id: 'nav-cost', groupKey: 'controlCenter.group.nav', icon: 'cost', labelKey: 'nav.cost', hint: '/cost', action: { type: 'route', to: '/cost' } },
  { id: 'nav-goals', groupKey: 'controlCenter.group.nav', icon: 'goals', labelKey: 'nav.goals', hint: '/goals', action: { type: 'route', to: '/goals' } },
  { id: 'nav-lessons', groupKey: 'controlCenter.group.nav', icon: 'lessons', labelKey: 'nav.lessons', hint: '/lessons', action: { type: 'route', to: '/lessons' } },
  { id: 'nav-sandbox', groupKey: 'controlCenter.group.nav', icon: 'sandbox', labelKey: 'nav.sandbox', hint: '/sandbox', action: { type: 'route', to: '/sandbox' } },
  { id: 'nav-audit', groupKey: 'controlCenter.group.nav', icon: 'audit', labelKey: 'nav.audit', hint: '/audit', action: { type: 'route', to: '/audit' } },
  { id: 'nav-proactive', groupKey: 'controlCenter.group.nav', icon: 'proactive', labelKey: 'nav.proactive', hint: '/proactive', action: { type: 'route', to: '/proactive' } },
  { id: 'nav-intent', groupKey: 'controlCenter.group.nav', icon: 'intent', labelKey: 'nav.intent', hint: '/intent', action: { type: 'route', to: '/intent' } },
  { id: 'nav-channels', groupKey: 'controlCenter.group.nav', icon: 'channels', labelKey: 'nav.channels', hint: '/channels', action: { type: 'route', to: '/channels' } },
  { id: 'nav-chat-room', groupKey: 'controlCenter.group.nav', icon: 'chatRoom', labelKey: 'nav.chatRoom', hint: '/chat-room', action: { type: 'route', to: '/chat-room' } },
  { id: 'nav-developer', groupKey: 'controlCenter.group.nav', icon: 'developer', labelKey: 'nav.developer', hint: '/developer', action: { type: 'route', to: '/developer' } },
  {
    id: 'nav-settings',
    groupKey: 'controlCenter.group.nav',
    icon: 'settings',
    labelKey: 'nav.settings',
    hint: '/settings',
    action: { type: 'route', to: '/settings' },
  },
  {
    id: 'new-chat',
    groupKey: 'controlCenter.group.action',
    icon: 'new',
    labelKey: 'controlCenter.action.newChat',
    hint: '⌘N',
    action: { type: 'route', to: '/chat' },
  },
  {
    id: 'refresh',
    groupKey: 'controlCenter.group.action',
    icon: 'refresh',
    labelKey: 'controlCenter.action.refresh',
    hint: '⌘R',
    action: { type: 'reload' },
  },
  {
    id: 'theme-light',
    groupKey: 'controlCenter.group.theme',
    icon: 'sun',
    labelKey: 'controlCenter.action.themeLight',
    action: { type: 'theme', mode: 'light' },
  },
  {
    id: 'theme-dark',
    groupKey: 'controlCenter.group.theme',
    icon: 'moon',
    labelKey: 'controlCenter.action.themeDark',
    action: { type: 'theme', mode: 'dark' },
  },
  {
    id: 'theme-auto',
    groupKey: 'controlCenter.group.theme',
    icon: 'auto',
    labelKey: 'controlCenter.action.themeAuto',
    action: { type: 'theme', mode: 'auto' },
  },
  {
    id: 'locale-zh',
    groupKey: 'controlCenter.group.locale',
    icon: 'language',
    labelKey: 'controlCenter.locale.zh',
    action: { type: 'locale', locale: 'zh-CN' },
  },
  {
    id: 'locale-en',
    groupKey: 'controlCenter.group.locale',
    icon: 'language',
    labelKey: 'controlCenter.locale.en',
    action: { type: 'locale', locale: 'en-US' },
  },
] as const satisfies readonly CommandDefinition[];

export function createRecentSessionCommand(
  session: RecentSessionCommandInput,
): RecentSessionCommandDefinition {
  return {
    id: `sess-${session.id}`,
    groupKey: 'controlCenter.group.recent',
    icon: 'chat',
    label: session.title,
    hint: session.updatedAtHint,
    action: { type: 'route', to: `/chat?resume=${encodeURIComponent(session.id)}` },
  };
}
