import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const themedLoadingFiles = [
  'src/views/sessions/index.vue',
  'src/views/tools/index.vue',
  'src/views/workspaces/index.vue',
  'src/views/memory/index.vue',
  'src/components/tools/SkillMarketplace.vue',
  'src/components/workspaces/ProfileSwitch.vue',
  'src/components/dashboard/CacheCard.vue',
  'src/components/dashboard/MonthlyPaceCard.vue',
  'src/components/tools/McpPanel.vue',
  'src/components/tools/McpServerList.vue',
  'src/components/tools/PluginsList.vue',
  'src/components/memory/FileTree.vue',
  'src/components/sessions/SessionHoverPreview.vue',
  'src/components/chat/ChatSessionsDrawer.vue',
  'src/components/settings/SectionProviders.vue',
  'src/components/developer/DoctorPanel.vue',
  'src/components/developer/LogsViewer.vue',
  'src/components/developer/WebhookTester.vue',
  'src/components/memory/FileEditor.vue',
];

describe('theme-aware loading placeholders', () => {
  it('uses ThemedSkeleton on primary data-loading surfaces instead of raw NSkeleton', () => {
    for (const file of themedLoadingFiles) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');

      expect(source, file).toContain('ThemedSkeleton');
      expect(source, file).not.toContain('NSkeleton');
    }
  });

  it('does not fall back to plain common.loading text on visible data surfaces', () => {
    for (const file of themedLoadingFiles) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');

      expect(source, file).not.toContain("t('common.loading')");
      expect(source, file).not.toContain('$t(\'common.loading\')');
    }
  });
});
