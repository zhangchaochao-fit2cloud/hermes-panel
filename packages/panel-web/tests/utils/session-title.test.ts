import { describe, expect, it } from 'vitest';
import { displaySessionTitle, looksGeneratedTitle } from '@/utils/session-title';

describe('session-title', () => {
  it('detects generated date/code titles', () => {
    expect(looksGeneratedTitle('2026-05-27-plan-01-8f4a3c2d')).toBe(true);
    expect(looksGeneratedTitle('run_202605271030_abcd1234')).toBe(true);
    expect(looksGeneratedTitle('优化左侧计划列表标题')).toBe(false);
  });

  it('cleans readable suffixes and falls back for pure noise', () => {
    expect(displaySessionTitle({ id: '1', title: '2026-05-27-优化左侧标题' }, '未命名')).toBe('优化左侧标题');
    expect(displaySessionTitle({ id: '2', title: 'run_202605271030_abcd1234' }, '未命名')).toBe('未命名');
  });
});
