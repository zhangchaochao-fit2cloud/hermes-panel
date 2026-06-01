# Hermes Panel

Hermes Panel is a desktop-first control panel for
[Hermes Agent](https://github.com/NousResearch/hermes-agent). It provides a
polished Vue 3 chat and operations UI, a local Koa BFF, Tauri 2 desktop
packaging, an `npx hermes-panel` browser runtime, and a VS Code extension for
sending code context into the panel.

The project is designed for local-first agent work: the browser or Tauri
WebView talks only to the Panel BFF, and the BFF proxies Hermes API traffic,
reads local Hermes state, runs Hermes CLI commands, and keeps credentials out
of the frontend.

## Highlights

- **Chat workspace**: streaming assistant replies, tool activity, reasoning
  summaries, editable user prompts, branching actions, image paste/preview,
  Markdown rendering, code/image copy controls, and session navigation.
- **Session management**: searchable history, grouped sources, pinned sessions,
  cron-run aggregation, hover previews, rename/delete/export flows.
- **Hermes operations**: gateway status and controls, model/provider settings,
  encrypted API key storage, MCP/tools/skills/plugin management, memory files,
  cron jobs, notifications, logs, diagnostics, and backups.
- **Desktop experience**: Tauri 2 macOS app bundle with native window chrome,
  local sidecar launch support, and release targets for macOS, Windows, and
  Linux.
- **Developer integrations**: `npx hermes-panel` for browser usage and a VS Code
  extension that can send selections, files, or git diffs to the panel.

## Architecture

Runtime uses three main processes:

```text
Browser / Tauri WebView (:5666)
   |
   | REST + SSE
   v
Panel BFF (:5667)
   |
   |-- /api/hermes/* proxy to Hermes API (:8642)
   |-- better-sqlite3 read-only access to ~/.hermes/state.db
   |-- child_process calls to the hermes CLI
   |-- keytar / encrypted file vault for Hermes API key storage
```

Important security and runtime choices:

- The frontend never receives the Hermes API key.
- The browser sends `X-Panel-Token` to the BFF; `/api/system/health` is the only
  unauthenticated endpoint.
- Hermes SSE is proxied through the BFF to avoid cross-origin/WebView SSE
  upgrade problems and to keep one CORS surface.
- `~/.hermes/state.db` is treated as read-only by the BFF. Mutations go through
  the Hermes CLI so Hermes remains the single writer.

## Workspace Packages

| Package | Purpose |
|---|---|
| `packages/panel-web` | Vue 3 SPA, hash router, Naive UI, Pinia, vue-i18n, ECharts, Markdown UI |
| `packages/panel-bff` | Koa BFF, auth, Hermes proxy, sqlite readers, secure store, CLI wrappers |
| `packages/panel-shared` | Shared DTOs, constants, and TypeScript types |
| `packages/panel-desktop` | Tauri 2 desktop shell and native app packaging |
| `packages/panel-npm` | `npx hermes-panel` browser runtime package |
| `packages/panel-vscode` | VS Code extension for sending editor context to the panel |
| `packages/fake-hermes` | Local mock Hermes API for offline development and tests |

## Requirements

- Node.js `>= 20`
- pnpm `>= 9` (the repo currently pins `pnpm@10.19.0`)
- Rust toolchain for Tauri desktop builds
- Node.js `>= 20` on `PATH` for the packaged desktop app's local BFF runtime
- macOS, Windows, or Linux for platform-specific desktop packaging
- A Hermes Agent installation for real agent runs, or `fake-hermes` for local
  UI development

Install workspace dependencies once:

```bash
make install
# or
pnpm install
```

## Run Locally

Recommended browser development stack:

```bash
make dev-up
```

This starts:

- fake Hermes on `:18642`
- Panel BFF on `:5667`
- Vite web app on `:5666`

Open `http://127.0.0.1:5666`.

Tauri desktop development:

```bash
make open
# or
make desktop
```

`make open` clears stale local dev processes, fixes the Cargo path for macOS
shells, and starts `cargo tauri dev`.

Useful runtime commands:

```bash
make status          # show dev process / port status
make stop            # stop Vite, BFF, fake-hermes, desktop dev process
make restart         # stop + start
make logs            # tail BFF and Hermes logs
make gateway-start   # start Hermes gateway through the BFF
make gateway-stop    # stop Hermes gateway through the BFF
```

## Install And Distribution Options

### 1. Desktop app

Build a local macOS app bundle:

```bash
make app-build
```

Open the generated app:

```bash
make app-open
```

Current local bundle path:

```text
packages/panel-desktop/src-tauri/target/release/bundle/macos/Hermes Panel.app
```

When a bundle already exists and you only need to refresh local changes:

```bash
make app-refresh-local
```

### 2. Release installers

Build all artifacts supported by the current host platform:

```bash
make release
```

macOS-specific targets:

```bash
make release-mac-arm
make release-mac-intel
make release-mac-universal
```

Other platform targets:

```bash
make release-win
make release-linux
```

Release artifacts are copied into `dist/` and can include `.dmg`, `.app.zip`,
`.app.tar.gz`, `.msi`, `.exe`, `.deb`, `.rpm`, `.AppImage`, npm `.tgz`, VSIX,
and `SHA256SUMS`, depending on platform.

### 3. npm / npx browser runtime

Use the browser runtime without installing the desktop app:

```bash
npx hermes-panel
```

It starts the BFF and web app locally, then opens:

```text
http://127.0.0.1:5666
```

Build the npm tarball locally:

```bash
make npm-pack
# or
make release-npm
```

### 4. VS Code extension

Build the extension:

```bash
make vscode-build
```

Package a sideloadable `.vsix`:

```bash
make vscode-pack
# or
make release-vsix
```

The extension contributes commands for sending the current selection, current
file, or git diff to Hermes Panel. If the BFF is unreachable, it copies the
prompt to the clipboard as a fallback.

## Common Commands

| Command | What it does |
|---|---|
| `make help` | List all Makefile targets |
| `make install` | Install workspace dependencies |
| `make dev-up` | Start fake Hermes + BFF + web |
| `make open` | Start desktop dev mode |
| `make build` | Build all packages |
| `make typecheck` | Run TypeScript / Vue type checks |
| `make test` | Run all tests |
| `make smoke` | Start services and check core endpoints |
| `make web-build` | Build only the web app |
| `make bff-build` | Build only the BFF |
| `make shared-build` | Build shared DTO/types |
| `make app-build` | Build local macOS app bundle |
| `make app-refresh-local` | Refresh an existing local app bundle |
| `make release` | Build release artifacts for the current host |

Single-package examples:

```bash
pnpm --filter @hermes-panel/web test
pnpm --filter @hermes-panel/web typecheck
pnpm --filter @hermes-panel/bff test
pnpm --filter @hermes-panel/bff typecheck
pnpm --filter @hermes-panel/desktop build
pnpm --filter hermes-panel-vscode build
```

## Environment Variables

Server/runtime:

| Variable | Default | Purpose |
|---|---|---|
| `PANEL_TOKEN` | generated at boot | BFF auth token |
| `BFF_PORT` | `5667` | Panel BFF port |
| `PANEL_BFF_PORT` | `5667` | BFF port used by `npx hermes-panel`, forwarded into `BFF_PORT` |
| `PANEL_WEB_PORT` | `5666` | `npx hermes-panel` web server port |
| `HERMES_API_BASE` | `http://127.0.0.1:8642` | Hermes API base URL |
| `HERMES_API_KEY` | unset | Hermes API key override |
| `HERMES_BIN` | `hermes` | Hermes CLI binary path |
| `HERMES_HOME` | `~/.hermes` | Hermes home directory |
| `PANEL_HOME` | `~/.hermes-panel` | Panel state/secrets directory |
| `PANEL_CORS_ORIGINS` | unset | Extra comma-separated CORS origins |
| `LOG_LEVEL` | `info` | BFF logger level |
| `NO_OPEN` | unset | Set to `1` to stop `npx hermes-panel` from opening a browser |

Browser build/dev:

| Variable | Purpose |
|---|---|
| `VITE_PANEL_TOKEN` | Dev fallback token when `index.html` meta token is not injected |
| `VITE_HERMES_API_BASE` | Frontend dev base override; normally the BFF proxy is used |

## Application Routes

The web app currently includes:

- `#/dashboard`
- `#/chat`
- `#/sessions`
- `#/workspaces`
- `#/cron`
- `#/memory`
- `#/files`
- `#/tools`
- `#/channels`
- `#/developer`
- `#/settings`

## Data And Secrets

- Hermes session state is read from `~/.hermes/state.db`.
- Panel local state and fallback encrypted secrets live under
  `~/.hermes-panel`.
- The BFF prefers OS secure storage through `keytar` and falls back to an
  AES-256-GCM encrypted file vault.
- Legacy `~/.hermes/auth.json` credentials are migrated on first read.

## Development Notes

- ESM is used throughout the workspace. TypeScript imports use `.js`
  extensions where needed for Node ESM runtime compatibility.
- There is no ESLint config. The enforced bar is TypeScript strictness plus
  package type checks.
- BFF routers are mounted before the Hermes proxy; the Hermes proxy wildcard
  should remain last.
- New shared DTOs should be exported from `packages/panel-shared/src/index.ts`
  and built before consumers use them.
- New views should be added under `packages/panel-web/src/views/<name>/`,
  registered in `packages/panel-web/src/router/index.ts`, and covered by
  locale keys in both `zh-CN` and `en-US`.

## Troubleshooting

Check local process state:

```bash
make status
```

Stop stale local development processes:

```bash
make stop
```

If graceful stop is not enough:

```bash
make kill-zombies
```

Tail useful logs:

```bash
make logs
```

If a packaged macOS app already exists and you only changed web/BFF/Rust code,
refresh it with:

```bash
make app-refresh-local
```

If the refresh target reports that the app bundle is missing, run:

```bash
make app-build
```

## Documentation

- Documentation index:
  `docs/README.md`
- Release and packaging guide:
  `docs/release.md`
- Product and architecture design:
  `docs/superpowers/specs/2026-05-25-hermes-panel-design.md`
- Competitive analysis:
  `docs/superpowers/specs/2026-06-01-competitive-analysis.md`
- Orchestrator UX design:
  `docs/superpowers/specs/2026-06-01-orchestrator-ux-design.md`
- Release and community standards:
  `docs/superpowers/specs/2026-06-01-release-and-community-standards.md`
- Implementation plans:
  `docs/superpowers/plans/`
- VS Code extension usage:
  `packages/panel-vscode/README.md`
- npm runtime usage:
  `packages/panel-npm/README.md`

## Contributing And Support

- Contribution guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- Support guide: `SUPPORT.md`
- Changelog: `CHANGELOG.md`
- Code of conduct: `CODE_OF_CONDUCT.md`

## License

MIT
