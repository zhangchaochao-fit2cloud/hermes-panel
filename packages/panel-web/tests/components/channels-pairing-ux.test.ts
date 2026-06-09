import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const channelsViewPath = join(process.cwd(), 'src/views/channels/index.vue');
const channelsStorePath = join(process.cwd(), 'src/stores/channels.ts');

describe('channels pairing UX', () => {
  it('loads official hermes pairing list output from the BFF', () => {
    const view = readFileSync(channelsViewPath, 'utf8');
    const store = readFileSync(channelsStorePath, 'utf8');

    expect(store).toContain('async function loadPairingList(): Promise<void>');
    expect(store).toContain("bffFetch<PairingListReport>('/api/channels/pairing/list')");
    expect(view).toContain('store.loadPairingList()');
    expect(view).toContain("t('channels.pairing.eyebrow')");
    expect(view).toContain("t('channels.pairing.errorPrefix')");
    expect(view).toContain("t('channels.pairing.empty')");
    expect(view).toContain('<CodeBlock');
  });
});
