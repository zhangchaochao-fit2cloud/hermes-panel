import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const registerSwPath = join(process.cwd(), 'src/utils/register-sw.ts');

describe('registerServiceWorker', () => {
  it('keeps dev localhost from serving stale PWA cache', () => {
    const source = readFileSync(registerSwPath, 'utf8');

    expect(source).toContain('import.meta.env.DEV');
    expect(source).toContain('navigator.serviceWorker.getRegistrations()');
    expect(source).toContain('registration.unregister()');
    expect(source.indexOf('import.meta.env.DEV')).toBeLessThan(source.indexOf("register('/sw.js')"));
  });
});
