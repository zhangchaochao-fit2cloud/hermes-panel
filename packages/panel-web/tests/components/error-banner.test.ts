import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const errorBannerPath = join(process.cwd(), 'src/components/shared/ErrorBanner.vue');
const pageErrorFiles = [
  'src/views/cron/index.vue',
  'src/views/goals/index.vue',
  'src/views/sessions/index.vue',
  'src/views/memory/index.vue',
];
const inlineErrorFiles = [
  'src/components/developer/DoctorPanel.vue',
  'src/components/developer/LogsViewer.vue',
  'src/components/developer/WebhookTester.vue',
  'src/components/memory/FileEditor.vue',
];

describe('page error banners', () => {
  it('defines a theme-aware shared error banner with retry affordance', () => {
    const source = readFileSync(errorBannerPath, 'utf8');

    expect(source).toContain('error-banner');
    expect(source).toContain('retryLabel');
    expect(source).toContain("surface?: 'page' | 'inline'");
    expect(source).toContain("emit('retry')");
  });

  it('uses the shared ErrorBanner on primary page-level error surfaces', () => {
    for (const file of pageErrorFiles) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');

      expect(source, file).toContain('ErrorBanner');
      expect(source, file).not.toContain('app-error-banner');
      expect(source, file).not.toContain('bg-red-500/10');
    }
  });

  it('uses inline shared error banners on developer tool panels', () => {
    for (const file of inlineErrorFiles) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');

      expect(source, file).toContain('ErrorBanner');
      expect(source, file).toContain('surface="inline"');
      expect(source, file).not.toContain('bg-red-500/10');
    }
  });
});
