# Hermes Panel 设计文档

> 一个为 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 打造的精美 Web 控制面板，参考 vue-vben-admin 设计语言。

- **版本**：v0.1 (Design)
- **日期**：2026-05-25
- **作者**：Hermes Panel Team
- **状态**：Design Approved → Ready for Planning

---

## 目录

- [§1 系统架构](#1-系统架构)
- [§2 组件分解](#2-组件分解)
- [§3 数据流](#3-数据流)
- [§4 UI 设计](#4-ui-设计)
- [§5 跨平台安装器与桌面应用](#5-跨平台安装器与桌面应用)
- [§6 用户体验设计原则](#6-用户体验设计原则最高优先级)
- [§7 主动通知与离线回放](#7-主动通知与离线回放)
- [§8 Profile 与多角色团队](#8-profile-与多角色团队)
- [§9 同类产品功能对齐矩阵](#9-同类产品功能对齐矩阵)
- [§10 多角色自动协作](#10-多角色自动协作)
- [§11 Token 优化与成本控制](#11-token-优化与成本控制)
- [§12 提示词自优化](#12-提示词自优化)
- [§13 开发者模式](#13-开发者模式)
- [§14 自我学习与系统优化](#14-自我学习与系统优化)
- [§15 内置工作环境（Workspaces）](#15-内置工作环境workspaces)
- [§16 错误处理与降级策略](#16-错误处理与降级策略)
- [§17 测试策略](#17-测试策略)
- [§18 可观测性](#18-可观测性)
- [§19 安全设计](#19-安全设计)
- [§20 项目里程碑与发布计划](#20-项目里程碑与发布计划)
- [§21 同类产品对齐优化](#21-同类产品对齐优化)

---

## 0. 背景与目标

### 0.1 项目背景

Hermes Agent v0.8.0+ 已经在用户机器本地运行，内置 OpenAI 兼容 HTTP API（端口 8642），但官方界面以 TUI 为主，对非命令行用户不够友好。社区已有的 Web UI（EKKOLearnAI/hermes-web-ui、官方 dashboard、Hermes Workspace 等）覆盖了基础场景，但在**用户体验**、**多工作环境**、**主动通知**、**Token 优化** 等方面仍有较大提升空间。

### 0.2 目标

打造一个**精美、易用、功能完整**的 Hermes Web 控制面板：

- **精美**：参考 vue-vben-admin 的设计语言，主题/动效/响应式全套
- **易用**：用户体验第一位，主动通知、友好提示、零学习成本
- **功能完整**：对齐所有同类产品 + 杀手特性（多角色自动协作、内置工作环境、自优化）
- **跨平台**：mac/win/linux 三平台 native 应用 + 三种部署形态
- **开发者友好**：开发者模式、API Playground、SDK 生成、SSE 调试

### 0.3 非目标

- ❌ 不是 hermes 的替代品，是 hermes 的图形化补充
- ❌ 不做云端版本，所有数据本地存储
- ❌ 不重新实现 hermes 已有的 AI 能力

---

## §1 系统架构

```
┌────────────────────────────────────────────────────────────────┐
│                     用户浏览器 :5666                            │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Vue3 + Vite + Naive UI + Tailwind  (vben 风格)         │   │
│  │  ├ Dashboard   ├ Chat   ├ Sessions   ├ Tools   ├ Set    │   │
│  └────────┬──────────────┬─────────────────────────────────┘   │
└───────────┼──────────────┼─────────────────────────────────────┘
            │              │
   [SSE 直连 /v1/runs]   [REST /api/*]
            │              │
            ▼              ▼
┌─────────────────┐  ┌────────────────────────────────────────┐
│ Hermes API      │  │ hermes-panel-bff (Node Koa) :5667      │
│ :8642           │  │  ├─ /api/sessions  → 调 hermes CLI      │
│  /v1/chat/      │  │  ├─ /api/skills    → 调 hermes CLI      │
│  /v1/runs (SSE) │  │  ├─ /api/tools     → 读 config + CLI    │
│  /v1/models     │  │  ├─ /api/stats     → 读 sqlite          │
│  /v1/responses  │  │  └─ /api/config    → 读/写 config.yaml  │
└─────────────────┘  └────────────────────────────────────────┘
                              │
                              ▼
                      ~/.hermes/  (本地文件)
                      ├── sessions/
                      ├── skills/
                      ├── state.db
                      └── config.yaml
```

**关键设计点**：

- **SSE 流式直连**：Chat 页面调用 `/v1/runs` 拿到 `run_id`，再 `GET /v1/runs/{id}/events` 拿 SSE 流，BFF 不掺和。原因：避免代理流式数据成为瓶颈，token-by-token 体验最佳。
- **BFF 只补缺**：hermes HTTP API 没暴露的（skills 管理、会话改名、工具开关、用量统计），由 BFF 通过 `child_process` 调 `hermes` CLI 或直接读 `~/.hermes/` 文件。
- **认证收口**：BFF 启动时生成 session token 注入到前端 HTML（学 hermes-web-ui 做法）；hermes API key 由 BFF 注入到前端 SSE 请求头，避免硬编码到 JS。
- **三种发行壳**：
  - npm 包 `hermes-panel`：内嵌 mini Node server，启动时拉起 BFF + 静态服务一体进程
  - Docker：`docker-compose.yml` 三服务（nginx 提供 dist + bff 容器 + hermes 容器）
  - hermes 插件：复用 hermes 进程生命周期，通过 `plugin.json` 注册路由
- **桌面应用（重点）**：Tauri 2.0 + WebView2/WKWebView/WebKitGTK，三平台原生体验

---

## §2 组件分解

按"小而清晰"的原则切分，每个单元一个职责、有明确接口、可独立测试。

### 2.1 前端（packages/panel-web）

```
src/
├── api/                         # API 层（唯一的网络出口）
│   ├── hermes.ts               # 直连 hermes :8642 /v1/*  (SSE)
│   ├── bff.ts                  # 调用 BFF :5667 /api/*
│   └── types.ts                # 共享 DTO 类型
│
├── stores/                      # Pinia 状态（单一数据源）
│   ├── session.ts              # 当前会话 + 消息流
│   ├── chat-stream.ts          # SSE 连接状态机
│   ├── settings.ts             # 模型/personality/主题
│   ├── workspace.ts            # 当前 workspace + 角色
│   ├── notifications.ts        # 通知中心
│   └── system.ts               # hermes 健康状态、版本号
│
├── views/                       # 路由页面（薄壳，只负责组装）
│   ├── dashboard/index.vue
│   ├── chat/index.vue
│   ├── sessions/index.vue
│   ├── tools/index.vue
│   ├── workspaces/index.vue
│   ├── profiles/index.vue
│   ├── notifications/index.vue
│   ├── insights/index.vue
│   ├── developer/index.vue
│   └── settings/index.vue
│
├── components/
│   ├── chat/                   # Chat 专属组件
│   │   ├── MessageBubble.vue
│   │   ├── ToolCallCard.vue
│   │   ├── StreamingText.vue
│   │   ├── Composer.vue
│   │   ├── SessionRail.vue
│   │   └── WorkflowGraph.vue   # 多角色协作可视化
│   │
│   ├── dashboard/
│   │   ├── StatCard.vue
│   │   ├── UsageChart.vue
│   │   ├── ModelPieChart.vue
│   │   ├── RecentSessions.vue
│   │   └── WelcomeBack.vue     # "你不在的 X 小时"
│   │
│   ├── tools/
│   │   ├── ToolGrid.vue
│   │   ├── MCPServerCard.vue
│   │   └── SkillTable.vue
│   │
│   ├── workspace/
│   │   ├── WorkspaceSwitcher.vue
│   │   ├── RoleCard.vue
│   │   └── WorkflowEditor.vue  # vue-flow 编辑器
│   │
│   └── shared/                 # 跨页面通用
│       ├── PageHeader.vue
│       ├── EmptyState.vue
│       ├── ErrorBoundary.vue
│       ├── CodeBlock.vue
│       └── ThemeToggle.vue
│
├── layouts/
│   ├── DefaultLayout.vue        # 侧边栏导航
│   ├── TopNavLayout.vue         # 顶部导航
│   ├── MixedLayout.vue          # 混合导航
│   ├── TwoColumnLayout.vue      # 双列侧边栏
│   └── FullscreenLayout.vue     # 全屏专注
│
├── router/
├── locales/                     # i18n
└── styles/
```

### 2.2 BFF（packages/panel-bff）

```
src/
├── server.ts                    # Koa 入口
├── routes/
│   ├── sessions.ts
│   ├── skills.ts
│   ├── tools.ts
│   ├── stats.ts
│   ├── config.ts
│   ├── system.ts
│   ├── workspaces.ts
│   ├── notifications.ts
│   ├── insights.ts
│   └── proxy-token.ts
│
├── services/                    # 业务逻辑层
│   ├── hermes-cli.ts
│   ├── hermes-home.ts
│   ├── sqlite-reader.ts
│   ├── config-yaml.ts
│   ├── event-collector.ts      # 监听 hermes 事件流
│   └── insights-engine.ts      # 每日跑 cron 生成洞察
│
├── middleware/
│   ├── auth.ts
│   ├── rate-limit.ts
│   └── error.ts
│
└── lib/
    ├── token.ts
    └── logger.ts
```

### 2.3 桌面壳（packages/panel-desktop）

```
src-tauri/
├── src/
│   ├── main.rs
│   ├── hermes.rs        # hermes 进程管理 commands
│   ├── bff.rs           # BFF sidecar 启停
│   ├── tray.rs          # 系统托盘
│   ├── menu.rs          # 原生菜单
│   ├── notification.rs  # 系统通知
│   └── updater.rs
├── tauri.conf.json
├── icons/
└── binaries/            # sidecar 二进制
```

### 2.4 发行壳（packages/dist-shells）

```
packages/dist-shells/
├── npm/                         # 形态 1
│   ├── bin/hermes-panel.js
│   └── package.json
├── docker/                      # 形态 2
│   ├── Dockerfile.web
│   ├── Dockerfile.bff
│   └── docker-compose.yml
└── hermes-plugin/               # 形态 3
    ├── plugin.json
    └── entry.ts
```

### 2.5 组件契约

| 单元 | 输入 | 输出 | 依赖 |
|------|------|------|------|
| `api/hermes.ts` | model, messages, options | SSE event stream | 浏览器 fetch + EventSource |
| `api/bff.ts` | REST 调用 | JSON | 浏览器 fetch + token header |
| `services/hermes-cli.ts` | command, args | `{stdout, stderr, exit}` | node child_process |
| `services/hermes-home.ts` | path 片段 | 文件/目录内容 | node fs/promises |
| `services/sqlite-reader.ts` | SQL（白名单） | rows | better-sqlite3 (只读) |
| `Composer.vue` | v-model: text, model | emit `send` | api/hermes |
| `ToolCallCard.vue` | toolCall 对象 | 渲染 | 纯展示 |

### 2.6 文件大小红线

- 单文件 ≤ 300 行
- 单组件 ≤ 5 个 prop / ≤ 3 个 emit
- `views/*/index.vue` 只负责"拿数据 + 组装子组件"

---

## §3 数据流

### 3.1 聊天发送全链路

```
用户输入 "帮我查下天气"
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ ① Composer.vue                                                  │
│    emit('send', { text, model, attachments })                   │
└────────────────┬────────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ ② stores/session.ts                                             │
│    - appendUserMessage(text)                                    │
│    - 调 stores/chat-stream.ts.start(text)                       │
└────────────────┬────────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ ③ api/hermes.ts → POST :8642/v1/runs                            │
│    body: { model, input, stream: true, session_id }             │
│    headers: { Authorization: Bearer <api_key> }                 │
│    返回: { run_id: "run_abc123" }                               │
└────────────────┬────────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ ④ api/hermes.ts → GET :8642/v1/runs/run_abc123/events (SSE)     │
│    建立 EventSource，开始消费事件流                              │
└────────────────┬────────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ ⑤ chat-stream.ts 事件分发                                       │
│                                                                  │
│  event: message.delta     → 追加到当前 assistant 消息            │
│  event: tool.call.start   → 渲染 ToolCallCard（pending）         │
│  event: tool.call.result  → 更新 ToolCallCard（done）            │
│  event: message.complete  → 标记消息完成                         │
│  event: run.done          → 关闭 EventSource，更新会话元数据     │
│  event: run.error         → 显示错误 + 重试按钮                  │
└─────────────────────────────────────────────────────────────────┘
```

**为什么用 `/v1/runs` 而非 `/v1/chat/completions`**：
- `/v1/runs` 事件粒度细，能拿到 `tool.call.*` 事件用于可视化工具调用卡片
- `chat/completions` 只能拿合并后文本流，工具调用过程不可见
- vben 风格的"工具调用动画卡片"是核心卖点

### 3.2 SSE 状态机

```
        ┌──────────┐
        │  IDLE    │◀──────────────────┐
        └────┬─────┘                   │
             │ send()                  │
             ▼                         │
        ┌──────────┐                   │
        │ CREATING │                   │
        └────┬─────┘                   │
             │ run_id received         │
             ▼                         │
        ┌──────────┐                   │
        │STREAMING │◀─┐                │
        └────┬─────┘  │ delta events   │
             │        │                │
       ┌─────┼────────┴────┐           │
       │     │             │           │
  run.done  network err  abort()       │
       │     │             │           │
       ▼     ▼             ▼           │
   ┌──────┐ ┌──────────┐ ┌──────┐      │
   │ DONE │ │RECONNECT │ │ABORT │──────┘
   └──┬───┘ └────┬─────┘ └──────┘
      │          │ exponential backoff
      │          ▼
      │     ┌──────────┐
      │     │STREAMING │
      │     │ (resume) │
      │     └──────────┘
      ▼
   ┌──────────┐
   │  IDLE    │
   └──────────┘
```

**断线重连策略**：
- 重连带 `Last-Event-Id` 头，hermes API 已支持续传
- 重连 5 次失败后停止，显示「连接已断开 [重试] [打开新会话]」

### 3.3 BFF 非流式数据流

```
前端 → BFF                                BFF 内部
─────────────────────                    ──────────────────────────
GET  /api/sessions       ──> hermes-cli.ts: exec("hermes sessions list --json")
GET  /api/stats          ──> sqlite-reader.ts: 白名单 SQL 聚合
PUT  /api/config         ──> config-yaml.ts: 1)备份 2)校验 3)写回 4)失败回滚
```

### 3.4 鉴权与启动流程

```
启动期（npx hermes-panel）
─────────────────────────────────────
1. 检测 hermes API server (:8642 /health)
   ├─ 没跑 → API_SERVER_ENABLED=true hermes gateway run &
   └─ 跑着 → 继续
2. 生成随机 32 字节 token，注入 dist/index.html <meta>
3. 启动 BFF :5667
4. 启动静态服务 :5666
5. 打开浏览器

运行期
─────────────────────────────────────
浏览器 → 读 <meta name="panel-token">
      → BFF 请求带 X-Panel-Token 头
      → BFF 校验 token，否则 401
```

### 3.5 会话持久化

- hermes 已存到 `~/.hermes/sessions/`，**panel 不重复存**
- 切换会话时：BFF 调 `hermes --resume <id> -Q` 拿历史消息渲染
- 流式中切换会话：先 abort 当前 SSE，确认后再切

### 3.6 跨平台部署适配

| 维度 | macOS / Linux | Windows |
|------|---------------|---------|
| **npm bin 启动** | shebang `#!/usr/bin/env node` | npm 自动生成 `.cmd` 包装器 |
| **hermes home 路径** | `~/.hermes/` | `%USERPROFILE%\.hermes\`，统一 `os.homedir() + path.join` |
| **child_process** | `execFile("hermes", [...])` | 同上 + `shell: true` 显式 |
| **路径分隔符** | `/` | `\`，全部用 `path.join` |
| **端口冲突** | net 检测 | 同 + Defender 首次弹窗，README 引导放行 |
| **浏览器自启** | `open` 包 | 同（内部分发） |
| **行结束符** | LF | `.gitattributes` 强制 LF |
| **文件锁** | `fs.flock` | `proper-lockfile` 跨平台 |
| **Docker** | linux/amd64 + arm64 | Docker Desktop 用 linux 容器 |
| **字体回退** | -apple-system / Noto CJK | Segoe UI / Microsoft YaHei UI |

**跨平台 CI**：GitHub Actions 三平台 matrix `ubuntu-latest` / `macos-latest` / `windows-latest`，跑 lint + typecheck + unit + 启动冒烟。

---

## §4 UI 设计

### 4.1 全局设计语言

参考 vue-vben-admin 设计语言，但用自有命名 token：

```css
/* 间距：8 的倍数 */
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 24px;  --space-6: 32px;  --space-7: 48px;

/* 圆角 */
--radius-sm: 6px;  --radius-md: 8px;  --radius-lg: 12px;  --radius-xl: 16px;

/* 阴影 */
--shadow-1: 0 1px 2px rgba(0,0,0,.04);
--shadow-2: 0 2px 8px rgba(0,0,0,.06);
--shadow-3: 0 8px 24px rgba(0,0,0,.10);

/* 主色（柔和靛蓝紫） */
--brand-500: #6366f1;
--brand-600: #4f46e5;

/* 中性色 */
--bg-page: #f7f8fa;
--bg-card: #ffffff;
--border: #e5e7eb;
--text-1: #18181b;

/* 暗色 */
--dark-bg-page: #0a0a0b;
--dark-bg-card: #141416;

/* 字体 */
--font-sans: -apple-system, "Segoe UI", "Microsoft YaHei UI", Roboto, "Noto Sans CJK SC", system-ui;
--font-mono: "JetBrains Mono", "SF Mono", "Cascadia Code", Consolas, monospace;

/* 动效 */
--ease: cubic-bezier(.4, 0, .2, 1);
--dur-fast: 150ms;  --dur-base: 250ms;
```

### 4.2 整体布局

```
┌─────────────────────────────────────────────────────────────────────┐
│ 顶栏 64px   [面包屑]   [搜索⌘K] [Workspace ▾] [🌐] [🌗] [👤]         │
├──────┬──────────────────────────────────────────────────────────────┤
│ 侧边 │                                                              │
│ 栏   │              内容区 (PageWrapper)                            │
│ 240  │              padding: 24px                                   │
│ px   │              max-width: 1440px 居中                          │
└──────┴──────────────────────────────────────────────────────────────┘
```

### 4.3 五大核心页面

详细页面 mockup 见原始设计讨论。摘要：

- **Dashboard 起始页**：欢迎语 + 4 个 StatCard + 双图（折线+饼图） + 最近会话
- **Chat 智能对话页**：三栏（会话列表 + 主对话 + 工具栏），工具调用可视化卡片是核心卖点
- **Sessions 历史会话页**：表格 + 卡片双视图，搜索 + 批量操作
- **Tools/Skills 页**：Tabs 切换（内置工具/MCP/技能），卡片网格 + toggle 开关
- **Settings 页**：左侧锚点导航 + 右侧滚动，分组：模型/提供商/人格/外观/通知/快捷键/高级

### 4.4 响应式断点系统

```css
--bp-sm:  640px;   /* 手机横屏 */
--bp-md:  768px;   /* 平板竖屏 */
--bp-lg:  1024px;  /* 平板横屏 */
--bp-xl:  1280px;  /* 桌面 */
--bp-2xl: 1536px;  /* 大桌面 */
```

五档自适应：
- **< 640px**：侧边栏 → Drawer，单列堆叠
- **640-768px**：手机横屏，部分两列
- **768-1024px**：平板，侧边栏折叠 64px
- **1024-1280px**：侧边栏展开 240px，三列
- **≥ 1280px**：完整布局，Chat 右侧上下文面板

**容器查询**：单个组件按容器宽度自适应，例如 StatCard 在 200px/300px/400px 三种宽度有不同布局。

**触摸适配**：移动端最小点击区 44×44 CSS px、长按替代 hover、`dvh` 处理键盘顶飞。

### 4.5 国际化 i18n

技术选型：`vue-i18n@9` Composition API 模式。

**支持语言**：zh-CN（默认）/ zh-TW / en-US / ja-JP，扩展位 ko-KR / de-DE / fr-FR / es-ES / pt-BR

**文件组织**：
```
src/locales/
├── modules/  # 按页面/组件分模块
│   ├── common.ts
│   ├── menu.ts
│   ├── chat.ts
│   ├── workspace.ts
│   └── errors.ts
└── langs/  # 聚合
    ├── zh-CN.ts
    ├── en-US.ts
    └── ...
```

**懒加载**：zh-CN 内置，其他语言切换时 `import()` 拉取。

**时间/数字本地化**：`dayjs` + `Intl.NumberFormat`，不引第三方。

**RTL**：MVP 不做，结构上预留。

### 4.6 主题系统

**配色模式（5 种）**：
1. 跟随系统（默认）
2. 亮色
3. 暗色
4. 暗黑系统色（OLED 友好真黑 #000）
5. 自定义

实现：`document.documentElement[data-theme]` + CSS variables。

**主题色预设（11 色）**：
- 默认蓝 #1677ff、靛蓝紫 #6366f1、浪漫紫 #722ed1、柔和粉 #eb2f96
- 自然绿 #52c41a、极客极客 #0960bd、暗夜绿 #11a8cd、活力橙 #fa541c
- 沉稳青 #13c2c2、警示红 #f5222d、月光银 #8c8c8c

**自定义模式**：主色取色器、中性色基调、圆角强度、紧凑度、字号、灰色模式、色弱模式、背景纹理。所有参数序列化为 JSON，支持导出/导入。

**布局变体（5 种）**：
1. 侧边栏导航（默认）
2. 顶部导航
3. 混合导航
4. 双列侧边栏
5. 全屏内容

**主题切换 UX**：
- 顶栏 🌗 单击循环、长按弹完整面板
- 切换动画用 View Transitions API 做放射式过渡
- 不支持时降级为 200ms fade

### 4.7 动效系统

**动效强度（3 档）**：完整 / 精简 / 关闭

**系统偏好**：`@media (prefers-reduced-motion: reduce)` 自动切到精简。

**动效一览**：
- 路由切换：fade + 8px translateY，`--dur-base`
- Drawer/Modal：弹出 + 遮罩 fade
- 主题切换：View Transitions 放射
- 工具卡 pending：左边框脉动呼吸
- 流式 token：字符级 fade 30ms
- 按钮 hover：scale 1.02 + tint
- Toast：顶部滑入

---

## §5 跨平台安装器与桌面应用

### 5.1 发行矩阵

| 形态 | 适用场景 | 实现 |
|------|---------|------|
| **npm 全局包** | 高级用户、`npx hermes-panel` | 内嵌 mini Node server |
| **Docker Compose** | 团队/服务器 | hermes + bff + nginx 三容器 |
| **hermes 插件** | 极客深度集成 | `hermes plugins install` |
| **桌面应用**（主推） | 普通用户 | Tauri 2.0 |

### 5.2 桌面技术：Tauri 2.0

| 维度 | Tauri 2.0 | Electron |
|------|-----------|---------|
| 安装包 | **3–10 MB** | 80–150 MB |
| 内存 | 30–80 MB | 200–400 MB |
| 启动 | < 1s | 2–4s |
| 渲染 | 系统 WebView | Chromium 内嵌 |
| Sidecar | 一等支持 | child_process |
| 自动更新 | 内置 | 第三方 |

### 5.3 桌面应用架构

```
┌──────────────────────────────────────────────────────────────────┐
│              Hermes Panel.app (Tauri 进程)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Tauri Rust 主进程                                          │   │
│  │  • 创建原生窗口 + 菜单 + 托盘                                │   │
│  │  • 拉起 sidecar BFF (随机端口)                              │   │
│  │  • 拉起 / 监控 hermes API server                            │   │
│  │  • 自动更新                                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│        │                  │                    │                 │
│        ▼                  ▼                    ▼                 │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────┐         │
│  │ WebView  │   │ BFF sidecar  │   │ Hermes sidecar   │         │
│  │ Vue3     │   │ Node Koa     │   │ (本地 hermes)     │         │
│  └──────────┘   └──────────────┘   └──────────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

**与 web 版的关系**：前端代码 0 差异、BFF 0 差异，桌面只多一层 Tauri 薄壳。

### 5.4 hermes 集成与首次启动流程

```
应用启动
  │
  ▼
检测 hermes (which hermes / where hermes)
  ├─ 找到 → 版本 ≥ 0.8.0？
  │    ├─ 是 → 拉起 API server → 进主界面 ✓
  │    └─ 否 → [自动升级] / [手动处理]
  │
  └─ 未找到 → 安装向导
       ├─ [一键安装]
       │   ├─ mac/linux: curl install.sh | bash
       │   └─ win: PowerShell iwr install.ps1 | iex
       ├─ [我已安装到自定义路径] → 选 hermes 路径
       └─ [跳过] → 只读演示模式
```

### 5.5 平台特定打包

| 平台 | 输出 | 关键配置 |
|------|------|---------|
| **macOS** | .dmg + .app | Universal Binary (arm64 + x86_64)，Apple Developer ID 签名 + 公证 |
| **Windows** | .exe (NSIS) + .msi (WiX) | x86_64 + aarch64，EV 证书签名，WebView2 bootstrap |
| **Linux** | .deb + .rpm + .AppImage | x86_64 + aarch64，依赖 libwebkit2gtk-4.1 |

### 5.6 系统托盘

统一行为：
- Hermes 状态：启动/停止/重启
- 最近会话快捷恢复
- 新建对话 ⌘N
- 快速提问悬浮窗 ⌘⇧Space
- 开机自启
- 设置 / 检查更新 / 退出

**快速提问悬浮窗**：全局快捷键 `⌘⇧Space` 唤出 Spotlight 样式输入框（无边框、半透明、居中），结果以系统通知呈现。**桌面版独有杀手特性**。

### 5.7 自动更新

走 Tauri Updater + minisign 签名，三通道：stable / beta / dev。

### 5.8 体积与启动预算

| 平台 | 安装包 | 已装 | 冷启动 |
|------|-------|------|-------|
| macOS .dmg | < 12 MB | < 35 MB | < 1.5s |
| Windows .msi | < 10 MB | < 30 MB | < 2s |
| Linux .AppImage | < 80 MB | N/A | < 2s |
| Linux .deb | < 10 MB | < 30 MB | < 2s |

### 5.9 CI/CD

GitHub Actions matrix 五平台并行构建，自动签名 + 公证 + 发布到 GitHub Releases + 同步辅助渠道（Homebrew Cask / WinGet / AUR / Snap / Flathub）。

---

## §6 用户体验设计原则（最高优先级）

### 6.1 八条不可妥协的体验铁律

| 铁律 | 落地 |
|------|------|
| **0 学习成本** | 关键功能 ≤ 3 次点击；首启 60 秒新手引导；按钮全 tooltip |
| **永不让用户等待沉默** | > 200ms 必有 loading；> 2s 必有进度 |
| **错误必须可操作** | 是什么 + 为什么 + 怎么办（含按钮） |
| **重要事件主动告知** | 定时任务、长任务、状态变化 → 系统通知 + Toast + 徽章 |
| **永不丢失用户输入** | 草稿自动存 localStorage |
| **危险操作必须可撤销** | 删除后 5s undo Toast，30 天回收站 |
| **响应式触觉反馈** | 移动端关键操作 vibrate(10) |
| **可访问性** | WCAG AA 对比度、全键盘可达、ARIA |

### 6.2 提示分层

| 类型 | 视觉 | 时长 | 使用场景 |
|------|------|------|---------|
| Toast | 顶部短条幅 | 3s 自动 | 操作成功 |
| Toast 带操作 | 顶部 + 按钮 | 5s | 危险操作 undo |
| Notification | 右下角卡片 | 8s 或手动 | 后台事件 |
| Banner | 顶部全宽条 | 持久 | 系统级状态 |
| Inline | 表单/按钮旁 | 持久 | 字段级错误 |
| Modal | 居中弹窗 | 用户关 | 需要确认 |
| Drawer | 侧边滑入 | 用户关 | 详情展示 |
| EmptyState | 内容区占位 | 持久 | 列表为空 |
| System Notification | OS 原生通知 | 系统控制 | 后台事件 |

**自动升级**：网络中断 → 第一次 Toast → 第二次失败 Banner → 第三次失败 Modal。

### 6.3 错误提示三段式（强制模板）

```
┌────────────────────────────────────────────────────┐
│  ⚠  无法发送消息                                    │ ← 1. 是什么
│  Hermes API 没有响应。可能是服务被关闭了。           │ ← 2. 为什么
│  [ 重启 Hermes 服务 ]  [ 重试 ]  [ 查看日志 ]       │ ← 3. 怎么办
│  错误码: HERMES_API_TIMEOUT · 14:32:01           [✕]│
└────────────────────────────────────────────────────┘
```

**反例（禁止）**：`Error: ECONNREFUSED 127.0.0.1:8642`、`请求失败，请稍后再试`。

### 6.4 加载与进度反馈

| 时长 | 反馈 |
|------|------|
| < 100ms | 不显示 |
| 100–300ms | 按钮内联 spinner |
| 300ms–2s | 骨架屏 / 进度指示器 |
| 2s–10s | 进度条 + 当前阶段文字 |
| > 10s | 百分比 + 预计剩余 + [取消] |
| 未知时长 | 不确定进度条 + 阶段 + [后台运行] |

### 6.5 空状态模板

每个列表/网格为空时必须有引导：图标 + 标题 + 副标题 + 主 CTA + 至少一个次 CTA。

### 6.6 危险操作反悔机制

| 操作 | 反悔方式 |
|------|---------|
| 删消息 | Toast undo 5s |
| 删会话 | Toast undo 5s + 回收站 30 天 |
| 删 profile | Modal + 二次输入名字 |
| 清空会话 | Modal + 输入 "DELETE" + 5s 冷静期 |
| 重置配置 | 自动备份 + 30 分钟内可撤销 |
| 卸载 hermes | 列出会删的内容 + 备份对话框 |

### 6.7 用户视角页面元素优先级

每个页面按用户重要性排序，最重要的放第一屏。

**Chat**：① 对话内容（70%）② 输入框 ③ 会话列表 ④ 模型切换 ⑤ 设置入口
**Dashboard**：① 状态徽章 ② 最近会话 ③ 今日活动 ④ 定时任务预告 ⑤ 趋势图
**Sessions**：① 搜索 ② 最近会话 ③ 筛选 ④ 批量操作
**Tools**：① 已启用 ② 快速搜索 ③ 全部网格 ④ MCP/技能
**Settings**：① 模型 ② 外观 ③ profile/团队 ④ 高级/危险

---

## §7 主动通知与离线回放

### 7.1 事件源

| 事件源 | 触发场景 | 重要级 |
|--------|---------|-------|
| Cron 定时任务 | 完成/失败/跳过/即将执行 | 高 |
| 后台长任务 | 用户启动后切走的 run | 高 |
| Hermes 状态 | 崩溃/重启/模型不可用 | 高 |
| 新会话消息 | gateway 进来的 | 高 |
| 多设备同步 | 别处改了配置 | 中 |
| Pairing 请求 | 新用户申请接入 | 高 |
| 技能/工具 | 自学习完成、MCP 掉线 | 中 |
| 更新可用 | panel/hermes 新版本 | 低 |
| 系统提醒 | API key 过期、磁盘满 | 高 |

### 7.2 三层通知架构

```
Layer 1: 系统级通知（OS Notification）
   应用退到后台时启用，点击拉回前台 + 跳转

Layer 2: 应用内通知中心（顶栏 🔔 + 未读红点）
   持久 sqlite，跨重启可见

Layer 3: 上下文徽章
   侧边栏菜单红点、会话列表行高亮、Cron 卡角标
```

### 7.3 离线事件回放

```
hermes 后台产事件
   │
   ▼
BFF 订阅 (轮询 + WebSocket 双保险)
   │
   ▼
持久化到 ~/.hermes-panel/events.db
   │
   ├─ panel 前台运行：实时推 WebView
   └─ panel 关闭：累积到 events.db
                    │
                    ▼ 下次打开 panel
                    │
       1. 读 events.db
       2. 计算未读
       3. 顶栏红点
       4. 重要事件主动气泡（最多 3 条）
       5. 全部归档到通知中心
```

### 7.4 "回家"体验

打开 panel 时主动呈现"你不在的 X 小时里"，重要事件突出（最多 3 条卡片，每条带直接行动按钮），次要事件折叠到通知中心。

### 7.5 桌面应用专属：实时系统通知

Tauri sidecar 即使主窗口关闭也保持运行，事件来了直接弹 OS 通知。用户**不需要打开 panel** 就知道发生了什么。

### 7.6 通知中心页

独立路由 `/notifications`，按类型筛选（全部/未读/Cron/消息/系统/更新），按日期分组。

### 7.7 通知偏好

Settings → 通知：
- 通知方式（应用内/系统/邮件/Telegram）
- 按类型订阅（每类的应用内/系统通知/重要度阈值独立配置）
- 免打扰时段（22:00–08:00）
- 数字徽章（显示未读数）

---

## §8 Profile 与多角色团队

hermes 自带 `profile` 命令（list/use/create/delete/show/alias/rename/export/import），panel 把它图形化 + 团队协作化。

### 8.1 Profile 两种场景

| 场景 | 描述 | 用户类型 |
|------|------|---------|
| **个人多角色** | 一人多套：工作/个人/写作/编程 | 个人开发者 |
| **团队多成员** | 一机多人共用，每人一份 profile，权限隔离 | 小团队 / 家庭 |

### 8.2 Profile 切换器

顶栏右侧永远可见，点开显示当前 + 切换 + 新建 + 管理。每个 profile 可设不同主色，一眼区分。

切换瞬间：动画 + Toast"已切换到 Profile「写作」· 模型 Claude · 12 个技能可用"。

### 8.3 多角色团队

| 角色 | 权限 |
|------|------|
| Owner | 全部 + 删 Profile + 管成员 |
| Admin | 管技能/工具/模型/计费 |
| Editor | 用 + 加技能 + 编辑提示词 |
| Member | 只能用，看自己会话 |
| Viewer | 只读 |

**团队 Profile 特性**：
- 成员管理（邀请、移除、改角色）
- 共享资源（提示词模板、技能、会话）
- 团队配额（月预算、按成员配额、超限自动暂停）
- 团队设置（默认模型、备用链、工具策略、数据保留、审计日志）

### 8.4 邀请新成员

二维码 + 链接 + 配对码三选一：
- 二维码方便手机扫
- 链接方便 IM 分享
- 配对码方便口头报

设置角色 + 有效期（24h/7d/永久）+ 使用次数（1/N/无限）。

底层走 hermes 的 pairing 机制。

### 8.5 数据隔离与切换性能

- 每个 profile 独立 `~/.hermes/profiles/<name>/`
- 切换调 `hermes profile use <name>` + 重启 API server
- 切换期间显示进度条，平均 < 1.5 秒
- 搜索可选「当前 profile / 全部 profile」

---

## §9 同类产品功能对齐矩阵

对齐 EKKOLearnAI/hermes-web-ui（4.2k⭐）、官方 dashboard、nesquena/hermes-webui、Hermes Workspace、joeynyc 监控面板。

**Hermes Panel 全面覆盖且额外提供**：
- 桌面应用（Tauri 三平台）
- 内置 12 个 Workspace
- 多角色自动协作 Orchestrator
- 主动通知 + 离线回放
- Token 智能优化
- 提示词自优化
- 开发者模式
- 自我学习 Insights
- 5 模式主题 + 11 主色 + 自定义
- 5 档断点 + 容器查询响应式

详细矩阵见原始设计讨论（30+ 项功能横向对比）。

---

## §10 多角色自动协作

### 10.1 核心理念

从"切换"到"调度"：用户一句话，Orchestrator 自动调用合适角色做合适事。

### 10.2 角色定义（Role Definition）

每个 Workspace 内可定义多个 Role，每个 Role 包含：

```yaml
name: researcher
display_name: "📚 研究员"
description: "擅长信息搜集、文献调研、事实核查"
model: deepseek-v4-flash      # 默认廉价快速
fallback_model: claude-4.7    # 复杂时升级
system_prompt: |
  你是专业研究员。任务是：1) 搜集事实并列来源 2) 区分一手/二手 3) 不确定就说不确定
tools: [web_search, fetch_url, read_file, vector_search]
callable_by: [orchestrator, writer]
inputs:
  topic: { type: string, required: true }
  depth: { type: enum, values: [quick, normal, deep], default: normal }
outputs:
  facts: { type: list }
  sources: { type: list }
```

### 10.3 Orchestrator 主调度器

每个 Profile 默认有一个隐式的 `orchestrator` 角色，负责：
1. 意图识别
2. 任务分解
3. 调度执行（按依赖关系，可并行）
4. 结果汇总

### 10.4 编排可视化

Chat 页消息流里看到的不是一团乱麻，而是可折叠的执行图：横向显示 `researcher → writer → editor` 流水线，每个节点显示用时、token、状态。

默认折叠只看最终结果（不被吓到），想看细节展开。任何环节都可"针对性重做"。

### 10.5 工作流编辑器

Profile 设置里可视化预定义工作流（用 `vue-flow`），节点类型：Agent / 工具 / 条件分支 / 循环 / 并行汇聚。保存为模板后，Chat 输入 `/blog` 一键触发。

### 10.6 安全限制

| 防护 | 默认 |
|------|-----|
| 最大调用深度 | 5 |
| 最大并行 agents | 3 |
| 单次工作流超时 | 5 分钟 |
| 单次 Token 上限 | 100K |
| 工具调用频率 | 60/分钟 |
| 危险工具白名单 | bash 不能被自动调用 |

超限暂停并通知用户审批继续。

---

## §11 Token 优化与成本控制

### 11.1 浪费来源

| 浪费源 | 占比 | 优化 |
|--------|-----|------|
| 重复系统提示词 | 25% | Prompt Caching |
| 历史过长 | 30% | 智能压缩 + 摘要 |
| 简单问题用大模型 | 20% | 模型路由 |
| 工具结果冗长 | 10% | 结果摘要 |
| 重复检索 | 8% | 结果缓存 |
| 无效重试 | 4% | 失败诊断 |

### 11.2 智能模型路由

复杂度估算器 → simple/normal/complex/coding 四类 → 路由到 Haiku/DeepSeek/Sonnet/Opus。自信度不达标自动升级。用户可选"成本/平衡/质量优先"。

### 11.3 上下文智能压缩

```
当前 100K tokens 
        │
        ▼
Token 计数器：78%（阈值 70%）
        │
        ▼
1. 老消息摘要化（保留最近 10 条原文）80K → 8K
2. 工具结果压缩（保留关键字段）3K → 500
3. 重复段落去重
        │
        ▼
压缩后 35K，节省 65%，成本省 $0.40
```

UI 显示「已自动压缩，省 65K Token [展开]」，可恢复原文。

### 11.4 Prompt Caching 可视化

显示命中率、节省 Token、节省成本、命中率前 5、建议。

### 11.5 实时 Token 计量条

Composer 上方进度条：绿 < 50% → 黄 50-80% → 橙 80-95% → 红 > 95%。红色时给 [压缩历史] [开新会话] 按钮。

### 11.6 成本预算

月预算上限 + 当前用量 + 预测 + 超限策略（仅警告/切便宜模型/暂停）+ 按角色配额（团队场景）。

### 11.7 工具结果智能摘要

本地廉价模型摘要 47KB HTML → 1.8KB 关键信息，节省 25 倍。保留原始全文链接可看。可选「保守/平衡/激进」。

---

## §12 提示词自优化

### 12.1 三种策略

| 策略 | 触发 | 收益 |
|------|-----|------|
| Inline Rewrite | 用户每次发送前 | 模糊变明确 |
| A/B Testing | 用户启用后自动 | 找到最佳提示词 |
| Pattern Mining | 累积 50+ 对话后 | 沉淀专属模板 |

### 12.2 Inline Rewrite

输入"帮我看下这个代码" → 系统检测歧义 → 弹"你可能想要：① 检视代码 ② 解释 ③ 重构"。用户点选自动填入，仍可二次修改。

不强制，可关闭。学习用户偏好（总选「检视」→ 下次首选）。

### 12.3 A/B 测试

针对特定任务（"写周报"），系统维护多个提示词版本，比较使用次数、满意度（隐式 + 显式）、平均时长、Token。推荐升级到最优版本。

### 12.4 Pattern Mining

每天凌晨 cron 分析最近 7 天对话，发现高频模式（如"代码审查"12 次/周），建议沉淀为模板。

### 12.5 提示词市场（v0.2+）

社区共享，热门排行 + 我的模板 + 安装次数 + 评分。

---

## §13 开发者模式

### 13.1 启用

Settings → 高级 → 开发者模式（默认关）。开启后侧边栏多 `🔧 Developer`、消息右键多"查看原始"、顶栏多性能监控按钮。

### 13.2 Developer 页五大功能

1. **API Playground**：类 Postman，自动注入 hermes key，导出 cURL/Python/JS/Go/Rust 代码
2. **SSE Inspector**：实时事件时间线、过滤、保存为 .jsonl、时间分析
3. **SDK 代码生成**：5 种语言一键生成
4. **Webhook 调试器**：内置 ngrok 隧道、请求重放
5. **模型 Compare**：同 prompt 并排跑多模型，对比时间/Token/成本/质量

### 13.3 Raw Inspector

每条消息下方有 `[查看原始]`：Request body、Response、Tools、Token 详情（含 cache 命中）、Timing（TTFT、tokens/s）。

### 13.4 开发者快捷键

| 快捷键 | 功能 |
|--------|------|
| `⌘⇧I` | 当前消息 Raw Inspector |
| `⌘⇧K` | API Playground |
| `⌘⇧S` | 导出当前会话 .jsonl |
| `⌘⇧R` | 同 prompt 换模型重跑 |
| `⌘⇧T` | Token 计量详情 |
| `⌘⇧L` | 实时日志查看器 |
| `⌘⌥1/2/3` | 切 1/2/3 列布局 |

### 13.5 IDE 集成

VS Code 扩展、JetBrains 插件、CLI 集成 `hermes-panel send "..." --context=$(git diff)`。

---

## §14 自我学习与系统优化

### 14.1 三个层面

| 层面 | 学习 | 应用 |
|------|-----|------|
| 使用习惯 | 常用模型、活跃时段、常问问题 | 智能默认、预加载 |
| 效果反馈 | 哪些满意/不满意 | 路由调优 |
| 错误模式 | 常踩什么坑 | 主动避坑提醒 |

### 14.2 Insights 自检页

每天 03:00 cron 触发分析，生成建议：
- 高效时段识别
- 模型成本优化（"60% 问题用 Haiku 就够"）
- 错误规律（"4 次上下文过长，建议启用压缩"）
- 模式建议（"常问翻译，建议建模板"）
- 技能推荐

### 14.3 隐私铁律

- ✅ 本地优先，所有分析在本地完成
- ✅ 可关可清，Settings 一键关闭 + 清空
- ✅ 可解释，每条建议有"为什么"说明
- ❌ 永不上传

### 14.4 自动配置调优（用户授权后）

| 调整项 | 触发 | 行动 |
|--------|-----|------|
| 默认模型 | 用户主动升级 30%+ | 自动升级 |
| 路由策略 | simple 命中率 > 80% | 调高阈值 |
| 缓存基础 | 某段长文反复出现 | 加入缓存 |
| 压缩阈值 | 多次接近上限 | 70% → 60% |
| 通知频率 | 多次"全部已读" | 提示降订阅 |
| Profile 切换 | 工作时段 90% 用「工作」 | 自动切换 |

每次自动调整都通知"我刚把 X 改为 Y，理由是 Z [撤销]"。

### 14.5 健康度评分

每天给系统打分（性能/成本/可靠/利用率/安全/多样性），趋势 + 改进建议。

### 14.6 自动备份与回滚

每周快照，保留 4 周。重大变更前自动快照。一键回滚到上一个工作版本。

---

## §15 内置工作环境（Workspaces）

### 15.1 核心概念

**Workspace = 角色团队 + 工具集 + 工作流模板 + 提示词库 + 推荐模型**

层级：Profile > Workspace > Role

一键启用，立即拥有完整团队，无需配置。

### 15.2 内置 Workspace 全景

| Workspace | 中文名 | 图标 | 角色数 | 核心场景 |
|-----------|-------|------|-------|---------|
| `dev-squad` | 开发团队 | 💻 | 7 | 全栈项目开发 |
| `collab-hub` | 协作中心 | 🤝 | 5 | 团队沟通、会议、规划 |
| `content-studio` | 内容创作 | 🎬 | 6 | 视频、播客、自媒体 |
| `research-lab` | 研究实验室 | 🔬 | 5 | 学术、深度调研 |
| `writing-studio` | 写作工坊 | ✍️ | 5 | 文章、小说、技术写作 |
| `design-studio` | 设计工作室 | 🎨 | 5 | UI/UX/视觉 |
| `education-hub` | 教育中心 | 🎓 | 4 | 教学、学习 |
| `business-suite` | 商业套件 | 💼 | 6 | 创业、商业分析 |
| `life-assistant` | 生活管家 | 🏠 | 5 | 日程、购物、健康 |
| `data-lab` | 数据实验室 | 📊 | 4 | 数据分析 |
| `legal-desk` | 法律工作台 | ⚖️ | 4 | 合同审查 |
| `customer-success` | 客服中心 | 📞 | 4 | 客户支持 |

### 15.3 开发团队（💻 dev-squad）详细

| 角色 | 模型 | 工具 | 提示词要点 |
|------|------|------|----------|
| 🏛 架构师 | Claude 4.7 Opus | read_file, fetch_url, vector_search, draw_diagram | SOLID、扩展性，输出 ADR |
| 🛠 后端 | DeepSeek-v4 | bash, read/edit_file, run_test, db_query | idiomatic 代码，性能与边界 |
| 🎨 前端 | DeepSeek-v4 | bash, read/edit_file, browser_preview, screenshot | 组件化、A11y、响应式 |
| 📱 移动端 | DeepSeek-v4 | bash, ios_simulator, android_emulator | 平台差异、电量、内存 |
| 🧪 QA | Sonnet 4.6 | bash, run_test, generate_test_cases | 边界、负向、并发 |
| 👁 Reviewer | Sonnet 4.6 | read_file, git_diff, run_linter | Google Code Review 准则 |
| 🔒 安全 | Sonnet 4.6 | security_scan, owasp_check | OWASP Top 10 |

**典型工作流：实现登录功能**：
- 架构师设计 schema、选 JWT vs session
- 安全顾问评估 OAuth 流程
- QA 设计测试场景
- 后端写 API、前端写 UI（并行）
- Code Reviewer 审查
- QA 跑测试

**专属 UI**：
- 侧边栏新增：项目仪表板、代码会话、ADR 库、Bug 追踪、开发工具链、代码指标
- Composer 增强：拖文件作为 context、`/code` 命令、`@架构师 设计 X`、`/review`

### 15.4 协作中心（🤝 collab-hub）

5 个角色：项目经理 PM、会议纪要、沟通官、日程管家、数据分析师。

专属工具：calendar、email、slack/feishu_post、doc_create、meeting_transcribe、gantt_render。

典型工作流：上传 Zoom 录音 → 转写分段 → 提炼决议 → 创建任务卡 → 发邮件总结 → 加后续会议邀请。

### 15.5 内容创作工作室（🎬 content-studio）

6 个角色：导演（Opus）、编剧、视觉/分镜、配音、配乐、剪辑助手。外加：营销文案。

专属工具：comfyui_generate、tts_eleven_labs、suno_music、video_concat、subtitle_burn、thumbnail_design。

典型工作流：60 秒短视频 → 导演定调 → 编剧脚本 → 分镜（ComfyUI）/ 配音（ElevenLabs）/ BGM（Suno）并行 → 剪辑输出 EDL → 营销文案。

### 15.6 其他 Workspace 概览

- **🔬 研究实验室**：文献调研员、数据科学家、实验设计师、论证审查、学术写作
- **✍️ 写作工坊**：头脑风暴、资料员、主笔、编辑、校对
- **🎨 设计工作室**：产品经理、UX、UI、插画师、设计系统
- **🎓 教育中心**：老师、苏格拉底、出题人、评估员
- **💼 商业套件**：策略师、市场分析、财务建模、产品规划、增长黑客、BP 写作
- **🏠 生活管家**：日程、购物、营养师、健身教练、财务顾问
- **📊 数据实验室**：分析师、SQL 专家、可视化师、ML 工程师
- **⚖️ 法律工作台**：法律顾问、合同审查、案例检索、法律文书（顶部 banner 免责声明）
- **📞 客服中心**：一线客服、问题诊断、知识库管家、客户成功

### 15.7 Workspace 切换器

顶栏中央位置：正在使用 + 最近用过 + 推荐 + 浏览全部 + 自定义新环境 + 导入 .workspace 文件。

切换体验：动效扫过 + 主色微调 + Toast + 侧边栏/Composer/工具同步切换。当前对话保留，下一条用新 workspace 角色。

### 15.8 首次启用引导

30 秒上手：介绍角色 + 三种使用方式（自动调度/`@`召唤/`/`命令）+ 拖文件作 context + 试试示例任务。

### 15.9 联动

```
Profile：「工作」
   ├── 当前 Workspace：💻 开发团队
   │      ├── 模型 → Profile 配置
   │      ├── 工具白名单生效
   │      ├── 工作流模板可用
   │      └── 知识库范围限定
   │
   ├── 切到「写作工坊」→ 工具/模型/角色整套切换
   ├── Cron 可指定 workspace："每天 9 点用「商业套件」生成市场快报"
   └── 团队共享 workspace
```

### 15.10 自定义 Workspace

完整编辑器：名称、图标、主色、团队成员（每个角色独立模型/工具/提示词）、工具集、工作流模板、推荐技能。可保存为模板。

### 15.11 Workspace 市场

热门 + 我安装的 + 我创建的。社区分享，安装次数 + 评分。

### 15.12 安全与隔离

- 每个 workspace 独立工具白名单，切换自动收紧/放开
- 数据访问不能跨读知识库（除非显式共享）
- 历史可见性可配置
- 团队场景下安装/切换记录审计
- 高危工具即使白名单也受 sudo 审批
- 第三方导入默认禁用危险工具

---

## §16 错误处理与降级策略

### 16.1 错误分类矩阵

| 错误来源 | 用户感知 | 降级 |
|---------|---------|------|
| Hermes API 不通 | Banner + 自动重连 | 5 次失败弹 Modal 引导 |
| Hermes 进程崩溃 | 系统通知 + Banner | 自动重启 3 次 |
| 模型提供商失败 | 行内警告 | fallback 备用模型链 |
| 网络中断 | 顶部 banner | 队列化请求恢复后重发 |
| CLI 超时 | Toast | 杀进程 + 重试 + 报错 |
| 工具失败 | 工具卡 ✗ | LLM 决定重试或换工具 |
| BFF 崩溃 | 全局 banner | Tauri watchdog 拉起 |
| WebView 异常 | 错误边界 | 路由级 ErrorBoundary |
| 数据库锁/损坏 | Modal | vacuum + 备份回退 |
| 磁盘空间不足 | 系统通知 | 引导清理 |
| 配置损坏 | Modal | 自动恢复 .bak |
| 更新失败 | 通知 | 保留旧版本 |

### 16.2 错误边界

Vue 全局 errorHandler + 路由级 ErrorBoundary + 组件级 ErrorBoundary 三层。

### 16.3 自动恢复

```
检测错误 → 错误分级 → Recoverable/Degrade/Fatal
                           │       │        │
                           ▼       ▼        ▼
                       自动重试  降级运行  停止+通知
                       指数退避  禁用相关  保存现场
                       最多 5 次  模块     生成报告
```

### 16.4 用户友好错误码

| 错误码 | 用户文案 | 行动 |
|--------|---------|------|
| HERMES_NOT_FOUND | 找不到 Hermes | 一键安装/指定路径 |
| HERMES_API_TIMEOUT | Hermes 没响应 | 重启服务/查看日志 |
| MODEL_QUOTA_EXCEEDED | 当前模型额度用完 | 切备用/充值 |
| CONTEXT_TOO_LONG | 对话太长 | 自动压缩/开新会话 |
| TOOL_NOT_AUTHORIZED | 工具需审批 | 申请审批/改用其他 |
| NETWORK_OFFLINE | 网络断了 | 自动重连中 |
| CONFIG_INVALID | 配置有问题 | 恢复备份/手动编辑 |
| BACKUP_AVAILABLE | 崩溃前对话已保存 | 恢复/丢弃 |

### 16.5 崩溃报告

- 写 `~/.hermes-panel/crashes/<timestamp>/`
- 含 stacktrace + 路由 + 最近 50 操作 + 系统信息
- 启动时检测，Modal 询问是否上报
- 默认脱敏：消息内容不传，只传错误和环境
- 用户可拒绝，本地保留 7 天

---

## §17 测试策略

### 17.1 金字塔

```
              ▲
             ╱ ╲      E2E (15%) Playwright 跨浏览器 + Tauri
            ╱   ╲
           ╱─────╲    集成 (25%) API mock + 真实 hermes CLI
          ╱       ╲
         ╱─────────╲  单元 (60%) Vitest + happy-dom
```

### 17.2 覆盖目标

| 层 | 工具 | 覆盖 | 关键场景 |
|----|------|------|---------|
| 单元 | Vitest | 80% line / 90% branch | Pinia stores、工具函数、组件 |
| 集成 | Vitest + msw | 关键路径 100% | SSE 流式、BFF 路由、CLI 调用 |
| E2E | Playwright | 5 个关键旅程 | 安装、对话、切 workspace、cron 通知、错误恢复 |
| 桌面 | tauri-driver | 三平台矩阵 | 启动、托盘、通知、自动更新 |
| 性能 | Lighthouse CI | LCP < 1.5s | 启动、路由切换、流式响应 |
| A11y | axe-core | 0 严重违规 | 键盘可达、ARIA、对比度 |

### 17.3 关键场景

- SSE 断线重连不丢消息（带 Last-Event-Id）
- 切换 workspace 不影响当前对话
- 跨平台启动 matrix（mac 13/14、Ubuntu 20/22、Windows 19/22）

### 17.4 视觉回归

Playwright + 截图对比，每页 × 每 workspace × 每主题 × 5 断点 ≈ 200 张基准图。PR 触发对比，差异 > 0.1% 需人工 review。

### 17.5 fake-hermes

CI 没法装真 hermes，做一个 fake：OpenAI 兼容 API + 模拟 CLI + 录制的 SSE 流可重放。集成测试和 E2E 都用 fake-hermes。

---

## §18 可观测性

### 18.1 三维度

| 维度 | 工具 | 用途 |
|------|------|------|
| 日志 | pino (BFF) + console (前端) | 排查 |
| 指标 | sqlite + Insights 引擎 | 性能 + 用量 |
| 追踪 | OpenTelemetry（可选） | 跨服务链路 |

### 18.2 日志体系

```
~/.hermes-panel/logs/
├── panel-{date}.log     # 主进程
├── bff-{date}.log       # BFF
├── tauri-{date}.log     # Rust
├── access-{date}.log    # HTTP
└── audit-{date}.log     # 团队审计
```

级别 trace/debug/info/warn/error/fatal。

内置日志查看器：实时滚动、过滤、清空、复制、导出、发送到开发者。

### 18.3 指标

- `chat.ttft`：首 token 时延
- `chat.tps`：tokens/sec
- `route.switch_time`、`workspace.switch_time`
- `hermes.cli_duration`
- `error.count` 按错误码
- `cache.hit_rate`
- `token.usage` 按模型/角色
- `cost.spent` 按时段/模型

### 18.4 诊断页

Settings → 诊断：
- 关键指标（平均时延、首 token、缓存命中、错误率、内存、磁盘）
- 健康检查（hermes/BFF/数据库/日志/配置/网络）
- 一键修复（清日志、VACUUM、重建索引、清缓存）
- 生成完整诊断报告 .zip

---

## §19 安全设计

### 19.1 攻击面与防护

| 攻击面 | 防护 |
|--------|------|
| BFF HTTP | Session token + CORS 白名单 + SameSite |
| WebView XSS | CSP 严格策略 + DOMPurify |
| Tauri 命令 | 命令白名单 + 参数校验 |
| hermes API key | BFF 持有，不进 localStorage |
| child_process | `execFile` + 参数数组（不拼字符串） |
| 配置读写 | 路径校验只能在 `~/.hermes/` |
| Workspace 导入 | JSON schema 校验 + 工具白名单确认 |
| 自动更新 | HTTPS + minisign 签名验证 |
| WebSocket/SSE | Origin 校验 + token |
| 多用户 | 团队场景下 RBAC 强制隔离 |

### 19.2 CSP

```
Content-Security-Policy:
  default-src 'self' tauri:;
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*;
  font-src 'self' data:;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
```

### 19.3 sudo 审批

把 hermes 内置的 sudo 机制图形化：弹窗显示命令、风险评估、执行目录、三按钮（拒绝/允许一次/永久允许）+ 可让 AI 解释命令。

### 19.4 数据加密

| 数据 | 加密 |
|------|------|
| hermes API key | macOS Keychain / Windows DPAPI / Linux Secret Service |
| 会话历史 | 不加密（依赖系统盘加密） |
| 团队同步 | TLS 传输 |
| 配置备份 | 可选 AES-256 + 用户密码 |

### 19.5 隐私承诺

- ❌ 使用数据不上传任何服务器
- ❌ 行为分析只在本地
- ✅ 唯一外联：自动更新检查（可关）+ 用户主动提交 issue 时的崩溃报告
- ✅ 完全开源，可审计

---

## §20 项目里程碑与发布计划

### 20.1 里程碑

```
v0.1.0 Alpha · 2026-06-30 (4 周后)
─────────────────────────────────
基础可用：4 个核心页面 + 单 profile + 直连 hermes
• Chat (SSE 流式 + 工具卡)
• Dashboard
• Sessions
• Settings (基础)
• Tauri 桌面壳 (mac 优先)
• 安装向导
• i18n 中英两语
• 亮暗主题

v0.2.0 Beta · 2026-08-15
─────────────────────────────────
功能完整：BFF + 所有页面 + Workspace
• Tools/Skills 页
• Profile 完整管理
• 12 个内置 Workspace
• 主动通知 + 离线回放
• Cron 可视化
• 多主题 + 自定义
• 5 档响应式

v0.3.0 RC · 2026-09-30
─────────────────────────────────
团队 + 优化
• 多角色团队
• Token 优化全套
• 提示词自优化
• 自我学习 Insights
• 开发者模式
• 4 国语言

v1.0.0 GA · 2026-10-31
─────────────────────────────────
正式发布
• 三平台稳定（mac/win/linux）
• 自动更新
• 完整文档
• Homebrew / WinGet / AUR
• 性能达标
• A11y 合规
```

### 20.2 工程目录最终形态

```
hermes-panel/
├── packages/
│   ├── panel-web/                   # Vue3 前端
│   ├── panel-bff/                   # Node Koa BFF
│   ├── panel-desktop/               # Tauri 2 桌面壳
│   ├── panel-shared/                # 共享类型/常量
│   ├── fake-hermes/                 # 测试用 mock
│   └── workspace-presets/           # 12 个内置 workspace
│
├── dist-shells/
│   ├── npm/
│   ├── docker/
│   └── hermes-plugin/
│
├── docs/
│   ├── superpowers/specs/
│   │   └── 2026-05-25-hermes-panel-design.md  ← 本文档
│   ├── user-guide/
│   ├── dev-guide/
│   └── api/
│
├── .github/workflows/
│   ├── ci.yml
│   ├── release.yml
│   └── visual-regression.yml
│
├── e2e/
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE                          # MIT
└── README.md
```

### 20.3 团队配置

| 角色 | 人数 | 工作量 |
|------|-----|-------|
| Vue3 前端 | 2 | 80% |
| Node BFF + Tauri Rust | 1 | 100% |
| 设计 UI/UX | 1 | 50% (前期重) |
| QA / E2E | 0.5 | 持续 |
| DevOps | 0.5 | 后期重 |

单人 + AI 辅助也能干（参考 hermes-web-ui 单人 4200⭐）。

### 20.4 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|-----|------|------|
| hermes API 大改 | 中 | 高 | API 适配层，兼容旧版本 |
| Tauri 2 生态新 | 低 | 中 | 关键能力做 fallback |
| 跨平台签名繁琐 | 高 | 中 | CI 早期跑通 + 文档化 |
| 12 个 workspace 工作量 | 高 | 中 | 先做 4 个主力，社区贡献其余 |
| 自动更新出错 | 低 | 高 | 双副本机制 + 回滚通道 |
| 用户期待过高 | 中 | 中 | Alpha 阶段明确标注 + 快速迭代 |

---

## 附录 A：技术栈快速索引

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3.5 + Vite 6 + TypeScript 5.4 |
| UI 库 | Naive UI 2.x + Tailwind CSS v4 |
| 状态管理 | Pinia 2.x |
| 路由 | Vue Router 4.x |
| i18n | vue-i18n@9 |
| 图表 | ECharts 5 |
| 工作流编辑器 | Vue Flow |
| 代码高亮 | Shiki |
| Markdown | markdown-it + DOMPurify |
| 终端模拟 | xterm.js + WebGL renderer |
| 时间处理 | dayjs |
| 桌面框架 | Tauri 2.0 + Rust |
| BFF 框架 | Koa 2 + TypeScript |
| BFF 数据库 | better-sqlite3 |
| HTTP 客户端 | undici (BFF) + ofetch (前端) |
| 日志 | pino (BFF) |
| 锁文件 | proper-lockfile |
| 配置解析 | yaml + ajv (JSON Schema) |
| 测试 | Vitest + Playwright + tauri-driver |
| 打包 | Tauri Bundler |
| 签名 | minisign + Apple notarytool + signtool |
| CI/CD | GitHub Actions |
| 包管理 | pnpm workspaces |

## 附录 B：参考资料

- [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)
- [Hermes Agent Web Dashboard 官方文档](https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard)
- [EKKOLearnAI/hermes-web-ui](https://github.com/EKKOLearnAI/hermes-web-ui)
- [Best Hermes Agent Dashboards & Web UIs in 2026](https://www.bitdoze.com/best-hermes-dashboards/)
- [vue-vben-admin](https://github.com/vbenjs/vue-vben-admin)
- [Tauri 2.0 文档](https://tauri.app/)
- [Naive UI 文档](https://www.naiveui.com/)

## 附录 C：术语表

| 术语 | 解释 |
|------|------|
| **Hermes Agent** | NousResearch 的开源 AI Agent 框架 |
| **Panel** | 本设计文档描述的 Web 控制面板 |
| **BFF** | Backend For Frontend，前端专属轻量后端 |
| **SSE** | Server-Sent Events，HTTP 单向流式协议 |
| **Profile** | hermes 的独立配置空间（一台机器多套互不影响） |
| **Workspace** | Panel 创新概念：预配置的角色团队 + 工具 + 工作流 |
| **Role** | Workspace 内的单个 AI 角色（模型 + 提示词 + 工具白名单） |
| **Orchestrator** | 多角色自动调度器 |
| **TUI** | Terminal User Interface，hermes 默认的命令行界面 |
| **MCP** | Model Context Protocol，Anthropic 的工具协议 |
| **ACP** | Agent Client Protocol，hermes 与编辑器集成的协议 |
| **ADR** | Architecture Decision Record，架构决策记录 |
| **TTFT** | Time To First Token，首 token 时延 |
| **A11y** | Accessibility，可访问性 |
| **CSP** | Content Security Policy |

---

## §21 同类产品对齐优化

经过对 5 大主流 Hermes Web UI（EKKOLearnAI/hermes-web-ui 5.8k⭐、nesquena/hermes-webui 3.1k⭐、outsourc-e/hermes-workspace 4.7k⭐、官方 dashboard、joeynyc 监控面板）的深度对比分析，新增以下优化点。

### 21.1 P0 必加项（核心体验对齐）

#### 21.1.1 圆形 Token 上下文环（Context Ring）

**来源**：nesquena/hermes-webui

**位置**：Composer footer 右侧，永远可见。

**视觉**：
```
        ╭─────────╮
       ╱           ╲
      │   72K       │   ← 当前 token 数
      │  ╱     ╲    │
      │ ╱  64%  ╲   │   ← 已用百分比
      │ ╲   ◯  ╱    │
       ╲           ╱
        ╰─────────╯
        hover →  $0.142 估算成本 · 还剩 36% 空间
```

**交互**：
- 颜色随用量渐变：绿（< 50%）→ 黄（50-80%）→ 橙（80-95%）→ 红（> 95%）
- Hover 显示成本估算 + 模型上下文上限 + 历史/系统/工具占比
- 点击展开详细 Token 计量面板（对应 §11.5）
- 实时随每条新消息更新

**替代**：取代原 spec §11.5 的水平进度条，更直观。

#### 21.1.2 思考速度选择（Thinking Speed）

**来源**：nesquena/hermes-webui

**位置**：Composer footer，模型选择器旁。

**三档**：
- ⚡ **快速** (fast)：低 reasoning effort，响应快
- 🧠 **深度思考** (extended reasoning)：高 reasoning effort，质量优先
- 🤖 **自动** (auto)：根据问题复杂度智能选择（接 §11.2 模型路由）

底层映射 hermes config 里的 `agent.reasoning_effort` (low/medium/high)。

**用户感知**：类 ChatGPT 的 thinking mode 切换，用户主动控制延迟/质量平衡。

#### 21.1.3 实时流式 Reasoning 显示

**来源**：nesquena/hermes-webui agentic transparency

**功能**：把模型的 `reasoning` token（Anthropic extended thinking / OpenAI o1 / DeepSeek-R1 等）流式显示出来，而不是隐藏。

**UI**：
```
┌─ 🧠 思考中... ───────────────────────────  [收起 ▾] ──┐
│ 用户问的是 Tauri 跟 Electron 的对比。我需要从这几方面 │
│ 分析：1) 体积 2) 性能 3) 生态 4) 开发体验。让我先...    │
│ ... [继续流式输出] ...                                │
└──────────────────────────────────────────────────────┘

┌─ 回答 ────────────────────────────────────────────────┐
│ Tauri 2.0 相比 Electron 在以下方面优势明显：           │
│ ...                                                   │
└──────────────────────────────────────────────────────┘
```

**默认折叠**（避免吓到普通用户），点击展开看推理过程。可在 Settings → 外观 设置默认展开/折叠/隐藏。

#### 21.1.4 幻觉检测 + Agent 质量评分（杀手特性）

**来源**：hermes-webui Monitor prototype (issue #721)

**核心**：每次 agent 回答后**自动评估**：
- **幻觉率**：检测是否编造事实/伪造引用/逻辑矛盾
- **质量分**：0-100 综合评分（事实准确 + 逻辑一致 + 回应完整 + 引用规范）

**实现**：
- 轻量本地模型（DeepSeek-v4-flash 或 Haiku）作 evaluator
- 三层检测：ephemeral 抗幻觉提示 + 实时 token 过滤 + session 历史清理
- 每个 agent 独立累计统计

**UI 呈现**：

```
┌─ Dashboard 新卡片 ──────────────────────────────────────┐
│  🤖 Agent 质量看板                                       │
│                                                         │
│  本周平均质量分：87 ⭐⭐⭐⭐                              │
│                                                         │
│  Agent 排行                          质量分  幻觉率      │
│  ─────────────────────────────────────────────         │
│  🏛 架构师 (Opus)                    94      0.2%      │
│  🛠 后端 (DeepSeek-v4)              89      1.1%      │
│  🎨 前端 (DeepSeek-v4)              88      1.3%      │
│  🧪 QA (Sonnet)                     92      0.6%      │
│  📚 研究员 (DeepSeek-v4)            76      4.8% ⚠   │
│                                                         │
│  ⚠ 研究员幻觉率偏高，建议升级模型 [一键替换为 Sonnet]    │
└─────────────────────────────────────────────────────────┘
```

**幻觉警告横幅**：当某 agent 单次回答幻觉率超阈值（默认 5%），消息卡片顶部出现可关闭的黄色警告条：

```
┌─ ⚠ 检测到可能的幻觉 ───────────────────────────  [✕] ──┐
│ 这条回答中第 2、4 段的事实陈述未能在引用源中找到支撑。  │
│ 建议：[换模型重试] [让 AI 自查] [我已核实，标为正确]   │
└────────────────────────────────────────────────────────┘
```

**模型替换 Modal**：点击「换模型重试」弹出对比，把幻觉率/质量分历史画成 7 天趋势：

```
┌─ 模型替换建议 ────────────────────────────────────────────┐
│                                                          │
│  当前：DeepSeek-v4-flash                                 │
│  ─────────────────────────────────────                   │
│  研究类任务表现：质量 76  ·  幻觉率 4.8%                 │
│  7 天趋势：质量↓ 幻觉↑                                   │
│                                                          │
│  推荐替换：                                              │
│                                                          │
│  ⭐⭐⭐  Claude Sonnet 4.6                              │
│  历史质量 91 · 幻觉 1.2% · 成本提升 11x · 速度降低 1.5x  │
│  [使用]                                                  │
│                                                          │
│  ⭐⭐    GPT-4 Turbo                                    │
│  历史质量 88 · 幻觉 1.8% · 成本提升 8x · 速度相当       │
│  [使用]                                                  │
└──────────────────────────────────────────────────────────┘
```

#### 21.1.5 Composer Footer 控件常驻

**来源**：nesquena/hermes-webui

**改动**：把 model / profile / workspace / 思考速度 / 工具开关 / Token 环六个高频控件从顶栏/侧边栏**全部挪到 Composer footer**，永远在视线内。

**布局**：

```
┌─ Composer ─────────────────────────────────────────────────────┐
│  输入消息，Shift+Enter 换行...                                  │
│                                                                │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ [DeepSeek-v4 ▾] [⚡快速▾] [💻 开发 ▾] [👤工作▾] [🛠 12▾] [📎]    │
│                                                  ╭───╮  [➤]   │
│                                              72K │64%│ 发送   │
│                                                  ╰───╯        │
└────────────────────────────────────────────────────────────────┘
```

**理由**：传统设计把这些藏到顶栏/侧边栏，每次切换都要找。Composer footer 始终在视野，切换成本最低。

顶栏只保留：logo + 搜索 + 语言 + 主题 + 头像。

#### 21.1.6 手机优先响应式

**来源**：nesquena/hermes-webui 公认优势

**核心**：移动端不是"桌面塞手机"，是**单独设计**的响应式 SPA。

**新增移动端规范**（强化原 §4.14）：

| 元素 | 移动端处理 |
|------|----------|
| 主导航 | 底部 Tab Bar（≤ 5 个），不用 Drawer |
| 顶栏 | 简化为「会话名 + Workspace 切换 + 头像」 |
| Composer | 全宽，键盘弹出时自动 `100dvh` |
| 模型/Profile 切换 | 长按 Composer 模型徽章弹半屏抽屉 |
| 工具调用卡 | 卡片更紧凑，默认折叠详情 |
| 会话列表 | 全屏 + 下拉刷新 + 滑动删除 |
| Token Ring | 输入框右侧迷你版（28px） |
| 主题切换 | 设置内，不挂顶栏 |
| Reasoning 流 | 默认隐藏（节省屏幕） |
| 长按代码块 | 复制 + 全屏查看 |
| 图片附件 | 支持系统相册 + 摄像头 |
| 语音输入 | 标配（Web Speech API + 长按麦克风） |

**PWA 支持**（必加）：
- `manifest.json` + Service Worker
- 添加到主屏 → 全屏运行，无浏览器 chrome
- 离线缓存最近 20 个会话
- 推送通知（Web Push）

#### 21.1.7 TUI 嵌入（xterm.js + WebGL）

**来源**：官方 dashboard

**功能**：在 Web UI 里内嵌**真实** hermes TUI，通过 xterm.js 的 WebGL renderer 渲染 ANSI 输出，像素级一致。

**位置**：开发者模式 → Terminal Tab，或 Settings → 高级 → 启用 TUI Tab。

**实现**：
- Tauri 端拉起 `hermes` 进程（PTY）
- BFF 用 `node-pty` 桥接
- 前端 xterm.js + WebGL + xterm-addon-fit

**价值**：终端老用户的肌肉记忆全部保留（斜杠命令、快捷键、皮肤主题），同时享受 Web UI 的可视化辅助。

#### 21.1.8 Monaco Editor 内嵌

**来源**：hermes-workspace

**功能**：Workspace 文件浏览 + 编辑用 Monaco Editor（VS Code 同款）。

**位置**：新增 **Files** 路由（仅在 dev-squad 等开发类 workspace 中显示）。

**功能**：
- 左侧文件树（支持 git 状态显示）
- 右侧 Monaco 编辑器（语法高亮、智能补全、错误提示）
- 顶部 tabs 切多文件
- 底部状态栏：行列、编码、文件类型、git 分支
- Cmd+P 文件快速跳转
- Cmd+Shift+F 全局搜索（接 BFF ripgrep）
- 与 Chat 联动：选中代码右键 "Send to Chat as context"

**轻量化**：Monaco 按需加载，首屏不引入。

#### 21.1.9 CLI Bridge（state.db 导入）

**来源**：nesquena/hermes-webui

**功能**：把 hermes CLI 在终端里的会话历史**导入** Panel。

**实现**：
- 启动时 BFF 检测 `~/.hermes/state.db` 与 panel 本地 sqlite 的 diff
- 显示 "发现 23 个终端会话还没导入到 Panel，是否同步？" Modal
- 一键导入，进度条显示
- 双向同步：Panel 新建的会话也写回 state.db，CLI 可见

**价值**：terminal 重度用户能无缝切到 Web 界面，不丢历史。

#### 21.1.10 微信扫码登录

**来源**：EKKOLearnAI/hermes-web-ui

**功能**：通过微信扫码注册/登录 Panel 团队（多用户场景）。

**适用场景**：中国市场，团队内成员快速接入。

**实现**：
- 集成开源微信扫码登录方案（OAuth Open Platform）
- 备选：扫码加入企业微信 / 飞书
- 与 §8.4 邀请流程合并：除了 hermes pairing code，还支持扫微信码

---

### 21.2 P1 强烈推荐（差异化加分）

#### 21.2.1 Kanban TaskBoard

**来源**：hermes-workspace

**新增路由**：`/tasks`，独立大页面。

**布局**：

```
┌─ Tasks Board ─────────────────────────────────────────────────────────┐
│ [+ 新建任务]  [模板▾]  [筛选: 全部▾]  [视图: Kanban▾]                  │
├──────┬──────┬─────────┬─────────┬─────────┬──────────────────────────┤
│Backlog│Ready │ Running │ Review  │ Blocked │ Done                     │
│  12   │  5   │   3     │   2     │   1     │  47                      │
├──────┼──────┼─────────┼─────────┼─────────┼──────────────────────────┤
│      │      │         │         │         │                          │
│ 实现  │ 设计  │ 🏛架构  │ 👁审查  │ ⏸ API   │ ✓ 添加登录                │
│ OAuth │ 数据  │ 数据库  │ 后端    │ key 过期│ ✓ Bug 修复               │
│      │ 模型  │ schema  │ PR #12  │         │ ✓ 重构 utils             │
│      │      │         │         │         │                          │
│ 周报  │ 写文  │ ✍️ 主笔 │         │         │ ✓ 周报-Week17            │
│      │ 章草  │         │         │         │                          │
│      │ 稿    │         │         │         │                          │
└──────┴──────┴─────────┴─────────┴─────────┴──────────────────────────┘
```

**任务卡片**：
- 标题 + 描述（markdown）
- 当前指派 agent（带图标）
- 关联会话（点击跳到 Chat）
- 截止时间 / 优先级 / 标签
- 进度条（多步任务）
- 操作：移列 / 编辑 / 删除 / 转 issue

**与 agent 联动**：
- agent 完成子任务 → 自动从 Running 移到 Review
- 用户在 Chat 说 "这件事先放着" → 自动建卡到 Backlog
- 卡片右键 "派给 @架构师 处理" → 自动建会话 + 调用对应 agent

#### 21.2.2 Reports + Inbox

**来源**：hermes-workspace

**新增路由**：`/inbox`，与通知中心并列但侧重"需要人决策的事项"。

**内容分类**：
- **Checkpoints**：长任务的人工审核节点（如部署前确认）
- **Blockers**：agent 卡住等待人工解决（如缺少 API key）
- **Handoffs**：跨 agent 移交需要人见证
- **Ready for human**：agent 完成草稿等人定夺（如周报草稿）

**UI**：

```
┌─ Inbox ───────────────────────────────────────────────────────────┐
│ [全部 12] [Checkpoints 3] [Blockers 1] [Handoffs 2] [Ready 6]    │
├──────────────────────────────────────────────────────────────────┤
│ ⏸ Blocker · 后端工程师                              2 分钟前       │
│ 缺少 STRIPE_API_KEY，无法继续实现支付接口                          │
│ [提供 key] [跳过这步] [终止任务]                                   │
├──────────────────────────────────────────────────────────────────┤
│ 📋 Checkpoint · 部署流程                            5 分钟前       │
│ 已完成代码审查与测试，准备部署到生产环境，等待确认                  │
│ [批准部署] [推迟] [查看变更]                                       │
├──────────────────────────────────────────────────────────────────┤
│ ✍️ Ready · 写作工坊                                 12 分钟前      │
│ 「Tauri 技术博客」初稿已完成（1547 字）                            │
│ [查看] [让编辑润色] [发布到博客]                                   │
└──────────────────────────────────────────────────────────────────┘
```

#### 21.2.3 Multi-Agent Control Plane

**来源**：hermes-workspace

**新增路由**：`/agents`，多 agent 实时监控大屏。

**功能**：
- 看所有活跃 agent 的状态（idle / thinking / tool_use / waiting）
- 角色 / 模型分配 / 运行时长 / 当前任务
- agent 之间的调用关系（实时连线动画）
- 单 agent 一键暂停 / 重启 / 终止

**UI 简图**：

```
┌─ Agents Control Plane ────────────────────────────────────────────┐
│                                                                   │
│              ┌──────────────────┐                                 │
│              │  🎯 Orchestrator  │   active                       │
│              │  Opus · 12 min   │   3 子任务运行中                │
│              └────────┬─────────┘                                 │
│              ╱     │    ╲                                         │
│             ╱      │     ╲                                        │
│   ┌────────────┐ ┌─────────┐ ┌────────────┐                       │
│   │🏛 架构师    │ │🛠 后端  │ │🧪 QA       │                       │
│   │● thinking  │ │● tool   │ │○ idle      │                       │
│   │ Opus       │ │DeepSeek │ │ Sonnet     │                       │
│   │ q=94 h=0.2%│ │q=89     │ │q=92        │                       │
│   └────────────┘ └────┬────┘ └────────────┘                       │
│                       │                                           │
│                  ┌────▼─────┐                                     │
│                  │bash      │                                     │
│                  │ running  │                                     │
│                  └──────────┘                                     │
└───────────────────────────────────────────────────────────────────┘
```

#### 21.2.4 Agent Swarm 层级网格

**来源**：hermes-webui Monitor

**位置**：Workspaces 页或独立 `/swarm`。

**功能**：看整个 workspace 的 agent 编制全景：Orchestrator 顶层 + 3×5 团队网格（最多 15 团队），每团队有 Team Lead + 成员，显示角色 / title / 模型 / 技能标签。

**与 §15 联动**：可视化每个 workspace 的角色编制，一眼看清"我有哪些兵"。

#### 21.2.5 本地 SQLite 自建数据库

**来源**：EKKOLearnAI/hermes-web-ui

**变更**：原 spec 是"读 hermes state.db"，改为"**自建 panel.db + 同步 hermes state.db**"。

**位置**：`~/.hermes-panel/panel.db`

**Schema**：
- sessions（独立索引、全文搜索 FTS5、自由打标签）
- messages（同步 hermes 消息 + panel 补充元数据如质量分/反馈）
- tasks（Kanban 任务）
- notifications（通知中心）
- inbox（Reports + Inbox 项）
- workspace_state（每个 workspace 的状态快照）
- analytics（行为分析）

**优势**：
- 不污染 hermes 原数据
- panel 关停后 hermes 仍能独立运行
- 支持复杂查询和索引
- 为未来"远程同步"铺路

#### 21.2.6 PWA + Tailscale 支持

**来源**：hermes-workspace

**PWA**：
- `manifest.json` + Service Worker
- 装到桌面/手机主屏作 native app
- 离线访问最近会话（只读）
- Web Push 通知（移动端通知中心）

**Tailscale 私网访问**：
- BFF 默认绑定 `127.0.0.1`
- 启用「私网模式」后绑定 `0.0.0.0`，但**只允许 Tailscale IP 段**（`100.64.0.0/10`）
- 配合 Tailscale Funnel 可对外发布（高级，默认关）
- Settings → 安全 → 私网访问，需要二次确认

**价值**：手机/平板/另一台电脑通过 Tailscale 安全访问本机 Panel，不暴露公网。

#### 21.2.7 Capability Gates 优雅降级

**来源**：hermes-workspace

**原则**：上游 hermes API 不支持某个功能时，**前端显示干净占位符**，不让用户中途碰壁。

**实现**：
- BFF 启动时检测 hermes 版本与能力（`hermes version --json`、各 API 探测）
- 注入 `capabilities.json` 到前端
- 前端按 capabilities 显示/隐藏/灰化功能入口
- 灰化入口的 tooltip 说明"需要 hermes v0.10+，[一键升级]"

**应用场景**：
- 旧版 hermes 没有 cron → 灰化 `/cron` 路由
- 没装 ComfyUI → 内容创作 workspace 隐藏配图节点
- 没配 Telegram → Gateway 监控只显示已配平台

#### 21.2.8 视觉知识树（Memory Tree）

**来源**：hermes-workspace

**新增路由**：`/memory`（移到独立页，比 Settings 抽屉更深入）。

**功能**：
- 树状浏览所有 memory（USER.md / MEMORY.md / 自定义）
- 全文搜索 + 标签过滤
- 行内 markdown 编辑器
- 拖拽重组结构
- 一键导出 / 导入 / 备份
- 与 Chat 联动：右键 memory 节点 "用作 context"

---

### 21.3 P2 锦上添花

#### 21.3.1 Profile 内多 Agent 实例切换

**来源**：EKKOLearnAI

**功能**：一个 Profile 下可以有多个 hermes agent 实例同时运行（不同模型/工具配置），顶栏切换器扩展为：

```
当前：工作 Profile / dev-squad Workspace / agent-claude-opus 实例
                                              ▲ 同 profile 下切实例
```

适合并发任务（一个 agent 跑长任务，另一个交互）。

#### 21.3.2 2000+ 技能市场增强

**来源**：hermes-workspace

**对原 §15.10 技能页的加强**：
- 直连 `agentskills.io` 开放标准
- 技能卡显示：origin badge（官方/社区/私有）/ filter / 源码路径 / 安装次数 / 评分
- 一键安装 / 卸载
- 安装时自动检测依赖（如某技能需要 ffmpeg）

#### 21.3.3 Hermes Control Center

**来源**：nesquena/hermes-webui

**位置**：侧边栏底部固定 launcher 按钮（图标 🎛 + "控制中心"）。

**点击**：弹出 Spotlight 式半屏面板，集中所有设置入口，搜索式查找：

```
┌─ Hermes Control Center ──────────────────────────────────┐
│  🔍 输入命令或搜索设置...                                  │
│  ─────────────────────────────────────                   │
│  最近使用                                                  │
│  • 切换主题                                                │
│  • 修改默认模型                                            │
│  • 查看 API key                                            │
│                                                          │
│  快捷操作                                                  │
│  ⚙ 设置                  🔄 重启 Hermes                  │
│  📦 备份配置             🐛 提交问题                      │
│  📊 查看用量             🌐 切换语言                      │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

类 macOS Spotlight / VS Code Command Palette 体验。全局快捷键 `⌘⇧P`。

#### 21.3.4 7 天成本柱状图 + 月度配速预测

**来源**：hermes-webui Monitor

**位置**：Dashboard 起始页。

**功能**：
- 7 天柱状图，每天分模型颜色堆叠
- 横线显示日均预算
- 预测线：按当前节奏，本月预计花 $X（带阴影区间）
- 配速指示：「✓ 不会超」/「⚠ 按当前节奏将超」/「❌ 已超预算」

#### 21.3.5 实时事件流日志（Live Event Stream）

**来源**：hermes-webui Monitor

**位置**：Dashboard 底部固定面板，类似 IDE 的 Output 窗口。

**显示**：

```
┌─ 实时事件流 ────────────────────────────────  [清空] [⏸] ─┐
│ 14:32:01  💬 新会话开始 · 工作 / dev-squad / 架构师       │
│ 14:32:03  🛠 工具调用 · web_search("Tauri 2.0")           │
│ 14:32:05  ✓ 工具完成 · 1.2s · 234 tokens                  │
│ 14:32:07  🎯 任务派发 · 架构师 → 后端                      │
│ 14:32:08  ⏰ Cron 触发 · "每日新闻"                        │
│ 14:32:12  ⚠ 幻觉警告 · 研究员 q=72                         │
│ 14:32:15  💰 成本 $0.012 · 已用 $38.21/$50                │
└──────────────────────────────────────────────────────────┘
```

可折叠为底部状态栏一行 tail。

---

### 21.4 里程碑重新分配

把 24 个优化点按 P0/P1/P2 分配到三个里程碑：

```
v0.1.0 Alpha (2026-06-30)
─────────────────────────────────
P0 全部 (10 项)：
+ 21.1.1  圆形 Token 环
+ 21.1.2  思考速度选择
+ 21.1.3  Reasoning 流显示
+ 21.1.4  幻觉检测 + 质量评分
+ 21.1.5  Composer footer 控件常驻
+ 21.1.6  手机优先响应式 + PWA
+ 21.1.7  TUI 嵌入
+ 21.1.8  Monaco Editor
+ 21.1.9  CLI Bridge
+ 21.1.10 微信扫码登录

v0.2.0 Beta (2026-08-15)
─────────────────────────────────
P1 全部 (8 项)：
+ 21.2.1  Kanban TaskBoard
+ 21.2.2  Reports + Inbox
+ 21.2.3  Multi-Agent Control Plane
+ 21.2.4  Agent Swarm 层级网格
+ 21.2.5  本地 SQLite 自建数据库
+ 21.2.6  PWA + Tailscale
+ 21.2.7  Capability Gates
+ 21.2.8  视觉知识树

v0.3.0 RC (2026-09-30)
─────────────────────────────────
P2 全部 (6 项)：
+ 21.3.1  Profile 多 agent 实例
+ 21.3.2  2000+ 技能市场增强
+ 21.3.3  Hermes Control Center
+ 21.3.4  7 天成本图 + 配速预测
+ 21.3.5  实时事件流日志
```

### 21.5 同类产品 vs Hermes Panel 终极对比

经过 §21 优化后，Hermes Panel 对 5 大同类产品的覆盖情况：

| 维度 | 官方 | EKKO | nesquena | workspace | joeynyc | **Panel** |
|------|-----|------|---------|----------|---------|----------|
| 实时聊天 SSE | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| 流式 reasoning | ✗ | ✗ | ✓ | △ | ✗ | **✓** |
| 工具调用可视化 | △ | △ | ✓ | ✓ | ✗ | **✓✓** |
| 圆形 Token 环 | ✗ | ✗ | ✓ | ✗ | ✗ | **✓** |
| 思考速度切换 | ✗ | ✗ | ✓ | ✗ | ✗ | **✓** |
| Composer 常驻控件 | ✗ | △ | ✓ | ✗ | ✗ | **✓** |
| 手机优先 | ✗ | △ | ✓ | △ | ✗ | **✓✓** |
| PWA | ✗ | ✗ | ✗ | ✓ | ✗ | **✓** |
| 桌面 native app | ✗ | ✗ | ✗ | ✗ | ✗ | **✓ Tauri** |
| 幻觉检测 + 质量分 | ✗ | ✗ | △ proto | ✗ | ✗ | **✓✓** |
| 多角色 Orchestration | ✗ | ✗ | ✗ | ✓ | ✗ | **✓✓** |
| Kanban TaskBoard | ✗ | ✗ | ✗ | ✓ | ✗ | **✓** |
| Reports + Inbox | ✗ | ✗ | ✗ | ✓ | ✗ | **✓** |
| Multi-Agent Control Plane | ✗ | ✗ | ✗ | ✓ | △ | **✓** |
| Agent Swarm 层级图 | ✗ | ✗ | △ proto | △ | ✗ | **✓** |
| 内置 Workspace 模板 | ✗ | ✗ | ✗ | △ | ✗ | **✓✓ 12 个** |
| 微信登录 | ✗ | ✓ | ✗ | ✗ | ✗ | **✓** |
| TUI 嵌入 | ✓ | △ | ✗ | ✓ | ✗ | **✓** |
| Monaco Editor | ✗ | ✗ | △ | ✓ | ✗ | **✓** |
| CLI Bridge state.db | ✗ | ✓ | ✓ | ✓ | ✗ | **✓** |
| Tailscale 私网 | ✗ | ✗ | ✗ | ✓ | ✗ | **✓** |
| Capability Gates | ✗ | ✗ | ✗ | ✓ | ✗ | **✓** |
| 视觉知识树 | △ | ✓ | △ | ✓ | ✓ | **✓** |
| Control Center | ✗ | ✗ | ✓ | ✗ | ✗ | **✓** |
| 月度配速预测 | ✗ | △ | △ proto | ✗ | ✗ | **✓** |
| 实时事件流 | ✗ | △ | △ proto | △ | ✗ | **✓** |
| Token 智能压缩 | ✗ | ✗ | ✗ | ✗ | ✗ | **✓ 独有** |
| 提示词自优化 | ✗ | ✗ | ✗ | ✗ | ✗ | **✓ 独有** |
| 自学习 Insights | ✗ | ✗ | ✗ | ✗ | △ | **✓ 独有** |

**结论**：Hermes Panel 覆盖所有同类产品的全部高价值特性 + 7 项独有杀手功能（桌面 native / 多 Orchestration / 12 Workspace / Token 优化 / 提示词自优化 / 自学习 / 幻觉检测+质量评分）。

---

## §22 战略方向更新（2026-05-31）

### 22.1 市场格局变化

自 v0.1 设计（2026-05-25）以来，AI 编码工具市场发生重大变化：

- **Codex** 从 CLI 工具演进为 macOS 超级 App（2026-04-16），增加背景桌面操控、多 Agent 并行、语音交互、内嵌浏览器、Plugin 市场等能力。云端执行、macOS only、GPT 模型绑定。
- **Claude Code** 巩固终端 Agent 地位，在多文件操作、深度 Agentic 编排方面领先。本地执行、跨平台、API 模型灵活。
- **Hermes Panel 的机会窗口**：两者在「本地优先 GUI + 跨平台桌面 + 多 Agent 可视化编排」的交叉区域留下了空白。

### 22.2 定位修正

从「Hermes Agent 的控制面板」升级为：

> **本地优先、跨平台、模型自由的 AI 开发工作台，以多 Agent 可视化编排为核心差异化能力。**

| 竞争维度 | Codex App | Claude Code | **Hermes Panel（新定位）** |
|---------|-----------|-------------|--------------------------|
| 执行位置 | 云端 | 本地 | **本地** |
| 平台 | macOS only | Win/Mac/Linux | **Win/Mac/Linux + Web + PWA** |
| 模型 | GPT only | Anthropic 优先 | **任意模型** |
| 交互界面 | GUI (Electron) | 终端 CLI | **GUI (Tauri) + Web** |
| 多 Agent | Sub-agent 并行 | Agent Teams | **可视化编排 + 12 Workspace 模板** |
| 开放协议 | Apache 2.0 | Proprietary | **MIT** |

### 22.3 里程碑重新规划

原有 v0.1/v0.2/v0.3/v1.0 里程碑基于「完成 spec 全部功能」的线性路径。新计划聚焦差异化，分为四个阶段：

```
Phase 2a (2026-06-21): 基础
├── 自建 panel.db（任务/工作流/Agent 状态/审批队列）
├── Docker 沙箱执行环境
├── Monaco Editor + 文件浏览器
└── Reasoning 流式显示 UI

Phase 2b (2026-07-19): 多 Agent 编排
├── Orchestrator 引擎（意图识别 → 任务分解 → 调度执行）
├── 工作流编辑器（vue-flow 拖拽式 DAG 编辑器）
├── Multi-Agent Control Plane（实时 Agent 状态监控大屏）
└── Agent 质量评估（幻觉检测 + 质量评分 + 模型替换建议）

Phase 2c (2026-08-09): 自主执行
├── Review Queue（Diff/Script/Handoff 统一审批队列）
├── 三种执行模式（Suggest / Auto Edit / Full Auto）
├── Monaco Diff Viewer（审批时左右对比）
└── 语音输入（Web Speech API）

Phase 2d (2026-08-23): 跨平台发布
├── Windows/Linux Tauri 构建验证 + 签名
├── PWA 离线模式 + Service Worker 缓存策略
├── 性能达标（LCP < 1.5s, idle < 80MB）
└── 三平台 CI 全绿
```

### 22.4 推迟到 v0.3+ 的功能

以下原 spec 中的功能优先级下调，不在 Phase 2 实现：

| 功能 | 延迟原因 |
|------|---------|
| TUI 嵌入 (xterm.js) | 与 GUI-first 定位冲突 |
| 微信/飞书 OAuth | 依赖外部服务，非核心 |
| 2000+ Skill 市场 | 依赖外部 API 标准化 |
| 提示词自优化 + Insights | 需大量 ML 基础设施 |
| Tailscale 私网模式 | 利基需求 |
| 4 种额外布局变体 | 锦上添花，非战略级 |

### 22.5 关键假设与风险

| 假设 | 如果被打破 |
|------|-----------|
| Hermes Agent 社区持续活跃 | 通过模型/Agent 抽象层降低对 Hermes 的依赖（Phase 2b 内建） |
| Docker 在目标用户机器上普遍可用 | 降级到直接执行 + sudo 式审批（Phase 2a 设计） |
| Web Speech API 可用 | 能力门控，不可用时隐藏麦克风按钮 |
| Monaco Editor 懒加载不影响首屏 | Vite manualChunks 拆分 + 仅 `/files` 路由时加载 |

---

**END OF DESIGN DOC**
