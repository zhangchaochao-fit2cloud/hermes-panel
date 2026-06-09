import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const logsPath = join(process.cwd(), 'src/components/developer/LogsViewer.vue');
const debugSharePath = join(process.cwd(), 'src/components/developer/DebugShareHandoffPanel.vue');

describe('logs debug share handoff experience', () => {
  it('surfaces support-share preparation without uploading debug data automatically', () => {
    const logs = readFileSync(logsPath, 'utf8');
    const debugShare = readFileSync(debugSharePath, 'utf8');

    expect(logs).toContain('DebugShareHandoffPanel');
    expect(logs).toContain('<DebugShareHandoffPanel />');
    expect(debugShare).toContain("const shareCommand = 'hermes debug share'");
    expect(debugShare).toContain("const helpCommand = 'hermes debug share --help'");
    expect(debugShare).toContain("bffFetch<DumpReport>('/api/system/dump')");
    expect(debugShare).toContain("copyText(shareCommand, 'developer.logs.debugShare.copiedShare')");
    expect(debugShare).toContain("copyText(helpCommand, 'developer.logs.debugShare.copiedHelp')");
    expect(debugShare).toContain("t('developer.logs.debugShare.checkSecrets')");
    expect(debugShare).toContain("t('developer.logs.debugShare.empty')");
    expect(debugShare).not.toContain("bffFetch('/api/cli/debug");
  });
});
