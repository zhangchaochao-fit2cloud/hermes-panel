import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const formPath = join(process.cwd(), 'src/components/channels/ChannelConfigForm.vue');
const enPath = join(process.cwd(), 'src/locales/en-US.ts');
const zhPath = join(process.cwd(), 'src/locales/zh-CN.ts');

describe('channels WhatsApp UX', () => {
  it('uses channel-specific QR actions, status text, and current setup guidance', () => {
    const form = readFileSync(formPath, 'utf8');
    const en = readFileSync(enPath, 'utf8');
    const zh = readFileSync(zhPath, 'utf8');

    expect(form).toContain("t('channels.' + props.name + '.getQr')");
    expect(form).toContain("t('channels.' + props.name + '.checkStatus')");
    expect(form).toContain("t('channels.' + props.name + '.bound')");
    expect(form).toContain("t('channels.' + props.name + '.notBound')");
    expect(en).toContain('Scan the QR code shown on this page with WhatsApp');
    expect(zh).toContain('二维码绑定');
  });
});
