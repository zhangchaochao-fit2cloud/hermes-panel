# Support

Use GitHub issues for bugs, feature requests, and user experience feedback.

Before opening an issue, please include:

- Hermes Panel version or commit.
- Installation mode: desktop app, `npx hermes-panel`, development server, or VS
  Code extension.
- Operating system and architecture.
- Whether Hermes gateway is running on `127.0.0.1:8642`.
- Relevant logs from `make logs` or `~/.hermes-panel/desktop-bff.log`.

For local diagnostics:

```bash
make status
make logs
```

For stale development processes:

```bash
make stop
make kill-zombies
```

