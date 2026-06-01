# Hermes Panel

<p align="center">
  <strong>本地优先、模型自由、跨平台的 AI Agent 可视化控制面板与开发工作台</strong>
</p>

<p align="center">
  <a href="https://github.com/xxx/hermes-panel/releases"><img src="https://img.shields.io/github/v/release/xxx/hermes-panel" alt="GitHub release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/xxx/hermes-panel" alt="License: MIT"></a>
  <a href="https://www.npmjs.com/package/hermes-panel"><img src="https://img.shields.io/npm/v/hermes-panel" alt="npm"></a>
</p>

---

## 什么是 Hermes Panel？

Hermes Panel 是 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 的精美 Web 控制面板，也是一个**本地优先的 AI 开发工作台**。

与终端命令行不同，Panel 提供了直观的 GUI：流式聊天、工具调用可视化、用量仪表盘、多 Agent 编排、文件编辑器、定时任务管理，一切都在一个界面中完成。

**定位**：所有数据和处理都在本地完成，不依赖任何云端服务。你拥有完全的控制权。

---

## 为什么选择 Hermes Panel？

| | Hermes Panel | 直接使用 Hermes CLI | 其他 Web 面板 |
|------|:---:|:---:|:---:|
| 流式聊天 + 工具可视化 | ✅ | ❌ (纯文本) | ✅ |
| 用量仪表盘 + 成本追踪 | ✅ | ❌ | 🔸 |
| 多 Agent Workspace 编排 | ✅ | ❌ | ❌ |
| 桌面应用 (轻量原生) | ✅ Tauri | ❌ | 🔸 Electron |
| 跨平台 (Win/Mac/Linux) | ✅ | ✅ | 🔸 |
| VS Code 扩展 | ✅ | ❌ | ❌ |
| PWA 移动端 | ✅ | ❌ | 🔸 |
| 隐私保护 (本地执行) | ✅ | ✅ | ✅ |
| 开源协议 | MIT | Apache 2.0 | MIT / GPL |

---

## 快速开始

### 方式一：npx（最快）

```bash
npx hermes-panel
```

浏览器自动打开 `http://127.0.0.1:5666`。

### 方式二：npm 全局安装

```bash
npm install -g hermes-panel
hermes-panel start
```

### 方式三：桌面应用

从 [GitHub Releases](https://github.com/xxx/hermes-panel/releases) 下载对应平台的安装包：

- macOS: `.dmg`
- Windows: `.exe` / `.msi`
- Linux: `.deb` / `.rpm` / `.AppImage`

### 方式四：Docker

```bash
docker compose up -d
```

---

## 功能亮点

| 功能 | 说明 |
|------|------|
| **AI 聊天** | SSE 实时流式、工具调用可视化、推理过程显示、消息编辑、会话分叉 |
| **多渠道管理** | 统一配置 Telegram / Discord / Slack / WhatsApp / 微信 / 飞书 等 8 个平台 |
| **用量仪表盘** | Token 用量、成本追踪、模型分布、缓存命中率、月度预测 |
| **多 Agent 编排** | 12 个内置 Workspace (开发/写作/研究等)，Orchestrator 自动调度 |
| **定时任务** | 可视化 Cron 编辑器，创建/暂停/恢复/触发 |
| **文件编辑器** | Monaco Editor (VS Code 同款)，语法高亮，Diff 对比 |
| **开发者工具** | API Playground、SSE Inspector、SDK 代码生成、Webhook 调试 |
| **桌面应用** | Tauri 2 原生壳，体积 < 15MB，内存 < 80MB |
| **VS Code 扩展** | 编辑器内发送代码/文件/diff 到 Panel |
| **PWA 移动端** | 添加到主屏，离线使用 |

---

## 技术架构

```
浏览器 / Tauri WebView (:5666)
   │
   │ REST + SSE
   ▼
Panel BFF (:5667)
   │
   ├── /api/hermes/* 代理到 Hermes API (:8642)
   ├── better-sqlite3 读取 ~/.hermes/state.db (只读)
   ├── child_process 调用 Hermes CLI
   └── 自建 panel.db 存储 Panel 数据
```

**安全设计**：
- Hermes API Key 存储在系统密钥链 (Keytar)，永不暴露到前端
- BFF 认证采用 Token + 可选用户名密码
- 所有敏感操作归口 BFF 层

---

## 项目结构

```
hermes-panel/
├── packages/
│   ├── panel-web/         # Vue 3 前端 (Naive UI + Pinia + ECharts)
│   ├── panel-bff/         # Koa 2 BFF (30+ 路由)
│   ├── panel-shared/      # 共享类型与常量
│   ├── panel-desktop/     # Tauri 2 桌面应用 (Rust)
│   ├── panel-npm/         # npx hermes-panel 运行时
│   ├── panel-vscode/      # VS Code 扩展
│   └── fake-hermes/       # 离线开发用 Mock
├── docs/                  # 设计与规划文档
├── scripts/               # 开发辅助脚本
└── .github/               # CI/CD 工作流 + Issue/PR 模板
```

---

## 开发指南

### 环境要求

- Node.js `>= 20`
- pnpm `>= 9`
- Rust 工具链 (仅桌面应用开发)

### 本地启动

```bash
# 安装依赖
pnpm install

# 启动开发环境 (fake-hermes + BFF + Web)
make dev-up

# 打开 http://127.0.0.1:5666
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `make dev-up` | 启动完整开发环境 |
| `make build` | 构建所有包 |
| `make typecheck` | TypeScript 类型检查 |
| `make test` | 运行所有测试 |
| `make open` | 启动桌面应用开发模式 |
| `make release` | 构建发布产物 |
| `make help` | 查看所有 Makefile 目标 |

### 单包开发

```bash
pnpm --filter @hermes-panel/web dev
pnpm --filter @hermes-panel/bff test
pnpm --filter @hermes-panel/desktop build
```

---

## 页面路由

- `#/dashboard` — 仪表盘
- `#/chat` — AI 聊天
- `#/sessions` — 会话历史
- `#/workspaces` — 工作环境
- `#/cron` — 定时任务
- `#/memory` — 知识管理
- `#/tools` — 工具与技能
- `#/files` — 文件编辑器
- `#/channels` — 渠道配置
- `#/developer` — 开发者工具
- `#/settings` — 系统设置

---

## 版本对比

| 功能 | 社区版 | 专业版 |
|------|:---:|:---:|
| AI 聊天 + 工具可视化 | ✅ | ✅ |
| 多渠道管理 | ✅ | ✅ |
| Dashboard 用量追踪 | ✅ | ✅ |
| Session 管理 | ✅ | ✅ |
| 文件编辑器 (Monaco) | ✅ | ✅ |
| Docker 沙箱 | ✅ | ✅ |
| VS Code 扩展 | ✅ | ✅ |
| 桌面应用 (Tauri) | ✅ | ✅ |
| PWA 移动端 | ✅ | ✅ |
| Workspace 多 Agent 编排 | ❌ | ✅ |
| Kanban 任务板 | ❌ | ✅ |
| 团队协作 (RBAC) | ❌ | ✅ |
| 审批队列 | ❌ | ✅ |
| Agent 质量评估 | ❌ | ✅ |
| Token 压缩引擎 | ❌ | ✅ |
| 高级诊断 | ❌ | ✅ |
| **价格** | **免费** | 待定 |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|------|------|
| `PANEL_TOKEN` | 启动时生成 | BFF 认证 Token |
| `BFF_PORT` | `5667` | BFF 端口 |
| `HERMES_API_BASE` | `http://127.0.0.1:8642` | Hermes API 地址 |
| `HERMES_BIN` | `hermes` | Hermes CLI 路径 |
| `HERMES_HOME` | `~/.hermes` | Hermes 数据目录 |
| `PANEL_HOME` | `~/.hermes-panel` | Panel 数据目录 |
| `LOG_LEVEL` | `info` | 日志级别 |

---

## 社区

- 📖 [设计文档](docs/superpowers/specs/)
- 📋 [实施计划](docs/superpowers/plans/)
- 🐛 [报告问题](https://github.com/xxx/hermes-panel/issues)
- 💡 [功能建议](https://github.com/xxx/hermes-panel/issues)
- 🔧 [贡献指南](CONTRIBUTING.md)

---

## 许可证

Hermes Panel 基于 [MIT License](LICENSE) 开源。

---

**Made with ❤️ by the Hermes Panel Team**
