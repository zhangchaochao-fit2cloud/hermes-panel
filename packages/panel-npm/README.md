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

## License

MIT
