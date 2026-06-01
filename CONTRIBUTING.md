# Contributing

Thanks for helping improve Hermes Panel. This repository is a pnpm workspace
with a Vue web app, Koa BFF, Tauri desktop shell, npm runtime package, and VS
Code extension.

## Development Setup

```bash
make install
make dev-up
```

Use `make open` when you need to work on the Tauri desktop shell.

## Before Opening A Pull Request

Run the checks that match your change:

```bash
make typecheck
make test
```

For frontend or package changes:

```bash
pnpm --filter @hermes-panel/web typecheck
pnpm --filter @hermes-panel/web test
pnpm --filter @hermes-panel/web build
```

For BFF changes:

```bash
pnpm --filter @hermes-panel/bff typecheck
pnpm --filter @hermes-panel/bff test
pnpm --filter @hermes-panel/bff build
```

For desktop packaging changes:

```bash
make app-build
```

## Project Conventions

- Keep frontend components focused. Large view files should assemble smaller
  components instead of holding all behavior inline.
- Add or update locale keys in both `zh-CN` and `en-US`.
- Treat `~/.hermes/state.db` as read-only in the BFF. Use Hermes CLI calls for
  mutations.
- Keep Hermes API keys out of the frontend. Secrets belong in the BFF secure
  store.
- Prefer Makefile targets for repeatable workflows.
- Do not add a lint framework without first agreeing on the project-wide lint
  policy.

## Pull Request Checklist

- [ ] The change is scoped to one clear goal.
- [ ] Tests or focused static checks cover the risky parts.
- [ ] `README.md` or `docs/` are updated when behavior or installation changes.
- [ ] New UI text is internationalized.
- [ ] Release or packaging changes are reflected in GitHub Actions and Makefile
      targets when needed.

