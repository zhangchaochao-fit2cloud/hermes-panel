import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const bffPath = join(process.cwd(), 'src/api/bff.ts');

describe('bffFetch Hermes endpoint forwarding', () => {
  it('forwards the active Hermes endpoint to model discovery as well as the raw proxy', () => {
    const source = readFileSync(bffPath, 'utf8');

    expect(source).toContain("path.startsWith('/api/hermes')");
    expect(source).toContain("path.startsWith('/api/models/discover')");
    expect(source).toContain('HEADERS.HERMES_ENDPOINT');
    expect(source).toContain('ep.active?.baseUrl');
  });
});
