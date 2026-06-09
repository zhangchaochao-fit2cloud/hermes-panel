import { describe, expect, it } from 'vitest';
import { createI18n } from 'vue-i18n';
import zhCN from '@/locales/zh-CN';
import enUS from '@/locales/en-US';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  const keys: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      keys.push(...flattenKeys(child, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

describe('locale message keys', () => {
  it('keeps zh-CN and en-US message trees in sync', () => {
    const zhKeys = flattenKeys(zhCN).sort();
    const enKeys = flattenKeys(enUS).sort();

    expect(enKeys.filter((key) => !zhKeys.includes(key))).toEqual([]);
    expect(zhKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
  });

  it('renders literal @@ mentions without vue-i18n linked-message errors', () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'zh-CN',
      messages: { 'zh-CN': zhCN, 'en-US': enUS },
    });
    const t = i18n.global.t;

    expect(t('dashboard.capabilityMap.items.chat.example')).toContain('@@角色');
    expect(t('chatRoom.availableRoles', { count: 3 })).toContain('@@');
    expect(t('channels.config.fields.atMention')).toContain('@@');
  });
});
