import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const settingsPath = join(process.cwd(), 'src/views/settings/index.vue');

describe('settings deep-link UX', () => {
  it('keeps settings anchors shareable and repeatable after the page is open', () => {
    const source = readFileSync(settingsPath, 'utf8');

    expect(source).toContain('useRouter');
    expect(source).toContain('watch(() => route.hash');
    expect(source).toContain('function isAnchorKey(key: string): boolean');
    expect(source).toContain('void router.replace({ hash: `#${key}` })');
    expect(source).toContain('goTo(hash, false)');
  });

  it('visually focuses the target section after hash navigation', () => {
    const source = readFileSync(settingsPath, 'utf8');

    expect(source).toContain('focusedKey');
    expect(source).toContain('focusSection');
    expect(source).toContain('settings-section-focus');
    expect(source).toContain(":class=\"sectionClass('providers')\"");
    expect(source).toContain('color-mix(in srgb, var(--brand-500)');
  });
});
