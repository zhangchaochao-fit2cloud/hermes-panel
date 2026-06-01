/**
 * Writable SQLite store for panel-owned data (accounts, auth sessions,
 * licenses, tasks, workflows, etc.).
 *
 * This is a SEPARATE database from hermes `state.db`:
 *   - `state.db` is opened query_only=ON — hermes is its single writer.
 *   - `panel.db` (here) is owned by the panel BFF and is read-write.
 *
 * Location: <PANEL_HOME>/panel.db  (PANEL_HOME defaults to ~/.hermes-panel).
 * Tables are created lazily on first open via CREATE TABLE IF NOT EXISTS.
 * Column additions for existing DBs are handled by runMigrations().
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPanelHome } from './hermes-home.js';
import { logger } from '../lib/logger.js';

let dbInstance: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,
  password_hash TEXT,
  password_salt TEXT,
  display_name  TEXT,
  role          TEXT NOT NULL DEFAULT 'member',
  created_at    INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash   TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  device_label TEXT,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

CREATE TABLE IF NOT EXISTS licenses (
  key           TEXT PRIMARY KEY,
  tier          TEXT NOT NULL DEFAULT 'web',
  bound_user_id TEXT,
  bound_device  TEXT,
  bound_os      TEXT,
  created_by    TEXT,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER,
  activated_at  INTEGER,
  features      TEXT,
  revoked       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS license_snapshots (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key    TEXT NOT NULL,
  user_id        TEXT NOT NULL,
  device_fingerprint TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  tier           TEXT,
  features       TEXT,
  expires_at     INTEGER,
  last_verified_at INTEGER NOT NULL,
  created_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_license_snapshots_user ON license_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_license_snapshots_license ON license_snapshots(license_key);

-- ============================================================
-- Plan 2 tables: Tasks, Workflows, Review Queue, Agent States
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'backlog'
                  CHECK(status IN ('backlog','ready','running','review','blocked','done')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                  CHECK(priority IN ('low','medium','high','critical')),
  assigned_agent  TEXT,
  session_id      TEXT,
  workspace_name  TEXT,
  profile_name    TEXT,
  tags            TEXT NOT NULL DEFAULT '[]',
  due_at          INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_name);
CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);

CREATE TABLE IF NOT EXISTS workflows (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  workspace_name  TEXT NOT NULL,
  definition      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK(status IN ('draft','active','archived')),
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workflows_workspace ON workflows(workspace_name);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id              TEXT PRIMARY KEY,
  workflow_id     TEXT NOT NULL REFERENCES workflows(id),
  session_id      TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','running','completed','failed','paused')),
  started_at      INTEGER,
  completed_at    INTEGER,
  result_summary  TEXT,
  token_usage     INTEGER NOT NULL DEFAULT 0,
  cost_estimate   REAL NOT NULL DEFAULT 0.0
);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_session ON workflow_runs(session_id);

CREATE TABLE IF NOT EXISTS review_items (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL CHECK(type IN ('diff','command','file_write','agent_handoff')),
  agent_name      TEXT NOT NULL,
  session_id      TEXT,
  summary         TEXT NOT NULL,
  detail          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','approved','rejected','expired')),
  created_at      INTEGER NOT NULL,
  resolved_at     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_review_items_status ON review_items(status);
CREATE INDEX IF NOT EXISTS idx_review_items_session ON review_items(session_id);

CREATE TABLE IF NOT EXISTS agent_states (
  agent_name        TEXT NOT NULL,
  workspace_name    TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'idle'
                    CHECK(status IN ('idle','thinking','tool_use','waiting','error')),
  current_task      TEXT,
  session_id        TEXT,
  quality_score     REAL,
  hallucination_rate REAL,
  last_active_at    INTEGER,
  PRIMARY KEY (agent_name, workspace_name)
);

CREATE TABLE IF NOT EXISTS agent_evaluations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name      TEXT NOT NULL,
  workspace_name  TEXT NOT NULL,
  session_id      TEXT,
  quality_score   REAL NOT NULL,
  hallucination_rate REAL NOT NULL DEFAULT 0,
  factual_accuracy    REAL,
  logical_consistency REAL,
  task_completeness   REAL,
  citation_quality    REAL,
  flagged_claims  TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_evals_agent ON agent_evaluations(agent_name, workspace_name);
CREATE INDEX IF NOT EXISTS idx_agent_evals_time ON agent_evaluations(created_at);
`;

export function getPanelDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const dir = getPanelHome();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const p = join(dir, 'panel.db');
  const db = new Database(p);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA);
  runMigrations(db);
  dbInstance = db;
  logger.debug({ path: p }, 'panel.db opened');
  return dbInstance;
}

/** Add columns to existing tables without breaking existing databases. */
function runMigrations(db: Database.Database): void {
  const cols = db.prepare("PRAGMA table_info('licenses')").all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('bound_device')) {
    db.exec("ALTER TABLE licenses ADD COLUMN bound_device TEXT");
  }
  if (!names.has('bound_os')) {
    db.exec("ALTER TABLE licenses ADD COLUMN bound_os TEXT");
  }
  if (!names.has('activated_at')) {
    db.exec("ALTER TABLE licenses ADD COLUMN activated_at INTEGER");
  }
  if (!names.has('features')) {
    db.exec("ALTER TABLE licenses ADD COLUMN features TEXT");
  }
}

// ---------------------------------------------------------------------------
// License snapshots — local cache of activation server responses
// ---------------------------------------------------------------------------

export interface LicenseSnapshotRow {
  id: number;
  license_key: string;
  user_id: string;
  device_fingerprint: string | null;
  status: string;
  tier: string | null;
  features: string | null;
  expires_at: number | null;
  last_verified_at: number;
  created_at: number;
}

export function upsertLicenseSnapshot(snap: Omit<LicenseSnapshotRow, 'id'>): LicenseSnapshotRow {
  const db = getPanelDb();
  const existing = db.prepare(
    'SELECT id FROM license_snapshots WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
  ).get(snap.user_id) as { id: number } | undefined;
  if (existing) {
    db.prepare(
      `UPDATE license_snapshots SET license_key=?, device_fingerprint=?, status=?, tier=?, features=?,
         expires_at=?, last_verified_at=? WHERE id=?`,
    ).run(snap.license_key, snap.device_fingerprint, snap.status, snap.tier, snap.features,
      snap.expires_at, snap.last_verified_at, existing.id);
    return db.prepare('SELECT * FROM license_snapshots WHERE id = ?').get(existing.id) as LicenseSnapshotRow;
  }
  const result = db.prepare(
    `INSERT INTO license_snapshots (license_key, user_id, device_fingerprint, status, tier, features, expires_at, last_verified_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(snap.license_key, snap.user_id, snap.device_fingerprint, snap.status, snap.tier, snap.features,
    snap.expires_at, snap.last_verified_at, Date.now());
  return db.prepare('SELECT * FROM license_snapshots WHERE id = ?').get(result.lastInsertRowid) as LicenseSnapshotRow;
}

export function getLicenseSnapshot(userId: string): LicenseSnapshotRow | null {
  const db = getPanelDb();
  const row = db.prepare(
    'SELECT * FROM license_snapshots WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
  ).get(userId) as LicenseSnapshotRow | undefined;
  return row ?? null;
}

export function deleteLicenseSnapshot(userId: string): void {
  const db = getPanelDb();
  db.prepare('DELETE FROM license_snapshots WHERE user_id = ?').run(userId);
}

export function closePanelDb(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      /* ignore */
    }
    dbInstance = null;
  }
}

// ============================================================
// TypeScript interfaces
// ============================================================

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'ready' | 'running' | 'review' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_agent: string | null;
  session_id: string | null;
  workspace_name: string | null;
  profile_name: string | null;
  tags: string;
  due_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface WorkflowRow {
  id: string;
  name: string;
  workspace_name: string;
  definition: string; // JSON: WorkflowDefinition
  status: 'draft' | 'active' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface WorkflowRunRow {
  id: string;
  workflow_id: string;
  session_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  started_at: number | null;
  completed_at: number | null;
  result_summary: string | null;
  token_usage: number;
  cost_estimate: number;
}

export interface ReviewItemRow {
  id: string;
  type: 'diff' | 'command' | 'file_write' | 'agent_handoff';
  agent_name: string;
  session_id: string | null;
  summary: string;
  detail: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: number;
  resolved_at: number | null;
}

export interface AgentStateRow {
  agent_name: string;
  workspace_name: string;
  status: 'idle' | 'thinking' | 'tool_use' | 'waiting' | 'error';
  current_task: string | null;
  session_id: string | null;
  quality_score: number | null;
  hallucination_rate: number | null;
  last_active_at: number | null;
}

export interface AgentEvaluationRow {
  id: number;
  agent_name: string;
  workspace_name: string;
  session_id: string | null;
  quality_score: number;
  hallucination_rate: number;
  factual_accuracy: number | null;
  logical_consistency: number | null;
  task_completeness: number | null;
  citation_quality: number | null;
  flagged_claims: string | null;
  created_at: number;
}

// ============================================================
// Tasks CRUD
// ============================================================

export function listTasks(opts: {
  status?: string;
  workspace_name?: string;
  assigned_agent?: string;
  limit?: number;
} = {}): TaskRow[] {
  const db = getPanelDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (opts.status) {
    where.push('status = @status');
    params.status = opts.status;
  }
  if (opts.workspace_name) {
    where.push('workspace_name = @workspace_name');
    params.workspace_name = opts.workspace_name;
  }
  if (opts.assigned_agent) {
    where.push('assigned_agent = @assigned_agent');
    params.assigned_agent = opts.assigned_agent;
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(Math.max(1, opts.limit ?? 100), 500);
  return db.prepare(`
    SELECT * FROM tasks ${whereSql}
    ORDER BY
      CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      created_at DESC
    LIMIT @limit
  `).all({ ...params, limit }) as TaskRow[];
}

export function getTask(id: string): TaskRow | null {
  const db = getPanelDb();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  return row ?? null;
}

export function createTask(task: Omit<TaskRow, 'created_at' | 'updated_at'>): TaskRow {
  const db = getPanelDb();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, assigned_agent,
      session_id, workspace_name, profile_name, tags, due_at, created_at, updated_at)
    VALUES (@id, @title, @description, @status, @priority, @assigned_agent,
      @session_id, @workspace_name, @profile_name, @tags, @due_at, @created_at, @updated_at)
  `).run({ ...task, created_at: now, updated_at: now });
  return getTask(task.id)!;
}

export function updateTask(id: string, patch: Partial<Omit<TaskRow, 'id' | 'created_at'>>): TaskRow | null {
  const db = getPanelDb();
  const existing = getTask(id);
  if (!existing) return null;
  const now = Math.floor(Date.now() / 1000);
  const merged = { ...existing, ...patch, updated_at: now };
  db.prepare(`
    UPDATE tasks SET title=@title, description=@description, status=@status, priority=@priority,
      assigned_agent=@assigned_agent, session_id=@session_id, workspace_name=@workspace_name,
      profile_name=@profile_name, tags=@tags, due_at=@due_at, updated_at=@updated_at
    WHERE id=@id
  `).run(merged);
  return getTask(id);
}

export function deleteTask(id: string): boolean {
  const db = getPanelDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function moveTask(id: string, status: TaskRow['status']): TaskRow | null {
  return updateTask(id, { status });
}

// ============================================================
// Workflows CRUD
// ============================================================

export function listWorkflows(workspace_name?: string): WorkflowRow[] {
  const db = getPanelDb();
  if (workspace_name) {
    return db.prepare('SELECT * FROM workflows WHERE workspace_name = ? ORDER BY updated_at DESC')
      .all(workspace_name) as WorkflowRow[];
  }
  return db.prepare('SELECT * FROM workflows ORDER BY updated_at DESC').all() as WorkflowRow[];
}

export function getWorkflow(id: string): WorkflowRow | null {
  const db = getPanelDb();
  const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(id) as WorkflowRow | undefined;
  return row ?? null;
}

export function createWorkflow(wf: Omit<WorkflowRow, 'created_at' | 'updated_at'>): WorkflowRow {
  const db = getPanelDb();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO workflows (id, name, workspace_name, definition, status, created_at, updated_at)
    VALUES (@id, @name, @workspace_name, @definition, @status, @created_at, @updated_at)
  `).run({ ...wf, created_at: now, updated_at: now });
  return getWorkflow(wf.id)!;
}

export function updateWorkflow(id: string, patch: Partial<Omit<WorkflowRow, 'id' | 'created_at'>>): WorkflowRow | null {
  const db = getPanelDb();
  const existing = getWorkflow(id);
  if (!existing) return null;
  const now = Math.floor(Date.now() / 1000);
  const merged = { ...existing, ...patch, updated_at: now };
  db.prepare(`
    UPDATE workflows SET name=@name, workspace_name=@workspace_name, definition=@definition,
      status=@status, updated_at=@updated_at WHERE id=@id
  `).run(merged);
  return getWorkflow(id);
}

export function deleteWorkflow(id: string): boolean {
  const db = getPanelDb();
  const result = db.prepare('DELETE FROM workflows WHERE id = ?').run(id);
  return result.changes > 0;
}

// ============================================================
// Workflow Runs
// ============================================================

export function createWorkflowRun(run: Omit<WorkflowRunRow, 'started_at' | 'completed_at'>): WorkflowRunRow {
  const db = getPanelDb();
  db.prepare(`
    INSERT INTO workflow_runs (id, workflow_id, session_id, status, started_at, completed_at,
      result_summary, token_usage, cost_estimate)
    VALUES (@id, @workflow_id, @session_id, @status, @started_at, @completed_at,
      @result_summary, @token_usage, @cost_estimate)
  `).run(run);
  return db.prepare('SELECT * FROM workflow_runs WHERE id = ?').get(run.id) as WorkflowRunRow;
}

export function updateWorkflowRun(id: string, patch: Partial<Omit<WorkflowRunRow, 'id'>>): WorkflowRunRow | null {
  const db = getPanelDb();
  const existing = db.prepare('SELECT * FROM workflow_runs WHERE id = ?').get(id) as WorkflowRunRow | undefined;
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  db.prepare(`
    UPDATE workflow_runs SET workflow_id=@workflow_id, session_id=@session_id, status=@status,
      started_at=@started_at, completed_at=@completed_at, result_summary=@result_summary,
      token_usage=@token_usage, cost_estimate=@cost_estimate
    WHERE id=@id
  `).run(merged);
  return db.prepare('SELECT * FROM workflow_runs WHERE id = ?').get(id) as WorkflowRunRow;
}

export function listWorkflowRuns(workflow_id: string, limit = 20): WorkflowRunRow[] {
  const db = getPanelDb();
  return db.prepare('SELECT * FROM workflow_runs WHERE workflow_id = ? ORDER BY started_at DESC LIMIT ?')
    .all(workflow_id, limit) as WorkflowRunRow[];
}

// ============================================================
// Review Items
// ============================================================

export function listReviewItems(opts: { status?: string; type?: string; limit?: number } = {}): ReviewItemRow[] {
  const db = getPanelDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (opts.status) {
    where.push('status = @status');
    params.status = opts.status;
  }
  if (opts.type) {
    where.push('type = @type');
    params.type = opts.type;
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(Math.max(1, opts.limit ?? 50), 200);
  return db.prepare(`
    SELECT * FROM review_items ${whereSql} ORDER BY created_at DESC LIMIT @limit
  `).all({ ...params, limit }) as ReviewItemRow[];
}

export function createReviewItem(item: Omit<ReviewItemRow, 'resolved_at'>): ReviewItemRow {
  const db = getPanelDb();
  db.prepare(`
    INSERT INTO review_items (id, type, agent_name, session_id, summary, detail, status, created_at, resolved_at)
    VALUES (@id, @type, @agent_name, @session_id, @summary, @detail, @status, @created_at, @resolved_at)
  `).run({ ...item, resolved_at: null });
  return db.prepare('SELECT * FROM review_items WHERE id = ?').get(item.id) as ReviewItemRow;
}

export function resolveReviewItem(id: string, status: 'approved' | 'rejected'): ReviewItemRow | null {
  const db = getPanelDb();
  const existing = db.prepare('SELECT * FROM review_items WHERE id = ?').get(id) as ReviewItemRow | undefined;
  if (!existing || existing.status !== 'pending') return null;
  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE review_items SET status = ?, resolved_at = ? WHERE id = ?').run(status, now, id);
  return db.prepare('SELECT * FROM review_items WHERE id = ?').get(id) as ReviewItemRow;
}

export function countPendingReviews(): number {
  const db = getPanelDb();
  const row = db.prepare('SELECT COUNT(*) AS cnt FROM review_items WHERE status = ?').get('pending') as { cnt: number };
  return row.cnt;
}

// ============================================================
// Agent States
// ============================================================

export function getAgentState(agent_name: string, workspace_name: string): AgentStateRow | null {
  const db = getPanelDb();
  const row = db.prepare('SELECT * FROM agent_states WHERE agent_name = ? AND workspace_name = ?')
    .get(agent_name, workspace_name) as AgentStateRow | undefined;
  return row ?? null;
}

export function upsertAgentState(state: Omit<AgentStateRow, 'quality_score' | 'hallucination_rate'> & {
  quality_score?: number | null;
  hallucination_rate?: number | null;
}): AgentStateRow {
  const db = getPanelDb();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO agent_states (agent_name, workspace_name, status, current_task, session_id,
      quality_score, hallucination_rate, last_active_at)
    VALUES (@agent_name, @workspace_name, @status, @current_task, @session_id,
      @quality_score, @hallucination_rate, @last_active_at)
    ON CONFLICT(agent_name, workspace_name) DO UPDATE SET
      status=excluded.status, current_task=excluded.current_task,
      session_id=excluded.session_id, quality_score=excluded.quality_score,
      hallucination_rate=excluded.hallucination_rate, last_active_at=excluded.last_active_at
  `).run({ ...state, quality_score: state.quality_score ?? null, hallucination_rate: state.hallucination_rate ?? null, last_active_at: now });
  return getAgentState(state.agent_name, state.workspace_name)!;
}

export function listAgentStates(workspace_name?: string): AgentStateRow[] {
  const db = getPanelDb();
  if (workspace_name) {
    return db.prepare('SELECT * FROM agent_states WHERE workspace_name = ? ORDER BY agent_name')
      .all(workspace_name) as AgentStateRow[];
  }
  return db.prepare('SELECT * FROM agent_states ORDER BY workspace_name, agent_name').all() as AgentStateRow[];
}

// ============================================================
// Agent Evaluations
// ============================================================

export function createAgentEvaluation(eval_: Omit<AgentEvaluationRow, 'id'>): AgentEvaluationRow {
  const db = getPanelDb();
  const result = db.prepare(`
    INSERT INTO agent_evaluations (agent_name, workspace_name, session_id, quality_score,
      hallucination_rate, factual_accuracy, logical_consistency, task_completeness,
      citation_quality, flagged_claims, created_at)
    VALUES (@agent_name, @workspace_name, @session_id, @quality_score,
      @hallucination_rate, @factual_accuracy, @logical_consistency, @task_completeness,
      @citation_quality, @flagged_claims, @created_at)
  `).run(eval_);
  return db.prepare('SELECT * FROM agent_evaluations WHERE id = ?').get(result.lastInsertRowid) as AgentEvaluationRow;
}

export function getAgentEvaluationStats(agent_name: string, workspace_name: string, days = 7): {
  avg_quality: number;
  avg_hallucination: number;
  total_evals: number;
} {
  const db = getPanelDb();
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  const row = db.prepare(`
    SELECT
      COALESCE(AVG(quality_score), 0) AS avg_quality,
      COALESCE(AVG(hallucination_rate), 0) AS avg_hallucination,
      COUNT(*) AS total_evals
    FROM agent_evaluations
    WHERE agent_name = ? AND workspace_name = ? AND created_at >= ?
  `).get(agent_name, workspace_name, cutoff) as { avg_quality: number; avg_hallucination: number; total_evals: number };
  return row;
}
