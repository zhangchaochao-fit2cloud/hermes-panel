# Hermes Panel 竞品深度对比分析

> **文档日期**：2026-06-01
> **对比对象**：Hermes Panel · hermes-web-ui · OpenAI Codex · Claude Code
> **目的**：明确 Panel 的差异化定位、目标用户、使用场景和后续方向

---

## 一、产品定位对比

### 1.1 一句话定位

| 产品 | 一句话 |
|------|--------|
| **Hermes Panel** | 本地优先、模型自由、跨平台的 AI Agent **可视化控制面板 + 开发工作台** |
| **hermes-web-ui** | Hermes Agent 的**全功能 Web 管理面板**，一个面板管到底 |
| **OpenAI Codex** | OpenAI 的**通用 AI Agent 超级 App**，从编码工具向知识工作平台演进 |
| **Claude Code** | Anthropic 的**终端原生编码 Agent**，仓库级理解 + 自主执行 |

### 1.2 产品形态

```
              GUI 界面
                 ▲
                 │
    Hermes Panel │  hermes-web-ui
    (Tauri桌面+Web)  (Web+Electron桌面)
                 │
                 │     Codex Desktop
                 │     (Electron桌面+云端)
                 │
    ─────────────┼─────────────────────▶ 终端/TUI
                 │
                 │     Claude Code
                 │     (纯终端CLI)
                 │
                 ▼
```

### 1.3 核心差异维度

| 维度 | Hermes Panel | hermes-web-ui | Codex | Claude Code |
|------|:---:|:---:|:---:|:---:|
| **产品形态** | Tauri 桌面 + Web SPA + VS Code 扩展 | Web SPA + Electron 桌面 | Electron 桌面 + Rust CLI | 纯终端 CLI |
| **定位层级** | Agent **管理面板** → 工作台 | Agent **管理面板** | Agent **本身** | Agent **本身** |
| **执行位置** | 本地 (BFF + Hermes) | 本地 (BFF + Hermes) | **云端** (OpenAI 沙箱) | **本地** (终端直接执行) |
| **模型绑定** | 自由 (任意 Provider) | 自由 (Hermes Provider) | **锁定** (GPT-5.3-Codex) | Anthropic 优先，可配置 |
| **平台覆盖** | Win/Mac/Linux + Web + PWA | Web + macOS | **macOS only** | Win/Mac/Linux |
| **开源协议** | MIT | MIT | Apache 2.0 | Proprietary |
| **技术栈** | Vue 3.5 · Koa 2.15 · Tauri 2 · better-sqlite3 | Vue 3 · Koa 2 · Electron · node-pty | Electron · Rust (60+ crates) · JSON-RPC | TypeScript (Node) |
| **安装包体积** | 3-10 MB (Tauri) | ~100 MB (Electron) | ~150 MB (Electron) | ~50 MB (Node) |
| **内存占用** | 30-80 MB | ~200 MB | ~400 MB | ~150 MB |
| **成熟度** | Beta (未发布) | v0.5.7 (生产可用) | 3M+ 周活 | 年化 $25亿 ARR |

### 1.4 关键认知

**Hermes Panel 和 hermes-web-ui 不是 Codex/Claude Code 的直接竞品。**

- Codex 和 Claude Code 是 **Agent 本身**——它们接收指令、执行任务、产出结果
- Hermes Panel 和 hermes-web-ui 是 **Agent 的管理层**——它们连接 Agent、可视化 Agent 的状态和资源、管理 Agent 的配置和渠道

这就像 **Kubernetes Dashboard** vs **Kubernetes**——管理面板和运行时引擎是不同层级的产品。但 Panel 正在通过 Phase 2 (Orchestrator + Sandbox) 向"执行层"延伸，目标是从"管理面板"升级为"管理 + 执行一体化工作台"。

---

## 二、架构对比

### 2.1 Hermes Panel

```
┌─────────────────────────────────────────────────────────┐
│                    Hermes Panel                           │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ Tauri 桌面│  │ Web SPA  │  │ VS Code 扩展          │   │
│  │ (Rust)   │  │ (Vue 3)  │  │ (发送选中/文件/diff)  │   │
│  │ :5666    │  │ :5666    │  │ → POST /api/draft     │   │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘   │
│       │             │                    │               │
│       └─────────────┼────────────────────┘               │
│                     │ REST + SSE (:5667)                 │
│                     ▼                                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │              BFF (Koa 2, 30+ 路由)                │   │
│  │                                                   │   │
│  │  ┌──────────────┐ ┌───────────┐ ┌─────────────┐ │   │
│  │  │ Hermes Proxy │ │ Hermes CLI│ │ 自建服务     │ │   │
│  │  │ → :8642      │ │ child_p.  │ │ panel.db    │ │   │
│  │  │ SSE 逐块转发 │ │ skills/   │ │ sandbox.ts  │ │   │
│  │  │              │ │ cron/mcp/ │ │ channel.ts  │ │   │
│  │  │              │ │ profile   │ │ compressor  │ │   │
│  │  └──────────────┘ └───────────┘ └─────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
│                     │                                    │
│         ┌───────────┼───────────┐                        │
│         ▼           ▼           ▼                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ Hermes   │ │ panel.db │ │ Docker   │                 │
│  │ Gateway  │ │ (12张表) │ │ Sandbox  │                 │
│  │ :8642    │ │ ~/.hermes│ │ 隔离容器 │                 │
│  └──────────┘ │ -panel/  │ └──────────┘                 │
│               └──────────┘                               │
└─────────────────────────────────────────────────────────┘
```

**关键设计决策**：
- **SSE 从直连改为 BFF 代理** —— Tauri WebKit SSE 跨域问题 + API Key 安全
- **自建 panel.db 独立于 state.db** —— Panel 数据不污染 Hermes，Hermes 停止不影响 Panel
- **CLI fallback 模式** —— hermes CLI 不可用时 Panel 仍可用（返回空数据，不 5xx）
- **Docker 沙箱** —— Agent 代码在隔离容器执行，不影响宿主机

### 2.2 hermes-web-ui

```
┌─────────────────────────────────────────────────────────┐
│                  hermes-web-ui                            │
│                                                           │
│  ┌──────────┐  ┌──────────┐                              │
│  │Electron  │  │ Web SPA  │                              │
│  │(macOS)   │  │ (Vue 3)  │                              │
│  │          │  │ :5173    │                              │
│  └────┬─────┘  └────┬─────┘                              │
│       └──────────────┤                                    │
│                      │ REST + SSE + WebSocket (:8648)     │
│                      ▼                                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │              BFF (Koa 2)                          │   │
│  │                                                   │   │
│  │  ┌──────────────┐ ┌───────────┐ ┌─────────────┐ │   │
│  │  │ SSE Proxy    │ │ CLI 调用   │ │ node-pty    │ │   │
│  │  │ → Gateway    │ │ sessions/ │ │ WebSocket   │ │   │
│  │  │              │ │ cron/logs │ │ 伪终端      │ │   │
│  │  └──────────────┘ └───────────┘ └─────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
│                     │                                    │
│         ┌───────────┼───────────┐                        │
│         ▼           ▼           ▼                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ Hermes   │ │config.yaml│ │auth.json │                 │
│  │ Gateway  │ │.env       │ │(凭证池)  │                 │
│  │ :8642    │ │(渠道配置) │ │          │                 │
│  └──────────┘ └──────────┘ └──────────┘                 │
└─────────────────────────────────────────────────────────┘
```

**关键差异 vs Panel**：
- **node-pty + WebSocket 终端** —— Panel 选择场景化终端面板方案，不复用 PTY
- **config.yaml + .env 直接读写** —— 渠道配置的持久化方式不同
- **命名空间隔离** —— `hermes/` 目录下组织代码，支持未来多 Agent 类型扩展
- **无自建数据库** —— 不维护独立的 panel.db，依赖 hermes state.db + 本地 SQLite 同步

### 2.3 OpenAI Codex

```
┌─────────────────────────────────────────────────────────┐
│                   Codex Desktop                           │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Electron Shell (Chromium)                │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  React UI · Theme · Multi-window · Browser│  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │ JSON-RPC 2.0 (stdio, JSONL)        │
│                     ▼                                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │           codex-rs (Rust Core, 60+ crates)        │   │
│  │                                                   │   │
│  │  ┌──────────────┐ ┌───────────┐ ┌─────────────┐ │   │
│  │  │ThreadManager │ │ Sandbox   │ │ Plugin Host │ │   │
│  │  │(多Agent调度) │ │(Seatbelt/ │ │ (90+ 插件)  │ │   │
│  │  │              │ │Bubblewrap)│ │             │ │   │
│  │  └──────────────┘ └───────────┘ └─────────────┘ │   │
│  │                                                   │   │
│  │  ┌──────────────────────────────────────────┐    │   │
│  │  │         GPT-5.3-Codex API (Cloud)        │    │   │
│  │  │  400K context · Compaction · Sandbox     │    │   │
│  │  └──────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  Execution: ALL code runs on OpenAI cloud servers         │
│  Local: UI rendering only                                 │
└─────────────────────────────────────────────────────────┘
```

**关键设计决策**：
- **Electron + Rust 双层** —— UI 用 Electron (跨平台)，核心引擎用 Rust (性能+安全)
- **JSON-RPC 通信** —— 前端与 Rust 后端通过 stdio JSONL 通信，与 IDE 扩展/TUI 共享同一协议
- **OS 级沙箱** —— macOS Seatbelt / Linux Bubblewrap+Seccomp / Windows Restricted Tokens，三平台三种策略
- **Cloud Sandbox** —— 桌面版实际执行在 OpenAI 云端容器，代码离开本机
- **Git Worktree 隔离** —— 多 Agent 并行各自独立 worktree，无冲突

### 2.4 Claude Code

```
┌─────────────────────────────────────────────────────────┐
│                   Claude Code (CLI)                       │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │        Node.js Process (TypeScript)               │   │
│  │                                                   │   │
│  │  ┌──────────────┐ ┌───────────┐ ┌─────────────┐ │   │
│  │  │ Agent Loop   │ │ Tool Use  │ │ Permission  │ │   │
│  │  │ (plan→act→   │ │ (Bash/    │ │ System      │ │   │
│  │  │  observe)    │ │ Read/Write│ │ (ask/deny)  │ │   │
│  │  └──────────────┘ └───────────┘ └─────────────┘ │   │
│  │                                                   │   │
│  │  ┌──────────────────────────────────────────┐    │   │
│  │  │      Anthropic API (Claude Models)       │    │   │
│  │  │      Prompt Caching · Tool Use · Thinking│    │   │
│  │  └──────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  Execution: ALL on local machine                          │
│  Interface: Terminal only (REPL)                          │
│  Security: Permission-based (ask user before each action) │
└─────────────────────────────────────────────────────────┘
```

**关键设计决策**：
- **纯终端 REPL** —— 没有 GUI，没有 Web 界面，100% 终端交互
- **权限模型** —— 每次文件写入/shell 执行都需用户确认（非沙箱隔离，是人审）
- **本地执行** —— 代码不离开本机，隐私敏感场景首选
- **Agent 循环** —— plan → act → observe → replan，自主迭代直到任务完成

---

## 三、用户画像对比

### 3.1 目标用户群体

| 用户类型 | Hermes Panel | hermes-web-ui | Codex | Claude Code |
|------|:---:|:---:|:---:|:---:|
| **独立开发者 (个人)** | ✅ 核心用户 | ✅ 核心用户 | ✅ 核心用户 | ✅ 核心用户 |
| **小团队 (2-10人)** | ✅ 目标用户 | 🔸 部分支持 | ✅ Pro 用户 | ✅ Teams |
| **企业 (10+人)** | ❌ 远期 | ❌ 远期 | ✅ Enterprise | ✅ Enterprise |
| **非程序员 (知识工作者)** | ❌ | ❌ | ✅ 扩展中 | ❌ |
| **国内用户** | ✅ 中文优先 | ✅ 中英双语 | ❌ 英文为主 | ❌ 英文为主 |
| **隐私敏感用户** | ✅ 本地执行 | ✅ 本地执行 | ❌ 云端执行 | ✅ 本地执行 |
| **Windows 用户** | ✅ | ❌ | ❌ | ✅ |
| **Linux 用户** | ✅ | 🔸 Web only | ❌ | ✅ |
| **移动端用户** | ✅ PWA | ✅ 响应式 | ✅ Android Beta | ❌ |

### 3.2 用户场景矩阵

| 场景 | Hermes Panel | hermes-web-ui | Codex | Claude Code |
|------|:---:|:---:|:---:|:---:|
| **日常 AI 聊天对话** | ✅ SSE 流式 + 工具卡 | ✅ SSE 流式 | ✅ | ✅ |
| **多模型对比切换** | ✅ Provider 管理 | ✅ 模型自动发现 | ❌ 仅 GPT | 🔸 可配置 |
| **管理多个消息平台** | ❌ | ✅ 8 平台统一 | ❌ | ❌ |
| **定时任务自动化** | ✅ Cron 可视化 | ✅ Cron 可视+CLI | ✅ 自调度 | 🔸 脚本 |
| **用量成本追踪** | ✅ Dashboard 图表 | ✅ 用量分析 | ❌ 云端账单 | ❌ |
| **多 Agent 协作开发** | ✅ Workspace+编排 | 🔸 群聊 | ✅ 并行 Agent | ✅ Agent Teams |
| **代码文件编辑** | ✅ Monaco Editor | 🔸 语法高亮预览 | ❌ 需外部 IDE | ❌ 终端 + 外部 IDE |
| **VS Code 内操作** | ✅ VS Code 扩展 | ❌ | 🔸 Chrome 扩展 | ❌ |
| **API 开发调试** | ✅ Playground+SSE Inspector | ❌ | ❌ | ❌ |
| **沙箱安全执行** | ✅ Docker 沙箱 | ❌ | ✅ OS 级沙箱 | ❌ 人审 |
| **对话终端操作** | 🔸 场景化面板 (计划中) | ✅ xterm.js 终端 | ✅ 多终端 Tab | ✅ 原生终端 |
| **文件远程后端访问** | ❌ | ✅ Docker/SSH | ❌ | ❌ |
| **语音输入** | 🔸 计划中 (Web Speech) | ❌ | ✅ 空格录音 | ❌ |
| **离线使用** | ✅ PWA 离线 | 🔸 部分 | ❌ (需云端) | ❌ (需 API) |
| **审批队列 (人审)** | ✅ review_items 表就绪 | ❌ | ✅ Review 队列 | ✅ 每次确认 |

### 3.3 用户痛点匹配

| 用户痛点 | 最优方案 |
|------|------|
| "我装了 Hermes Agent 但不想用命令行，想有个好看的界面" | **hermes-web-ui** 或 Hermes Panel |
| "我有多个消息平台 (Telegram/Discord/微信) 的 AI 机器人要统一管理" | **hermes-web-ui** (8 平台渠道配置) |
| "我想定时让 AI 帮我做事，并且能看到结果" | **Hermes Panel** (Cron 可视化) |
| "我想追踪 AI 花了多少钱、用了多少 Token" | **Hermes Panel** (Dashboard + Usage Ledger) |
| "我想让多个 AI 角色协作完成一个复杂任务" | **Hermes Panel** (Workspace + Orchestrator) |
| "我想把任务丢给 AI，关掉电脑让它自己跑，明天看结果" | **Codex** (云端异步执行) |
| "我的代码绝对不能上传到任何云端服务器" | **Claude Code** 或 **Hermes Panel** (本地执行) |
| "我大部分时间在终端里工作" | **Claude Code** |
| "我在 Windows 上用 AI 开发" | **Hermes Panel** 或 **Claude Code** |
| "我在手机上想操作 AI" | **Hermes Panel** (PWA) 或 **Codex** (Android) |
| "我需要调试 AI 的 API 调用过程" | **Hermes Panel** (SSE Inspector + Playground) |

---

## 四、功能全景矩阵

### 4.1 基础功能

| 功能 | Panel | web-ui | Codex | Claude |
|------|:---:|:---:|:---:|:---:|
| SSE 流式聊天 | ✅ | ✅ | ✅ | ✅ |
| 工具调用可视化 | ✅✅ | ✅ | ✅ | ✅ |
| 多会话管理 | ✅ | ✅ | ✅ | ✅ |
| Markdown 渲染 + 代码高亮 | ✅ | ✅ | ✅ | ✅ |
| 消息编辑/分叉 | ✅ | ✅ | ✅ | ✅ |
| 文件上传 | ✅ | ✅ | ✅ | ✅ |
| 会话搜索 | ✅ Ctrl+K | ✅ Ctrl+K | ✅ | ✅ |
| 亮暗主题 | ✅ 5模式+11色 | ✅ | ✅ | ✅ |
| i18n 国际化 | ✅ 4语 | ✅ 9语 | ❌ | ❌ |

### 4.2 管理功能

| 功能 | Panel | web-ui | Codex | Claude |
|------|:---:|:---:|:---:|:---:|
| Dashboard 用量图表 | ✅✅ | ✅ | ❌ | ❌ |
| Token/成本追踪 | ✅✅ | ✅ | ❌ | 🔸 |
| Cron 定时任务 | ✅ 可视化 | ✅ 可视化 | ✅ 自调度 | 🔸 脚本 |
| 平台渠道配置 | ❌ | ✅ 8平台 | ❌ | ❌ |
| Profile/网关管理 | 🔸 只读 | ✅ 完整 | N/A | N/A |
| Provider/模型管理 | ✅ | ✅ 自动发现 | ❌ 锁定 | 🔸 可配 |
| 系统诊断 | ✅ Doctor | ❌ | ❌ | ❌ |
| 配置备份恢复 | ✅ | 🔸 | ❌ | ❌ |

### 4.3 开发工具

| 功能 | Panel | web-ui | Codex | Claude |
|------|:---:|:---:|:---:|:---:|
| API Playground | ✅ | ❌ | ❌ | ❌ |
| SSE Inspector | ✅ | ❌ | ❌ | ❌ |
| SDK 代码生成 | ✅ | ❌ | ❌ | ❌ |
| Webhook 调试 | ✅ | ❌ | ❌ | ❌ |
| 日志查看器 | ✅ | ✅ | ✅ | ❌ |
| Monaco Editor | ✅ | ❌ | ❌ | ❌ |
| Docker 沙箱 | ✅ | ❌ | ✅ OS级 | ❌ |
| 终端 | 🔸 场景化(计划) | ✅ xterm.js | ✅ 多Tab | ✅ 原生 |
| localhost 预览 | 🔸 计划中 | ❌ | ✅ Atlas | ❌ |

### 4.4 多 Agent / 协作

| 功能 | Panel | web-ui | Codex | Claude |
|------|:---:|:---:|:---:|:---:|
| 内置 Workspace 模板 | ✅✅ 12个 | ❌ | ❌ | ❌ |
| 角色定义 (Role) | ✅ | ❌ | ❌ | ❌ |
| Orchestrator 调度 | 🔸 设计中 | ❌ | ❌ | ❌ |
| Multi-Agent Control Plane | 🔸 设计中 | ❌ | 🔸 | ❌ |
| 群聊 @mention | 🔸 计划中 | ✅ | ❌ | ❌ |
| 并行 Agent 执行 | 🔸 Docker沙箱 | ❌ | ✅ Worktree | ✅ |
| Agent 质量评估 | 🔸 设计中 | ❌ | ❌ | ❌ |
| 审批队列 | 🔸 表已就绪 | ❌ | ✅ Review | ✅ 每次确认 |

### 4.5 部署 / 分发

| 功能 | Panel | web-ui | Codex | Claude |
|------|:---:|:---:|:---:|:---:|
| npm 全局安装 | ✅ npx hermes-panel | ✅ npm -g | ❌ | ✅ npm -g |
| Docker 部署 | ✅ compose | ✅ compose | ❌ | ❌ |
| 桌面应用 | ✅ Tauri (轻量) | ✅ Electron (重) | ✅ Electron (重) | ❌ CLI only |
| PWA 移动端 | ✅ | ✅ | ❌ | ❌ |
| VS Code 扩展 | ✅ | ❌ | 🔸 Chrome扩展 | ❌ |
| CLI 管理命令 | 🔸 仅start | ✅ 5个命令 | ✅ | ✅ |

---

## 五、后续规划对比

### 5.1 各产品已知方向

| | Hermes Panel | hermes-web-ui | Codex | Claude Code |
|------|------|------|------|------|
| **近期** | Plan 2 (编排+沙箱+审批) + Plan 3 (渠道+群聊+终端) | v0.6 未知 | Windows/Linux 桌面版 | 性能优化 |
| **中期** | 跨平台 GA + Summary Pane + Agent 自调度 | - | 移动端完善 + 语音 | 多 Agent 编排 |
| **远期** | Agent 无关化 (支持多后端) | - | "超级 App" (全知识工作) | 企业平台化 |
| **核心赌注** | **可视化编排 + 本地隐私 + 跨平台** | **平台渠道连接性** | **云端异步 + 桌面操控** | **仓库深度理解 + Agentic** |

### 5.2 Hermes Panel 的机会窗口

```
                       隐私/本地
                          ▲
                          │
          Claude Code ────┼──── Hermes Panel ← 唯一同时占据
                          │                    本地+GUI+跨平台
                          │
           Codex ─────────┤
           (云 端)         │
                          │
                          │
               ───────────┼──────────▶ GUI/可视化
                          │
                hermes-   │
                web-ui    │
                          │
```

**Panel 的三重差异化**：
1. **本地执行** — 区别于 Codex 的云端执行
2. **GUI 界面** — 区别于 Claude Code 的纯终端
3. **跨平台桌面 + Web + PWA** — 区别于 Codex 的 macOS only

**潜在风险**：
- 如果 Codex 出了 Windows 版 + 本地执行模式 → Panel 差异化大幅缩小
- 如果 Claude Code 出了 GUI → Panel 两维度优势减半
- 如果 hermes-web-ui 加上 Tauri → 直接竞争

---

## 六、战略建议

### 6.1 短期 (1-2 月)：守住基本盘，加速差异化

- **Plan 2 Phase 2b** (Orchestrator + Control Plane) — 这是最大的差异化筹码
- **Plan 3 Phase 3a** (渠道配置) — 补上 vs hermes-web-ui 的最大功能缺口
- **不跟 Codex 卷云端/AI 能力** — 那不是 Panel 的战场

### 6.2 中期 (3-6 月)：建立壁垒

- **本地隐私 + 沙箱安全** — 对标 Codex 云端执行的软肋
- **GUI 工作台体验** — 对标 Claude Code 终端的天花板
- **Windows/Linux 桌面** — Codex 进不来的市场
- **多 Agent 可视化编排** — 目前没有竞品做好这件事

### 6.3 长期 (6-12 月)：从"Hermes 面板"到"Agent 工作台"

- **Agent 无关化** — 不只管理 Hermes Agent，也管理 Claude、Codex 等其他 Agent
- **团队协作** — 多人共享 Workspace、审核队列、用量分摊
- **开放生态** — 插件市场、Workspace 模板社区

---

## 附录：关键数据来源

- [EKKOLearnAI/hermes-web-ui](https://github.com/EKKOLearnAI/hermes-web-ui) — 4,700+ Stars, MIT
- [openai/codex](https://github.com/openai/codex) — 82,900+ Stars, Apache 2.0
- [Codex Changelog](https://developers.openai.com/codex/changelog)
- [Claude Code vs Codex vs Cursor 2026 横评](https://apidog.com/blog/claude-vs-codex-comparison-2026/)
- [JetBrains AI Coding Tools Research 2026](https://blog.jetbrains.com/research/2026/04/which-ai-coding-tools-do-developers-actually-use-at-work/)
- [Codex Architecture DeepWiki](https://deepwiki.com/openai/codex/1.3-architecture-overview)

---

**END OF DOCUMENT**
