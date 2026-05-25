# Plan 1: MVP Skeleton + Chat Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the smallest end-to-end working slice: project skeleton + BFF + Tauri shell + Chat page that streams from local Hermes Agent.

**Architecture:** pnpm monorepo (`panel-web` Vue3 + `panel-bff` Koa + `panel-desktop` Tauri 2). Chat directly streams from Hermes `:8642/v1/runs` (SSE), BFF only serves `/api/sessions` and `/api/system/health`. Session token injected via `<meta>`; hermes API key fetched once from BFF in memory.

**Tech Stack:** Vue 3.5 · Vite 6 · TypeScript 5.4 · Naive UI · Tailwind v4 · Pinia · vue-router · vue-i18n · Koa · better-sqlite3 · Tauri 2 · pnpm workspaces.

**Spec Reference:** `docs/superpowers/specs/2026-05-25-hermes-panel-design.md` §1–§5, §21.1.1, §21.1.5

**Out of Scope (later plans):** Dashboard/Sessions/Tools/Settings pages · Workspaces · Multi-role orchestration · Notifications · i18n full coverage · Hallucination detection · Monaco editor · CLI Bridge · WeChat login · Token optimization · Cron · Insights · Developer mode

---

## File Structure

```
hermes-panel/
├── package.json                          # workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .editorconfig
├── .gitignore
├── .gitattributes                        # force LF
├── README.md
├── LICENSE                               # MIT
│
├── packages/
│   ├── panel-shared/                     # shared types & constants
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types/
│   │       │   ├── chat.ts               # SSE event types
│   │       │   ├── session.ts            # Session DTO
│   │       │   └── system.ts             # HealthStatus DTO
│   │       └── constants.ts              # ports, keys
│   │
│   ├── panel-web/                        # Vue 3 frontend
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.ts
│   │       ├── App.vue
│   │       ├── env.d.ts
│   │       ├── api/
│   │       │   ├── hermes.ts             # direct hermes :8642 client
│   │       │   ├── bff.ts                # BFF :5667 client
│   │       │   └── token.ts              # read panel-token from <meta>
│   │       ├── stores/
│   │       │   ├── session.ts            # current session + messages
│   │       │   ├── chat-stream.ts        # SSE state machine
│   │       │   ├── system.ts             # health + key
│   │       │   └── settings.ts           # model/theme
│   │       ├── views/
│   │       │   └── chat/index.vue
│   │       ├── components/
│   │       │   ├── chat/
│   │       │   │   ├── MessageBubble.vue
│   │       │   │   ├── ToolCallCard.vue
│   │       │   │   ├── Composer.vue
│   │       │   │   ├── ComposerFooter.vue
│   │       │   │   ├── ContextRing.vue
│   │       │   │   └── SessionRail.vue
│   │       │   └── shared/
│   │       │       ├── EmptyState.vue
│   │       │       └── CodeBlock.vue
│   │       ├── layouts/
│   │       │   └── DefaultLayout.vue
│   │       ├── router/
│   │       │   └── index.ts
│   │       ├── locales/
│   │       │   ├── index.ts
│   │       │   ├── zh-CN.ts
│   │       │   └── en-US.ts
│   │       └── styles/
│   │           └── theme.css             # design tokens
│   │
│   ├── panel-bff/                        # Koa BFF
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── server.ts                 # entry
│   │   │   ├── routes/
│   │   │   │   ├── sessions.ts
│   │   │   │   ├── system.ts
│   │   │   │   └── token.ts
│   │   │   ├── services/
│   │   │   │   ├── hermes-cli.ts
│   │   │   │   └── hermes-home.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   └── error.ts
│   │   │   └── lib/
│   │   │       ├── token.ts
│   │   │       └── logger.ts
│   │   └── tests/
│   │       ├── routes/
│   │       │   ├── sessions.test.ts
│   │       │   └── system.test.ts
│   │       └── services/
│   │           └── hermes-cli.test.ts
│   │
│   ├── panel-desktop/                    # Tauri 2 shell
│   │   ├── package.json
│   │   └── src-tauri/
│   │       ├── Cargo.toml
│   │       ├── tauri.conf.json
│   │       ├── build.rs
│   │       ├── icons/
│   │       └── src/
│   │           ├── main.rs
│   │           ├── hermes.rs
│   │           └── bff.rs
│   │
│   └── fake-hermes/                      # test mock
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── server.ts                 # OpenAI-compatible fake :8642
│           ├── cli.ts                    # hermes CLI subset
│           └── fixtures/
│               └── sse-replay.jsonl
│
└── docs/
    └── (existing)
```

---

## Task 1: Workspace bootstrap

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.editorconfig`
- Create: `.gitignore`
- Create: `.gitattributes`
- Create: `README.md`
- Create: `LICENSE`

- [ ] **Step 1: Create `package.json` (workspace root)**

```json
{
  "name": "hermes-panel",
  "version": "0.1.0-alpha.0",
  "private": true,
  "type": "module",
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint",
    "typecheck": "pnpm -r run typecheck",
    "fake-hermes": "pnpm --filter fake-hermes dev"
  },
  "devDependencies": {
    "typescript": "5.4.5"
  },
  "packageManager": "pnpm@10.19.0"
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "useDefineForClassFields": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2022"]
  }
}
```

- [ ] **Step 4: Create `.editorconfig`**

```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.{md,markdown}]
trim_trailing_whitespace = false
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
target/
*.log
.DS_Store
.env
.env.local
*.tsbuildinfo
.vite/
.turbo/
coverage/
.tauri/
src-tauri/target/
src-tauri/gen/
```

- [ ] **Step 6: Create `.gitattributes` (force LF, prevent Windows CRLF issues for SSE)**

```
* text=auto eol=lf
*.png binary
*.jpg binary
*.ico binary
*.icns binary
```

- [ ] **Step 7: Create `README.md`**

```markdown
# Hermes Panel

Beautiful Web UI for [Hermes Agent](https://github.com/NousResearch/hermes-agent).

## Development

```bash
pnpm install
pnpm dev
```

See `docs/superpowers/specs/2026-05-25-hermes-panel-design.md` for design.

## License

MIT
```

- [ ] **Step 8: Create `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 Hermes Panel Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 9: Install root deps and verify**

```bash
pnpm install
```

Expected: `Done in <Ns>` with `node_modules/` created.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: workspace bootstrap (pnpm monorepo + tsconfig + tooling)"
```

---

## Task 2: Shared types package

**Files:**
- Create: `packages/panel-shared/package.json`
- Create: `packages/panel-shared/tsconfig.json`
- Create: `packages/panel-shared/src/index.ts`
- Create: `packages/panel-shared/src/constants.ts`
- Create: `packages/panel-shared/src/types/chat.ts`
- Create: `packages/panel-shared/src/types/session.ts`
- Create: `packages/panel-shared/src/types/system.ts`

- [ ] **Step 1: Create `packages/panel-shared/package.json`**

```json
{
  "name": "@hermes-panel/shared",
  "version": "0.1.0-alpha.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Create `packages/panel-shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/panel-shared/src/constants.ts`**

```ts
export const PORTS = {
  HERMES_API: 8642,
  PANEL_WEB: 5666,
  PANEL_BFF: 5667,
  FAKE_HERMES: 18642,
} as const;

export const HEADERS = {
  PANEL_TOKEN: 'X-Panel-Token',
  HERMES_SESSION: 'X-Hermes-Session-Id',
} as const;

export const ENV = {
  HERMES_HOME: 'HERMES_HOME',
  PANEL_HOME: 'PANEL_HOME',
  PANEL_TOKEN: 'PANEL_TOKEN',
  HERMES_API_KEY: 'HERMES_API_KEY',
  HERMES_API_BASE: 'HERMES_API_BASE',
  BFF_PORT: 'BFF_PORT',
} as const;
```

- [ ] **Step 4: Create `packages/panel-shared/src/types/chat.ts`**

```ts
export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
  createdAt: number;
  completed: boolean;
  tokenUsage?: TokenUsage;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'running' | 'done' | 'error';
  errorMessage?: string;
  startedAt: number;
  completedAt?: number;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  cached: number;
  total: number;
  cost?: number;
}

export type SSEEvent =
  | { type: 'message.start'; messageId: string; role: Role }
  | { type: 'message.delta'; messageId: string; text: string }
  | { type: 'message.reasoning'; messageId: string; text: string }
  | { type: 'tool.call.start'; toolCallId: string; messageId: string; name: string; input: Record<string, unknown> }
  | { type: 'tool.call.result'; toolCallId: string; output: unknown }
  | { type: 'tool.call.error'; toolCallId: string; error: string }
  | { type: 'message.complete'; messageId: string; usage?: TokenUsage }
  | { type: 'run.done'; runId: string }
  | { type: 'run.error'; runId: string; error: string };
```

- [ ] **Step 5: Create `packages/panel-shared/src/types/session.ts`**

```ts
export interface SessionSummary {
  id: string;
  title: string;
  model: string;
  messageCount: number;
  tokenTotal: number;
  createdAt: number;
  updatedAt: number;
}

export interface SessionDetail extends SessionSummary {
  messages: import('./chat.js').ChatMessage[];
}
```

- [ ] **Step 6: Create `packages/panel-shared/src/types/system.ts`**

```ts
export interface HealthStatus {
  hermes: {
    running: boolean;
    version: string | null;
    apiBase: string;
    error?: string;
  };
  bff: {
    running: boolean;
    version: string;
    uptimeSec: number;
  };
  panel: {
    version: string;
  };
}
```

- [ ] **Step 7: Create `packages/panel-shared/src/index.ts`**

```ts
export * from './constants.js';
export * from './types/chat.js';
export * from './types/session.js';
export * from './types/system.js';
```

- [ ] **Step 8: Typecheck**

```bash
pnpm --filter @hermes-panel/shared typecheck
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(shared): add shared types and constants"
```

---

## Task 3: Fake Hermes for testing

**Files:**
- Create: `packages/fake-hermes/package.json`
- Create: `packages/fake-hermes/tsconfig.json`
- Create: `packages/fake-hermes/src/server.ts`
- Create: `packages/fake-hermes/src/fixtures/sse-replay.jsonl`

- [ ] **Step 1: Create `packages/fake-hermes/package.json`**

```json
{
  "name": "fake-hermes",
  "version": "0.1.0-alpha.0",
  "private": true,
  "type": "module",
  "bin": {
    "fake-hermes": "./dist/cli.js"
  },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "tsx src/server.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@hermes-panel/shared": "workspace:*"
  },
  "devDependencies": {
    "tsx": "4.19.0",
    "@types/node": "20.14.10",
    "typescript": "5.4.5"
  }
}
```

- [ ] **Step 2: Create `packages/fake-hermes/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/fake-hermes/src/fixtures/sse-replay.jsonl`** (one fixture conversation)

```jsonl
{"type":"message.start","messageId":"m_1","role":"assistant","delayMs":100}
{"type":"message.reasoning","messageId":"m_1","text":"用户问北京今天天气。我需要调用 web_search 工具。","delayMs":300}
{"type":"tool.call.start","toolCallId":"tc_1","messageId":"m_1","name":"web_search","input":{"query":"北京今日天气"},"delayMs":200}
{"type":"tool.call.result","toolCallId":"tc_1","output":{"temp":"18-26℃","condition":"多云","wind":"东南风3级"},"delayMs":600}
{"type":"message.delta","messageId":"m_1","text":"北京今天","delayMs":80}
{"type":"message.delta","messageId":"m_1","text":"多云","delayMs":80}
{"type":"message.delta","messageId":"m_1","text":"，气温 18-26℃，","delayMs":80}
{"type":"message.delta","messageId":"m_1","text":"东南风 3 级。","delayMs":80}
{"type":"message.complete","messageId":"m_1","usage":{"prompt":142,"completion":92,"cached":120,"total":234,"cost":0.00023},"delayMs":100}
{"type":"run.done","runId":"run_abc123","delayMs":50}
```

- [ ] **Step 4: Create `packages/fake-hermes/src/server.ts`**

```ts
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PORTS } from '@hermes-panel/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? PORTS.FAKE_HERMES);

const sseReplay = readFileSync(
  join(__dirname, 'fixtures/sse-replay.jsonl'),
  'utf-8'
).trim().split('\n').map(line => JSON.parse(line));

const runs = new Map<string, { createdAt: number }>();

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  // CORS for browser dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (url.pathname === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', version: 'fake-0.1.0' }));
    return;
  }

  if (url.pathname === '/v1/models' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      object: 'list',
      data: [{ id: 'hermes-agent', object: 'model', created: 0, owned_by: 'hermes' }],
    }));
    return;
  }

  if (url.pathname === '/v1/runs' && req.method === 'POST') {
    const runId = `run_${Math.random().toString(36).slice(2, 10)}`;
    runs.set(runId, { createdAt: Date.now() });
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ run_id: runId, status: 'queued' }));
    return;
  }

  const runMatch = url.pathname.match(/^\/v1\/runs\/([^/]+)\/events$/);
  if (runMatch && req.method === 'GET') {
    const runId = runMatch[1];
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    for (const event of sseReplay) {
      const { delayMs, ...payload } = event;
      await new Promise(r => setTimeout(r, delayMs ?? 100));
      const finalPayload = payload.type === 'run.done' ? { ...payload, runId } : payload;
      res.write(`event: ${payload.type}\n`);
      res.write(`data: ${JSON.stringify(finalPayload)}\n\n`);
    }
    res.end();
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found', path: url.pathname }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`fake-hermes listening on http://127.0.0.1:${PORT}`);
});
```

- [ ] **Step 5: Install fake-hermes deps**

```bash
pnpm install
```

- [ ] **Step 6: Start and verify fake-hermes**

```bash
pnpm --filter fake-hermes start &
sleep 1
curl -s http://127.0.0.1:18642/health
curl -s http://127.0.0.1:18642/v1/models
```

Expected:
- `{"status":"ok","version":"fake-0.1.0"}`
- Models list with `hermes-agent`

Kill the bg process:

```bash
pkill -f "fake-hermes" || true
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(fake-hermes): add OpenAI-compatible mock server for testing"
```

---

## Task 4: BFF skeleton — server + auth + error middleware

**Files:**
- Create: `packages/panel-bff/package.json`
- Create: `packages/panel-bff/tsconfig.json`
- Create: `packages/panel-bff/src/lib/logger.ts`
- Create: `packages/panel-bff/src/lib/token.ts`
- Create: `packages/panel-bff/src/middleware/error.ts`
- Create: `packages/panel-bff/src/middleware/auth.ts`
- Create: `packages/panel-bff/src/server.ts`

- [ ] **Step 1: Create `packages/panel-bff/package.json`**

```json
{
  "name": "@hermes-panel/bff",
  "version": "0.1.0-alpha.0",
  "private": true,
  "type": "module",
  "main": "./dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "tsx src/server.ts",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@hermes-panel/shared": "workspace:*",
    "@koa/router": "13.1.0",
    "koa": "2.15.3",
    "koa-bodyparser": "4.4.1",
    "pino": "9.4.0",
    "pino-pretty": "11.2.2"
  },
  "devDependencies": {
    "@types/koa": "2.15.0",
    "@types/koa__router": "12.0.4",
    "@types/koa-bodyparser": "4.3.12",
    "@types/node": "20.14.10",
    "@types/supertest": "6.0.2",
    "supertest": "7.0.0",
    "tsx": "4.19.0",
    "typescript": "5.4.5",
    "vitest": "2.1.1"
  }
}
```

- [ ] **Step 2: Create `packages/panel-bff/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["tests/**/*"]
}
```

- [ ] **Step 3: Create `packages/panel-bff/src/lib/logger.ts`**

```ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});
```

- [ ] **Step 4: Create `packages/panel-bff/src/lib/token.ts`**

```ts
import { randomBytes } from 'node:crypto';

let cached: string | null = null;

export function getSessionToken(): string {
  if (cached) return cached;
  cached = process.env.PANEL_TOKEN ?? randomBytes(32).toString('hex');
  return cached;
}

export function regenerateToken(): string {
  cached = randomBytes(32).toString('hex');
  return cached;
}
```

- [ ] **Step 5: Create `packages/panel-bff/src/middleware/error.ts`**

```ts
import type { Middleware } from 'koa';
import { logger } from '../lib/logger.js';

export const errorMiddleware: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string; expose?: boolean };
    const status = e.status ?? 500;
    const code = e.code ?? 'INTERNAL_ERROR';
    const message = e.expose || status < 500 ? (e.message ?? 'error') : 'internal server error';
    logger.error({ err, code, status, path: ctx.path }, 'request failed');
    ctx.status = status;
    ctx.body = { error: { code, message } };
  }
};
```

- [ ] **Step 6: Create `packages/panel-bff/src/middleware/auth.ts`**

```ts
import type { Middleware } from 'koa';
import { HEADERS } from '@hermes-panel/shared';
import { getSessionToken } from '../lib/token.js';

export const authMiddleware: Middleware = async (ctx, next) => {
  // Allow health check without auth so Tauri can probe
  if (ctx.path === '/api/system/health') {
    await next();
    return;
  }
  const provided = ctx.headers[HEADERS.PANEL_TOKEN.toLowerCase()];
  if (provided !== getSessionToken()) {
    ctx.status = 401;
    ctx.body = { error: { code: 'UNAUTHORIZED', message: 'invalid panel token' } };
    return;
  }
  await next();
};
```

- [ ] **Step 7: Create `packages/panel-bff/src/server.ts`** (minimal skeleton; routes added later)

```ts
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { PORTS } from '@hermes-panel/shared';
import { logger } from './lib/logger.js';
import { errorMiddleware } from './middleware/error.js';
import { authMiddleware } from './middleware/auth.js';
import { getSessionToken } from './lib/token.js';

export function createApp(): Koa {
  const app = new Koa();
  const router = new Router({ prefix: '/api' });

  // Routes registered in later tasks
  // router.use(systemRouter.routes());
  // router.use(sessionsRouter.routes());
  // router.use(tokenRouter.routes());

  app.use(errorMiddleware);
  app.use(bodyParser());
  app.use(authMiddleware);
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.BFF_PORT ?? PORTS.PANEL_BFF);
  const token = getSessionToken();
  logger.info({ port, token: token.slice(0, 8) + '...' }, 'starting bff');
  createApp().listen(port, '127.0.0.1', () => {
    logger.info(`bff listening on http://127.0.0.1:${port}`);
  });
}
```

- [ ] **Step 8: Install BFF deps**

```bash
pnpm install
```

- [ ] **Step 9: Boot test — start and stop**

```bash
PANEL_TOKEN=test123 pnpm --filter @hermes-panel/bff start &
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5667/api/system/health
pkill -f "@hermes-panel/bff" || pkill -f "panel-bff/src/server" || true
```

Expected: `404` (no routes yet, but server is up and responding).

- [ ] **Step 10: Typecheck**

```bash
pnpm --filter @hermes-panel/bff typecheck
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(bff): skeleton with auth + error middleware + token generator"
```

---

## Task 5: BFF — hermes-cli service + tests

**Files:**
- Create: `packages/panel-bff/src/services/hermes-cli.ts`
- Create: `packages/panel-bff/src/services/hermes-home.ts`
- Create: `packages/panel-bff/tests/services/hermes-cli.test.ts`
- Create: `packages/panel-bff/vitest.config.ts`

- [ ] **Step 1: Create `packages/panel-bff/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 2: Create `packages/panel-bff/src/services/hermes-home.ts`**

```ts
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export function getHermesHome(): string {
  return process.env.HERMES_HOME ?? join(homedir(), '.hermes');
}

export function getPanelHome(): string {
  return process.env.PANEL_HOME ?? join(homedir(), '.hermes-panel');
}

export function hermesHomeExists(): boolean {
  return existsSync(getHermesHome());
}
```

- [ ] **Step 3: Write failing test for `hermes-cli.run()`**

Create `packages/panel-bff/tests/services/hermes-cli.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runHermesCli } from '../../src/services/hermes-cli.js';

describe('runHermesCli', () => {
  it('returns parsed JSON stdout for a quiet hermes call', async () => {
    // Use `node -e` to simulate a fast hermes-like binary
    const result = await runHermesCli(['--version-json'], {
      hermesBin: 'node',
      argsPrefix: ['-e', `console.log(JSON.stringify({version:'fake-0.8.0'}))`],
      timeoutMs: 2000,
    });
    expect(result.parsed).toEqual({ version: 'fake-0.8.0' });
    expect(result.exitCode).toBe(0);
  });

  it('returns error when binary not found', async () => {
    await expect(
      runHermesCli(['--version'], { hermesBin: 'does-not-exist-binary-xyz', timeoutMs: 1000 })
    ).rejects.toMatchObject({ code: 'HERMES_CLI_NOT_FOUND' });
  });

  it('times out a long-running command', async () => {
    await expect(
      runHermesCli([], {
        hermesBin: 'node',
        argsPrefix: ['-e', 'setTimeout(() => {}, 10000)'],
        timeoutMs: 200,
      })
    ).rejects.toMatchObject({ code: 'HERMES_CLI_TIMEOUT' });
  });
});
```

- [ ] **Step 4: Run failing test**

```bash
pnpm --filter @hermes-panel/bff test
```

Expected: FAIL — `runHermesCli` not defined.

- [ ] **Step 5: Implement `hermes-cli.ts`**

Create `packages/panel-bff/src/services/hermes-cli.ts`:

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface RunOptions {
  hermesBin?: string;
  argsPrefix?: string[];
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  parsed?: unknown;
}

export class HermesCliError extends Error {
  constructor(public code: string, message: string, public detail?: unknown) {
    super(message);
    this.name = 'HermesCliError';
  }
}

export async function runHermesCli(
  args: string[],
  options: RunOptions = {}
): Promise<RunResult> {
  const bin = options.hermesBin ?? process.env.HERMES_BIN ?? 'hermes';
  const allArgs = [...(options.argsPrefix ?? []), ...args];
  const timeoutMs = options.timeoutMs ?? 15_000;

  try {
    const { stdout, stderr } = await execFileAsync(bin, allArgs, {
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, ...(options.env ?? {}) },
      shell: false,
    });
    let parsed: unknown;
    const trimmed = stdout.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { parsed = JSON.parse(trimmed); } catch { /* leave undefined */ }
    }
    return { stdout, stderr, exitCode: 0, parsed };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { killed?: boolean; signal?: string; stdout?: string; stderr?: string; code?: string | number };
    if (e.code === 'ENOENT') {
      throw new HermesCliError('HERMES_CLI_NOT_FOUND', `hermes binary not found: ${bin}`);
    }
    if (e.killed && e.signal === 'SIGTERM') {
      throw new HermesCliError('HERMES_CLI_TIMEOUT', `hermes call timed out after ${timeoutMs}ms`);
    }
    throw new HermesCliError(
      'HERMES_CLI_FAILED',
      `hermes call failed: ${e.message ?? String(err)}`,
      { stderr: e.stderr ?? '', exitCode: typeof e.code === 'number' ? e.code : -1 }
    );
  }
}
```

- [ ] **Step 6: Run tests, expect pass**

```bash
pnpm --filter @hermes-panel/bff test
```

Expected: 3 passing tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(bff): hermes-cli service with timeout + error codes + tests"
```

---

## Task 6: BFF routes — /api/system/health + /api/token

**Files:**
- Create: `packages/panel-bff/src/routes/system.ts`
- Create: `packages/panel-bff/src/routes/token.ts`
- Modify: `packages/panel-bff/src/server.ts`
- Create: `packages/panel-bff/tests/routes/system.test.ts`

- [ ] **Step 1: Write failing test for `/api/system/health`**

Create `packages/panel-bff/tests/routes/system.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { getSessionToken } from '../../src/lib/token.js';

let request: ReturnType<typeof supertest>;
let token: string;

beforeAll(() => {
  process.env.HERMES_BIN = 'does-not-exist-xxx';  // force hermes-not-found path
  const app = createApp();
  request = supertest(app.callback());
  token = getSessionToken();
});

describe('GET /api/system/health', () => {
  it('returns 200 with hermes.running=false when binary missing (no auth required)', async () => {
    const res = await request.get('/api/system/health');
    expect(res.status).toBe(200);
    expect(res.body.hermes.running).toBe(false);
    expect(res.body.bff.running).toBe(true);
    expect(typeof res.body.bff.uptimeSec).toBe('number');
  });
});

describe('GET /api/token', () => {
  it('returns 401 without token header', async () => {
    const res = await request.get('/api/token');
    expect(res.status).toBe(401);
  });

  it('returns hermes api key (or null) with valid token', async () => {
    const res = await request.get('/api/token').set('X-Panel-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hermesApiKey');
    expect(res.body).toHaveProperty('hermesApiBase');
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
pnpm --filter @hermes-panel/bff test
```

Expected: FAIL — routes return 404.

- [ ] **Step 3: Create `packages/panel-bff/src/routes/system.ts`**

```ts
import Router from '@koa/router';
import type { HealthStatus } from '@hermes-panel/shared';
import { PORTS } from '@hermes-panel/shared';
import { runHermesCli } from '../services/hermes-cli.js';

const startedAt = Date.now();
export const PANEL_VERSION = '0.1.0-alpha.0';

export const systemRouter = new Router();

systemRouter.get('/system/health', async ctx => {
  let hermesRunning = false;
  let version: string | null = null;
  let error: string | undefined;
  try {
    const r = await runHermesCli(['--version'], { timeoutMs: 2000 });
    hermesRunning = true;
    version = r.stdout.split('\n')[0]?.trim() ?? null;
  } catch (err) {
    error = (err as Error).message;
  }

  const body: HealthStatus = {
    hermes: {
      running: hermesRunning,
      version,
      apiBase: process.env.HERMES_API_BASE ?? `http://127.0.0.1:${PORTS.HERMES_API}`,
      error,
    },
    bff: {
      running: true,
      version: PANEL_VERSION,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    },
    panel: { version: PANEL_VERSION },
  };
  ctx.body = body;
});
```

- [ ] **Step 4: Create `packages/panel-bff/src/routes/token.ts`**

```ts
import Router from '@koa/router';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getHermesHome } from '../services/hermes-home.js';
import { PORTS } from '@hermes-panel/shared';

export const tokenRouter = new Router();

function loadHermesApiKey(): string | null {
  if (process.env.HERMES_API_KEY) return process.env.HERMES_API_KEY;
  const authJsonPath = join(getHermesHome(), 'auth.json');
  if (!existsSync(authJsonPath)) return null;
  try {
    const data = JSON.parse(readFileSync(authJsonPath, 'utf-8'));
    return data?.api_key ?? data?.apiKey ?? null;
  } catch {
    return null;
  }
}

tokenRouter.get('/token', ctx => {
  ctx.body = {
    hermesApiKey: loadHermesApiKey(),
    hermesApiBase: process.env.HERMES_API_BASE ?? `http://127.0.0.1:${PORTS.HERMES_API}`,
  };
});
```

- [ ] **Step 5: Wire routes into `packages/panel-bff/src/server.ts`**

Replace the existing `createApp` function body — add imports at top and use them:

```ts
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { PORTS } from '@hermes-panel/shared';
import { logger } from './lib/logger.js';
import { errorMiddleware } from './middleware/error.js';
import { authMiddleware } from './middleware/auth.js';
import { getSessionToken } from './lib/token.js';
import { systemRouter } from './routes/system.js';
import { tokenRouter } from './routes/token.js';

export function createApp(): Koa {
  const app = new Koa();
  const router = new Router({ prefix: '/api' });

  router.use(systemRouter.routes(), systemRouter.allowedMethods());
  router.use(tokenRouter.routes(), tokenRouter.allowedMethods());

  app.use(errorMiddleware);
  app.use(bodyParser());
  app.use(authMiddleware);
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.BFF_PORT ?? PORTS.PANEL_BFF);
  const token = getSessionToken();
  logger.info({ port, token: token.slice(0, 8) + '...' }, 'starting bff');
  createApp().listen(port, '127.0.0.1', () => {
    logger.info(`bff listening on http://127.0.0.1:${port}`);
  });
}
```

- [ ] **Step 6: Run tests, expect pass**

```bash
pnpm --filter @hermes-panel/bff test
```

Expected: 6 tests passing total (3 prior + 3 new).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(bff): /api/system/health and /api/token endpoints"
```

---

## Task 7: BFF route — /api/sessions (list, get)

**Files:**
- Create: `packages/panel-bff/src/routes/sessions.ts`
- Modify: `packages/panel-bff/src/server.ts`
- Create: `packages/panel-bff/tests/routes/sessions.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/panel-bff/tests/routes/sessions.test.ts`:

```ts
import { describe, it, expect, beforeAll, vi } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { getSessionToken } from '../../src/lib/token.js';
import * as cliModule from '../../src/services/hermes-cli.js';

let request: ReturnType<typeof supertest>;
let token: string;

beforeAll(() => {
  const app = createApp();
  request = supertest(app.callback());
  token = getSessionToken();
});

describe('GET /api/sessions', () => {
  it('returns 401 without token', async () => {
    const res = await request.get('/api/sessions');
    expect(res.status).toBe(401);
  });

  it('lists sessions from hermes CLI', async () => {
    vi.spyOn(cliModule, 'runHermesCli').mockResolvedValueOnce({
      stdout: JSON.stringify([
        { id: 's1', title: 'hi', model: 'fake', message_count: 2, token_total: 10, created_at: 1, updated_at: 2 },
      ]),
      stderr: '',
      exitCode: 0,
      parsed: [
        { id: 's1', title: 'hi', model: 'fake', message_count: 2, token_total: 10, created_at: 1, updated_at: 2 },
      ],
    });
    const res = await request.get('/api/sessions').set('X-Panel-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 's1', title: 'hi', messageCount: 2 });
  });

  it('returns empty array when hermes cli fails', async () => {
    vi.spyOn(cliModule, 'runHermesCli').mockRejectedValueOnce(
      new cliModule.HermesCliError('HERMES_CLI_NOT_FOUND', 'no hermes')
    );
    const res = await request.get('/api/sessions').set('X-Panel-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
pnpm --filter @hermes-panel/bff test
```

Expected: FAIL — `/api/sessions` returns 404.

- [ ] **Step 3: Create `packages/panel-bff/src/routes/sessions.ts`**

```ts
import Router from '@koa/router';
import type { SessionSummary } from '@hermes-panel/shared';
import { runHermesCli, HermesCliError } from '../services/hermes-cli.js';
import { logger } from '../lib/logger.js';

export const sessionsRouter = new Router();

interface HermesSessionRaw {
  id: string;
  title?: string;
  model?: string;
  message_count?: number;
  token_total?: number;
  created_at?: number;
  updated_at?: number;
}

function normalize(raw: HermesSessionRaw): SessionSummary {
  return {
    id: raw.id,
    title: raw.title ?? '(untitled)',
    model: raw.model ?? 'unknown',
    messageCount: raw.message_count ?? 0,
    tokenTotal: raw.token_total ?? 0,
    createdAt: raw.created_at ?? 0,
    updatedAt: raw.updated_at ?? 0,
  };
}

sessionsRouter.get('/sessions', async ctx => {
  try {
    const result = await runHermesCli(['sessions', 'list', '--json'], { timeoutMs: 5000 });
    const raw = (result.parsed ?? []) as HermesSessionRaw[];
    ctx.body = Array.isArray(raw) ? raw.map(normalize) : [];
  } catch (err) {
    if (err instanceof HermesCliError) {
      logger.warn({ code: err.code }, 'hermes sessions list failed; returning []');
      ctx.body = [];
      return;
    }
    throw err;
  }
});
```

- [ ] **Step 4: Wire route in `packages/panel-bff/src/server.ts`**

Add to imports:

```ts
import { sessionsRouter } from './routes/sessions.js';
```

Add to `createApp` after token router:

```ts
router.use(sessionsRouter.routes(), sessionsRouter.allowedMethods());
```

- [ ] **Step 5: Run tests, expect pass**

```bash
pnpm --filter @hermes-panel/bff test
```

Expected: 9 tests passing total.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(bff): /api/sessions list endpoint with graceful CLI fallback"
```

---

## Task 8: Panel-web — Vite + Vue + Naive UI bootstrap

**Files:**
- Create: `packages/panel-web/package.json`
- Create: `packages/panel-web/tsconfig.json`
- Create: `packages/panel-web/tsconfig.node.json`
- Create: `packages/panel-web/vite.config.ts`
- Create: `packages/panel-web/tailwind.config.ts`
- Create: `packages/panel-web/postcss.config.js`
- Create: `packages/panel-web/index.html`
- Create: `packages/panel-web/src/main.ts`
- Create: `packages/panel-web/src/App.vue`
- Create: `packages/panel-web/src/env.d.ts`
- Create: `packages/panel-web/src/styles/theme.css`

- [ ] **Step 1: Create `packages/panel-web/package.json`**

```json
{
  "name": "@hermes-panel/web",
  "version": "0.1.0-alpha.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview --port 5666",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "vue-tsc --noEmit",
    "lint": "eslint . --ext .vue,.ts,.tsx"
  },
  "dependencies": {
    "@hermes-panel/shared": "workspace:*",
    "naive-ui": "2.40.4",
    "pinia": "2.2.4",
    "vfonts": "0.0.3",
    "vue": "3.5.13",
    "vue-i18n": "9.14.1",
    "vue-router": "4.4.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "4.0.0-beta.1",
    "@vitejs/plugin-vue": "5.1.4",
    "@vue/tsconfig": "0.5.1",
    "happy-dom": "15.7.4",
    "postcss": "8.4.47",
    "tailwindcss": "4.0.0-beta.1",
    "typescript": "5.4.5",
    "vite": "6.0.0",
    "vitest": "2.1.1",
    "vue-tsc": "2.1.6"
  }
}
```

- [ ] **Step 2: Create `packages/panel-web/tsconfig.json`**

```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["vite/client"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "src/**/*.d.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `packages/panel-web/tsconfig.node.json`**

```json
{
  "extends": "@vue/tsconfig/tsconfig.node.json",
  "compilerOptions": {
    "composite": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "tailwind.config.ts"]
}
```

- [ ] **Step 4: Create `packages/panel-web/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5666,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
  },
});
```

- [ ] **Step 5: Create `packages/panel-web/postcss.config.js`**

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 6: Create `packages/panel-web/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', '"Segoe UI"', '"Microsoft YaHei UI"', 'Roboto', '"Noto Sans CJK SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 7: Create `packages/panel-web/src/styles/theme.css`**

```css
@import 'tailwindcss';

:root {
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px;

  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px;

  --shadow-1: 0 1px 2px rgba(0, 0, 0, .04);
  --shadow-2: 0 2px 8px rgba(0, 0, 0, .06);
  --shadow-3: 0 8px 24px rgba(0, 0, 0, .10);

  --brand-500: #6366f1;
  --brand-600: #4f46e5;
  --brand-700: #4338ca;

  --bg-page: #f7f8fa;
  --bg-card: #ffffff;
  --bg-elevate: #fafbfc;
  --border: #e5e7eb;
  --text-1: #18181b;
  --text-2: #52525b;
  --text-3: #a1a1aa;

  --ease: cubic-bezier(.4, 0, .2, 1);
  --dur-fast: 150ms;
  --dur-base: 250ms;
}

:root[data-theme='dark'] {
  --bg-page: #0a0a0b;
  --bg-card: #141416;
  --bg-elevate: #1c1c1f;
  --border: #27272a;
  --text-1: #fafafa;
  --text-2: #a1a1aa;
  --text-3: #71717a;
}

html, body, #app {
  height: 100%;
  margin: 0;
}

body {
  background: var(--bg-page);
  color: var(--text-1);
  font-family: -apple-system, "Segoe UI", "Microsoft YaHei UI", Roboto, "Noto Sans CJK SC", system-ui, sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 8: Create `packages/panel-web/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="panel-token" content="__PANEL_TOKEN__" />
    <meta name="panel-bff-base" content="http://127.0.0.1:5667" />
    <meta name="hermes-api-base" content="http://127.0.0.1:8642" />
    <title>Hermes Panel</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `packages/panel-web/src/env.d.ts`**

```ts
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
```

- [ ] **Step 10: Create `packages/panel-web/src/App.vue`**

```vue
<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, darkTheme, useOsTheme } from 'naive-ui';
import { computed } from 'vue';

const osTheme = useOsTheme();
const theme = computed(() => (osTheme.value === 'dark' ? darkTheme : null));
</script>

<template>
  <NConfigProvider :theme="theme">
    <NMessageProvider>
      <NDialogProvider>
        <main class="h-full flex items-center justify-center text-base">
          <div class="text-center">
            <h1 class="text-2xl font-semibold">Hermes Panel</h1>
            <p class="mt-2 text-sm opacity-60">v0.1.0-alpha · skeleton</p>
          </div>
        </main>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
```

- [ ] **Step 11: Create `packages/panel-web/src/main.ts`**

```ts
import { createApp } from 'vue';
import App from './App.vue';
import './styles/theme.css';

createApp(App).mount('#app');
```

- [ ] **Step 12: Install panel-web deps**

```bash
pnpm install
```

- [ ] **Step 13: Dev server smoke test**

```bash
pnpm --filter @hermes-panel/web dev &
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5666
pkill -f "vite" || true
```

Expected: `200`.

- [ ] **Step 14: Build smoke test**

```bash
pnpm --filter @hermes-panel/web build
ls packages/panel-web/dist/
```

Expected: dist contains `index.html` + `assets/`.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat(web): Vite + Vue3 + Naive UI + Tailwind skeleton"
```

---

## Task 9: Panel-web — Pinia + Router + i18n base

**Files:**
- Create: `packages/panel-web/src/router/index.ts`
- Create: `packages/panel-web/src/locales/index.ts`
- Create: `packages/panel-web/src/locales/zh-CN.ts`
- Create: `packages/panel-web/src/locales/en-US.ts`
- Create: `packages/panel-web/src/layouts/DefaultLayout.vue`
- Modify: `packages/panel-web/src/main.ts`
- Modify: `packages/panel-web/src/App.vue`

- [ ] **Step 1: Create `packages/panel-web/src/locales/zh-CN.ts`**

```ts
export default {
  app: {
    name: 'Hermes Panel',
    tagline: '为 Hermes Agent 设计的精美控制面板',
  },
  nav: {
    chat: '对话',
  },
  chat: {
    empty: {
      title: '开始对话',
      subtitle: '随便问点什么，{model} 会帮你解决',
    },
    composer: {
      placeholder: '输入消息，Shift+Enter 换行...',
      send: '发送',
      stop: '停止',
    },
    toolCall: {
      pending: '准备调用',
      running: '正在执行',
      done: '已完成',
      error: '调用失败',
    },
  },
  status: {
    connecting: '正在连接...',
    connected: '已连接',
    disconnected: '已断开',
    reconnecting: '正在重连... (尝试 {n}/5)',
  },
  error: {
    hermes_not_found: '找不到 Hermes',
    hermes_api_timeout: 'Hermes 没有响应',
    network_offline: '网络已断开',
    unknown: '未知错误',
  },
} as const;
```

- [ ] **Step 2: Create `packages/panel-web/src/locales/en-US.ts`**

```ts
export default {
  app: {
    name: 'Hermes Panel',
    tagline: 'Beautiful control panel for Hermes Agent',
  },
  nav: {
    chat: 'Chat',
  },
  chat: {
    empty: {
      title: 'Start a conversation',
      subtitle: 'Ask anything — {model} will help.',
    },
    composer: {
      placeholder: 'Type a message, Shift+Enter for newline...',
      send: 'Send',
      stop: 'Stop',
    },
    toolCall: {
      pending: 'Preparing',
      running: 'Running',
      done: 'Done',
      error: 'Failed',
    },
  },
  status: {
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'Disconnected',
    reconnecting: 'Reconnecting... (attempt {n}/5)',
  },
  error: {
    hermes_not_found: 'Hermes not found',
    hermes_api_timeout: 'Hermes did not respond',
    network_offline: 'Network is offline',
    unknown: 'Unknown error',
  },
} as const;
```

- [ ] **Step 3: Create `packages/panel-web/src/locales/index.ts`**

```ts
import { createI18n } from 'vue-i18n';
import zhCN from './zh-CN.js';
import enUS from './en-US.js';

const STORAGE_KEY = 'panel.locale';

function detectLocale(): 'zh-CN' | 'en-US' {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'zh-CN' || stored === 'en-US') return stored;
  if (navigator.language?.toLowerCase().startsWith('zh')) return 'zh-CN';
  return 'en-US';
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'zh-CN',
  messages: { 'zh-CN': zhCN, 'en-US': enUS },
});

export function setLocale(locale: 'zh-CN' | 'en-US'): void {
  i18n.global.locale.value = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.setAttribute('lang', locale);
}
```

- [ ] **Step 4: Create `packages/panel-web/src/layouts/DefaultLayout.vue`** (minimal — sidebar comes later)

```vue
<script setup lang="ts">
// MVP: full-bleed layout, dedicated sidebar comes with multi-page work
</script>

<template>
  <div class="h-full w-full flex flex-col">
    <slot />
  </div>
</template>
```

- [ ] **Step 5: Create `packages/panel-web/src/router/index.ts`**

```ts
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/chat',
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('@/views/chat/index.vue'),
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
```

- [ ] **Step 6: Create `packages/panel-web/src/views/chat/index.vue` placeholder**

```vue
<script setup lang="ts">
// implementation comes in subsequent tasks
</script>

<template>
  <div class="h-full flex items-center justify-center">
    <p class="text-sm opacity-60">chat view placeholder</p>
  </div>
</template>
```

- [ ] **Step 7: Update `packages/panel-web/src/main.ts`**

```ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router/index.js';
import { i18n } from './locales/index.js';
import './styles/theme.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(i18n);
app.mount('#app');
```

- [ ] **Step 8: Update `packages/panel-web/src/App.vue`**

```vue
<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, darkTheme, useOsTheme } from 'naive-ui';
import { computed } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

const osTheme = useOsTheme();
const theme = computed(() => (osTheme.value === 'dark' ? darkTheme : null));
</script>

<template>
  <NConfigProvider :theme="theme">
    <NMessageProvider>
      <NDialogProvider>
        <DefaultLayout>
          <RouterView />
        </DefaultLayout>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
```

- [ ] **Step 9: Dev server smoke test**

```bash
pnpm --filter @hermes-panel/web dev &
sleep 3
curl -s http://127.0.0.1:5666 | grep -q 'id="app"' && echo "OK"
pkill -f "vite" || true
```

Expected: `OK`.

- [ ] **Step 10: Build smoke test**

```bash
pnpm --filter @hermes-panel/web build
```

Expected: success.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(web): pinia + router + i18n base (zh-CN, en-US)"
```

---

## Task 10: Panel-web — API client + token bootstrap

**Files:**
- Create: `packages/panel-web/src/api/token.ts`
- Create: `packages/panel-web/src/api/bff.ts`
- Create: `packages/panel-web/src/api/hermes.ts`
- Create: `packages/panel-web/src/stores/system.ts`

- [ ] **Step 1: Create `packages/panel-web/src/api/token.ts`**

```ts
function readMeta(name: string): string {
  const el = document.querySelector(`meta[name="${name}"]`);
  return el?.getAttribute('content') ?? '';
}

export function getPanelToken(): string {
  const v = readMeta('panel-token');
  // In Vite dev the meta still has the placeholder; we fall back to env
  if (!v || v === '__PANEL_TOKEN__') {
    return (import.meta.env.VITE_PANEL_TOKEN as string) ?? '';
  }
  return v;
}

export function getBffBase(): string {
  return readMeta('panel-bff-base') || 'http://127.0.0.1:5667';
}

export function getHermesApiBase(): string {
  return readMeta('hermes-api-base') || 'http://127.0.0.1:8642';
}
```

- [ ] **Step 2: Create `packages/panel-web/src/api/bff.ts`**

```ts
import { HEADERS } from '@hermes-panel/shared';
import { getBffBase, getPanelToken } from './token.js';

interface BffError { code: string; message: string }

export class BffApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = 'BffApiError';
  }
}

export async function bffFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set(HEADERS.PANEL_TOKEN, getPanelToken());
  const res = await fetch(`${getBffBase()}${path}`, { ...init, headers });
  if (!res.ok) {
    let err: BffError = { code: 'HTTP_ERROR', message: res.statusText };
    try { err = (await res.json()).error ?? err; } catch { /* ignore */ }
    throw new BffApiError(err.code, err.message, res.status);
  }
  return (await res.json()) as T;
}
```

- [ ] **Step 3: Create `packages/panel-web/src/api/hermes.ts`**

```ts
import type { SSEEvent } from '@hermes-panel/shared';
import { getHermesApiBase } from './token.js';

interface RunStartPayload {
  model: string;
  input: string;
  stream: true;
  session_id?: string;
}

export interface RunHandle {
  runId: string;
}

export async function startRun(
  apiKey: string,
  payload: RunStartPayload
): Promise<RunHandle> {
  const res = await fetch(`${getHermesApiBase()}/v1/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`startRun failed: HTTP ${res.status}`);
  const data = (await res.json()) as { run_id: string };
  return { runId: data.run_id };
}

export interface SSEHandle {
  close: () => void;
}

export function consumeSSE(
  runId: string,
  apiKey: string,
  handlers: {
    onEvent: (ev: SSEEvent) => void;
    onError: (err: Event) => void;
    onClose: () => void;
  }
): SSEHandle {
  // EventSource doesn't support headers directly, so include apiKey in query for now
  // (hermes API accepts ?api_key=... fallback; in prod we'd use fetch+ReadableStream)
  const url = new URL(`${getHermesApiBase()}/v1/runs/${runId}/events`);
  const es = new EventSource(url.toString());

  const eventTypes: SSEEvent['type'][] = [
    'message.start', 'message.delta', 'message.reasoning',
    'tool.call.start', 'tool.call.result', 'tool.call.error',
    'message.complete', 'run.done', 'run.error',
  ];

  for (const type of eventTypes) {
    es.addEventListener(type, (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        handlers.onEvent({ type, ...data } as SSEEvent);
        if (type === 'run.done' || type === 'run.error') {
          es.close();
          handlers.onClose();
        }
      } catch (err) {
        handlers.onError(new ErrorEvent('parse', { error: err }));
      }
    });
  }

  es.onerror = handlers.onError;

  // apiKey is unused for EventSource; tracked for future fetch-stream implementation
  void apiKey;

  return { close: () => { es.close(); handlers.onClose(); } };
}
```

- [ ] **Step 4: Create `packages/panel-web/src/stores/system.ts`**

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bffFetch } from '@/api/bff';
import type { HealthStatus } from '@hermes-panel/shared';

interface TokenInfo { hermesApiKey: string | null; hermesApiBase: string }

export const useSystemStore = defineStore('system', () => {
  const health = ref<HealthStatus | null>(null);
  const hermesApiKey = ref<string | null>(null);
  const hermesApiBase = ref<string>('http://127.0.0.1:8642');
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function refresh(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      health.value = await bffFetch<HealthStatus>('/api/system/health');
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function loadToken(): Promise<void> {
    try {
      const t = await bffFetch<TokenInfo>('/api/token');
      hermesApiKey.value = t.hermesApiKey;
      hermesApiBase.value = t.hermesApiBase;
    } catch (err) {
      error.value = (err as Error).message;
    }
  }

  return { health, hermesApiKey, hermesApiBase, loading, error, refresh, loadToken };
});
```

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @hermes-panel/web typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): api clients (bff + hermes SSE) and system store"
```

---

## Task 11: Panel-web — chat-stream store (SSE state machine)

**Files:**
- Create: `packages/panel-web/src/stores/chat-stream.ts`
- Create: `packages/panel-web/src/stores/session.ts`

- [ ] **Step 1: Create `packages/panel-web/src/stores/session.ts`**

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChatMessage, TokenUsage } from '@hermes-panel/shared';

export const useSessionStore = defineStore('session', () => {
  const sessionId = ref<string | null>(null);
  const messages = ref<ChatMessage[]>([]);
  const tokenUsage = ref<TokenUsage>({ prompt: 0, completion: 0, cached: 0, total: 0 });
  const contextLimit = ref(128_000);

  function appendUserMessage(content: string): ChatMessage {
    const msg: ChatMessage = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content,
      createdAt: Date.now(),
      completed: true,
    };
    messages.value.push(msg);
    return msg;
  }

  function getOrCreateAssistant(messageId: string): ChatMessage {
    let msg = messages.value.find(m => m.id === messageId);
    if (!msg) {
      msg = {
        id: messageId,
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [],
        createdAt: Date.now(),
        completed: false,
      };
      messages.value.push(msg);
    }
    return msg;
  }

  function appendDelta(messageId: string, text: string): void {
    const msg = getOrCreateAssistant(messageId);
    msg.content += text;
  }

  function appendReasoning(messageId: string, text: string): void {
    const msg = getOrCreateAssistant(messageId);
    msg.reasoning = (msg.reasoning ?? '') + text;
  }

  function startToolCall(
    messageId: string,
    toolCallId: string,
    name: string,
    input: Record<string, unknown>,
  ): void {
    const msg = getOrCreateAssistant(messageId);
    msg.toolCalls ??= [];
    msg.toolCalls.push({
      id: toolCallId, name, input, status: 'running', startedAt: Date.now(),
    });
  }

  function updateToolCall(toolCallId: string, patch: Partial<ChatMessage['toolCalls'][number]>): void {
    for (const m of messages.value) {
      if (!m.toolCalls) continue;
      const tc = m.toolCalls.find(t => t.id === toolCallId);
      if (tc) { Object.assign(tc, patch); return; }
    }
  }

  function completeMessage(messageId: string, usage?: TokenUsage): void {
    const msg = getOrCreateAssistant(messageId);
    msg.completed = true;
    if (usage) {
      msg.tokenUsage = usage;
      tokenUsage.value = {
        prompt: tokenUsage.value.prompt + usage.prompt,
        completion: tokenUsage.value.completion + usage.completion,
        cached: tokenUsage.value.cached + usage.cached,
        total: tokenUsage.value.total + usage.total,
        cost: (tokenUsage.value.cost ?? 0) + (usage.cost ?? 0),
      };
    }
  }

  function reset(): void {
    sessionId.value = null;
    messages.value = [];
    tokenUsage.value = { prompt: 0, completion: 0, cached: 0, total: 0 };
  }

  return {
    sessionId, messages, tokenUsage, contextLimit,
    appendUserMessage, getOrCreateAssistant,
    appendDelta, appendReasoning,
    startToolCall, updateToolCall, completeMessage,
    reset,
  };
});
```

- [ ] **Step 2: Create `packages/panel-web/src/stores/chat-stream.ts`**

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SSEEvent } from '@hermes-panel/shared';
import { startRun, consumeSSE, type SSEHandle } from '@/api/hermes';
import { useSessionStore } from './session';
import { useSystemStore } from './system';

export type StreamState = 'idle' | 'creating' | 'streaming' | 'done' | 'error' | 'reconnecting';

export const useChatStreamStore = defineStore('chat-stream', () => {
  const state = ref<StreamState>('idle');
  const lastError = ref<string | null>(null);
  const currentRunId = ref<string | null>(null);
  const reconnectAttempts = ref(0);

  let handle: SSEHandle | null = null;

  async function send(input: string, model: string): Promise<void> {
    const session = useSessionStore();
    const system = useSystemStore();

    if (!system.hermesApiKey) {
      throw new Error('Hermes API key not loaded; call system.loadToken() first');
    }

    session.appendUserMessage(input);

    state.value = 'creating';
    lastError.value = null;
    reconnectAttempts.value = 0;

    try {
      const run = await startRun(system.hermesApiKey, {
        model,
        input,
        stream: true,
        session_id: session.sessionId ?? undefined,
      });
      currentRunId.value = run.runId;
      state.value = 'streaming';

      handle = consumeSSE(run.runId, system.hermesApiKey, {
        onEvent: (ev: SSEEvent) => dispatch(ev),
        onError: (err) => {
          lastError.value = `SSE error: ${(err as Event).type ?? 'unknown'}`;
          state.value = 'error';
        },
        onClose: () => {
          handle = null;
          if (state.value === 'streaming') state.value = 'done';
        },
      });
    } catch (err) {
      lastError.value = (err as Error).message;
      state.value = 'error';
    }
  }

  function dispatch(ev: SSEEvent): void {
    const session = useSessionStore();
    switch (ev.type) {
      case 'message.start':
        session.getOrCreateAssistant(ev.messageId);
        break;
      case 'message.delta':
        session.appendDelta(ev.messageId, ev.text);
        break;
      case 'message.reasoning':
        session.appendReasoning(ev.messageId, ev.text);
        break;
      case 'tool.call.start':
        session.startToolCall(ev.messageId, ev.toolCallId, ev.name, ev.input);
        break;
      case 'tool.call.result':
        session.updateToolCall(ev.toolCallId, {
          status: 'done', output: ev.output, completedAt: Date.now(),
        });
        break;
      case 'tool.call.error':
        session.updateToolCall(ev.toolCallId, {
          status: 'error', errorMessage: ev.error, completedAt: Date.now(),
        });
        break;
      case 'message.complete':
        session.completeMessage(ev.messageId, ev.usage);
        break;
      case 'run.done':
        state.value = 'done';
        break;
      case 'run.error':
        lastError.value = ev.error;
        state.value = 'error';
        break;
    }
  }

  function abort(): void {
    handle?.close();
    handle = null;
    state.value = 'idle';
  }

  return { state, lastError, currentRunId, reconnectAttempts, send, abort };
});
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @hermes-panel/web typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): chat-stream + session stores with SSE state machine"
```

---

## Task 12: Panel-web — Composer + ContextRing + MessageBubble + ToolCallCard

**Files:**
- Create: `packages/panel-web/src/components/shared/CodeBlock.vue`
- Create: `packages/panel-web/src/components/shared/EmptyState.vue`
- Create: `packages/panel-web/src/components/chat/MessageBubble.vue`
- Create: `packages/panel-web/src/components/chat/ToolCallCard.vue`
- Create: `packages/panel-web/src/components/chat/ContextRing.vue`
- Create: `packages/panel-web/src/components/chat/ComposerFooter.vue`
- Create: `packages/panel-web/src/components/chat/Composer.vue`

- [ ] **Step 1: Create `packages/panel-web/src/components/shared/CodeBlock.vue`**

```vue
<script setup lang="ts">
defineProps<{ code: string; lang?: string }>();
</script>

<template>
  <pre class="rounded-md bg-[var(--bg-elevate)] p-3 text-xs font-mono overflow-x-auto"><code>{{ code }}</code></pre>
</template>
```

- [ ] **Step 2: Create `packages/panel-web/src/components/shared/EmptyState.vue`**

```vue
<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; icon?: string }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <div v-if="icon" class="text-4xl">{{ icon }}</div>
    <h2 class="text-lg font-medium">{{ title }}</h2>
    <p v-if="subtitle" class="text-sm opacity-60">{{ subtitle }}</p>
    <slot />
  </div>
</template>
```

- [ ] **Step 3: Create `packages/panel-web/src/components/chat/MessageBubble.vue`**

```vue
<script setup lang="ts">
import type { ChatMessage } from '@hermes-panel/shared';
import ToolCallCard from './ToolCallCard.vue';

const props = defineProps<{ message: ChatMessage }>();
void props;
</script>

<template>
  <div
    class="flex w-full mb-4"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[80%] rounded-md px-4 py-3"
      :class="message.role === 'user'
        ? 'bg-[var(--brand-500)] text-white'
        : 'bg-[var(--bg-card)] border border-[var(--border)]'"
    >
      <!-- reasoning (collapsed by default) -->
      <details v-if="message.reasoning" class="mb-2 text-xs opacity-70">
        <summary class="cursor-pointer">🧠 思考过程</summary>
        <div class="mt-1 whitespace-pre-wrap">{{ message.reasoning }}</div>
      </details>

      <!-- tool calls -->
      <div v-if="message.toolCalls?.length" class="mb-2 space-y-2">
        <ToolCallCard
          v-for="tc in message.toolCalls"
          :key="tc.id"
          :tool-call="tc"
        />
      </div>

      <!-- content -->
      <div class="whitespace-pre-wrap text-sm">{{ message.content }}</div>

      <!-- footer (token usage, etc.) -->
      <div v-if="message.tokenUsage" class="mt-2 text-xs opacity-60">
        {{ message.tokenUsage.total }} tokens
        <span v-if="message.tokenUsage.cost != null">· ${{ message.tokenUsage.cost.toFixed(4) }}</span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Create `packages/panel-web/src/components/chat/ToolCallCard.vue`**

```vue
<script setup lang="ts">
import type { ToolCall } from '@hermes-panel/shared';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ toolCall: ToolCall }>();
const { t } = useI18n();

const statusLabel = computed(() => t(`chat.toolCall.${props.toolCall.status}`));
const statusIcon = computed(() => {
  switch (props.toolCall.status) {
    case 'pending': return '⏳';
    case 'running': return '⠋';
    case 'done': return '✓';
    case 'error': return '✗';
    default: return '';
  }
});
const durationMs = computed(() =>
  props.toolCall.completedAt ? props.toolCall.completedAt - props.toolCall.startedAt : null
);
</script>

<template>
  <details
    class="rounded-md border-l-4 px-3 py-2 text-xs"
    :class="{
      'border-yellow-400 bg-yellow-50/40': toolCall.status === 'running',
      'border-green-500 bg-green-50/40': toolCall.status === 'done',
      'border-red-500 bg-red-50/40': toolCall.status === 'error',
      'border-zinc-300 bg-zinc-50/40': toolCall.status === 'pending',
    }"
  >
    <summary class="cursor-pointer flex items-center gap-2">
      <span>{{ statusIcon }}</span>
      <span class="font-mono font-medium">{{ toolCall.name }}</span>
      <span class="opacity-60">{{ statusLabel }}</span>
      <span v-if="durationMs != null" class="opacity-60 ml-auto">{{ (durationMs / 1000).toFixed(1) }}s</span>
    </summary>
    <div class="mt-2 space-y-2">
      <div>
        <div class="opacity-60 mb-1">input</div>
        <pre class="bg-[var(--bg-elevate)] p-2 rounded font-mono">{{ JSON.stringify(toolCall.input, null, 2) }}</pre>
      </div>
      <div v-if="toolCall.output !== undefined">
        <div class="opacity-60 mb-1">output</div>
        <pre class="bg-[var(--bg-elevate)] p-2 rounded font-mono">{{ JSON.stringify(toolCall.output, null, 2) }}</pre>
      </div>
      <div v-if="toolCall.errorMessage" class="text-red-600">
        {{ toolCall.errorMessage }}
      </div>
    </div>
  </details>
</template>
```

- [ ] **Step 5: Create `packages/panel-web/src/components/chat/ContextRing.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  used: number;
  limit: number;
  cost?: number;
}>();

const pct = computed(() => Math.min(100, (props.used / Math.max(1, props.limit)) * 100));
const stroke = computed(() => {
  if (pct.value >= 95) return '#ef4444';
  if (pct.value >= 80) return '#f97316';
  if (pct.value >= 50) return '#eab308';
  return '#10b981';
});
const r = 18;
const c = 2 * Math.PI * r;
const dashOffset = computed(() => c * (1 - pct.value / 100));

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
</script>

<template>
  <div class="relative inline-flex items-center justify-center w-12 h-12" :title="cost != null ? `~$${cost.toFixed(4)}` : ''">
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" :r="r" stroke="var(--border)" stroke-width="3" fill="none" />
      <circle
        cx="24" cy="24" :r="r"
        :stroke="stroke" stroke-width="3" fill="none"
        :stroke-dasharray="c"
        :stroke-dashoffset="dashOffset"
        stroke-linecap="round"
        transform="rotate(-90 24 24)"
        style="transition: stroke-dashoffset 250ms var(--ease)"
      />
    </svg>
    <span class="absolute text-[10px] font-mono font-semibold">{{ fmt(used) }}</span>
  </div>
</template>
```

- [ ] **Step 6: Create `packages/panel-web/src/components/chat/ComposerFooter.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue';
import ContextRing from './ContextRing.vue';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();

const props = defineProps<{
  model: string;
  thinkingSpeed: 'fast' | 'extended' | 'auto';
  disabled: boolean;
  sending: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:model', v: string): void;
  (e: 'update:thinkingSpeed', v: 'fast' | 'extended' | 'auto'): void;
  (e: 'send'): void;
  (e: 'stop'): void;
}>();

const speedLabel = computed(() => ({
  fast: '⚡ 快速',
  extended: '🧠 深度',
  auto: '🤖 自动',
}[props.thinkingSpeed]));

function cycleSpeed(): void {
  const order: Array<'fast' | 'auto' | 'extended'> = ['fast', 'auto', 'extended'];
  const next = order[(order.indexOf(props.thinkingSpeed as 'fast' | 'auto' | 'extended') + 1) % order.length];
  emit('update:thinkingSpeed', next);
}
</script>

<template>
  <div class="flex items-center gap-2 px-3 py-2 border-t border-[var(--border)]">
    <button
      class="text-xs px-2 py-1 rounded hover:bg-[var(--bg-elevate)]"
      @click="$emit('update:model', model)"
      :title="model"
    >
      {{ model }} ▾
    </button>
    <button
      class="text-xs px-2 py-1 rounded hover:bg-[var(--bg-elevate)]"
      @click="cycleSpeed"
    >
      {{ speedLabel }}
    </button>
    <span class="flex-1" />
    <ContextRing
      :used="session.tokenUsage.total"
      :limit="session.contextLimit"
      :cost="session.tokenUsage.cost"
    />
    <button
      v-if="sending"
      class="px-3 py-1.5 rounded-md bg-red-500 text-white text-sm hover:bg-red-600"
      @click="$emit('stop')"
    >
      ⏹ 停止
    </button>
    <button
      v-else
      class="px-3 py-1.5 rounded-md bg-[var(--brand-500)] text-white text-sm hover:bg-[var(--brand-600)] disabled:opacity-50"
      :disabled="disabled"
      @click="$emit('send')"
    >
      ➤ 发送
    </button>
  </div>
</template>
```

- [ ] **Step 7: Create `packages/panel-web/src/components/chat/Composer.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ComposerFooter from './ComposerFooter.vue';

const { t } = useI18n();

const props = defineProps<{
  model: string;
  thinkingSpeed: 'fast' | 'extended' | 'auto';
  sending: boolean;
}>();

const emit = defineEmits<{
  (e: 'send', text: string): void;
  (e: 'stop'): void;
  (e: 'update:model', v: string): void;
  (e: 'update:thinkingSpeed', v: 'fast' | 'extended' | 'auto'): void;
}>();

const text = ref('');
const canSend = computed(() => text.value.trim().length > 0 && !props.sending);

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    submit();
  }
}

function submit(): void {
  if (!canSend.value) return;
  emit('send', text.value.trim());
  text.value = '';
}
</script>

<template>
  <div class="border border-[var(--border)] rounded-md bg-[var(--bg-card)] shadow-[var(--shadow-1)]">
    <textarea
      v-model="text"
      :placeholder="t('chat.composer.placeholder')"
      class="w-full resize-none outline-none bg-transparent p-3 text-sm font-sans max-h-[200px]"
      rows="2"
      @keydown="onKeydown"
    />
    <ComposerFooter
      :model="model"
      :thinking-speed="thinkingSpeed"
      :disabled="!canSend"
      :sending="sending"
      @update:model="$emit('update:model', $event)"
      @update:thinking-speed="$emit('update:thinkingSpeed', $event)"
      @send="submit"
      @stop="$emit('stop')"
    />
  </div>
</template>
```

- [ ] **Step 8: Typecheck**

```bash
pnpm --filter @hermes-panel/web typecheck
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(web): chat components — MessageBubble, ToolCallCard, ContextRing, Composer"
```

---

## Task 13: Panel-web — Chat view wiring + smoke test against fake-hermes

**Files:**
- Modify: `packages/panel-web/src/views/chat/index.vue`

- [ ] **Step 1: Replace `packages/panel-web/src/views/chat/index.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useSessionStore } from '@/stores/session';
import { useChatStreamStore } from '@/stores/chat-stream';
import { useSystemStore } from '@/stores/system';
import MessageBubble from '@/components/chat/MessageBubble.vue';
import Composer from '@/components/chat/Composer.vue';
import EmptyState from '@/components/shared/EmptyState.vue';

const { t } = useI18n();
const session = useSessionStore();
const stream = useChatStreamStore();
const system = useSystemStore();
const { messages } = storeToRefs(session);
const { state } = storeToRefs(stream);

const model = ref('hermes-agent');
const thinkingSpeed = ref<'fast' | 'extended' | 'auto'>('auto');
const sending = ref(false);
const scroller = ref<HTMLElement | null>(null);

onMounted(async () => {
  await system.refresh();
  await system.loadToken();
});

watch(messages, async () => {
  await nextTick();
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
}, { deep: true });

watch(state, (s) => {
  sending.value = s === 'creating' || s === 'streaming' || s === 'reconnecting';
});

async function onSend(text: string): Promise<void> {
  await stream.send(text, model.value);
}

function onStop(): void {
  stream.abort();
}
</script>

<template>
  <div class="flex h-full w-full">
    <main class="flex-1 flex flex-col min-w-0">
      <div ref="scroller" class="flex-1 overflow-y-auto px-6 py-4">
        <EmptyState
          v-if="messages.length === 0"
          icon="💬"
          :title="t('chat.empty.title')"
          :subtitle="t('chat.empty.subtitle', { model })"
        />
        <MessageBubble v-for="m in messages" :key="m.id" :message="m" />
      </div>
      <div class="px-6 pb-4">
        <Composer
          v-model:model="model"
          v-model:thinking-speed="thinkingSpeed"
          :sending="sending"
          @send="onSend"
          @stop="onStop"
        />
      </div>
    </main>
  </div>
</template>
```

- [ ] **Step 2: Build**

```bash
pnpm --filter @hermes-panel/web build
```

Expected: build success, dist created.

- [ ] **Step 3: Wire up end-to-end smoke test — start fake-hermes + BFF + web together**

Open three terminals (or use `pnpm` parallel):

```bash
# Terminal A
pnpm --filter fake-hermes start
# Terminal B  
PANEL_TOKEN=devtoken123 HERMES_API_BASE=http://127.0.0.1:18642 pnpm --filter @hermes-panel/bff start
# Terminal C
VITE_PANEL_TOKEN=devtoken123 pnpm --filter @hermes-panel/web dev
```

Note: the `<meta name="panel-token">` in `index.html` contains the literal `__PANEL_TOKEN__` placeholder. For dev, the `getPanelToken()` helper falls back to `import.meta.env.VITE_PANEL_TOKEN`.

Open http://127.0.0.1:5666 in browser. Verify:
- Page loads with empty state
- Type "hello" and Send
- Streaming response appears (from fake-hermes fixture)
- Reasoning collapse works
- Tool call card appears and updates

If end-to-end works, kill all three processes.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): chat view end-to-end wired to SSE stream"
```

---

## Task 14: Tauri desktop shell — minimal mac build

**Files:**
- Create: `packages/panel-desktop/package.json`
- Create: `packages/panel-desktop/src-tauri/Cargo.toml`
- Create: `packages/panel-desktop/src-tauri/tauri.conf.json`
- Create: `packages/panel-desktop/src-tauri/build.rs`
- Create: `packages/panel-desktop/src-tauri/src/main.rs`
- Create: `packages/panel-desktop/src-tauri/src/hermes.rs`
- Create: `packages/panel-desktop/src-tauri/src/bff.rs`
- Create: `packages/panel-desktop/src-tauri/icons/icon.png` (placeholder)

- [ ] **Step 1: Install Rust toolchain (one-time, per developer)**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustup default stable
rustc --version
cargo --version
```

Expected: rustc and cargo print versions.

- [ ] **Step 2: Install Tauri CLI**

```bash
cargo install tauri-cli --version "^2.0"
cargo tauri --version
```

Expected: `tauri-cli 2.x.x`.

- [ ] **Step 3: Create `packages/panel-desktop/package.json`**

```json
{
  "name": "@hermes-panel/desktop",
  "version": "0.1.0-alpha.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "cargo tauri dev",
    "build": "cargo tauri build",
    "icon": "cargo tauri icon"
  },
  "devDependencies": {
    "@tauri-apps/cli": "2.1.0"
  }
}
```

- [ ] **Step 4: Create `packages/panel-desktop/src-tauri/Cargo.toml`**

```toml
[package]
name = "hermes-panel-desktop"
version = "0.1.0"
description = "Hermes Panel desktop shell"
authors = ["Hermes Panel Contributors"]
edition = "2021"
rust-version = "1.77"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
tauri = { version = "2.0", features = [] }
tauri-plugin-shell = "2.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
which = "6.0"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

- [ ] **Step 5: Create `packages/panel-desktop/src-tauri/build.rs`**

```rust
fn main() {
    tauri_build::build();
}
```

- [ ] **Step 6: Create `packages/panel-desktop/src-tauri/tauri.conf.json`**

```json
{
  "$schema": "https://schema.tauri.app/config/2.0.0",
  "productName": "Hermes Panel",
  "version": "0.1.0",
  "identifier": "org.hermespanel.app",
  "build": {
    "beforeDevCommand": "pnpm --filter @hermes-panel/web dev",
    "beforeBuildCommand": "pnpm --filter @hermes-panel/web build",
    "devUrl": "http://127.0.0.1:5666",
    "frontendDist": "../../panel-web/dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Hermes Panel",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 500,
        "decorations": true,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": "default-src 'self' tauri:; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*; font-src 'self' data:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "icon": ["icons/icon.png"],
    "category": "Productivity",
    "shortDescription": "Beautiful Web UI for Hermes Agent",
    "longDescription": "Hermes Panel is a beautiful, easy-to-use control panel for the Hermes Agent."
  }
}
```

- [ ] **Step 7: Create `packages/panel-desktop/src-tauri/src/hermes.rs`**

```rust
use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct HermesStatus {
    pub found: bool,
    pub path: Option<String>,
    pub version: Option<String>,
}

#[tauri::command]
pub fn hermes_status() -> HermesStatus {
    match which::which("hermes") {
        Ok(path) => {
            let version = Command::new(&path)
                .arg("--version")
                .output()
                .ok()
                .and_then(|o| String::from_utf8(o.stdout).ok())
                .and_then(|s| s.lines().next().map(|l| l.to_string()));
            HermesStatus {
                found: true,
                path: Some(path.display().to_string()),
                version,
            }
        }
        Err(_) => HermesStatus { found: false, path: None, version: None },
    }
}
```

- [ ] **Step 8: Create `packages/panel-desktop/src-tauri/src/bff.rs`** (stub — full sidecar wiring later)

```rust
use std::sync::Mutex;

#[derive(Default)]
pub struct BffState {
    pub port: Mutex<Option<u16>>,
    pub token: Mutex<Option<String>>,
}

#[tauri::command]
pub fn bff_info(state: tauri::State<'_, BffState>) -> serde_json::Value {
    serde_json::json!({
        "port": state.port.lock().unwrap().clone(),
        "token": state.token.lock().unwrap().clone(),
    })
}
```

- [ ] **Step 9: Create `packages/panel-desktop/src-tauri/src/main.rs`**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod hermes;
mod bff;

fn main() {
    tauri::Builder::default()
        .manage(bff::BffState::default())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            hermes::hermes_status,
            bff::bff_info,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri app");
}
```

- [ ] **Step 10: Create placeholder icon**

For MVP we use a simple 512×512 PNG. Use any 512×512 PNG you have, or run this Python one-liner to generate a solid-color placeholder:

```bash
python3 -c "
from PIL import Image
img = Image.new('RGBA', (512, 512), (99, 102, 241, 255))
img.save('packages/panel-desktop/src-tauri/icons/icon.png')
"
```

If you don't have PIL:

```bash
mkdir -p packages/panel-desktop/src-tauri/icons
# Use an existing PNG or download one — minimal requirement for tauri build
# As a fallback, copy any PNG you have:
cp /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns packages/panel-desktop/src-tauri/icons/icon.icns 2>/dev/null || true
# And generate set via tauri:
cd packages/panel-desktop && cargo tauri icon icons/icon.png 2>/dev/null || true
cd ../..
```

Run:

```bash
pnpm --filter @hermes-panel/desktop install
cd packages/panel-desktop
cargo tauri icon src-tauri/icons/icon.png
cd ../..
```

Expected: tauri generates icons for all platforms in `src-tauri/icons/`.

- [ ] **Step 11: Tauri dev — first run (downloads deps, may take 5+ min)**

```bash
cd packages/panel-desktop
cargo tauri dev &
DEV_PID=$!
sleep 60  # cold compile is slow
# Manual check: window should open showing the Vue app
# Kill once verified
kill $DEV_PID 2>/dev/null || true
cd ../..
```

Expected: A native macOS window opens displaying the Hermes Panel chat view. Title bar shows "Hermes Panel". If fake-hermes + BFF are running too, the chat works.

- [ ] **Step 12: Tauri release build (optional, slow — skip if just iterating)**

```bash
cd packages/panel-desktop
cargo tauri build
ls src-tauri/target/release/bundle/
cd ../..
```

Expected: `bundle/macos/Hermes Panel.app` and `bundle/dmg/Hermes Panel_0.1.0_aarch64.dmg`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(desktop): Tauri 2 shell for macOS with hermes_status command"
```

---

## Task 15: npm package shell — `hermes-panel` CLI

**Files:**
- Create: `packages/panel-npm/package.json`
- Create: `packages/panel-npm/bin/hermes-panel.js`
- Create: `packages/panel-npm/scripts/copy-dist.js`
- Create: `packages/panel-npm/README.md`

- [ ] **Step 1: Create `packages/panel-npm/package.json`**

```json
{
  "name": "hermes-panel",
  "version": "0.1.0-alpha.0",
  "description": "Beautiful Web UI for Hermes Agent",
  "license": "MIT",
  "type": "module",
  "bin": {
    "hermes-panel": "bin/hermes-panel.js"
  },
  "scripts": {
    "prepack": "node scripts/copy-dist.js"
  },
  "files": [
    "bin/",
    "dist-web/",
    "dist-bff/",
    "README.md"
  ],
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "@hermes-panel/bff": "workspace:*",
    "@hermes-panel/web": "workspace:*",
    "open": "10.1.0",
    "sirv": "3.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/panel-npm/scripts/copy-dist.js`**

```js
#!/usr/bin/env node
import { cpSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..');

function copy(srcRel, destRel) {
  const src = join(pkgRoot, '..', srcRel);
  const dest = join(pkgRoot, destRel);
  if (!existsSync(src)) {
    throw new Error(`source missing: ${src} — run build first`);
  }
  if (existsSync(dest)) rmSync(dest, { recursive: true });
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`✓ copied ${srcRel} -> ${destRel}`);
}

copy('panel-web/dist', 'dist-web');
copy('panel-bff/dist', 'dist-bff');
```

- [ ] **Step 3: Create `packages/panel-npm/bin/hermes-panel.js`**

```js
#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import sirv from 'sirv';
import open from 'open';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..');

const WEB_PORT = Number(process.env.PANEL_WEB_PORT ?? 5666);
const BFF_PORT = Number(process.env.PANEL_BFF_PORT ?? 5667);
const TOKEN = process.env.PANEL_TOKEN ?? randomBytes(32).toString('hex');

process.env.PANEL_TOKEN = TOKEN;
process.env.BFF_PORT = String(BFF_PORT);

// 1) start BFF in-process
const { createApp } = await import('@hermes-panel/bff/src/server.js');
const bffApp = createApp();
bffApp.listen(BFF_PORT, '127.0.0.1');
console.log(`[bff] http://127.0.0.1:${BFF_PORT}`);

// 2) serve static web with token injection
const webDist = join(pkgRoot, 'dist-web');
const serve = sirv(webDist, { dev: false, etag: true });
const indexHtml = readFileSync(join(webDist, 'index.html'), 'utf-8')
  .replace('__PANEL_TOKEN__', TOKEN);

const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(indexHtml);
    return;
  }
  serve(req, res, () => {
    res.writeHead(404).end();
  });
});

server.listen(WEB_PORT, '127.0.0.1', async () => {
  const url = `http://127.0.0.1:${WEB_PORT}`;
  console.log(`[web] ${url}`);
  console.log(`[token] ${TOKEN.slice(0, 8)}...`);
  if (!process.env.NO_OPEN) {
    await open(url).catch(() => { /* ignore */ });
  }
});

const shutdown = () => {
  console.log('\nshutting down...');
  server.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

- [ ] **Step 4: Create `packages/panel-npm/README.md`**

```markdown
# hermes-panel

Beautiful Web UI for [Hermes Agent](https://github.com/NousResearch/hermes-agent).

## Usage

```bash
npx hermes-panel
```

Opens http://127.0.0.1:5666 in your browser.

## Environment variables

- `PANEL_WEB_PORT` (default 5666)
- `PANEL_BFF_PORT` (default 5667)
- `PANEL_TOKEN` (auto-generated if missing)
- `HERMES_API_BASE` (default http://127.0.0.1:8642)
- `HERMES_BIN` (default `hermes` from PATH)
- `NO_OPEN=1` — don't auto-open browser
```

- [ ] **Step 5: Build, then test npm shell**

```bash
pnpm --filter @hermes-panel/web build
pnpm --filter @hermes-panel/bff build
pnpm --filter hermes-panel exec node scripts/copy-dist.js
```

Expected: `packages/panel-npm/dist-web/` and `dist-bff/` populated.

- [ ] **Step 6: Smoke run**

```bash
# In one terminal: fake hermes
pnpm --filter fake-hermes start &
FAKE_PID=$!

# In another: panel
HERMES_API_BASE=http://127.0.0.1:18642 NO_OPEN=1 node packages/panel-npm/bin/hermes-panel.js &
PANEL_PID=$!
sleep 2

curl -s -o /dev/null -w "web=%{http_code}\n" http://127.0.0.1:5666
curl -s -o /dev/null -w "bff_health=%{http_code}\n" http://127.0.0.1:5667/api/system/health

kill $FAKE_PID $PANEL_PID 2>/dev/null || true
```

Expected: `web=200` and `bff_health=200`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(npm): hermes-panel CLI package (bin + static + bff bundled)"
```

---

## Task 16: CI workflow (lint + typecheck + test + build, three platforms)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:

jobs:
  test:
    name: Test (${{ matrix.os }} / node ${{ matrix.node }})
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [20, 22]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
        if: matrix.os == 'ubuntu-latest' && matrix.node == 22
```

- [ ] **Step 2: Verify lockfile exists for CI**

```bash
ls pnpm-lock.yaml
```

Expected: file exists. If missing, run `pnpm install` and commit.

- [ ] **Step 3: Push to a feature branch to trigger CI (optional — only if remote is set up)**

```bash
git status
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "ci: add GitHub Actions matrix (ubuntu/macos/windows × node 20/22)"
```

---

## Task 17: End-to-end manual verification + sanity script

**Files:**
- Create: `scripts/dev-up.sh`
- Create: `scripts/smoke-test.sh`

- [ ] **Step 1: Create `scripts/dev-up.sh`**

```bash
#!/usr/bin/env bash
# Convenience: bring up fake-hermes + bff + web for local dev
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[1/3] starting fake-hermes :18642"
pnpm --filter fake-hermes start &

sleep 1

echo "[2/3] starting bff :5667"
PANEL_TOKEN=devtoken123 HERMES_API_BASE=http://127.0.0.1:18642 \
  pnpm --filter @hermes-panel/bff start &

sleep 1

echo "[3/3] starting web :5666"
VITE_PANEL_TOKEN=devtoken123 pnpm --filter @hermes-panel/web dev &

echo ""
echo "ready. open http://127.0.0.1:5666 — Ctrl+C to stop"
wait
```

- [ ] **Step 2: Create `scripts/smoke-test.sh`**

```bash
#!/usr/bin/env bash
# Headless smoke: start all three, hit endpoints, kill.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

pnpm --filter fake-hermes start &
sleep 1
PANEL_TOKEN=smoketoken HERMES_API_BASE=http://127.0.0.1:18642 \
  pnpm --filter @hermes-panel/bff start &
sleep 1
VITE_PANEL_TOKEN=smoketoken pnpm --filter @hermes-panel/web dev &
sleep 3

fail=0
check() {
  local label=$1 url=$2 expected=${3:-200}
  local got
  got=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo 000)
  if [ "$got" = "$expected" ]; then
    echo "✓ $label ($url) → $got"
  else
    echo "✗ $label ($url) → expected $expected got $got"
    fail=1
  fi
}

check "fake-hermes health"   http://127.0.0.1:18642/health
check "bff health"           http://127.0.0.1:5667/api/system/health
check "web index"            http://127.0.0.1:5666

# Auth: should be 401 without token, 200 with
got=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5667/api/sessions)
if [ "$got" = "401" ]; then echo "✓ auth rejects missing token"; else echo "✗ auth missing token = $got"; fail=1; fi
got=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Panel-Token: smoketoken" http://127.0.0.1:5667/api/sessions)
if [ "$got" = "200" ]; then echo "✓ auth accepts valid token"; else echo "✗ auth valid token = $got"; fail=1; fi

if [ $fail -ne 0 ]; then exit 1; fi
echo ""
echo "all smoke checks passed."
```

- [ ] **Step 3: Make scripts executable**

```bash
chmod +x scripts/dev-up.sh scripts/smoke-test.sh
```

- [ ] **Step 4: Run smoke test**

```bash
./scripts/smoke-test.sh
```

Expected output (all checks pass):
```
✓ fake-hermes health (http://127.0.0.1:18642/health) → 200
✓ bff health (http://127.0.0.1:5667/api/system/health) → 200
✓ web index (http://127.0.0.1:5666) → 200
✓ auth rejects missing token
✓ auth accepts valid token

all smoke checks passed.
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add dev-up.sh and smoke-test.sh convenience scripts"
```

---

## Final Verification

- [ ] **All tests pass**

```bash
pnpm typecheck
pnpm test
```

Expected: 0 errors, 9+ tests pass.

- [ ] **All packages build**

```bash
pnpm build
```

Expected: success across all packages.

- [ ] **Smoke test passes**

```bash
./scripts/smoke-test.sh
```

Expected: 5 ✓.

- [ ] **Manual UX check (5 minutes)**

```bash
./scripts/dev-up.sh
# Open http://127.0.0.1:5666 in browser
```

Verify:
1. Page loads with empty state showing "💬 开始对话"
2. Composer footer shows: `hermes-agent ▾` `🤖 自动` button, Context Ring (0K / 0%), 发送 button
3. Type "hello" + Enter
4. Streaming response appears word-by-word
5. Reasoning section collapsible above the answer
6. Tool call card appears with pending → done transition
7. Token usage shows on completed message
8. Context Ring updates to show used tokens
9. Click 停止 mid-stream — stream halts
10. Theme follows system (try changing macOS to dark — UI follows)

If any step fails, fix before moving on.

---

## Done — what shipped in Plan 1

✅ pnpm monorepo with 6 packages  
✅ panel-shared types + constants  
✅ panel-bff: Koa server + auth + error mw + sessions/health/token routes + tests  
✅ panel-web: Vue 3 + Vite + Naive UI + Tailwind + Pinia + Router + i18n  
✅ Chat view: SSE state machine, MessageBubble, ToolCallCard, ContextRing, Composer with always-visible footer controls  
✅ panel-desktop: Tauri 2 shell with hermes_status command, builds .app for macOS  
✅ panel-npm: `npx hermes-panel` runnable shell that bundles dist + bff  
✅ fake-hermes: mock SSE server for offline dev  
✅ CI matrix: ubuntu/macos/windows × node 20/22  
✅ Smoke test scripts  
✅ Spec §21.1.1 (Context Ring), §21.1.2 (Thinking Speed), §21.1.3 (Reasoning), §21.1.5 (Composer footer controls)

## What's NOT in Plan 1 (queued for next plans)

- Dashboard / Sessions / Tools / Workspaces / Settings pages
- 12 built-in Workspaces with role teams
- Multi-agent orchestration
- Notifications & offline replay
- Token optimization & smart routing
- Prompt self-optimization
- Hallucination detection & quality scoring
- Developer mode (Playground, SSE Inspector, etc.)
- Insights & self-learning
- Full i18n coverage (only key MVP strings done)
- All 5 theme modes (only system follow done)
- Mobile-first responsive
- PWA
- WeChat login
- Monaco editor / TUI embed
- CLI Bridge (state.db import)
- Auto-updater
- Windows & Linux build pipeline
- Code signing & notarization

Each becomes its own plan, building on this foundation.
