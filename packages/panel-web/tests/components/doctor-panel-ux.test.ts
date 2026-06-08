import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const panelPath = join(process.cwd(), 'src/components/developer/DoctorPanel.vue');
const storePath = join(process.cwd(), 'src/stores/doctor.ts');

describe('doctor panel experience', () => {
  it('lets users run and copy the official support dump', () => {
    const panel = readFileSync(panelPath, 'utf8');
    const store = readFileSync(storePath, 'utf8');

    expect(store).toContain('async function runDump(): Promise<void>');
    expect(store).toContain("bffFetch<DumpReport>('/api/system/dump')");
    expect(panel).toContain('async function onRunDump(): Promise<void>');
    expect(panel).toContain("t('developer.doctor.dumpTitle')");
    expect(panel).toContain("t('developer.doctor.dumpRun')");
    expect(panel).toContain("t('developer.doctor.dumpErrorPrefix')");
    expect(panel).toContain(':code="dump.stdout.trimEnd()"');
    expect(panel).toContain(':lang="dump.source"');
  });
});
