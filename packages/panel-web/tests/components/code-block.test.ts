import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const codeBlockPath = join(process.cwd(), 'src/components/shared/CodeBlock.vue');
const developerCodeConsumers = [
  'src/components/developer/ApiPlayground.vue',
  'src/components/developer/CodeGen.vue',
  'src/components/developer/DoctorPanel.vue',
  'src/components/developer/SSEInspector.vue',
  'src/components/developer/WebhookTester.vue',
];

describe('developer code output blocks', () => {
  it('provides a theme-aware shared code block with copy affordance', () => {
    const source = readFileSync(codeBlockPath, 'utf8');

    expect(source).toContain('code-block-toolbar');
    expect(source).toContain('navigator.clipboard.writeText');
    expect(source).toContain("t('common.copy')");
    expect(source).toContain('maxHeight');
  });

  it('uses the shared CodeBlock for developer payload and response output', () => {
    for (const file of developerCodeConsumers) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');

      expect(source, file).toContain('CodeBlock');
      expect(source, file).not.toContain('<pre');
    }
  });
});
