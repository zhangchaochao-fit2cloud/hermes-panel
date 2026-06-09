import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const developerPath = join(process.cwd(), 'src/views/developer/index.vue');

describe('developer tabs deep links', () => {
  it('opens tabs from route hashes and keeps user tab clicks shareable', () => {
    const source = readFileSync(developerPath, 'utf8');

    expect(source).toContain("const VALID_TABS = ['cli-parity', 'playground', 'sse', 'codegen', 'webhook', 'logs', 'doctor'] as const");
    expect(source).toContain('function tabFromHash(hash: string): DevTab | null');
    expect(source).toContain("watch(() => route.hash");
    expect(source).toContain('function setDeveloperTab(value: string): void');
    expect(source).toContain('void router.replace({ hash: `#${next}` })');
    expect(source).toContain('@update:value="setDeveloperTab"');
  });
});
