# Hermes Panel — common commands.
# Run `make` (or `make help`) to see the list.

.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help install dev dev-up smoke build typecheck test \
        bff bff-test bff-test-watch bff-typecheck bff-build \
        web web-build web-typecheck \
        shared-build \
        fake \
        desktop desktop-build \
        vscode-build \
        npm-pack \
        clean clean-dist clean-modules

help: ## Show this help
	@awk 'BEGIN {FS = ":.*?## "; printf "Targets:\n"} \
	     /^[a-zA-Z0-9_-]+:.*## / {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' \
	     $(MAKEFILE_LIST)

# ── Setup / dev ─────────────────────────────────────────────────────────
install: ## pnpm install (one-time)
	pnpm install

dev: ## pnpm dev — every package in parallel
	pnpm dev

dev-up: ## fake-hermes + bff + web with shared devtoken123 (scripts/dev-up.sh)
	./scripts/dev-up.sh

smoke: ## Headless smoke test (scripts/smoke-test.sh)
	./scripts/smoke-test.sh

# ── Whole-repo build / verify ───────────────────────────────────────────
build: ## Build all packages
	pnpm build

typecheck: ## tsc + vue-tsc across all packages
	pnpm typecheck

test: ## Run all package tests (vitest in bff + web)
	pnpm test

# ── Single package: panel-bff ───────────────────────────────────────────
bff: ## panel-bff dev server (tsx, no build)
	pnpm --filter @hermes-panel/bff start

bff-test: ## Vitest run for bff (use ARGS='-t "returns 401"' to grep)
	pnpm --filter @hermes-panel/bff exec vitest run $(ARGS)

bff-test-watch: ## Vitest watch mode for bff
	pnpm --filter @hermes-panel/bff test:watch

bff-typecheck: ## Typecheck bff only
	pnpm --filter @hermes-panel/bff typecheck

bff-build: ## Build bff to dist/
	pnpm --filter @hermes-panel/bff build

# ── Single package: panel-web ───────────────────────────────────────────
web: ## panel-web Vite dev server on :5666
	pnpm --filter @hermes-panel/web dev

web-build: ## Build web (vue-tsc -b && vite build)
	pnpm --filter @hermes-panel/web build

web-typecheck: ## Typecheck web only
	pnpm --filter @hermes-panel/web typecheck

# ── Other packages ──────────────────────────────────────────────────────
shared-build: ## Build @hermes-panel/shared (needed before panel-npm pack)
	pnpm --filter @hermes-panel/shared build

fake: ## fake-hermes mock server on :18642
	pnpm --filter fake-hermes start

desktop: ## Tauri dev (cargo tauri dev — uses scripts/tauri-dev-prep.sh)
	pnpm --filter @hermes-panel/desktop dev

desktop-build: ## Tauri release build (cargo tauri build)
	pnpm --filter @hermes-panel/desktop build

vscode-build: ## Bundle VS Code extension via esbuild
	pnpm --filter hermes-panel-vscode build

npm-pack: shared-build bff-build web-build ## Build everything panel-npm needs and pack
	pnpm --filter hermes-panel pack

# ── Cleanup ─────────────────────────────────────────────────────────────
clean-dist: ## Remove build outputs (dist/, dist-web/, target/, .vite/, *.tsbuildinfo)
	rm -rf packages/*/dist packages/*/dist-web packages/*/.vite packages/*/*.tsbuildinfo
	rm -rf packages/panel-desktop/src-tauri/target packages/panel-desktop/src-tauri/gen

clean-modules: ## Remove every node_modules (forces full reinstall)
	find . -name node_modules -type d -prune -exec rm -rf {} +

clean: clean-dist ## Default clean — build outputs only
