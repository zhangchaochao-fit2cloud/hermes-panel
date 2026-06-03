export type ChannelName = 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'matrix' | 'feishu' | 'wechat' | 'wecom';

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  atMention: boolean;
  emojiReaction: boolean;
  freeReply: boolean;
}

export interface DiscordConfig {
  enabled: boolean;
  botToken: string;
  autoThread: boolean;
  channelWhitelist: string[];
  channelBlacklist: string[];
}

export interface SlackConfig {
  enabled: boolean;
  botToken: string;
  mentionControl: boolean;
  handleBotMessages: boolean;
}

export interface WhatsAppConfig {
  enabled: boolean;
  mentionMode: 'always' | 'never' | 'at_mention';
}

export interface MatrixConfig {
  enabled: boolean;
  accessToken: string;
  homeserver: string;
  autoThread: boolean;
}

export interface FeishuConfig {
  enabled: boolean;
  appId: string;
  appSecret: string;
  mentionControl: boolean;
}

export interface WeChatConfig {
  enabled: boolean;
}

export interface WeComConfig {
  enabled: boolean;
  botId: string;
  botSecret: string;
}

export type ChannelConfig =
  | TelegramConfig
  | DiscordConfig
  | SlackConfig
  | WhatsAppConfig
  | MatrixConfig
  | FeishuConfig
  | WeChatConfig
  | WeComConfig;

export interface ChannelStatus {
  name: ChannelName;
  label: string;
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  lastActiveAt?: number;
}

export const CHANNEL_META: Record<ChannelName, { label: string; labelEn: string; icon: string; description: string }> = {
  telegram:    { label: 'Telegram',  labelEn: 'Telegram',  icon: '✈️', description: 'Bot Token 接入，支持 @提及控制、表情反应、自由回复' },
  discord:     { label: 'Discord',   labelEn: 'Discord',   icon: '🎮', description: 'Bot Token 接入，支持自动建线程、频道白名单/黑名单' },
  slack:       { label: 'Slack',     labelEn: 'Slack',     icon: '💬', description: 'Bot Token 接入，支持提及控制、Bot 消息处理' },
  whatsapp:    { label: 'WhatsApp',  labelEn: 'WhatsApp',  icon: '📱', description: '提及模式控制 (always/never/at_mention)' },
  matrix:      { label: 'Matrix',    labelEn: 'Matrix',    icon: '🔗', description: 'Access Token + Homeserver，支持自动线程' },
  feishu:      { label: '飞书',      labelEn: 'Feishu',    icon: '🐦', description: 'App ID/Secret 接入，支持提及控制' },
  wechat:      { label: '微信',      labelEn: 'WeChat',    icon: '💚', description: 'AppID+AppSecret 配置，Token/Key 自动生成，扫码绑定' },
  wecom:       { label: '企业微信',   labelEn: 'WeCom',     icon: '🏢', description: 'Bot ID/Secret 接入' },
};

export interface AllChannelsState {
  channels: ChannelStatus[];
  gatewayRunning: boolean;
}
