# Plan 3: Hermes Web UI 功能对齐 + Codex 启发计划

> **目标**：补齐与 hermes-web-ui (EKKOLearnAI, 4.7k⭐) 的核心功能差距，借鉴 Codex 桌面版 (2026-04) 的优秀设计，同时在 Panel 已有优势领域（开发者工具、Workspace、Tauri 桌面、沙箱）建立更深壁垒。

**Spec Reference:** `docs/superpowers/specs/2026-05-25-hermes-panel-design.md` §6-§8, §11, §21
**Cross-reference:**
- `docs/superpowers/plans/2026-05-31-plan-02-local-workbench-and-orchestration.md` (Plan 2)
- Codex Desktop App 2026-04 release (Computer Use, In-App Browser, Image Gen, Automations, Memory, Summary Pane, 90+ Plugins, Multi-Terminal)

---

## 一、对标分析：Panel vs hermes-web-ui vs Codex

### 1.1 三方定位

| | **Hermes Panel** | **hermes-web-ui** | **Codex Desktop** |
|------|:---:|:---:|:---:|
| 定位 | GUI 控制面板 + 开发工作台 | Hermes 全功能 Web 管理面板 | 通用 AI Agent 超级 App |
| 平台 | Web + Win/Mac/Linux + VS Code | Web + macOS app | macOS only |
| 模型 | 任意 | Hermes Provider 体系 | GPT-5.3-Codex only |
| 执行 | 本地 | 本地 | 云端 |
| 开源 | MIT | MIT | Apache 2.0 |
| 成熟度 | beta | v0.5.7 (生产可用) | 3M+ 周活用户 |

### 1.2 功能差距矩阵

| 功能 | hermes-web-ui | Codex | Panel 当前 | 纳入计划 |
|------|:---:|:---:|:---:|:---:|
| **8 平台渠道配置** | ✅ | ❌ | ❌ | ✅ P0 |
| **群聊 (@mention 多 Agent)** | ✅ | ❌ | ❌ | ✅ P0 |
| **场景化终端面板** | ✅ 独立终端页 | ✅ 多线程终端 | ❌ | ✅ P1 (改方案) |
| **内嵌浏览器 (localhost)** | ❌ | ✅ Atlas 浏览器 | ❌ | ✅ P1 (Codex 启发) |
| **Summary Pane** | ❌ | ✅ 计划/来源/产物 | ❌ | ✅ P2 (Codex 启发) |
| **Agent 自调度** | ❌ | ✅ 跨天唤醒 | 🔸 Cron UI 已有 | ✅ P2 (Codex 启发) |
| **上下文自动压缩** | ✅ | ✅ Compaction | ❌ | ✅ P1 |
| **多 Profile 网关管理** | ✅ | N/A | 🔸 只读状态 | ✅ P1 |
| **模型自动发现** | ✅ | N/A | 🔸 手动配置 | ✅ P1 |
| **CLI 管理命令** | ✅ | ✅ | 🔸 仅 start | ✅ P1 |
| **Fork 任意点分叉** | ❌ | ✅ | 🔸 branch 基础 | ✅ P2 (Codex 启发) |
| **微信扫码登录** | ✅ | ❌ | ❌ | ✅ P2 |
| **文件浏览器远端后端** | ✅ SSH/Docker | ❌ | 🔸 仅本地 | ✅ P2 |
| **PII 脱敏** | ✅ | ❌ | ❌ | ✅ P2 |
| **国际化 9 语言** | ✅ | ❌ | 🔸 4 语 | ✅ P2 |
| **Computer Use** | ❌ | ✅ AX Tree | ❌ | ❌ 远期 |
| **图片生成** | ❌ | ✅ gpt-image-1.5 | ❌ | ❌ 依赖模型 |
| **90+ 插件生态** | ❌ | ✅ | 🔸 框架已有 | 🔸 社区驱动 |

---

## 二、终端方案：从"不做"到"场景化嵌入"

### 2.1 原决策的问题

之前写"与 GUI-first 定位冲突"是伪命题——VS Code 是 GUI-first，内置终端却是被重度依赖的功能。正确的区分不是"要不要终端"，而是"做什么样的终端"。

### 2.2 三方终端方案对比

| | hermes-web-ui | Codex Desktop | Panel (新方案) |
|------|------|------|------|
| 形态 | 独立 Terminal 页面 | 每个线程独立 Terminal Tab | 场景内嵌终端面板 |
| 入口 | 侧边栏 Terminal 入口 | 线程底部 Terminal Tab | Chat 消息流下方 / Files 右下角 / Sandbox 主面板 |
| 默认目录 | 用户 home | 项目根目录 | **跟随场景上下文** (Chat→session 目录, Files→选中目录) |
| Agent 命令结果 | 需手动跑 | 线程终端显示 | **SSE 事件直接渲染到终端面板，零手动** |
| 用户手动输入 | 支持 | 支持 | 支持（受限命令集） |
| 技术栈 | node-pty + WebSocket + xterm.js | 原生 PTY | sandbox.ts 复用 + xterm.js (仅渲染) |
| 文件联动 | 无 | 无 | **文件树 → cd 跟随；选中文件 → 路径就绪** |

### 2.3 核心差异：上下文就绪

hermes-web-ui 和 Codex 的终端都是 "通用终端"——用户打开后需要自己 cd 到目录、自己跑命令。Panel 的方案是：

```
Chat 场景：
  Agent 跑了 npm test → 结果流式渲染到消息下方终端面板
  → 用户看到红色 FAIL，直接在面板里输入 npm test -- --grep "login" 重跑
  → 不用切换窗口、不用 cd、不用重新输入

Files 场景：
  用户在文件树选中 packages/panel-bff/
  → 右下角终端自动 cd 到该目录
  → 用户输入 ls src/routes/ → 即时显示
  → 修改代码后 Monaco 自动保存，终端里直接跑 pnpm test

Sandbox 场景：
  Docker 容器的 stdin/stdout 直接 pipe 到 xterm.js
  → 完全隔离的命令执行环境
  → 每个 Agent 独立沙箱终端
```

---

## 三、Codex 启发的增量功能

### 3.1 Summary Pane — 多 Agent 工作总览

**Codex 做了什么**：一个统一面板展示当前 Agent 的计划、信息来源、生成的产物。用户不用在多个线程间切换就能知道"发生了什么"。

**Panel 怎么做**：在 Control Plane (Plan 2 Phase 2b.3) 中集成 Summary Pane：

```
┌─ Summary Pane ──────────────────────────────────────────────┐
│                                                              │
│  📋 当前计划                                                 │
│  ├─ 1. 设计 OAuth schema       🏛 架构师 · ✅ 完成           │
│  ├─ 2. 实现 API endpoints      🛠 后端 · 🔵 运行中          │
│  ├─ 3. 构建登录 UI             🎨 前端 · ⏳ 等待中          │
│  └─ 4. Code Review             👁 Reviewer · ⏳ 等待中      │
│                                                              │
│  📎 来源                                                      │
│  ├─ packages/panel-bff/src/routes/auth.ts                    │
│  ├─ packages/panel-web/src/views/login/index.vue             │
│  └─ docs/superpowers/specs/...design.md (§19 安全设计)        │
│                                                              │
│  📦 产物                                                      │
│  ├─ auth-schema.sql (1.2 KB)                                 │
│  ├─ oauth-flow.md (3.4 KB)                                   │
│  └─ login-page-mockup.png                                    │
│                                                              │
│  💰 Token: 42K · 成本 $0.18 · 耗时 3m12s                     │
└──────────────────────────────────────────────────────────────┘
```

Panel 优势：已有 Agent 状态表 + Workspace 角色定义 + Token 追踪，Summary Pane 只需聚合展示。

### 3.2 In-App Browser — localhost 预览

**Codex 做了什么**：基于 Atlas 的内嵌浏览器，在网页元素上直接评论（"这里改小一点"），支持 localhost 前端预览。

**Panel 怎么做**：轻量版——只做 localhost 预览 + 元素选择器，不做完整浏览器。

```
场景：dev-squad workspace，前端角色写完登录页面

Files 页 → 打开 login/index.vue (Monaco 编辑)
  → 右下角终端面板中 pnpm dev → localhost:5666 启动
  → 点击「预览」→ 右侧滑出内嵌 WebView (iframe to localhost)
  → 用户看到渲染结果，选中元素 → "这个按钮颜色改成 brand-500"
  → 上下文自动发给前端 Agent
```

实现：Naive UI n-drawer 内嵌 `<iframe src="http://localhost:XXXX">` + 简单的元素选择器 (postMessage 到 iframe 注入 JS)。不依赖任何外部浏览器引擎。

### 3.3 Agent 自调度

**Codex 做了什么**：Agent 可以自己决定"下次什么时候继续"，关闭 App 后任务仍然在跑，几天后自我唤醒。例如用户说"每小时检查一次 Slack 和邮件"。

**Panel 怎么做**：扩展已有 Cron 系统，允许 Agent 创建自调度任务：

```
用户："每天早晨 9 点用商业套件生成市场快报，发到飞书"

Orchestrator 处理后：
  1. 创建 Cron 任务 "每日市场快报" (cron: 0 9 * * *)
  2. Cron 触发时 → 自动调 Orchestrator → 商业套件角色团队
  3. 生成报告 → 通过渠道配置 (Phase 3a) 发到飞书
  4. Agent 发现数据源变化 (如新增竞品) → 自己建议调整 Cron 频率

Control Plane 中查看所有自调度任务状态
```

Panel 优势：已有 Cron UI + Workspace 角色定义 + 渠道配置 (Phase 3a)，三者组合就是完整的自调度流水线。

### 3.4 Fork 任意点分叉

**Codex 做了什么**：从任意历史消息（不仅是最后一条）分叉出新的对话分支。

**Panel 怎么做**：扩展已有的 `branch` 功能——点击任意消息 → 右键菜单 [从此分叉] → 创建包含所有历史上下文的新线程，用户从该点重新开始。

改动量小（~100 行 Chat 页改动），但体验提升明显。

### 3.5 可分享主题

**Codex 做了什么**：自定义主题预设可以导出分享。

**Panel 怎么做**：已有主题 JSON 序列化机制（Settings → Appearance → 导出），增加一个"复制分享链接"按钮，生成 `hermes-panel://theme/import?data=<base64>` 或纯 JSON 复制到剪贴板。

---

## 四、Phase 重新规划

### Phase 3a: 平台渠道配置 (P0 · 2 周) — 不变

内容不变，见原文档 Phase 3a。**目标 06-14**。

### Phase 3b: 群聊 + 场景化终端面板 (P0 · 2 周)

在原来群聊基础上增加场景化终端面板。

#### Task 3b.1-3b.3: 聊天室 (同原方案)

同原文档 Phase 3b。

#### Task 3b.4: 场景化终端面板 (新增)

**技术方案**：xterm.js 只作为渲染组件，不引入 node-pty（复用 Sandbox 服务的命令执行）。

**新增文件**：
- `packages/panel-web/src/components/shared/TerminalPanel.vue` — xterm.js 包装器，props: `cwd`, `sessionId?`。通过 BFF SSE 执行命令并流式渲染 ANSI 输出。
- `packages/panel-bff/src/routes/terminal.ts` — `POST /api/terminal/exec` (body: `{ cwd, command, timeoutMs? }`) → SSE stream of stdout/stderr

**三个嵌入场景**：
1. Chat 页 — 消息流下方可折叠面板，Agent 命令结果自动渲染
2. Files 页 — 右下角终端面板，目录跟随文件树选中
3. Sandbox 页 — 全面板终端，Docker 容器 stdin/stdout pipe

#### Task 3b.5: 安装 xterm.js

```bash
pnpm --filter @hermes-panel/web add xterm @xterm/addon-fit @xterm/addon-webgl
```

### Phase 3c-3d: 保持不变

网关管理 + 上下文压缩，内容不变。

### Phase 3e: P1 补充 + Codex 启发 (2 周)

原 Phase 3e (模型发现 + CLI 命令) + Codex 启发的轻量功能：

| Task | 内容 | Codex 启发 |
|------|------|:---:|
| 3e.1 | 模型自动发现 | - |
| 3e.2 | CLI 管理命令 | - |
| **3e.3** | **In-App Browser (localhost 预览)** | ✅ |
| **3e.4** | **Fork 任意点分叉** | ✅ |
| **3e.5** | **可分享主题** | ✅ |

### Phase 3f: P2 锦上添花 (3 周) — 扩展

原 P2 + Codex 启发的 Summary Pane + Agent 自调度：

| Task | 内容 | 来源 |
|------|------|:---:|
| 3f.1 | 微信扫码登录 | hermes-web-ui 对齐 |
| 3f.2 | 文件浏览器远端后端 (SSH/Docker) | hermes-web-ui 对齐 |
| 3f.3 | PII 脱敏 | hermes-web-ui 对齐 |
| 3f.4 | 国际化 9 语言 | hermes-web-ui 对齐 |
| **3f.5** | **Summary Pane (集成到 Control Plane)** | Codex 启发 |
| **3f.6** | **Agent 自调度 (Cron + Agent 联动)** | Codex 启发 |

---

## 五、更新后的里程碑总览

```
2026-06-14  Phase 3a 完成 — 平台渠道配置
2026-06-28  Phase 3b 完成 — 群聊 + 场景化终端面板
2026-07-05  Phase 3c 完成 — 多 Profile 网关管理
2026-07-12  Phase 3d 完成 — 上下文自动压缩
2026-07-26  Phase 3e 完成 — 模型发现 + CLI + localhost 预览 + Fork + 主题分享
2026-08-16  Phase 3f 完成 — P2 全部 (含 Summary Pane + Agent 自调度)
```

与 Plan 2 交织后的总时间线：

```
          Plan 2                             Plan 3
          ──────                             ──────
5/31  ✅  2a.1-2a.4 基础完成
6/07      2b.1 Orchestrator 引擎            3a 渠道配置
6/14      2b.2 Workflow Editor              3a ✅ 渠道配置完成
6/21      2b.3 Control Plane                3b 群聊 + 终端面板
6/28      2b.4 质量评估                     3b ✅ 群聊 + 终端完成
7/05      2c.1 Review Queue                 3c 网关管理
7/12      2c.2 Full Auto 模式               3d 上下文压缩
7/19      2c.3 语音输入                     
7/26      跨平台构建验证                     3e ✅ P1+Codex 完成
8/02      2d 跨平台发布                     
8/16                                         3f ✅ P2 全部完成
```

---

## 六、不做的功能及原因

| 功能 | 来源 | 不做原因 |
|------|:---:|------|
| Computer Use (AX Tree 桌面操控) | Codex | 需原生 macOS Accessibility API 深度集成，Tauri 无法轻易实现。远期可探索 Tauri plugin。 |
| 图片生成 (gpt-image-1.5) | Codex | 依赖模型侧能力，Hermes 不支持时无意义。等 Hermes 支持后作为 Provider 功能接入。 |
| 独立 Terminal 页面 | hermes-web-ui | 场景化嵌入优于独立页面，见 §2 分析。 |
| 通用 Web 浏览器 | Codex | Atlas 是云端浏览器，Panel 本地做无优势。仅做 localhost 预览。 |
| 90+ 插件规模 | Codex | 需社区生态，非单人可建。Panel 已有插件安装框架，规模靠社区成长。 |
| 拖拽重排消息 | Codex | 太小众，投入产出比低。 |
| Back/Forward 导航 | Codex | 浏览器已有此能力，无需自建。 |

---

## 七、风险更新

| 风险 | 概率 | 缓解 |
|------|-----|------|
| xterm.js 增加 Bundle 体积 | 中 | 按需加载（仅 Chat/Files/Sandbox 页面引入），xterm.js ~400KB gzipped ~120KB |
| localhost 预览跨域问题 | 中 | iframe + postMessage 通信；CSP 配置 `frame-src 'self' http://127.0.0.1:*` |
| Agent 自调度可靠性 | 中 | Cron 已有成熟基础设施；自调度任务本质是 Cron 任务的自动创建，不引入新执行机制 |
| 群聊 + 终端同步开发工期紧张 | 低 | 群聊用 SSE 复用已有 chat-stream；终端复用 sandbox 服务，不引入新协议 |
| 渠道配置 config.yaml 格式不兼容 | 中 | 读写前备份，Schema 校验，失败自动回滚 |

---

**END OF PLAN 3**
