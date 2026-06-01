import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { getHermesHome } from './hermes-home.js';
import { logger } from '../lib/logger.js';
import type { ChannelName, ChannelConfig, ChannelStatus } from '@hermes-panel/shared';
import { CHANNEL_META } from '@hermes-panel/shared';

interface HermesConfig {
  platforms?: Record<string, unknown>;
  [k: string]: unknown;
}

function configPath(): string {
  return join(getHermesHome(), 'config.yaml');
}

function readConfig(): HermesConfig {
  const p = configPath();
  if (!existsSync(p)) return {};
  try {
    return (parseYaml(readFileSync(p, 'utf8')) as HermesConfig) ?? {};
  } catch {
    return {};
  }
}

function writeConfig(doc: HermesConfig): void {
  const p = configPath();
  const bak = p + '.bak';
  try {
    if (existsSync(p)) copyFileSync(p, bak);
  } catch { /* best-effort backup */ }
  const dir = dirname(p);
  if (!existsSync(dir)) {
    const { mkdirSync } = require('node:fs') as typeof import('node:fs');
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  writeFileSync(p, stringifyYaml(doc, { lineWidth: 120 }), 'utf8');
  logger.info({ path: p }, 'config.yaml written');
}

const DEFAULT_CONFIGS: Record<ChannelName, () => ChannelConfig> = {
  telegram: () => ({ enabled: false, botToken: '', atMention: true, emojiReaction: true, freeReply: false }),
  discord: () => ({ enabled: false, botToken: '', autoThread: true, channelWhitelist: [], channelBlacklist: [] }),
  slack: () => ({ enabled: false, botToken: '', mentionControl: true, handleBotMessages: false }),
  whatsapp: () => ({ enabled: false, mentionMode: 'at_mention' }),
  matrix: () => ({ enabled: false, accessToken: '', homeserver: 'https://matrix.org', autoThread: true }),
  feishu: () => ({ enabled: false, appId: '', appSecret: '', mentionControl: true }),
  wechat: () => ({ enabled: false }),
  wecom: () => ({ enabled: false, botId: '', botSecret: '' }),
};

export function getChannelConfig(name: ChannelName): ChannelConfig {
  const doc = readConfig();
  const platforms = (doc.platforms ?? {}) as Record<string, unknown>;
  const stored = platforms[name] as Record<string, unknown> | undefined;
  const defaults = DEFAULT_CONFIGS[name]();
  if (!stored || typeof stored !== 'object') return defaults;
  return { ...defaults, ...stored } as ChannelConfig;
}

export function setChannelConfig(name: ChannelName, config: ChannelConfig): void {
  const doc = readConfig();
  const platforms = (doc.platforms ?? {}) as Record<string, unknown>;
  platforms[name] = config;
  doc.platforms = platforms;
  writeConfig(doc);
}

export function removeChannelConfig(name: ChannelName): void {
  const doc = readConfig();
  const platforms = (doc.platforms ?? {}) as Record<string, unknown>;
  delete platforms[name];
  if (Object.keys(platforms).length === 0) {
    delete doc.platforms;
  } else {
    doc.platforms = platforms;
  }
  writeConfig(doc);
}

export function listChannels(): ChannelStatus[] {
  const doc = readConfig();
  const platforms = (doc.platforms ?? {}) as Record<string, unknown>;
  return (Object.keys(CHANNEL_META) as ChannelName[]).map(name => {
    const cfg = platforms[name] as Record<string, unknown> | undefined;
    const enabled = cfg && typeof cfg === 'object' ? (cfg.enabled as boolean) === true : false;
    return {
      name,
      label: CHANNEL_META[name].label,
      enabled,
      configured: cfg !== undefined && typeof cfg === 'object' && Object.keys(cfg).length > 1,
      connected: enabled, // best-effort: enabled implies connected
    };
  });
}

export function hasAnyChannelEnabled(): boolean {
  return listChannels().some(c => c.enabled);
}
