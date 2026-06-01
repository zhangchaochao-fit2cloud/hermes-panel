# Hermes Panel 版本管理、发布流程与社区规范

> **参考对象**：1Panel、JumpServer、semantic-release 社区最佳实践
> **目标**：建立从代码提交 → 审核 → 自动构建 → 发布 → 社区维护的完整工程化标准

---

## 一、版本管理规范 (Version Management)

### 1.1 语义化版本 (Semantic Versioning)

参考 [SemVer 2.0](https://semver.org/lang/zh-CN/) 和 1Panel 的实践：

```
MAJOR.MINOR.PATCH[-prerelease][+build]

示例：
  0.1.0-alpha.1   # 早期 Alpha
  0.1.0-beta.0    # 当前 Panel
  0.2.0-beta.0    # Plan 2 完成后
  0.5.0-rc.1      # 功能基本完整，候选发布
  1.0.0            # 正式 GA
  1.0.1            # Bug 修复
  1.1.0            # 新功能
  2.0.0            # 破坏性变更
```

### 1.2 版本号规则

| 版本段 | 何时递增 | 示例 |
|------|------|------|
| **MAJOR** | 破坏性 API 变更、架构重写、不再向后兼容 | 0.x → 1.0.0, 1.x → 2.0.0 |
| **MINOR** | 新功能、新页面、向后兼容 | 0.1.0 → 0.2.0, 1.0.0 → 1.1.0 |
| **PATCH** | Bug 修复、性能优化、文档更新 | 0.1.0 → 0.1.1 |

### 1.3 发布前版本标识

参考 1Panel v2.x 线：

| 标识 | 含义 | 何时用 |
|------|------|------|
| `-alpha.N` | 内部开发版，功能不完整 | 功能开发中，内部测试 |
| `-beta.N` | 公开测试版，功能基本完整 | 邀请社区测试，收集反馈 |
| `-rc.N` | 候选发布版，冻结功能 | 修最后一轮 Bug，准备 GA |
| (无后缀) | 正式版 | 生产可用 |

### 1.4 版本管理工具

```bash
# package.json 中的 version 为唯一版本源
# 所有包 (panel-web, panel-bff, panel-shared, panel-desktop) 共享同一版本

# 发版时手动升级版本号：
npm version prerelease --preid=alpha   # 0.1.0-alpha.0 → 0.1.0-alpha.1
npm version prerelease --preid=beta    # 0.1.0-beta.0 → 0.1.0-beta.1
npm version patch                       # 0.1.0 → 0.1.1
npm version minor                       # 0.1.0 → 0.2.0
npm version major                       # 0.1.0 → 1.0.0
```

---

## 二、分支策略 (Branch Strategy)

### 2.1 参考 1Panel 模式

```
master / main (默认分支)
  │
  ├── dev (日常开发集成分支)
  │     ├── feat/plan-02-orchestrator    (功能分支)
  │     ├── feat/plan-03-channels        (功能分支)
  │     ├── fix/sse-reconnect            (修复分支)
  │     └── chore/update-deps            (杂项分支)
  │
  ├── release/v0.2.0  (发布分支，从 dev 切出)
  │     └── 只修 Bug，不添加功能
  │
  └── hotfix/v0.1.1   (热修复分支，从 master 切出)
        └── 紧急 Bug 修复
```

### 2.2 分支命名规范

```
feat/<描述>        # 新功能: feat/plan-02-orchestrator
fix/<描述>         # Bug 修复: fix/chat-sse-timeout
chore/<描述>       # 杂项: chore/update-dependencies
docs/<描述>        # 文档: docs/api-reference
refactor/<描述>    # 重构: refactor/auth-middleware
release/<版本>     # 发布: release/v0.2.0
hotfix/<版本>      # 热修复: hotfix/v0.1.1
```

### 2.3 合并策略

```
feat/* ──Squash/Merge──▶ dev ──Merge──▶ release/* ──Merge──▶ master
                           │                                    │
                           │                          hotfix/* ──Merge──▶ master
                           │                              │
                           └──────────────────────────────┘ (cherry-pick 回 dev)
```

- **feat → dev**: Squash and Merge (保持 commit 历史干净)
- **dev → release**: Merge Commit (保留完整的合并记录)
- **release → master**: Merge Commit + Tag
- **hotfix → master**: Merge Commit + Tag, 然后 cherry-pick 回 dev

---

## 三、提交信息规范 (Conventional Commits)

参考 [Conventional Commits](https://www.conventionalcommits.org/) 和 1Panel 的实践：

### 3.1 格式

```
<type>(<scope>): <简短描述>

<详细说明（可选）>

<footer（可选，如 BREAKING CHANGE、Closes #123）>
```

### 3.2 Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(chat): add orchestrator plan preview card` |
| `fix` | Bug 修复 | `fix(sse): handle reconnect after network loss` |
| `docs` | 文档变更 | `docs(readme): add installation guide` |
| `style` | 代码格式（不影响逻辑） | `style: format with prettier` |
| `refactor` | 重构（不改变功能） | `refactor(auth): extract token validation` |
| `perf` | 性能优化 | `perf(chat): lazy load monaco editor` |
| `test` | 测试相关 | `test(channels): add channel config tests` |
| `chore` | 构建/工具/依赖 | `chore(deps): update koa to 2.16` |
| `ci` | CI/CD 变更 | `ci: add windows to release matrix` |
| `revert` | 回滚 | `revert: feat(chat): add orchestrator` |

### 3.3 Scope 范围

```
chat, channels, dashboard, sessions, workspaces,
cron, memory, tools, developer, settings, files,
bff, desktop, shared, npm, vscode,
docs, ci, deps, release
```

---

## 四、代码审核流程 (Code Review)

### 4.1 参考 1Panel 的 PR 模板

```markdown
<!-- 感谢你为 Hermes Panel 贡献代码！-->

#### 这个 PR 做了什么？
<!-- 用 1-2 句话描述 -->

#### 修改类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档
- [ ] 其他

#### 关联 Issue
<!-- Closes #123 -->

#### 测试
<!-- 描述你做了什么测试 -->
- [ ] 单元测试通过
- [ ] 手动测试通过
- [ ] E2E 测试通过（如有）

#### 截图（UI 变更时）
<!-- 粘贴前后对比截图 -->

#### Checklist
- [ ] 代码符合项目规范
- [ ] 已添加必要的测试
- [ ] 已更新相关文档
- [ ] 没有引入新的 TypeScript 错误
- [ ] Commit 信息符合 Conventional Commits
```

### 4.2 审核要求

| 要求 | 说明 |
|------|------|
| **至少 1 位 Reviewer** | 核心代码至少 2 位 |
| **CI 全绿** | typecheck + test + build 必须通过 |
| **无未解决的 Comment** | 所有 Review 意见必须解决 |
| **禁止直接 push master/dev** | 所有变更必须走 PR |

### 4.3 Label 管理

参考 1Panel 的 PR Label 体系：
```
type: feature      # 新功能
type: bug          # Bug 修复
type: docs         # 文档
priority: high     # 高优先级
priority: low      # 低优先级
status: wip        # 开发中
status: review     # 待审核
size: xs/s/m/l/xl  # 改动规模
```

---

## 五、自动构建与发布 (CI/CD)

### 5.1 当前状态

Panel 已有的 CI 工作流（`.github/workflows/ci.yml`）：
- 三平台 × 双 Node 版本 矩阵测试
- typecheck + test 自动运行
- build 仅在 ubuntu/node22 执行

### 5.2 需要新增的工作流

#### 5.2.1 Release 工作流 (`.github/workflows/release.yml`)

参考 1Panel 和 semantic-release 的模式：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'
      - 'v*.*.*-alpha.*'
      - 'v*.*.*-beta.*'
      - 'v*.*.*-rc.*'

jobs:
  # 1. 类型检查 + 测试
  verify:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test

  # 2. 构建所有包
  build:
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: |
            packages/panel-web/dist/
            packages/panel-bff/dist/
            packages/panel-shared/dist/

  # 3. 构建桌面应用
  build-desktop:
    needs: verify
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - run: pnpm --filter @hermes-panel/desktop build
      - uses: actions/upload-artifact@v4
        with:
          name: desktop-${{ matrix.os }}
          path: packages/panel-desktop/src-tauri/target/release/bundle/

  # 4. 构建 VS Code 扩展
  build-vscode:
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - run: pnpm --filter hermes-panel-vscode build

  # 5. 生成 Changelog
  changelog:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: npx conventional-changelog -p angular -i CHANGELOG.md -s

  # 6. 发布到 GitHub Releases
  release:
    needs: [build, build-desktop, changelog]
    runs-on: ubuntu-latest
    steps:
      - uses: softprops/action-gh-release@v2
        with:
          body_path: CHANGELOG.md
          files: |
            packages/panel-desktop/src-tauri/target/release/bundle/**/*
            packages/panel-vscode/dist/extension.vsix

  # 7. 发布 npm 包
  publish-npm:
    needs: build
    runs-on: ubuntu-latest
    if: "!contains(github.ref, '-alpha') && !contains(github.ref, '-beta') && !contains(github.ref, '-rc')"
    steps:
      - uses: actions/setup-node@v4
        with:
          registry-url: 'https://registry.npmjs.org'
      - run: cd packages/panel-npm && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  # 8. 发布 VS Code 扩展
  publish-vscode:
    needs: build-vscode
    runs-on: ubuntu-latest
    if: "!contains(github.ref, '-alpha') && !contains(github.ref, '-beta')"
    steps:
      - run: npx vsce publish
```

#### 5.2.2 触发流程

```
开发者 push tag (例如 v0.2.0-beta.0)
  │
  ▼
GitHub Actions 触发 Release 工作流
  │
  ├── verify (3 平台 × 2 Node 测试)
  ├── build (构建 Web + BFF + Shared)
  ├── build-desktop (三平台 Tauri 构建)
  ├── build-vscode (VS Code 扩展构建)
  ├── changelog (生成 CHANGELOG.md)
  │
  ▼
release (发布到 GitHub Releases)
  │
  ├── 正式版 (v1.0.0): 同时发布 npm + VS Code Marketplace
  ├── beta/rc: 仅发布 GitHub Release
  └── alpha: 不自动发布，仅构建验证
```

#### 5.2.3 桌面应用打包参考 1Panel

| 平台 | 格式 | 签名 |
|------|------|------|
| macOS | `.dmg` + `.app` | Apple Developer ID 签名 + 公证 |
| Windows | `.exe` (NSIS) + `.msi` (WiX) | EV 证书签名 |
| Linux | `.deb` + `.rpm` + `.AppImage` | GPG 签名 |

---

## 六、包管理规范

### 6.1 Monorepo 包版本策略

```
packages/
├── panel-shared/    → @hermes-panel/shared@0.1.0
├── panel-bff/       → @hermes-panel/bff@0.1.0
├── panel-web/       → @hermes-panel/web@0.1.0
├── panel-desktop/   → (Tauri, Cargo.toml 独立版本)
├── panel-npm/       → hermes-panel@0.1.0
├── panel-vscode/    → hermes-panel-vscode@0.1.0
└── fake-hermes/     → 不发布

原则：
  - 所有包共享同一 MAJOR.MINOR.PATCH 版本号
  - panel-desktop 的 Cargo.toml 版本同步
  - workspace:* 协议引用内部包
```

### 6.2 npm 发布清单

参考 1Panel 的 `files` 字段：

```json
{
  "name": "hermes-panel",
  "files": [
    "bin/",
    "dist/",
    "package.json",
    "README.md",
    "LICENSE"
  ],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org"
  }
}
```

### 6.3 发布渠道

| 渠道 | Tag | 用户 |
|------|-----|------|
| `latest` | 正式版 (v1.0.0+) | 普通用户 `npm i -g hermes-panel` |
| `next` | Beta/RC 版 | 尝鲜用户 `npm i -g hermes-panel@next` |
| `canary` | Alpha 版 | 开发者 `npm i -g hermes-panel@canary` |

---

## 七、社区版 vs 专业版 (Edition Management)

### 7.1 参考 1Panel 的版本分层

1Panel 用 **GPL v3** 协议，社区版完全开源，专业版通过 License Key 激活额外功能。Panel 应采用类似策略：

```
Hermes Panel 社区版 (MIT)
  ✅ 所有基础功能（聊天、Dashboard、会话、工具、设置）
  ✅ 桌面应用 (Tauri)
  ✅ VS Code 扩展
  ✅ npm 发布
  ✅ Docker 部署
  ✅ 单用户使用

Hermes Panel 专业版 (License Key)
  🔐 Workspace 多角色编排
  🔐 Kanban 任务板
  🔐 群聊 (多 Agent 聊天室)
  🔐 渠道配置管理
  🔐 团队协作 (多 Profile + RBAC)
  🔐 审批队列
  🔐 高级诊断 (Doctor Pro)
  🔐 Agent 质量评估
  🔐 Token 压缩引擎
```

### 7.2 功能开关实现 (Feature Gate)

Panel 已有 Premium Feature 体系（`packages/panel-shared/src/types/auth.ts`）：

```typescript
// 已有的 Premium Features
export const PREMIUM_FEATURES = [
  'workspaces', 'cron', 'memory', 'files', 'tools', 'developer',
  'providers', 'backup', 'sandbox', 'gateway', 'webhook',
  'doctor', 'logs', 'secrets', 'channels',
] as const;

// 新增：社区版免费功能（无需 License）
const COMMUNITY_FEATURES = new Set([
  'chat', 'dashboard', 'sessions', 'settings', 'memory', 'files'
]);

// 新增：专业版功能（需 License）
const PRO_FEATURES = new Set([
  'workspaces', 'cron', 'tools', 'developer', 'providers',
  'backup', 'sandbox', 'gateway', 'webhook', 'doctor',
  'logs', 'secrets', 'channels'
]);

// 新增：企业版功能（需 Enterprise License）
const ENTERPRISE_FEATURES = new Set([
  'kanban', 'group-chat', 'team-rbac', 'audit-log'
]);
```

### 7.3 License 激活流程

参考 1Panel Professional 的激活方式：

```
1. 用户在设置页面输入 License Key
2. BFF 验证 License Key（本地校验 + 可选在线校验）
3. BFF 存储激活状态到 panel.db licenses 表
4. 前端根据激活状态显示/隐藏功能入口
5. License 过期 → 功能降级为只读 → 提示续费
```

### 7.4 源码控制策略

```
开源仓库 (GitHub Public)
  ├── 所有社区版代码 (MIT License)
  ├── 专业版功能代码 (源码可见，需 License 激活)
  └── 企业版功能代码 (源码可见，需 Enterprise License)

原则：
  - 不维护私有仓库
  - 所有功能代码在同一个开源仓库
  - 功能区分通过 License Key 激活，而非代码隐藏
  - 参考 1Panel：专业版功能代码在开源仓库，激活靠 License
```

---

## 八、README 规范

### 8.1 参考 1Panel README 结构

```markdown
<!-- Logo + 一句话描述 -->
<p align="center">
  <img src="logo.png" width="200" alt="Hermes Panel">
</p>
<h3 align="center">本地优先的 AI Agent 可视化控制面板与开发工作台</h3>

<!-- Badges -->
<p align="center">
  <img src="https://img.shields.io/github/v/release/...">
  <img src="https://img.shields.io/github/license/...">
  <img src="https://img.shields.io/github/stars/...">
  <img src="https://img.shields.io/npm/v/hermes-panel">
  <img src="https://img.shields.io/github/actions/workflow/status/...">
</p>

<!-- 多语言 README -->
<p align="center">
  <a href="/README.md">English</a> |
  <a href="/README.zh-CN.md">中文</a> |
  <a href="/README.ja.md">日本語</a>
</p>

---

## 什么是 Hermes Panel？

<!-- 2-3 段，配合截图/GIF -->

## 为什么选择 Hermes Panel？

<!-- 对比表：vs 直接使用 Hermes CLI, vs hermes-web-ui, vs Codex -->

## 快速开始

### 方式一：npx（最快）
```bash
npx hermes-panel
```

### 方式二：npm 全局安装
```bash
npm install -g hermes-panel
hermes-panel start
```

### 方式三：Docker
```bash
docker compose up -d
```

### 方式四：桌面应用
<!-- 下载链接 -->

## 功能亮点

<!-- 带截图的特性介绍 -->

## 技术栈

<!-- 架构图 + 技术列表 -->

## 开发

### 环境要求
- Node.js >= 20
- pnpm >= 9

### 本地开发
```bash
git clone https://github.com/xxx/hermes-panel.git
cd hermes-panel
pnpm install
pnpm dev
```

### 项目结构
```
hermes-panel/
├── packages/
│   ├── panel-web/         # Vue 3 前端
│   ├── panel-bff/         # Koa 2 BFF
│   ├── panel-shared/      # 共享类型
│   ├── panel-desktop/     # Tauri 2 桌面
│   ├── panel-npm/         # npm 包
│   ├── panel-vscode/      # VS Code 扩展
│   └── fake-hermes/       # 测试 mock
├── docs/                  # 文档
└── scripts/               # 脚本
```

## 版本对比

| 功能 | 社区版 | 专业版 | 企业版 |
|------|:---:|:---:|:---:|
| AI 聊天 | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ |
| Workspace 编排 | ❌ | ✅ | ✅ |
| 团队协作 | ❌ | ❌ | ✅ |
| 价格 | 免费 | $X/月 | $X/月 |

## 社区

- 💬 [Discord](https://discord.gg/...)
- 📖 [文档](https://docs.hermes-panel.dev)
- 🐛 [Issue Tracker](https://github.com/.../issues)
- 🔧 [贡献指南](CONTRIBUTING.md)

## 许可证

Hermes Panel 基于 [MIT License](LICENSE) 开源。
```

---

## 九、社区规范文件清单

参考 1Panel 和 JumpServer，以下文件应在仓库根目录：

| 文件 | 用途 | 优先级 |
|------|------|:---:|
| `README.md` | 项目介绍 + 快速开始 | **必须** |
| `README.zh-CN.md` | 中文 README | **必须** |
| `LICENSE` | MIT 许可证 | **必须** |
| `CONTRIBUTING.md` | 贡献指南 | **必须** |
| `CODE_OF_CONDUCT.md` | 行为准则 | 强烈建议 |
| `SECURITY.md` | 安全策略 + 漏洞报告 | 强烈建议 |
| `CHANGELOG.md` | 版本变更日志 | **必须** |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug 报告模板 | 强烈建议 |
| `.github/ISSUE_TEMPLATE/feature_request.md` | 功能请求模板 | 强烈建议 |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR 模板 | 强烈建议 |
| `.github/workflows/ci.yml` | CI 工作流 (已有) | **必须** |
| `.github/workflows/release.yml` | 发布工作流 | **必须** |
| `docs/` | 用户文档 | 强烈建议 |
| `pnpm-workspace.yaml` | monorepo 配置 (已有) | **必须** |

---

## 十、实施计划

### Phase 0: 立即 (今天)

| 任务 | 说明 |
|------|------|
| 创建 `CONTRIBUTING.md` | 贡献指南 |
| 创建 `SECURITY.md` | 安全策略 |
| 创建 `CODE_OF_CONDUCT.md` | 行为准则 |
| 创建 `.github/ISSUE_TEMPLATE/` | Issue 模板 |
| 创建 `.github/PULL_REQUEST_TEMPLATE.md` | PR 模板 |
| 更新 `README.md` | 按规范重写 |
| 创建 `README.zh-CN.md` | 中文 README |

### Phase 1: 本周

| 任务 | 说明 |
|------|------|
| 创建 `.github/workflows/release.yml` | 自动发布工作流 |
| 配置 npm publish token | GitHub Secrets |
| 首次手动发布 `v0.1.0-beta.0` | 建立 release 流程 |

### Phase 2: 后续迭代

| 任务 | 说明 |
|------|------|
| Tauri 桌面签名配置 | Apple Developer + EV 证书 |
| VS Code Marketplace 发布 | vsce publish 自动化 |
| Docker Hub 自动构建 | 关联 GitHub Release |
| Homebrew Cask / WinGet 提交 | 包管理器分发 |

---

**END OF DOCUMENT**
