/**
 * Panel 偏好（仅前端 localStorage 部分）的导出/导入。
 *
 * 范围：只动 panel.* 前缀的 key — 避免误碰其它站点 / 浏览器扩展写的数据。
 * 不含：sessions / messages / cron jobs / providers / API key（这些是后端
 * 数据，走 settings/SectionBackup 的 BFF 备份链路）。
 *
 * 格式：
 *   {
 *     version: 1,
 *     exportedAt: "2026-05-27T...",
 *     panel: { "panel.foo": "...raw...", "panel.bar": "..." }
 *   }
 */
export interface PanelPrefsBackup {
  version: 1;
  exportedAt: string;
  panel: Record<string, string>;
}

const PREFIX = 'panel.';

function collectKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  return keys;
}

export function exportPanelPrefs(): PanelPrefsBackup {
  const panel: Record<string, string> = {};
  for (const k of collectKeys()) {
    const v = localStorage.getItem(k);
    if (v !== null) panel[k] = v;
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    panel,
  };
}

export interface ImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  reason?: 'invalid_json' | 'bad_schema' | 'version_mismatch';
}

export function importPanelPrefs(jsonText: string, opts: { merge?: boolean } = {}): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return { ok: false, imported: 0, skipped: 0, reason: 'invalid_json' };
  }
  if (!isBackup(data)) {
    return { ok: false, imported: 0, skipped: 0, reason: 'bad_schema' };
  }
  if (data.version !== 1) {
    return { ok: false, imported: 0, skipped: 0, reason: 'version_mismatch' };
  }
  // 不 merge 时先清空所有 panel.* — 让导入是"全套替换"
  if (!opts.merge) {
    for (const k of collectKeys()) localStorage.removeItem(k);
  }
  let imported = 0;
  let skipped = 0;
  for (const [k, v] of Object.entries(data.panel)) {
    if (!k.startsWith(PREFIX) || typeof v !== 'string') { skipped++; continue; }
    try {
      localStorage.setItem(k, v);
      imported++;
    } catch {
      skipped++;
    }
  }
  return { ok: true, imported, skipped };
}

function isBackup(x: unknown): x is PanelPrefsBackup {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o.version === 'number'
    && typeof o.exportedAt === 'string'
    && typeof o.panel === 'object'
    && o.panel !== null;
}
