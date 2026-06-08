import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const costViewPath = join(process.cwd(), 'src/views/cost/index.vue');

describe('cost insights UX', () => {
  it('makes the official insights command discoverable on the cost page', () => {
    const source = readFileSync(costViewPath, 'utf8');

    expect(source).toContain('hermes insights');
    expect(source).toContain("t('cost.cliEyebrow')");
    expect(source).toContain("t('cost.cliDesc')");
    expect(source).toContain("t('cost.sourceUsage')");
    expect(source).toContain("t('cost.sourceBudget')");
    expect(source).toContain("t('cost.sourceOptimizations')");
  });

  it('loads optimization suggestions on first render', () => {
    const source = readFileSync(costViewPath, 'utf8');

    expect(source).toContain("await loadOptimizations()");
    expect(source).toContain("'/api/cost/optimizations'");
  });
});
