/**
 * Agent Security Audit Log.
 * Records all significant BFF operations for compliance and debugging.
 * Stored in ~/.hermes-panel/audit.jsonl (append-only JSONL format).
 */

import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPanelHome } from './hermes-home.js';

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;          // e.g. 'hermes.run.start', 'sandbox.create', 'goal.execute'
  actor: string;           // 'user' | 'agent' | 'system'
  resource: string;        // e.g. session id, file path, sandbox id
  details?: Record<string, unknown>;
  ip?: string;
  outcome: 'success' | 'failure' | 'denied';
}

function auditPath(): string {
  const dir = getPanelHome();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return join(dir, 'audit.jsonl');
}

let entryCount = 0;

export function recordAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
  const full: AuditEntry = {
    id: `audit-${Date.now()}-${++entryCount}`,
    timestamp: Date.now(),
    ...entry,
  };
  try {
    appendFileSync(auditPath(), JSON.stringify(full) + '\n', 'utf8');
  } catch {
    // Best-effort — never block request for audit logging
  }
  return full;
}

export function readAuditLog(opts: { limit?: number; action?: string; since?: number } = {}): AuditEntry[] {
  const p = auditPath();
  if (!existsSync(p)) return [];
  try {
    const lines = readFileSync(p, 'utf8').trim().split('\n').filter(Boolean);
    let entries: AuditEntry[] = lines.map(l => JSON.parse(l));
    if (opts.since) entries = entries.filter(e => e.timestamp >= opts.since!);
    if (opts.action) entries = entries.filter(e => e.action.includes(opts.action!));
    entries.sort((a, b) => b.timestamp - a.timestamp);
    if (opts.limit) entries = entries.slice(0, opts.limit);
    return entries;
  } catch { return []; }
}

export function auditStats(): { total: number; last24h: number; denied: number; topActions: Array<{ action: string; count: number }> } {
  const entries = readAuditLog({ limit: 10000 });
  const now = Date.now();
  const last24h = entries.filter(e => now - e.timestamp < 86_400_000).length;
  const denied = entries.filter(e => e.outcome === 'denied').length;
  const actionCounts = new Map<string, number>();
  for (const e of entries) {
    actionCounts.set(e.action, (actionCounts.get(e.action) ?? 0) + 1);
  }
  const topActions = [...actionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([action, count]) => ({ action, count }));
  return { total: entries.length, last24h, denied, topActions };
}
