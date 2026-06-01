import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const emptyStatePath = join(process.cwd(), 'src/components/shared/EmptyState.vue');
const emptyConsumers = [
  'src/components/tools/McpPanel.vue',
  'src/components/tools/McpServerList.vue',
  'src/components/tools/PluginsList.vue',
  'src/components/developer/ApiPlayground.vue',
  'src/components/developer/CodeGen.vue',
  'src/components/developer/DoctorPanel.vue',
  'src/components/developer/LogsViewer.vue',
  'src/components/developer/SSEInspector.vue',
  'src/components/developer/WebhookTester.vue',
];

describe('EmptyState polish', () => {
  it('renders icons inside a theme-aware badge instead of a raw large glyph', () => {
    const source = readFileSync(emptyStatePath, 'utf8');

    expect(source).toContain('empty-state-icon');
    expect(source).not.toContain('text-4xl');
  });

  it('uses the shared EmptyState component for tool-related empty surfaces', () => {
    for (const file of emptyConsumers) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');

      expect(source, file).toContain('EmptyState');
      expect(source, file).not.toContain('NEmpty');
      expect(source, file).not.toContain('text-4xl');
    }
  });
});
