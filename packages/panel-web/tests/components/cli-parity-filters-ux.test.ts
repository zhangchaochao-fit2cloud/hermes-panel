import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const filtersPath = join(process.cwd(), 'src/components/developer/CliParityFilters.vue');

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
});
