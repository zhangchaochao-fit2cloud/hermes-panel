import { describe, expect, it } from 'vitest';
import { createPanelThemeOverrides } from '@/utils/naive-theme';

function collectStrings(value: unknown, acc: string[] = []): string[] {
  if (typeof value === 'string') {
    acc.push(value);
    return acc;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, acc);
    return acc;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, acc);
  }
  return acc;
}

describe('createPanelThemeOverrides', () => {
  it('does not pass CSS variables or color-mix values into Naive theme tokens', () => {
    const overrides = createPanelThemeOverrides({
      primary: '#6366f1',
      dark: false,
    });

    const unsafeValues = collectStrings(overrides).filter((value) =>
      /\bvar\(|\bcolor-mix\(/.test(value),
    );

    expect(unsafeValues).toEqual([]);
  });

  it('uses concrete popover colors so seemly/rgba can parse them', () => {
    expect(createPanelThemeOverrides({ primary: '#1677ff', dark: false }).Popover).toMatchObject({
      color: '#ffffff',
      textColor: '#1f2937',
    });
    expect(createPanelThemeOverrides({ primary: '#1677ff', dark: true }).Popover).toMatchObject({
      color: '#171717',
      textColor: '#fafafa',
    });
  });
});
