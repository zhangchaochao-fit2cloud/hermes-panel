# =============================================================================
# Hermes Panel — Makefile
# -----------------------------------------------------------------------------
# 本仓库的统一命令入口。直接 `make` (或 `make help`) 看所有可用命令。
#
# 设计原则：
#   - 每个 target 都有 `## 简短帮助` 注释，会被 `make help` 抽取并彩色打印。
#   - 每个 target 上方都有多行中文注释，说明"做什么 / 何时用 / 副作用"。
#   - 重复命令统一用 pnpm filter，与 scripts/*.sh 和 tauri.conf.json 保持一致。
#   - 区分三类：① 开发流程  ② 单包迭代  ③ 运行时运维  ④ 生产打包/发布。
# =============================================================================

.DEFAULT_GOAL := help
SHELL := /bin/bash

# 收集所有 phony target — 这些 target 不对应文件，只是命名。
.PHONY: help install dev dev-up smoke smoke-npm smoke-desktop-bff build typecheck test ci-release-critical \
        bff bff-test bff-test-watch bff-typecheck bff-build \
        web web-build web-typecheck \
        shared-build \
        fake \
        desktop desktop-build \
        vscode-build vscode-pack \
        npm-pack \
        clean clean-dist clean-modules \
        open start stop restart status logs kill-zombies \
        gateway-start gateway-stop gateway-restart \
        app-build app-bundle app-refresh-local app-open desktop-resources desktop-web-dist \
        release release-mac release-mac-arm release-mac-intel release-mac-universal \
        release-win release-linux release-npm release-vsix \
        release-checksums release-clean \
        tag-push version-show \
        ci-local


# -----------------------------------------------------------------------------
# `make help` —— 打印彩色 target 列表
#   awk 读 Makefile 自己，按 `target: ... ## help` 模式抓取并对齐。
#   这是 *所有* 用户的入口；保持其作为 .DEFAULT_GOAL。
# -----------------------------------------------------------------------------
help: ## 显示本帮助列表
	@awk 'BEGIN {FS = ":.*?## "; printf "Targets:\n"} \
	     /^[a-zA-Z0-9_-]+:.*## / {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' \
	     $(MAKEFILE_LIST)


# ═════════════════════════════════════════════════════════════════════════════
#  ①  Setup / 开发主流程
# ═════════════════════════════════════════════════════════════════════════════

# 一次性安装所有 workspace 依赖。
# 注意：pnpm 只为 root package.json:pnpm.onlyBuiltDependencies 列出的
# 原生模块 (better-sqlite3, keytar) 跑 install scripts，其它一律跳过。
install: ## pnpm install (一次性)
	pnpm install

# 全部 package 并行 dev：bff (tsx watch) + web (vite) + shared (tsc -w) + ...
# 比 dev-up.sh 暴力，会启所有包；适合 IDE 协同；不会自动启 fake-hermes。
dev: ## pnpm dev — 所有包并行启动
	pnpm dev

# 推荐的"纯前端开发"启动方式：
#   fake-hermes (:18642) + BFF (:5667) + Vite (:5666)，共用 PANEL_TOKEN=devtoken123。
# 不启 Tauri，所以速度快、热重载稳。浏览器直接打开 http://localhost:5666。
dev-up: ## hermes gateway + bff + web (token=devtoken123)
	./scripts/dev-up.sh

# 后台启动所有服务（不阻塞终端），适合 make 直接调用。
# 等效于 dev-up.sh 但进程存活不受 shell 退出影响。
dev-start: ## 后台启动 hermes gateway + bff + web
	@echo "[1/3] starting hermes gateway :8642"
	@osascript -e 'tell application "Terminal" to do script "/tmp/start-hermes.sh"' > /dev/null 2>&1
	@sleep 2
	@echo "[2/3] starting bff :5667"
	@osascript -e 'tell application "Terminal" to do script "/tmp/start-bff.sh"' > /dev/null 2>&1
	@sleep 2
	@echo "[3/3] starting web :5666"
	@osascript -e 'tell application "Terminal" to do script "/tmp/start-web.sh"' > /dev/null 2>&1
	@sleep 6
	@echo "---"
	@lsof -i:8642 -i:5667 -i:5666 2>/dev/null | grep LISTEN || echo "waiting for ports..."
	@sleep 3
	@lsof -i:8642 -i:5667 -i:5666 2>/dev/null | grep LISTEN || echo "⚠️  some services may still be starting"
	@echo "ready. open http://127.0.0.1:5666"

# 无人值守 smoke test：起服务 → 打 5 个 endpoint → 全 200 才退 0。
# CI 用，也可本地确认重构没破基本路由。
smoke: ## 无人值守 smoke test (5 个 endpoint)
	./scripts/smoke-test.sh

smoke-npm: release-npm ## 安装 npm tarball 并真实启动 web + BFF
	./scripts/smoke-npm-package.sh

smoke-desktop-bff: desktop-build ## 验证 .app 内置 BFF runtime 可启动
	./scripts/smoke-desktop-bff.sh


# ═════════════════════════════════════════════════════════════════════════════
#  ②  全仓库构建 / 校验
# ═════════════════════════════════════════════════════════════════════════════

# 顺序构建所有包：shared → bff → web → ...。CI 必跑。
# 失败时常因 shared 接口没 build → bff/web 看不到新类型。
build: ## 构建全部包
	pnpm build

# tsc + vue-tsc 全仓库。比 build 快，专门看类型有没有破。
# CI 矩阵每个 node × OS 都跑这个。
typecheck: ## tsc + vue-tsc 全包
	pnpm typecheck

# Vitest 全包跑一次。bff 用 node 环境，web 用 happy-dom。
test: ## 跑全部测试 (bff + web vitest)
	pnpm test


# ═════════════════════════════════════════════════════════════════════════════
#  ②a  单包迭代 — panel-bff (Koa BFF on :5667)
# ═════════════════════════════════════════════════════════════════════════════

# 直接跑 src/server.ts (tsx，不编译)。改完代码 ctrl+C 重启。
# dev-up.sh / tauri-dev-prep.sh 也是用这条。
bff: ## bff 开发服 (tsx, 不编译)
	pnpm --filter @hermes-panel/bff start

# 单跑 BFF vitest。grep 用法： make bff-test ARGS='-t "returns 401"'
bff-test: ## bff 单包测试 (ARGS='-t pattern' 可 grep)
	pnpm --filter @hermes-panel/bff exec vitest run $(ARGS)

# bff watch 模式 — 改文件自动重跑相关 test。
bff-test-watch: ## bff vitest watch
	pnpm --filter @hermes-panel/bff test:watch

# 单独看 bff 类型错。pnpm typecheck 慢 8 倍，只关心 bff 时用这个。
bff-typecheck: ## bff 类型检查
	pnpm --filter @hermes-panel/bff typecheck

# 编译 bff 到 dist/ — npm-pack 时需要先跑。
bff-build: ## bff 编译到 dist/
	pnpm --filter @hermes-panel/bff build


# ═════════════════════════════════════════════════════════════════════════════
#  ②b  单包迭代 — panel-web (Vue 3 SPA on :5666)
# ═════════════════════════════════════════════════════════════════════════════

# 启 Vite dev server。需要 BFF 已经在 :5667。
# 通常配合 `make bff` 或 `make dev-up` 用。
web: ## web Vite dev (:5666)
	pnpm --filter @hermes-panel/web dev

# 生产构建：vue-tsc -b (类型) → vite build (打包)。产物在 packages/panel-web/dist。
# panel-npm 和 Tauri release 都依赖这步。
web-build: ## web 生产构建 (vue-tsc + vite build)
	pnpm --filter @hermes-panel/web build

# 单独 vue-tsc 看类型。
web-typecheck: ## web 类型检查
	pnpm --filter @hermes-panel/web typecheck


# ═════════════════════════════════════════════════════════════════════════════
#  ②c  其它包
# ═════════════════════════════════════════════════════════════════════════════

# panel-shared 是 DTOs/ports/headers 的纯类型包。
# 改了 src/types/* 必须先跑这个，否则 bff/web 看不到新类型。
shared-build: ## 构建 @hermes-panel/shared (panel-npm pack 前必跑)
	pnpm --filter @hermes-panel/shared build

# fake-hermes — :18642 上的 OpenAI 兼容 mock，重放 fixtures/sse-replay.jsonl。
# 离线开发 / e2e 用。和 dev-up.sh 自动启的是同一个进程。
fake: ## fake-hermes mock (:18642)
	pnpm --filter fake-hermes start

# 桌面 dev：cargo tauri dev → 触发 beforeDevCommand=tauri-dev-prep.sh。
# 该脚本会自动起 vite + bff + 兜底 fake-hermes，最后 exec vite。
desktop: ## Tauri dev (cargo tauri dev)
	pnpm --filter @hermes-panel/desktop dev

# Tauri release build — 看 `release-mac-*` 这些更高层 target，
# 它们带自动校验和 zip / sha256。
desktop-build: shared-build bff-build web-build ## Tauri release build (单平台 host)
	pnpm --filter @hermes-panel/desktop build

desktop-resources: shared-build bff-build ## 准备桌面包内置 BFF runtime
	./scripts/prepare-desktop-resources.sh

desktop-web-dist: web-build ## 裁剪 Tauri 桌面包不需要的 Web 下载素材
	./scripts/prepare-desktop-web-dist.sh

# 用 esbuild 把 panel-vscode bundle 成单个 dist/extension.js。
# vsix 打包看 vscode-pack。
vscode-build: ## VS Code 扩展 esbuild bundle
	pnpm --filter hermes-panel-vscode build

# 打 .vsix — 上传到 marketplace 或本地 install 用。
vscode-pack: vscode-build ## VS Code 扩展打 .vsix
	pnpm --filter hermes-panel-vscode exec vsce package --no-dependencies -o ../../dist/

# 打 npm tarball：shared/bff/web 都得先 build → copy-dist.js 收集到 panel-npm。
# 产物可 `npm install ./packages/panel-npm/*.tgz` 测一下。
# 必须 cd 进去；用 --filter 会让 pack 忽略 files 把整个 monorepo 打进去。
npm-pack: shared-build bff-build web-build ## panel-npm 打 tarball
	cd packages/panel-npm && pnpm pack


# ═════════════════════════════════════════════════════════════════════════════
#  ②d  清理
# ═════════════════════════════════════════════════════════════════════════════

# 删所有构建产物，但保留 node_modules。重建快。
clean-dist: ## 删 dist/ + target/ + .vite/ + .tsbuildinfo
	rm -rf packages/*/dist packages/*/dist-web packages/*/.vite packages/*/*.tsbuildinfo
	rm -rf packages/panel-desktop/src-tauri/target packages/panel-desktop/src-tauri/gen

# 核弹级：删所有 node_modules，必须 `make install` 重装。
# pnpm-lock 没坏的情况下少用。
clean-modules: ## 删全部 node_modules (强制重装)
	find . -name node_modules -type d -prune -exec rm -rf {} +

# 默认 clean 只清产物，不动 node_modules。
clean: clean-dist ## 默认 clean — 只清产物


# ═════════════════════════════════════════════════════════════════════════════
#  ③  运行时运维 (daily ops) — start / stop / status / logs / restart
# ═════════════════════════════════════════════════════════════════════════════
# 这一段是日常开发"动嘴"层 — 不用记 pkill 一串 PID，记 verb 就行。

# 一键启 Mac 桌面开发：
#   1) 清理 stale vite/bff/fake-hermes 残留 (避免端口占用)
#   2) 把 $HOME/.cargo/bin 加进 PATH (zsh 默认找不到 cargo)
#   3) cargo tauri dev — beforeDevCommand 会拉起 vite+bff+fake-hermes
#   4) Tauri 窗口编译完自动弹出
open: ## 一键启 Mac 桌面 dev (清残留 + 修 PATH + tauri dev)
	./scripts/dev-open.sh

# `make start` 是 open 的 alias — start 更顺口。
start: open ## `make open` 的 alias

# 优雅停 vite (5666) + bff (5667) + fake-hermes (18642) + Tauri 桌面进程。
# 不停 :8642 上的 hermes gateway — 那是用户的 AI agent 服务，独立生命周期。
stop: ## 停 vite/bff/fake/桌面 (不动 :8642 hermes gateway)
	@echo "→ stopping vite / bff / fake-hermes / tauri desktop"
	@./scripts/stop-dev.sh
	@sleep 1
	@$(MAKE) status

# 一键重启：先 stop 再 start。卡死时用。
restart: stop start ## 重启 (stop + start)

# 报告每个端口/进程的 PID。空 = 没跑。
# 排查"我到底起了什么"时第一条命令。
status: ## 显示哪些 dev 服务在跑
	@printf "  vite        (5666)  : %s\n" "$$(lsof -i:5666 -t 2>/dev/null | head -1)"; \
	 printf "  bff         (5667)  : %s\n" "$$(lsof -i:5667 -t 2>/dev/null | head -1)"; \
	 printf "  fake-hermes (18642) : %s\n" "$$(lsof -i:18642 -t 2>/dev/null | head -1)"; \
	 printf "  hermes gw   (8642)  : %s\n" "$$(lsof -i:8642 -t 2>/dev/null | head -1)"; \
	 printf "  tauri desktop       : %s\n" "$$(pgrep -f 'target/debug/hermes-panel-desktop' 2>/dev/null | head -1)"

# tail BFF 自身日志 + hermes agent 日志。
# 看接口出错／hermes 内部报错时常用。Ctrl+C 退出。
logs: ## tail BFF 日志 + hermes agent 日志
	@echo "→ /tmp/hermes-panel-bff.log + ~/.hermes/logs/agent.log (Ctrl+C 退出)"
	@tail -n 80 -F /tmp/hermes-panel-bff.log ~/.hermes/logs/agent.log 2>/dev/null

# 暴力 SIGKILL 所有孤儿进程 — stop 不管用时再用。
# 不会动 :8642 hermes gateway。
kill-zombies: ## SIGKILL 所有孤儿 dev 进程
	@echo "→ scrubbing zombies"
	@./scripts/stop-dev.sh --force
	@sleep 1
	@$(MAKE) status


# ═════════════════════════════════════════════════════════════════════════════
#  ③a  Hermes API gateway 控制 (端口 8642，独立于 panel dev 进程)
# ═════════════════════════════════════════════════════════════════════════════
# Hermes gateway 在 :8642 提供 OpenAI 兼容 API，给 panel 调。
# 用 BFF 的 /api/gateway/* 来开停 — 它处理了进程残留 + env 注入。

# 启 gateway。需要 BFF 在跑 (5667)。
gateway-start: ## 启 Hermes gateway (:8642) via BFF
	curl -fsSL -X POST http://localhost:5667/api/gateway/start \
		-H "X-Panel-Token: $${PANEL_TOKEN:-devtoken123}" \
		&& echo "" && echo "→ check: make status"

# 停 gateway — BFF 会 forceKillPort 兜底，确保 :8642 真的释放。
gateway-stop: ## 停 Hermes gateway via BFF
	curl -fsSL -X POST http://localhost:5667/api/gateway/stop \
		-H "X-Panel-Token: $${PANEL_TOKEN:-devtoken123}" \
		&& echo "" && echo "→ check: make status"

# 换模型/credential 时用。stop → start，避开 `--replace` flag 不可靠的坑。
gateway-restart: gateway-stop gateway-start ## 重启 gateway


# ═════════════════════════════════════════════════════════════════════════════
#  ④  生产打包 — 本地一次性打 Mac .app (release 子集)
# ═════════════════════════════════════════════════════════════════════════════
# 这一段是给"我现在就要一个能给同事的 .app"准备的。
# 不签名、不发布 — 只产 .app + .zip。完整跨平台发布看 ④a。

# 编 Tauri release：cargo tauri build。耗时 3-8 分钟，看 Mac 是 M-chip 还是 Intel。
# PATH 修正：CI 之外 zsh 经常找不到 cargo，所以手动 prepend $HOME/.cargo/bin。
app-build: shared-build bff-build web-build desktop-resources ## 单机编 Tauri Mac .app (target/release)
	@echo "→ building Tauri release (takes a few minutes)"
	cd packages/panel-desktop && PATH=$$HOME/.cargo/bin:$$PATH cargo tauri build

# 编完 → 把 .app 用 ditto 压成版本号化的 zip。ditto 保留 macOS 元数据 + 资源叉，
# zip(1) 会丢；分发 zip 必须用 ditto，否则下载方双击会"已损坏"。
app-bundle: app-build ## 编 + zip Mac .app (./dist/hermes-panel-VER-mac.zip)
	@mkdir -p dist
	@APP=$$(find packages/panel-desktop/src-tauri/target/release/bundle/macos -name "*.app" -maxdepth 2 2>/dev/null | head -1); \
	  VER=$$(grep '"version"' packages/panel-desktop/package.json | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/'); \
	  OUT="dist/hermes-panel-$$VER-mac.zip"; \
	  echo "→ zipping $$APP → $$OUT"; \
	  ditto -c -k --sequesterRsrc --keepParent "$$APP" "$$OUT"; \
	  ls -lh "$$OUT"

# 本地快速刷新已经生成过的 .app：
#   1) 重新编 shared/bff/web
#   2) 只跑 cargo release binary，不重新跑完整 tauri bundle
#   3) 把新 binary 覆盖到现有 Hermes Panel.app，并做 ad-hoc codesign
# 适合频繁修桌面壳逻辑后立刻打开验证；第一次没有 .app 时先跑 make app-build。
app-refresh-local: shared-build bff-build web-build desktop-web-dist desktop-resources ## 快速刷新本地 Hermes Panel.app 并 ad-hoc 签名
	@echo "→ refreshing local packaged app"
	cd packages/panel-desktop/src-tauri && PATH=$$HOME/.cargo/bin:$$PATH CARGO_NET_OFFLINE=$${CARGO_NET_OFFLINE:-true} cargo build --release
	@APP="packages/panel-desktop/src-tauri/target/release/bundle/macos/Hermes Panel.app"; \
	  BIN_SRC="packages/panel-desktop/src-tauri/target/release/hermes-panel-desktop"; \
	  BIN_DST="$$APP/Contents/MacOS/Hermes Panel"; \
	  RES_SRC="packages/panel-desktop/src-tauri/resources/bff"; \
	  RES_DST="$$APP/Contents/Resources/resources/bff"; \
	  if [ ! -d "$$APP" ]; then \
	    echo "缺少 $$APP，请先跑 make app-build"; \
	    exit 1; \
	  fi; \
	  if [ ! -f "$$BIN_SRC" ]; then \
	    echo "缺少 $$BIN_SRC"; \
	    exit 1; \
	  fi; \
	  cp "$$BIN_SRC" "$$BIN_DST"; \
	  rm -rf "$$RES_DST"; \
	  mkdir -p "$$(dirname "$$RES_DST")"; \
	  cp -R "$$RES_SRC" "$$RES_DST"; \
	  chmod +x "$$BIN_DST"; \
	  /usr/libexec/PlistBuddy -c 'Set :CFBundleExecutable Hermes Panel' "$$APP/Contents/Info.plist" >/dev/null; \
	  /usr/libexec/PlistBuddy -c 'Set :CFBundleName Hermes Panel' "$$APP/Contents/Info.plist" >/dev/null; \
	  /usr/libexec/PlistBuddy -c 'Set :CFBundleDisplayName Hermes Panel' "$$APP/Contents/Info.plist" >/dev/null; \
	  codesign --force --deep --sign - "$$APP" >/dev/null; \
	  codesign --verify --deep --strict "$$APP"; \
	  echo "✓ refreshed $$APP"

app-open: ## 打开本地打包后的 Hermes Panel.app
	open "packages/panel-desktop/src-tauri/target/release/bundle/macos/Hermes Panel.app"


# ═════════════════════════════════════════════════════════════════════════════
#  ④a  跨平台 release — 生产可上线、可上 GitHub Releases
# ═════════════════════════════════════════════════════════════════════════════
# 设计目标：
#   - `make release` 在本机能打齐 *本平台能打* 的全部产物 (Mac/Linux/Win 三选一)。
#   - 跨平台分发用 GitHub Actions：`make tag-push VER=v0.1.0-rc.1` 触发
#     .github/workflows/release-desktop.yml，矩阵跑 macOS arm64/x86_64 + Win + Linux，
#     产物自动收集成 Draft Release。
#   - 所有产物落到 ./dist/，文件名带版本号，并生成 SHA256SUMS 校验文件。
# -----------------------------------------------------------------------------

# 从 panel-desktop/package.json 读 version — 单一来源。
VERSION := $(shell grep '"version"' packages/panel-desktop/package.json | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')
DIST_DIR := dist

# 显示当前要打的版本号。
version-show: ## 显示当前 VERSION (从 panel-desktop/package.json 读)
	@echo "VERSION = $(VERSION)"
	@echo "DIST_DIR = $(DIST_DIR)"

# 本地一键打全部当前平台能打的：
#   macOS  → mac-arm + mac-intel + mac-universal (.app/.dmg) + vsix + npm tgz
#   其它    → linux 或 win 单平台 + vsix + npm tgz
# 之后用 release-checksums 生成 SHA256SUMS。
# 真正的"所有平台"必须靠 CI — 见 tag-push。
release: release-clean ## 一键本地打：本平台所有 + npm tgz + vsix + SHA256SUMS
	@echo "→ release $(VERSION) (本平台可打的全部)"
	@OS=$$(uname -s); \
	  if [ "$$OS" = "Darwin" ]; then \
	    $(MAKE) release-mac-arm release-mac-intel release-mac-universal; \
	  elif [ "$$OS" = "Linux" ]; then \
	    $(MAKE) release-linux; \
	  else \
	    $(MAKE) release-win; \
	  fi
	@$(MAKE) release-npm release-vsix release-checksums
	@echo ""
	@echo "✓ release done — see ./$(DIST_DIR)/"
	@ls -lh $(DIST_DIR)/

# Mac arm64 (Apple Silicon)。
# 输出：.app + .dmg + .app.tar.gz (Tauri updater 用)。
release-mac-arm: shared-build bff-build web-build ## 打 Mac arm64 (.dmg + .app.tar.gz)
	@echo "→ Mac arm64 ($(VERSION))"
	@mkdir -p $(DIST_DIR)
	@rustup target add aarch64-apple-darwin >/dev/null 2>&1 || true
	cd packages/panel-desktop && PATH=$$HOME/.cargo/bin:$$PATH \
	  cargo tauri build --target aarch64-apple-darwin
	@$(MAKE) _collect-mac TARGET=aarch64-apple-darwin SUFFIX=mac-arm64

# Mac x86_64 (Intel) — 给 Intel Mac 用户。
# 需要 rustup target add x86_64-apple-darwin。
release-mac-intel: shared-build bff-build web-build ## 打 Mac x86_64 (.dmg + .app.tar.gz)
	@echo "→ Mac x86_64 ($(VERSION))"
	@mkdir -p $(DIST_DIR)
	@rustup target add x86_64-apple-darwin >/dev/null 2>&1 || true
	cd packages/panel-desktop && PATH=$$HOME/.cargo/bin:$$PATH \
	  cargo tauri build --target x86_64-apple-darwin
	@$(MAKE) _collect-mac TARGET=x86_64-apple-darwin SUFFIX=mac-x64

# Mac universal binary — 一个 .app 同时支持 arm64 + x86_64。
# 体积翻倍，但用户体验最好；推荐作为主下载。
release-mac-universal: shared-build bff-build web-build ## 打 Mac universal (.dmg, arm+intel 合一)
	@echo "→ Mac universal ($(VERSION))"
	@mkdir -p $(DIST_DIR)
	@rustup target add aarch64-apple-darwin x86_64-apple-darwin >/dev/null 2>&1 || true
	cd packages/panel-desktop && PATH=$$HOME/.cargo/bin:$$PATH \
	  cargo tauri build --target universal-apple-darwin
	@$(MAKE) _collect-mac TARGET=universal-apple-darwin SUFFIX=mac-universal

# 内部：把刚 build 出来的 mac 产物拷到 dist/ 并加版本号前缀。
# 调用： $(MAKE) _collect-mac TARGET=<rust-target> SUFFIX=<标签>
_collect-mac:
	@BASE=packages/panel-desktop/src-tauri/target/$(TARGET)/release/bundle; \
	  DMG=$$(find $$BASE/dmg -name "*.dmg" 2>/dev/null | head -1); \
	  APP=$$(find $$BASE/macos -name "*.app" -maxdepth 2 2>/dev/null | head -1); \
	  TGZ=$$(find $$BASE/macos -name "*.app.tar.gz" 2>/dev/null | head -1); \
	  if [ -n "$$DMG" ]; then cp "$$DMG" $(DIST_DIR)/hermes-panel-$(VERSION)-$(SUFFIX).dmg; echo "  + dmg"; fi; \
	  if [ -n "$$APP" ]; then ditto -c -k --sequesterRsrc --keepParent "$$APP" $(DIST_DIR)/hermes-panel-$(VERSION)-$(SUFFIX).app.zip; echo "  + app.zip"; fi; \
	  if [ -n "$$TGZ" ]; then cp "$$TGZ" $(DIST_DIR)/hermes-panel-$(VERSION)-$(SUFFIX).app.tar.gz; echo "  + app.tar.gz (updater)"; fi

# Windows: .msi (WiX) + .exe (NSIS)。本机必须是 Windows 才能跑。
# CI 矩阵 (windows-latest) 会跑这条。
release-win: shared-build bff-build web-build ## 打 Windows (.msi + .exe，需 Windows 主机)
	@echo "→ Windows x64 ($(VERSION))"
	@mkdir -p $(DIST_DIR)
	cd packages/panel-desktop && cargo tauri build
	@BASE=packages/panel-desktop/src-tauri/target/release/bundle; \
	  MSI=$$(find $$BASE/msi -name "*.msi" 2>/dev/null | head -1); \
	  EXE=$$(find $$BASE/nsis -name "*.exe" 2>/dev/null | head -1); \
	  [ -n "$$MSI" ] && cp "$$MSI" $(DIST_DIR)/hermes-panel-$(VERSION)-win-x64.msi || true; \
	  [ -n "$$EXE" ] && cp "$$EXE" $(DIST_DIR)/hermes-panel-$(VERSION)-win-x64-setup.exe || true; \
	  ls -lh $(DIST_DIR)/hermes-panel-$(VERSION)-win-* 2>/dev/null || true

# Linux: .deb (Debian/Ubuntu) + .AppImage (portable) + .rpm (Fedora/RHEL)。
# 需要 libwebkit2gtk-4.1-dev + librsvg2-dev + patchelf；CI 用 ubuntu-22.04。
release-linux: shared-build bff-build web-build ## 打 Linux (.deb + .AppImage + .rpm)
	@echo "→ Linux x86_64 ($(VERSION))"
	@mkdir -p $(DIST_DIR)
	cd packages/panel-desktop && cargo tauri build
	@BASE=packages/panel-desktop/src-tauri/target/release/bundle; \
	  DEB=$$(find $$BASE/deb -name "*.deb" 2>/dev/null | head -1); \
	  AI=$$(find $$BASE/appimage -name "*.AppImage" 2>/dev/null | head -1); \
	  RPM=$$(find $$BASE/rpm -name "*.rpm" 2>/dev/null | head -1); \
	  [ -n "$$DEB" ] && cp "$$DEB" $(DIST_DIR)/hermes-panel-$(VERSION)-linux-x64.deb || true; \
	  [ -n "$$AI" ]  && cp "$$AI"  $(DIST_DIR)/hermes-panel-$(VERSION)-linux-x64.AppImage || true; \
	  [ -n "$$RPM" ] && cp "$$RPM" $(DIST_DIR)/hermes-panel-$(VERSION)-linux-x64.rpm || true; \
	  ls -lh $(DIST_DIR)/hermes-panel-$(VERSION)-linux-* 2>/dev/null || true

# npm tarball — 给 `npx hermes-panel` 用。
# 必须 cd 进 panel-npm 后再 pack，不能用 `pnpm --filter`：filter 模式下
# cwd 还在 monorepo root，pnpm 会忽略 `files` 字段把整个 monorepo（含
# Tauri target/）都打进 tarball (1.4GB)；cd 后正常走 files (~2.5MB)。
release-npm: shared-build bff-build web-build ## 打 npm tarball (hermes-panel-VER.tgz)
	@echo "→ npm tarball ($(VERSION))"
	@mkdir -p $(DIST_DIR)
	cd packages/panel-npm && pnpm pack --pack-destination "$(CURDIR)/$(DIST_DIR)"
	@ls -lh $(DIST_DIR)/hermes-panel-*.tgz 2>/dev/null

# VS Code 扩展 .vsix — 给 marketplace 或本地 install 用。
release-vsix: vscode-build ## 打 VS Code 扩展 .vsix
	@echo "→ VSIX ($(VERSION))"
	@mkdir -p $(DIST_DIR)
	cd packages/panel-vscode && npx --yes @vscode/vsce@3 package --no-dependencies -o ../../$(DIST_DIR)/
	@ls -lh $(DIST_DIR)/hermes-panel-vscode-*.vsix 2>/dev/null || \
	  ls -lh $(DIST_DIR)/*.vsix 2>/dev/null

# 生成 SHA256SUMS — 用户校验完整性 + Tauri updater 校验 latest.json。
# 在 ./dist 里跑 shasum，输出文件名相对路径，方便 `shasum -c SHA256SUMS`。
release-checksums: ## 生成 SHA256SUMS 校验文件
	@echo "→ SHA256SUMS"
	@cd $(DIST_DIR) && shasum -a 256 \
	  hermes-panel-*.dmg \
	  hermes-panel-*.zip \
	  hermes-panel-*.tar.gz \
	  hermes-panel-*.msi \
	  hermes-panel-*.exe \
	  hermes-panel-*.deb \
	  hermes-panel-*.AppImage \
	  hermes-panel-*.rpm \
	  hermes-panel-*.tgz \
	  hermes-panel-*.vsix \
	  2>/dev/null | tee SHA256SUMS

# 清空 ./dist。release target 第一步会跑这个保证干净。
release-clean: ## 清空 ./dist (release 前必做)
	@echo "→ clean $(DIST_DIR)/"
	@rm -rf $(DIST_DIR)
	@mkdir -p $(DIST_DIR)


# ═════════════════════════════════════════════════════════════════════════════
#  ④b  发布 — push tag 触发 GitHub Actions 跨平台矩阵
# ═════════════════════════════════════════════════════════════════════════════
# 上线流程：
#   1) `make tag-push VER=v0.1.0-rc.1`  → 推 tag
#   2) GitHub Actions release.yml 自动跑 (mac arm/x64/universal + win + linux)
#   3) Draft Release 生成，包含全部 .dmg/.msi/.exe/.deb/.AppImage/.rpm/.tgz/.vsix
#   4) Release 页人工 review → 改 draft 为 published
# -----------------------------------------------------------------------------

# 推 tag 触发 CI release。
# 用法： make tag-push VER=v0.1.0-rc.1
# 必须保证 panel-desktop/package.json 的 version 已经改到对应数字。
tag-push: ## 推 tag 触发 CI release (VER=v0.1.0-rc.1)
	@if [ -z "$(VER)" ]; then \
	  echo "用法: make tag-push VER=v0.1.0-rc.1"; \
	  exit 1; \
	fi
	@echo "→ 推 tag $(VER)"
	git tag -a $(VER) -m "release $(VER)"
	git push origin $(VER)
	@echo "→ CI 已触发，看：https://github.com/$$(git config --get remote.origin.url | sed -E 's,.*[:/]([^/]+/[^/]+)\.git,\1,')/actions"


# ═════════════════════════════════════════════════════════════════════════════
#  ⑤  CI 模拟
# ═════════════════════════════════════════════════════════════════════════════

# 本地跑一遍 CI 做的事 — typecheck + test + build。
# 推前自己跑一次能省一轮 CI。
ci-local: ## 本地跑 CI 做的事 (typecheck + test + build)
	$(MAKE) typecheck
	$(MAKE) test
	$(MAKE) build

ci-release-critical: ## 本地模拟 GitHub CI 的 release-critical build
	pnpm --filter @hermes-panel/shared build
	pnpm --filter @hermes-panel/bff build
	pnpm --filter @hermes-panel/web build
	pnpm --filter hermes-panel-vscode build
	pnpm --filter @hermes-panel/desktop build
	$(MAKE) release-npm
	./scripts/smoke-npm-package.sh
	./scripts/smoke-desktop-bff.sh
