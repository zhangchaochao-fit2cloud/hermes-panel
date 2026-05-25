# Hermes Panel — VS Code Extension

Send code, selection, or git diff from VS Code directly to your local Hermes Panel.

## Commands

| Command | Where | What it does |
|---------|-------|--------------|
| **Send Selection** | Editor context menu (with selection) | Wrap the selection in a code block and send to Panel |
| **Send Current File** | Editor context menu (no selection) | Send the whole file |
| **Send Git Diff** | Source Control title bar | Run `git diff HEAD` and send the result |
| **Open Panel** | Command palette | Open Hermes Panel (Tauri app or browser) |
| **New Chat** | Command palette | Open Panel directly on a fresh chat |

## Configuration

```json
{
  "hermesPanel.bffUrl": "http://127.0.0.1:5667",
  "hermesPanel.token": "<paste from Panel> Settings → About",
  "hermesPanel.openOnSend": true
}
```

## How it works

The extension POSTs your content to the Panel BFF (`/api/draft`). When the
Panel is open, the chat composer picks up drafts on mount. If the BFF is
unreachable (Panel not running), the prompt is copied to your clipboard
instead — paste it into the Panel manually.

Falls back gracefully if you have a browser-only Panel install.

## Development

```bash
cd packages/panel-vscode
pnpm install
pnpm build           # bundles src/extension.ts -> dist/extension.js
# In VS Code: press F5 to launch a dev host with the extension loaded
pnpm package         # produce a .vsix you can sideload
```

## License

MIT
