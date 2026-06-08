import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const filtersPath = join(process.cwd(), 'src/components/developer/CliParityFilters.vue');
const panelPath = join(process.cwd(), 'src/components/developer/CliParityPanel.vue');

describe('CLI parity filters experience', () => {
  it('resets search, coverage, and group filters in one action', () => {
    const source = readFileSync(filtersPath, 'utf8');

    expect(source).toContain('function resetFilters(): void');
    expect(source).toContain("emit('update:query', '')");
    expect(source).toContain("emit('update:coverageFilter', 'all')");
    expect(source).toContain("emit('update:groupFilter', 'all')");
    expect(source).toContain('@click="resetFilters"');
    expect(source).toContain("t('developer.cliParity.resetFilters')");
  });

  it('keeps the reset affordance quiet when no filters are active', () => {
    const source = readFileSync(filtersPath, 'utf8');

    expect(source).toContain('const hasActiveFilters = computed');
    expect(source).toContain("props.query.trim() !== ''");
    expect(source).toContain("props.coverageFilter !== 'all'");
    expect(source).toContain("props.groupFilter !== 'all'");
    expect(source).toContain(':disabled="!hasActiveFilters"');
  });

  it('shows how many CLI commands match the current filters', () => {
    const filters = readFileSync(filtersPath, 'utf8');
    const panel = readFileSync(panelPath, 'utf8');

    expect(filters).toContain('visibleCount: number');
    expect(filters).toContain('totalCount: number');
    expect(filters).toContain("t('developer.cliParity.resultCount', { shown: visibleCount, total: totalCount })");
    expect(filters).toContain('class="result-count"');
    expect(panel).toContain(':visible-count="filtered.length"');
    expect(panel).toContain(':total-count="commands.length"');
  });

  it('shows coverage counts on coverage filter chips', () => {
    const filters = readFileSync(filtersPath, 'utf8');
    const panel = readFileSync(panelPath, 'utf8');

    expect(filters).toContain("coverageCounts: Record<CliCommandCoverage | 'all', number>");
    expect(filters).toContain('{{ coverageCounts.all }}');
    expect(filters).toContain('{{ coverageCounts[coverage] }}');
    expect(panel).toContain("const coverageCounts = computed<Record<CliCommandCoverage | 'all', number>>");
    expect(panel).toContain(':coverage-counts="coverageCounts"');
  });
});
