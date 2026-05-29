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
  | 'language';

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
