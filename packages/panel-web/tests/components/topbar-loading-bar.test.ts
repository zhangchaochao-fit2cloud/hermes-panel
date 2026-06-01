import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const topbarPath = join(process.cwd(), 'src/components/shared/AppTopbar.vue');

describe('AppTopbar loading feedback', () => {
  it('renders the shared global loading bar in the topbar', () => {
    const source = readFileSync(topbarPath, 'utf8');

    expect(source).toContain("import GlobalLoadingBar from './GlobalLoadingBar.vue'");
    expect(source).toContain('<GlobalLoadingBar />');
  });
});
