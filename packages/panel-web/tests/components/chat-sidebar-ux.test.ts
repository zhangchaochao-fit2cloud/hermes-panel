import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const drawerPath = join(process.cwd(), 'src/components/chat/ChatSessionsDrawer.vue');

describe('chat sessions drawer polish', () => {
  it('renders sessions as a quiet one-line list with hover-only actions', () => {
    const source = readFileSync(drawerPath, 'utf8');

    expect(source).toContain('drawer-toolbar');
    expect(source).toContain('drawer-icon-button');
    expect(source).toContain('drawer-new-button');
    expect(source).toContain('session-row-title');
    expect(source).toContain('session-row-time');
    expect(source).toContain('session-row-actions');
    expect(source).toContain('session-more-btn');
    expect(source).toContain('.session-row:hover .session-row-actions');
    expect(source).toContain('.session-row:hover .session-row-time');
    expect(source).not.toContain('border border-[var(--border)] bg-[var(--bg-card)]');
  });

  it('uses muted group headings instead of visual card group dividers', () => {
    const source = readFileSync(drawerPath, 'utf8');

    expect(source).toContain('session-group-header');
    expect(source).toContain('session-group-title');
    expect(source).toContain('session-group-count');
    expect(source).not.toContain("SOURCE_META[g.source]?.icon");
  });

  it('limits pinned sessions to three by default with a more affordance', () => {
    const source = readFileSync(drawerPath, 'utf8');

    expect(source).toContain('PINNED_VISIBLE_LIMIT = 3');
    expect(source).toContain('pinnedExpanded');
    expect(source).toContain('visibleGroupItems(g)');
    expect(source).toContain('hiddenPinnedCount(g)');
    expect(source).toContain('session-pinned-more');
    expect(source).toContain("t('chat.sidebar.pinnedMore'");
    expect(source).toContain("t('chat.sidebar.pinnedLess')");
  });
});
