# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Hermes Panel — a Vue 3 control panel for [Hermes Agent](https://github.com/NousResearch/hermes-agent). Ships as a Tauri 2 desktop app, an `npx hermes-panel` web server, and a VS Code extension that stages prompts into the panel.

Authoritative design docs (read these before non-trivial work):

- `docs/superpowers/specs/2026-05-25-hermes-panel-design.md` — full design spec (§1–§21).
- `docs/superpowers/plans/2026-05-25-plan-01-mvp-skeleton-and-chat.md` — Plan 1, the MVP build. The current branch (`feat/plan-01-mvp-skeleton`) has executed Plan 1 plus several feature additions beyond it (parallel pages, IDE bridge, secure store, themes, PWA, etc.).

## Architecture

pnpm workspace monorepo. Runtime is three processes:

```
Browser / Tauri WebView (:5666)
   │
   └── REST + SSE → panel-bff (:5667)
                       │
                       ├── /api/hermes/*  proxies to Hermes API (:8642)
                       ├── better-sqlite3  reads ~/.hermes/state.db (read-only via PRAGMA query_only)
                       ├── child_process   shells out to `hermes` CLI (skills/profile/cron/mcp/memory)
                       └── keytar / encrypted file  holds the Hermes API key
```

### The non-obvious decision: SSE proxies through the BFF

The spec originally called for SSE to bypass the BFF and connect directly to Hermes `:8642`. **The implementation reverses this** (commit `0a06353`). The frontend speaks only to the BFF; `packages/panel-bff/src/routes/hermes-proxy.ts` forwards `/api/hermes/*` to Hermes including chunk-by-chunk SSE piping. Reasons:

1. Tauri WebKit fetch sometimes fails to upgrade to SSE across a separate origin (`"Load failed"`).
2. Keeps the Hermes API key in BFF env — never sent to the browser.
3. One CORS allowlist instead of two.

`packages/panel-web/src/api/hermes.ts` reads as if it talks to Hermes; it actually hits `${bff}/api/hermes/*`. Both `startRun` and `consumeSSE` take an `_apiKey` parameter for signature symmetry but ignore it — the real key lives in the BFF.

### Hermes SSE event shape

Hermes does **not** use `event:` SSE headers; the event name is inside the JSON payload:

```
data: {"event": "message.delta", "run_id": "...", "timestamp": 123, "delta": "..."}\n\n
```

Event types: `message.delta`, `reasoning.available`, `tool.started`, `tool.completed`, `run.completed`, `run.error`. Defined as `HermesSSEEvent` in `packages/panel-shared/src/types/chat.ts`. Unknown events are skipped (forward-compat).

### Auth

- BFF generates a 32-byte hex token at boot (or honors `PANEL_TOKEN` env).
- The token is injected into `index.html` as `<meta name="panel-token">` (the `__PANEL_TOKEN__` placeholder is replaced at serve time by `packages/panel-npm/bin/hermes-panel.js`). In Vite dev, the placeholder stays and the browser falls back to `VITE_PANEL_TOKEN`.
- Browser sends `X-Panel-Token` header on every BFF request (`auth.ts` middleware).
- `/api/system/health` is the **only** unauthenticated endpoint (Tauri probes it before the WebView is ready to read the meta tag).
- The Hermes API key is stored in keytar (macOS Keychain / WinCred / libsecret) with an AES-256-GCM file vault at `~/.hermes-panel/secrets.enc` as fallback. See `services/secure-store.ts`. Legacy `~/.hermes/auth.json` is migrated on first read. The key is never returned over the wire — `/api/secrets/hermes-api-key/exists` only reports presence.

## Packages

| Package | Purpose | Key tech |
|---|---|---|
| `packages/panel-shared` | Cross-package DTOs (`HermesSSEEvent`, `SessionSummary`, `HealthStatus`, `TokenUsage`) and port/header constants. Built to `dist/`, consumed as `@hermes-panel/shared` workspace dep. | TS only |
| `packages/panel-bff` | Koa BFF on `:5667`. Mounted routers: `system`, `token`, `sessions`, `stats`, `tools`, `notifications`, `profile-cron`, `memory`, `capabilities`, `draft`, `secrets`, `hermes-proxy`. | Koa 2.15 + `@koa/router` + `@koa/cors` + `better-sqlite3` 11 + `keytar` 7 + `pino` |
| `packages/panel-web` | Vue 3.5 SPA on `:5666`. Hash-router; 10 views (`dashboard`, `chat`, `sessions`, `workspaces`, `cron`, `memory`, `tools`, `developer`, `settings`). | Vite 6 + Naive UI 2.40 + Tailwind 4 beta + Pinia 2 + vue-i18n 9 + echarts 5 |
| `packages/panel-desktop` | Tauri 2 shell. `tauri.conf.json:beforeDevCommand` runs `scripts/tauri-dev-prep.sh`. CSP is `null` (relies on BFF for security). | Rust 1.77+, `tauri` 2.0 |
| `packages/panel-npm` | `npx hermes-panel` CLI. `bin/hermes-panel.js` starts BFF in-process via `import('@hermes-panel/bff')` and serves `dist-web/` via `sirv` with token injection. `prepack` runs `scripts/copy-dist.js` to gather `panel-web/dist` and `panel-bff/dist`. | Node ≥ 20, `sirv`, `open` |
| `packages/fake-hermes` | OpenAI-compatible mock on `:18642`. Replays `src/fixtures/sse-replay.jsonl` for offline dev/test. | Node `http` |
| `packages/panel-vscode` | VS Code extension. Sends selection/file/git-diff as a draft via `POST /api/draft`; clipboard fallback when BFF is unreachable. Falls back to opening `hermes-panel://` then `http://127.0.0.1:5666/#/chat`. | esbuild bundles to `dist/extension.js` |

### Ports and env vars

| Port | Service |
|---|---|
| 8642 | Hermes Agent API (real, started via `hermes gateway run --replace`) |
| 18642 | fake-hermes |
| 5666 | panel-web (Vite dev or sirv prod) |
| 5667 | panel-bff |

Env vars: `PANEL_TOKEN`, `BFF_PORT`, `HERMES_API_KEY`, `HERMES_API_BASE`, `HERMES_BIN`, `HERMES_HOME` (default `~/.hermes`), `PANEL_HOME` (default `~/.hermes-panel`), `PANEL_CORS_ORIGINS` (comma-separated extra origins). In the browser: `VITE_PANEL_TOKEN`, `VITE_HERMES_API_BASE`.

## Commands

```bash
pnpm install                          # one-time
pnpm dev                              # everything in parallel (-r --parallel)
pnpm build                            # all packages
pnpm test                             # all package tests (vitest in bff + web)
pnpm typecheck                        # tsc + vue-tsc across packages
pnpm fake-hermes                      # just the mock on :18642
```

Single-package iteration uses pnpm filters (this is the established pattern in `scripts/*.sh` and `tauri.conf.json`):

```bash
pnpm --filter @hermes-panel/bff test
pnpm --filter @hermes-panel/bff test:watch
pnpm --filter @hermes-panel/bff start          # tsx src/server.ts, no build
pnpm --filter @hermes-panel/bff typecheck
pnpm --filter @hermes-panel/web dev
pnpm --filter @hermes-panel/web build          # vue-tsc -b && vite build
pnpm --filter @hermes-panel/shared build       # required before panel-npm packing
pnpm --filter fake-hermes start
pnpm --filter @hermes-panel/desktop dev        # cargo tauri dev
pnpm --filter @hermes-panel/desktop build      # cargo tauri build
pnpm --filter hermes-panel-vscode build        # esbuild bundle for VS Code
```

Single Vitest file or grep:

```bash
pnpm --filter @hermes-panel/bff exec vitest run tests/routes/sessions.test.ts
pnpm --filter @hermes-panel/bff exec vitest run -t "returns 401"
```

Helper scripts at `scripts/`:

- `scripts/dev-up.sh` — boots `fake-hermes` + BFF + Vite with shared `devtoken123`. The simplest way to develop the web frontend.
- `scripts/smoke-test.sh` — headless: starts everything, asserts 5 endpoints, exits non-zero on failure.
- `scripts/tauri-dev-prep.sh` — invoked by `cargo tauri dev` via `beforeDevCommand`. Reuses an existing Hermes API server on `:8642` if up, otherwise tries `hermes gateway run`, otherwise falls back to fake-hermes. Always finishes by `exec`ing the Vite dev server so Tauri can wait on its "ready" output.

CI (`.github/workflows/ci.yml`) is matrix `[ubuntu, macos, windows] × node [20, 22]` running `pnpm typecheck && pnpm test`, then `pnpm build` only on `ubuntu-latest`/node 22.

## Conventions encoded in the code

- **No lint config exists.** Don't add ESLint unless asked — TypeScript's `strict + noUnusedLocals + noUnusedParameters` is the enforced bar (from `tsconfig.base.json`).
- ESM everywhere. Imports use `.js` extensions on TS files (`from './services/sqlite-reader.js'`) because TS resolves at compile time and Node ESM needs the explicit extension at runtime.
- Component file-size red lines (spec §2.6): ≤ 300 lines, ≤ 5 props, ≤ 3 emits per component. `views/*/index.vue` is a thin assembler; logic lives in stores.
- `better-sqlite3` is opened with `journal_mode=WAL` + `pragma query_only=ON`. Treat the DB as **read-only** — every write must go through `runHermesCli()` so Hermes is the single writer.
- CLI fallback pattern (used in `routes/sessions.ts`, `routes/notifications.ts`, etc.): wrap `runHermesCli()` in try/catch, return empty data on `HermesCliError` instead of 5xx. The panel must stay usable when `hermes` is missing.
- `.gitattributes` forces LF — CRLF breaks SSE framing on Windows.
- Native modules (`better-sqlite3`, `keytar`) are listed in root `package.json:pnpm.onlyBuiltDependencies`. After `pnpm install`, pnpm only builds those — don't add others to that allowlist without verifying the install still works on all CI platforms.
- Hermes CLI calls always pass `timeoutMs` (default 15s) and `shell: false`. `HERMES_CLI_NOT_FOUND` / `HERMES_CLI_TIMEOUT` / `HERMES_CLI_FAILED` error codes are the contract callers depend on.

## When extending

- **New BFF route**: add `src/routes/foo.ts` (Koa-router), wire into `server.ts` after `bodyParser` and before `hermesProxyRouter` (the proxy uses a wildcard and should stay last). Add `tests/routes/foo.test.ts` with `supertest(createApp().callback())`.
- **New shared type**: add to `packages/panel-shared/src/types/*`, re-export from `src/index.ts`, and run `pnpm --filter @hermes-panel/shared build` before consumers can pick it up.
- **New view**: add `views/<name>/index.vue` and register in `src/router/index.ts` with `() => import('@/views/<name>/index.vue')`. Add i18n keys to `src/locales/{zh-CN,en-US}.ts`.
- **Touching `state.db`**: only read. Use the helpers in `services/sqlite-reader.ts` (`listSessions`, `dailyTokenUsage`, `modelDistribution`, `cacheStats`, `monthlyPace`, etc.). To mutate sessions, shell out to `hermes sessions delete/rename --force` as `sessions.ts` does.
