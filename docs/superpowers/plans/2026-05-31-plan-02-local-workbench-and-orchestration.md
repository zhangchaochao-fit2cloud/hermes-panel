# Plan 2: Local-First AI Workbench + Multi-Agent Orchestration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Hermes Panel from a Hermes Agent control panel into a **local-first, cross-platform AI development workbench** with **multi-agent orchestration** as its core differentiator. Compete with Codex (cloud, macOS-only) and Claude Code (terminal) on the axis of: privacy (local execution), platform reach (Win/Mac/Linux + Web + PWA), model freedom (any provider), and visual multi-agent management.

**Strategic Rationale:**
- Codex is cloud-only → our local execution is the counter-position
- Codex is macOS-only → our cross-platform Tauri + Web is the counter-position
- Claude Code is terminal-only → our GUI is the counter-position
- Neither has visual multi-agent orchestration → our Workspace/Role/Orchestrator is the killer differentiator

**Spec Reference:** `docs/superpowers/specs/2026-05-25-hermes-panel-design.md` §10, §15, §21.1.4, §21.1.8, §21.2.1–§21.2.3

**Prerequisite:** Plan 1 complete (current `master` branch state)

---

## Phase Overview

| Phase | Scope | Duration | Target |
|-------|-------|----------|--------|
| **2a: Foundation** | Sandbox + Self-Built DB + Monaco Editor | 3 weeks | 2026-06-21 |
| **2b: Orchestration v1** | Orchestrator Engine + Control Plane + Workflow Editor | 4 weeks | 2026-07-19 |
| **2c: Autonomous Mode** | Full Auto + Approval Queue + Voice Input | 3 weeks | 2026-08-09 |
| **2d: Cross-Platform GA** | Windows/Linux Tauri + PWA Offline + Performance | 2 weeks | 2026-08-23 |

---

## Phase 2a: Foundation — Sandbox + Self-Built DB + Monaco Editor

### Motivation

Before multi-agent orchestration can work, three foundations must exist:
1. **Sandbox** — Agents must execute code safely without risking the host machine
2. **Self-built database** — panel needs its own `panel.db` for tasks, agent state, review queue; can't rely solely on hermes's `state.db`
3. **File editor** — A real code editor (Monaco) is table stakes for a workbench; the current `<textarea>` doesn't cut it

### Architecture Changes

```
packages/panel-bff/src/
├── services/
│   ├── sandbox.ts              # NEW: Docker/podman container management
│   ├── panel-db.ts             # NEW: self-built SQLite for panel state
│   └── sqlite-reader.ts        # existing (reads hermes state.db)
│
├── routes/
│   ├── sandbox.ts              # NEW: POST /api/sandbox/run, /status/:id
│   └── files.ts                # NEW: GET/PUT /api/files/* (workspace FS)
│
packages/panel-web/src/
├── views/
│   └── files/                  # NEW: file browser + Monaco editor
│       └── index.vue
├── components/
│   └── files/
│       ├── FileTree.vue        # tree sidebar (moved from memory/)
│       ├── MonacoEditor.vue    # NEW: Monaco wrapper, lazy-loaded
│       ├── FileTabs.vue        # NEW: multi-file tab bar
│       └── SandboxConsole.vue  # NEW: sandbox execution output
└── stores/
    ├── files.ts                # NEW: file tree state + open tabs
    └── sandbox.ts              # NEW: sandbox run state
```

### New Dependencies

```
panel-web:
  - monaco-editor (lazy chunk, ~3MB gzipped)
  - @monaco-editor/loader

panel-bff:
  - better-sqlite3 (already present)
  - dockerode (Docker API client, optional fallback to child_process)
```

### Task 2a.1: Self-built panel.db

**Goal:** Create `~/.hermes-panel/panel.db` with schema for: tasks (Kanban), agent-workflows, notifications (migrate from hermes events), review-queue, agent-state. Hermes's `state.db` continues as the read-only session source; `panel.db` holds everything the panel adds on top.

- [ ] **Step 1: Define panel.db schema** (`packages/panel-bff/src/services/panel-db-schema.ts`)

```sql
-- Tasks (Kanban board)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK(status IN ('backlog','ready','running','review','blocked','done')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
  assigned_agent TEXT,          -- Role name from workspace
  session_id TEXT,               -- Linked chat session (optional)
  workspace_name TEXT,
  profile_name TEXT,
  tags TEXT DEFAULT '[]',        -- JSON array
  due_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Agent workflows (saved workflow templates + running instances)
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  definition TEXT NOT NULL,      -- JSON: nodes, edges, roles, tools
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed','paused')),
  started_at TEXT,
  completed_at TEXT,
  result_summary TEXT,
  token_usage INTEGER DEFAULT 0,
  cost_estimate REAL DEFAULT 0.0
);

-- Review queue (Full Auto mode)
CREATE TABLE review_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('diff','command','file_write','agent_handoff')),
  agent_name TEXT NOT NULL,
  session_id TEXT,
  summary TEXT NOT NULL,
  detail TEXT,                   -- JSON: full diff, command string, etc.
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- Agent state snapshots (for Control Plane)
CREATE TABLE agent_states (
  agent_name TEXT PRIMARY KEY,
  workspace_name TEXT NOT NULL,
  status TEXT DEFAULT 'idle' CHECK(status IN ('idle','thinking','tool_use','waiting','error')),
  current_task TEXT,
  session_id TEXT,
  quality_score REAL,
  hallucination_rate REAL,
  last_active_at TEXT
);
```

- [ ] **Step 2: Implement panel-db.ts service** — open/create `~/.hermes-panel/panel.db` with WAL mode, run migrations, export typed query helpers
- [ ] **Step 3: Add BFF routes** for tasks CRUD (`routes/tasks.ts`), workflows CRUD (`routes/workflows.ts`), review queue (`routes/review.ts`)
- [ ] **Step 4: Add tests** for all new routes, using an in-memory SQLite database for test isolation

### Task 2a.2: Docker Sandbox

**Goal:** Execute agent-proposed shell commands and code in an isolated Docker container. Use `dockerode` (Node Docker API) with a pre-built sandbox image. Fall back to `child_process` with user confirmation when Docker is unavailable.

- [ ] **Step 1: Create sandbox Dockerfile** (`packages/panel-bff/src/services/sandbox/`)

```dockerfile
# Minimal sandbox image for agent code execution
FROM node:22-alpine
RUN adduser -D -h /home/sandbox sandbox
USER sandbox
WORKDIR /workspace
# Mounted read-write by panel; read-only for .codex/ equivalents
```

- [ ] **Step 2: Implement sandbox.ts service**
  - `createSandbox(sessionId)` → pull image, create container, mount workspace volume
  - `runCommand(sandboxId, command, opts)` → exec in container, capture stdout/stderr, enforce timeout
  - `runScript(sandboxId, script, language)` → write temp file, execute, capture output
  - `destroySandbox(sandboxId)` → stop + remove container
  - `getStatus(sandboxId)` → running/stopped/error, resource usage
  - Hard limits: 2GB memory, 1 CPU, 5min timeout, no network by default, read-only `/` except `/workspace`
- [ ] **Step 3: Capability gate** — BFF detects Docker availability at startup, injects `sandbox: { available: true/false, reason }` into capabilities
- [ ] **Step 4: Add BFF routes** (`routes/sandbox.ts`)
  - `POST /api/sandbox/create` → `{ sandboxId }`
  - `POST /api/sandbox/:id/run` → stream stdout/stderr via SSE
  - `DELETE /api/sandbox/:id` → destroy
- [ ] **Step 5: Frontend SandboxConsole.vue** — xterm.js terminal embedded in a drawer/panel, connected to sandbox SSE stream

### Task 2a.3: Monaco Editor + File Browser

**Goal:** Replace the `<textarea>` in memory/FileEditor with Monaco Editor. Add a proper file browser (file tree + multi-tab editor). Lazy-load Monaco as a separate chunk so it doesn't affect the initial bundle.

- [ ] **Step 1: Create `/files` route** (`views/files/index.vue`)
  - Three-column layout: file tree (left) | Monaco editor (center) | agent/sandbox panel (right, collapsible)
  - Top: file tabs (like VS Code), breadcrumb
  - Bottom status bar: language mode, line:col, encoding, git branch
- [ ] **Step 2: Create MonacoEditor.vue wrapper**
  - Lazy import: `defineAsyncComponent(() => import('@/components/files/MonacoEditorInner.vue'))`
  - Support: syntax highlighting (TS/JS/Vue/Python/Rust/JSON/YAML/Markdown), minimap, Cmd+P quick-open, Cmd+Shift+F search, diff view (for review queue)
  - Props: `modelValue`, `language`, `readOnly`, `diffMode` + `originalValue`
  - Integrate with theme system: Monaco theme follows `data-theme` attribute
- [ ] **Step 3: Create FileTabs.vue** — visual tabs for open files, close/dirty indicator, right-click "Close Others" / "Close All"
- [ ] **Step 4: Create files.ts Pinia store** — file tree (lazy-loaded from BFF), open tabs with dirty state, active file, recent files
- [ ] **Step 5: Add BFF file routes** (`routes/files.ts`)
  - `GET /api/files/tree?path=` → directory listing
  - `GET /api/files/read?path=` → file contents
  - `PUT /api/files/write` → write file (goes through review queue in Full Auto mode)
  - Path validation: only within `~/.hermes/workspaces/` and allowed directories
- [ ] **Step 6: Wire "Send to Chat"** — right-click in Monaco → "Send selection to Chat as context" (reuses existing `draft` API)

### Task 2a.4: Reasoning Display UI

**Goal:** The BFF already proxies `reasoning.available` events from Hermes. Build the collapsible reasoning panel UI in MessageBubble.

- [ ] **Step 1: Add reasoning block to MessageBubble.vue**
  - Collapsible section with header "🧠 思考过程" (thinking process)
  - Default collapsed (setting: `appearance.showReasoning`)
  - Animated expand/collapse with streaming text
- [ ] **Step 2: Add setting** — Settings → Appearance → "默认展开思考过程" (expand reasoning by default) toggle

---

## Phase 2b: Multi-Agent Orchestration v1

### Motivation

The 12 built-in Workspaces with role definitions are the most unique asset. But they're currently passive — users must manually `@` summon each role. This phase makes them **active**: the Orchestrator automatically decomposes tasks, dispatches to the right agents, and coordinates results.

### Architecture

```
User: "Add OAuth login to the app"
         │
         ▼
┌────────────────────────────────────────────────────────┐
│  Orchestrator (BFF service)                             │
│                                                         │
│  1. Intent parsing → "add OAuth" → task decomposition  │
│  2. Workflow DAG:                                       │
│                                                         │
│     🏛 Architect (design schema, choose provider)       │
│          │                                              │
│          ├── 🔒 Security (review OAuth flow)            │
│          │                                              │
│          ├── 🛠 Backend (implement API)                 │
│          │       │                                      │
│          │       └── 🧪 QA (write tests)               │
│          │                                              │
│          └── 🎨 Frontend (build UI)                     │
│                  │                                      │
│                  └── 👁 Reviewer (code review)          │
│                                                         │
│  3. Dispatch: parallel where DAG allows                 │
│  4. Aggregate results → final summary                   │
└────────────────────────────────────────────────────────┘
         │
         ▼
   Chat UI: collapsible execution graph (WorkflowGraph.vue)
```

### New/Changed Files

```
packages/panel-bff/src/
├── services/
│   ├── orchestrator.ts          # NEW: intent → workflow → dispatch
│   ├── agent-dispatcher.ts      # NEW: spawn hermes runs per role
│   ├── workflow-engine.ts       # NEW: DAG execution with parallelism
│   └── agent-evaluator.ts       # NEW: quality scoring per agent
│
packages/panel-web/src/
├── views/
│   └── agents/                  # NEW: Multi-Agent Control Plane
│       └── index.vue
├── components/
│   ├── chat/
│   │   └── WorkflowGraph.vue    # NEW: DAG visualization in chat
│   ├── agents/
│   │   ├── AgentCard.vue        # single agent status card
│   │   ├── AgentGraph.vue       # real-time agent call graph (vue-flow)
│   │   └── QualityScoreBadge.vue
│   └── workflow/
│       ├── WorkflowEditor.vue   # NEW: drag-drop workflow builder (vue-flow)
│       ├── NodePalette.vue      # draggable node types
│       └── WorkflowTemplateCard.vue
├── stores/
│   ├── agents.ts                # NEW: agent state for control plane
│   └── workflows.ts             # NEW: workflow templates + runs
```

### Task 2b.1: Orchestrator Engine

**Goal:** When a user sends a message in a Workspace context, the Orchestrator analyzes intent, decomposes into subtasks, and dispatches to the appropriate roles. User can disable orchestration (direct chat mode) or enable it per-message with `/orchestrate` command.

- [ ] **Step 1: Define workflow DAG model** (`packages/panel-shared/src/types/workflow.ts`)

```typescript
interface WorkflowNode {
  id: string
  roleName: string        // which role handles this
  prompt: string           // what to tell the agent
  dependsOn: string[]      // node IDs that must complete first
  tools: string[]          // tools to enable (subset of role's full tools)
  timeoutMs: number        // per-node timeout
}

interface WorkflowDefinition {
  nodes: WorkflowNode[]
  parallelGroups: string[][]  // groups of nodes that can run in parallel
  aggregatorRole?: string     // role that summarizes results (default: orchestrator)
}
```

- [ ] **Step 2: Implement orchestrator.ts**
  - `analyzeIntent(message, workspace)` → calls a fast cheap model (Haiku/DeepSeek-flash) to classify intent + suggest task decomposition
  - `planWorkflow(intent, workspace)` → maps intent to workflow template, or generates ad-hoc DAG
  - Returns `WorkflowDefinition` — shown to user in a preview card before execution
- [ ] **Step 3: Implement workflow-engine.ts**
  - Execute DAG respecting `dependsOn` and `parallelGroups`
  - Each node: spawn a hermes run with the role's model + system prompt + tools
  - Progress reporting via SSE events pushed to frontend
  - On node failure: retry once, then mark failed, continue siblings (fail-fast=false by default)
  - Aggregation: feed all node outputs into aggregator role for final summary
- [ ] **Step 4: Orchestrator UX in Composer**
  - `/orchestrate <task>` command or "Orchestrate" toggle button
  - Preview card: shows the planned DAG before execution with [Approve] [Edit] [Cancel]
  - User can remove nodes, reorder, add notes to any node
  - During execution: WorkflowGraph.vue shows live progress

### Task 2b.2: Workflow Editor (vue-flow)

**Goal:** Visual drag-and-drop editor for creating and customizing workflow templates. Users can define reusable multi-agent pipelines.

- [ ] **Step 1: Install vue-flow** — `pnpm --filter @hermes-panel/web add @vue-flow/core @vue-flow/background @vue-flow/controls @vue-flow/minimap`
- [ ] **Step 2: Build NodePalette.vue** — sidebar with draggable node types: Agent (existing role), Tool (existing MCP/skill), Condition (if/else branch), Parallel (fork/join), HumanApproval (checkpoint)
- [ ] **Step 3: Build WorkflowEditor.vue** — main canvas
  - Drag nodes from palette → canvas
  - Connect nodes with edges (represents data flow + dependency)
  - Node inspector (click node → edit role/model/prompt/tools/timeout)
  - Save as template → stored in panel.db `workflows` table
  - Export/Import as `.workflow.json`
- [ ] **Step 4: Wire to Workspace** — workspace detail drawer shows available workflow templates; Chat Composer `/wf <name>` triggers a saved workflow

### Task 2b.3: Multi-Agent Control Plane

**Goal:** A real-time dashboard showing all active agents, their status, call relationships, and quality metrics.

- [ ] **Step 1: Create `/agents` route** (`views/agents/index.vue`)
  - Grid of AgentCard components — one per active role in current workspace
  - Each card: role icon + name, status (idle/thinking/tool_use/waiting), current task, elapsed time, quality score, token usage
  - Top bar: workspace selector, [Pause All] [Resume All] buttons
  - Click agent → expand to show detailed activity log
- [ ] **Step 2: Create AgentGraph.vue** — vue-flow canvas showing real-time agent call relationships
  - Orchestrator at center/top
  - Arrows = dispatch/call relationships, animated when active
  - Node color = status (green idle, blue thinking, orange tool, red error)
  - Click node → jump to that agent's chat thread
- [ ] **Step 3: Create agents.ts Pinia store**
  - Poll BFF every 1s for agent states (or SSE push)
  - Derive: active count, idle count, error count, total token burn rate
- [ ] **Step 4: BFF agent state tracking** (`services/agent-tracker.ts`)
  - Track hermes run lifecycle: run.created → run.started → tool.started → run.completed
  - Write state snapshots to panel.db `agent_states` table
  - SSE endpoint: `GET /api/agents/stream` for live updates

### Task 2b.4: Agent Quality Evaluation

**Goal:** After each agent completes a task, a lightweight evaluator scores the output for quality and hallucination. This feeds into the Control Plane's quality score badges and model replacement suggestions.

- [ ] **Step 1: Implement agent-evaluator.ts**
  - Listens for `run.completed` events
  - Sends agent output + context to a fast cheap evaluator model (Haiku)
  - Evaluator prompt asks: "Rate this response on factual accuracy (0-100), logical consistency (0-100), task completeness (0-100), and proper citations (0-100). Flag any statements that appear fabricated."
  - Composite quality score = weighted average
  - Hallucination rate = flagged statements / total factual claims
- [ ] **Step 2: Store results** — write to `agent_states` table (quality_score, hallucination_rate columns) + `agent_evaluations` table for historical trending
- [ ] **Step 3: UI integration**
  - QualityScoreBadge.vue — inline badge on agent name (⭐⭐⭐ 87)
  - MessageBubble — expandable "Quality Report" section below agent messages
  - Agent detail panel — 7-day quality trend sparkline
  - Dashboard — new "Agent Quality" card (spec §21.1.4 mockup)
- [ ] **Step 4: Model replacement suggestion**
  - If an agent's 7-day quality < 80 and hallucination > 3%, surface recommendation in Control Plane
  - "📚 Researcher (DeepSeek-v4) quality 76 · hallucination 4.8% → Try Sonnet (91 quality, 1.2% hallucination) [Swap]"

---

## Phase 2c: Autonomous Mode

### Motivation

Codex's "Full Auto" mode is the benchmark. Hermes Panel needs an equivalent: the user gives a high-level goal, the Orchestrator plans and dispatches, agents execute autonomously, and a review queue lets the human approve/reject changes before they land.

### Architecture

```
User gives goal → Orchestrator plans → agents execute autonomously
                                              │
                            ┌─────────────────┼─────────────────┐
                            ▼                 ▼                  ▼
                       file writes       shell commands      code changes
                            │                 │                  │
                            └─────────────────┼──────────────────┘
                                              ▼
                                    ┌─────────────────┐
                                    │  Review Queue    │
                                    │  (unified inbox) │
                                    └────────┬────────┘
                                             │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                          [Approve]     [Reject]     [Approve All]
                              │              │
                              ▼              ▼
                          Apply diff    Discard + tell agent
```

### New Components

```
packages/panel-web/src/
├── views/
│   └── inbox/                   # NEW: Review Queue + Reports
│       └── index.vue
├── components/
│   └── inbox/
│       ├── ReviewCard.vue       # unified review item card
│       ├── DiffViewer.vue       # side-by-side diff (Monaco diff mode)
│       ├── CommandPreview.vue   # shell command preview with risk badge
│       └── InboxFilter.vue      # filter by type/agent/status
```

### Task 2c.1: Review Queue (Inbox)

**Goal:** All agent actions that modify files or execute commands are routed through a unified review queue. User reviews diffs and approves/rejects in a single interface.

- [ ] **Step 1: Create `/inbox` route** (`views/inbox/index.vue`)
  - Three-column: filter sidebar | review list | detail panel (diff/command view)
  - Tabs at top: All | Diffs | Commands | Handoffs | Ready for Review
  - Each item: agent icon + name, action summary, file/command, timestamp, [Approve] [Reject]
- [ ] **Step 2: BFF review routes** (`routes/review.ts` extended)
  - `GET /api/review/items?status=pending&type=` — list review items
  - `POST /api/review/:id/approve` — apply diff or execute command
  - `POST /api/review/:id/reject` — discard with optional rejection reason
  - `POST /api/review/approve-all` — bulk approve (with confirmation)
- [ ] **Step 3: Intercept agent actions** — extend sandbox.ts and hermes-proxy.ts
  - In Full Auto mode: file writes → create review_item with diff → pause agent
  - User approves → apply change → resume agent with "Change approved" context
  - User rejects → discard → resume agent with "Change rejected: <reason>" context
- [ ] **Step 4: Monaco DiffViewer** — reuse MonacoEditor.vue in diff mode for side-by-side diff review

### Task 2c.2: Execution Modes

**Goal:** Three execution modes, selectable per-session or per-workspace.

| Mode | Reads Files | Writes Files | Runs Commands | User Involvement |
|------|------------|--------------|---------------|------------------|
| **Suggest** (default) | Auto | Approval needed | Approval needed | Every action |
| **Auto Edit** | Auto | Auto | Approval needed | Only shell commands |
| **Full Auto** | Auto | Auto (queued) | Auto (queued) | Review queue, can approve in batch |

- [ ] **Step 1: Mode selector UI** — dropdown in Composer footer or session settings
  - Show current mode with color indicator (Suggest=blue, Auto Edit=yellow, Full Auto=red)
  - Tooltip explaining what each mode does
  - Full Auto shows warning on first enable per session
- [ ] **Step 2: Session-level mode state** — stored in panel.db for persistence across page reloads
- [ ] **Step 3: Workspace-level mode default** — each workspace can set a default mode (dev-squad=Auto Edit, legal-desk=Suggest only)

### Task 2c.3: Voice Input

**Goal:** Web Speech API-based voice input in the Composer. Simple, lightweight, no external service dependency.

- [ ] **Step 1: Create useVoiceInput composable** (`composables/useVoiceInput.ts`)
  - Use `SpeechRecognition` (Web Speech API, available in Chrome/Safari/Edge)
  - Hold mic button in Composer → recording → release → transcribe to text
  - Show interim results as ghost text while speaking
  - Fallback: if SpeechRecognition unavailable, hide mic button (capability gate)
- [ ] **Step 2: Add mic button to Composer** — right side of input, icon-only, changes color when recording
- [ ] **Step 3: i18n for voice** — set recognition language to match current UI language (`zh-CN` / `en-US` / `ja-JP`)

---

## Phase 2d: Cross-Platform Polish & Performance

### Task 2d.1: Windows + Linux Tauri Build Verification

- [ ] **Step 1: Windows Tauri build** — verify `.msi` and `.exe` builds, WebView2 bootstrap, Defender false-positive submission
- [ ] **Step 2: Linux Tauri build** — verify `.deb`, `.rpm`, `.AppImage` builds, libwebkit2gtk dependency check
- [ ] **Step 3: CI matrix** — add Windows and Linux to release workflow, auto-sign + notarize

### Task 2d.2: PWA Offline Mode

- [ ] **Step 1: Service Worker caching strategy** — cache app shell + static assets; API responses use network-first with stale-while-revalidate for sessions list
- [ ] **Step 2: Offline chat queue** — messages composed while offline are queued in IndexedDB, sent when connectivity returns
- [ ] **Step 3: Offline badge** — status bar indicator showing offline state + queued message count

### Task 2d.3: Performance Targets

| Metric | Target | Current (estimate) | Action |
|--------|--------|---------------------|--------|
| Initial load (Vite build) | < 1.5s LCP | ~2s | Manual chunks: monaco, echarts, vue-flow in separate chunks |
| Route switch | < 200ms | ~150ms | Already good, verify after Monaco lazy load |
| SSE latency (TTFT) | < 50ms from hermes event | ~30ms | Already good |
| Memory (idle) | < 80MB (WebView) | TBD | Profile with Tauri devtools |
| Bundle size (gzipped) | < 500KB initial (excl. lazy chunks) | ~350KB | Verify after Monaco added |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| Hermes Agent community stagnates | Medium | High | Panel becomes agent-agnostic via provider abstraction layer (Phase 2b) |
| Monaco Editor bundle too large | High | Low | Lazy-load as separate chunk; only load on `/files` route visit |
| Docker not available on user machine | High | Medium | Graceful fallback: direct execution with sudo-style approval |
| Orchestrator quality depends on underlying model | High | High | Allow manual DAG editing before execution; support `@role` direct call as escape hatch |
| Windows Tauri WebView2 compatibility | Medium | Medium | Early CI testing; Evergreen WebView2 bootstrap |
| Web Speech API availability (Firefox) | Low | Low | Feature-gate via capabilities; show "browser not supported" tooltip |

---

## Success Metrics

| Metric | Baseline | Target | Measured By |
|--------|---------|--------|-------------|
| Orchestrator task completion rate | N/A | > 80% of planned tasks complete without human intervention | panel.db workflow_runs |
| Review queue time-to-approve | N/A | < 30s median | panel.db review_items |
| Agent quality score | N/A | Average > 80 across all agents | agent-evaluator |
| Cross-platform build success | macOS only | 3-platform CI green | GitHub Actions |
| Monaco load time | N/A | < 2s on fast 3G | Lighthouse |
| PWA offline readiness | Online only | Read sessions + queue messages offline | Lighthouse PWA audit |

---

## Out of Scope (Later Plans)

- WeChat/Feishu OAuth login (spec §21.1.10) — requires external service integration
- 2000+ Skill marketplace from agentskills.io (spec §21.3.2) — depends on external API
- Tailscale private network mode (spec §21.2.6) — niche, defer to v0.3
- AI-powered prompt self-optimization (spec §12) — requires significant ML infra
- Self-learning Insights engine (spec §14) — depends on prompt optimization
- Hermes Control Center enhancements (spec §21.3.3) — already partially implemented
- 4 additional layout variants (spec §4.6) — nice-to-have, not strategic
- TUI embed / xterm.js (spec §21.1.7) — conflicts with GUI-first positioning
- CLI Bridge full bidirectional sync (spec §21.1.9) — partial sync exists, full sync is complex

---

## Appendix: Package Dependency Changes

### New Dependencies

```json
// panel-web
{
  "monaco-editor": "^0.52.0",        // lazy chunk
  "@monaco-editor/loader": "^1.4.0",
  "@vue-flow/core": "^1.42.0",       // workflow editor + agent graph
  "@vue-flow/background": "^1.3.0",
  "@vue-flow/controls": "^1.1.0",
  "@vue-flow/minimap": "^1.5.0"
}

// panel-bff
{
  "dockerode": "^4.0.2"              // Docker API client
}
// devDependencies
{
  "@types/dockerode": "^3.3.31"
}
```

### Existing Dependencies Upgraded

None required. Current stack (Vue 3.5, Vite 6, Koa 2.15, better-sqlite3 11, Pinia 2, Naive UI 2.40, Tailwind 4) supports all new features.

---

**END OF PLAN 2**
