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

    expect(source).toContain('function loadCostOverview');
    expect(source).toContain("await loadOptimizations()");
    expect(source).toContain("'/api/cost/optimizations'");
    expect(source).toContain('const error = ref<string | null>(null)');
    expect(source).toContain('v-else-if="error"');
    expect(source).toContain('@retry="loadCostOverview"');
  });

  it('keeps dashboard cost intelligence failures inside the card', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/dashboard/CostIntelligenceCard.vue'), 'utf8');

    expect(source).toContain('const error = ref<string | null>(null)');
    expect(source).toContain("bffFetch<CostData>('/api/usage/intelligence', { silent: true })");
    expect(source).toContain("t('dashboard.costIntelligence.unavailable')");
    expect(source).toContain('@click="load"');
  });
});
