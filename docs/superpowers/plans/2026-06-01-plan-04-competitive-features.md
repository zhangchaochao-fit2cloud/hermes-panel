# Plan 4: 竞争功能追赶计划

> **背景**：基于 hermes-web-ui v0.6.7 源码分析，识别出 18 个 Panel 缺失的关键功能。本计划按"用户每天都会用到 → 差异化价值最大 → 实现成本最低"三维排序，给出优先级和执行计划。

---

## 一、竞争差距排序

### 优先级判定标准

| 维度 | 权重 | 说明 |
|------|:---:|------|
| **日常使用频率** | 40% | 用户每天用几次？还是偶尔用一次？ |
| **竞争差异化** | 35% | 是"补齐短板"还是"建立壁垒"？ |
| **实现成本** | 25% | 需要多少时间？能否复用现有资产？ |

### 差距清单

| 功能 | 频率 | 差异化 | 成本 | 综合 | 优先级 |
|------|:---:|:---:|:---:|:---:|:---:|
| **上下文自动压缩** | ⭐⭐⭐⭐⭐ (每条长对话) | ⭐⭐⭐ (补齐) | ⭐⭐⭐⭐ (复用 LLM) | **4.4** | **P0** |
| **群聊 @mention** | ⭐⭐⭐⭐ (协作场景) | ⭐⭐⭐⭐ (与 Workspace 联动) | ⭐⭐ (2536 行参考) | **3.7** | **P0** |
| **Kanban 任务板** | ⭐⭐⭐ (项目管理) | ⭐⭐⭐⭐⭐ (Workspace 联动独有) | ⭐⭐⭐ (复用 panel.db) | **3.6** | **P1** |
| **场景化终端面板** | ⭐⭐⭐⭐ (开发场景) | ⭐⭐⭐⭐ (场景联动独特) | ⭐⭐ (xterm.js 封装) | **3.5** | **P1** |
| **Profile 级网关管理** | ⭐⭐ (配置时) | ⭐⭐⭐ (补齐) | ⭐⭐⭐⭐ (扩展现有) | **2.8** | **P1** |
| **模型自动发现** | ⭐⭐ (配置时) | ⭐⭐ (补齐) | ⭐⭐⭐⭐ (扩展现有) | **2.4** | **P2** |
| **文件远端后端** | ⭐⭐ (特定场景) | ⭐⭐⭐ (独特) | ⭐⭐ (SSH/Docker 复杂) | **2.2** | **P2** |
| **微信扫码登录** | ⭐⭐ (首次登录) | ⭐⭐ (补齐) | ⭐⭐ (外部依赖) | **2.0** | **P2** |
| **OAuth 登录** | ⭐ (首次) | ⭐⭐ (补齐) | ⭐ (多 Provider) | **1.5** | **P3** |
| **PII 脱敏** | ⭐⭐⭐ (安全场景) | ⭐⭐ (补齐) | ⭐⭐⭐⭐ (正则即可) | **2.8** | **P2** |
| **9 语言 i18n** | ⭐ (非中文用户) | ⭐ (补齐) | ⭐ (AI 翻译) | **1.3** | **P3** |
| **TTS 语音合成** | ⭐ (少数场景) | ⭐ (小众) | ⭐⭐ (node-edge-tts) | **1.1** | **P3** |

---

## 二、P0：本周必做（用户每天都会遇到）

### Phase 4a: 上下文自动压缩 (2 天)

**为什么 P0**：这是影响每次长对话体验的功能。用户聊了 30 轮后上下文溢出 → Agent 开始"忘记"早期讨论 → 用户被迫手动开新会话。hermes-web-ui 有 883 行完整实现。

**实现方案**（复用现有资产）：

```
触发时机：ContextRing 显示 > 70%
压缩策略：
  1. 保留最近 10 条原文
  2. 老旧消息 → 调廉价模型生成摘要（1-2 句/条）
  3. 工具调用结果 → 提取关键字段（exitCode, fileCount, errorCount）
  4. 去重：相同内容的连续消息只保留最新

技术实现：
  BFF: services/context-compressor.ts (~150 行)
    - estimateTokens(messages) → number
    - shouldCompress(messages, threshold) → boolean
    - compress(messages) → { compressed, savedTokens }
  
  前端: Composer 中 ContextRing 交互
    - > 70% 黄色 pulse 动画提示
    - 点击 ContextRing → 详情面板增加 [压缩历史] 按钮
    - 压缩完成 → Toast "已压缩 65K tokens (节省 $0.14)"
```

**为什么先于群聊**：实现成本低（纯 BFF 服务 + 前端小改动），但影响所有长对话。群聊需要 2 周，压缩只需要 2 天。

### Phase 4b: 群聊 — 多 Agent 聊天室 (2 周)

**为什么 P0**：hermes-web-ui 最核心的差异化功能（2536 行代码）。Panel 的 Workspace 体系天然适合群聊——每个角色就是一个可 @mention 的 Agent。

**与 hermes-web-ui 的差异**：

| | hermes-web-ui | Hermes Panel (方案) |
|------|------|------|
| 技术 | Socket.IO | **SSE (复用 chat-stream)** |
| Agent 来源 | 手动配置 | **自动从当前 Workspace 角色加载** |
| 上下文 | Socket 房间内共享 | **SSE 合流 + panel.db 持久化** |
| 并行 | 单线程 | **Docker 沙箱隔离** |

**实现方案**：

```
BFF 路由:
  POST /api/chat-rooms                    → 创建房间 (绑定 Workspace)
  GET  /api/chat-rooms                     → 列表
  POST /api/chat-rooms/:id/messages        → 发送消息 (解析 @mentions)
  GET  /api/chat-rooms/:id/stream          → SSE 合流 (多 Agent 并行)
  
前端页面:
  /chat-room/:id → 两栏布局
    左侧: 房间列表 (复用 SessionRail 样式)
    右侧: 消息流 + @mention 自动补全 + Composer
  
@mention 逻辑:
  用户输入 "@" → 弹窗显示当前 Workspace 角色列表
  → 选择角色 → 消息发送到 BFF
  → BFF 并行调 hermes run (每个 @mention 独立 session)
  → SSE 合流推送到前端，按 agent_id 分发到不同气泡

消息气泡:
  不同 Agent 不同颜色 (复用 Workspace 角色色)
  每个 Agent 消息显示: 头像 + 名称 + 思考状态 + 工具调用
  用户消息居中显示
```

---

## 三、P1：本月必做（建立差异化壁垒）

### Phase 4c: 场景化终端面板 (1 周)

**定位**：不做独立 Terminal 页面（那是 hermes-web-ui 的做法），做**场景内嵌终端**——跟随上下文，减少窗口切换。

**三个嵌入场景**：

```
场景 1: Chat 页 → 消息流下方可折叠终端
  Agent 跑了 npm test → ANSI 输出直接渲染到终端面板
  用户可直接输入命令重跑 → 在当前 session 目录执行
  实现: SSE 流转发到 xterm.js (不引入 node-pty)

场景 2: Files 页 → 右下角终端面板
  当前目录跟随文件树选中 → 自动 cd
  ls/npm/node 等基础命令
  实现: 复用 sandbox.ts 命令执行 + xterm.js 渲染

场景 3: Sandbox 页 → 全面板终端
  Docker 容器 stdin/stdout pipe 到 xterm.js
  完全隔离执行环境
```

**技术方案**：
```
新增依赖: xterm, @xterm/addon-fit, @xterm/addon-webgl
新增组件: shared/TerminalPanel.vue (~150 行 xterm.js 封装)
BFF 路由: routes/terminal.ts (POST /api/terminal/exec, SSE stream)
```

### Phase 4d: Kanban 任务板 (1.5 周)

**定位**：不只是简单的 TODO 列表，而是**与 Workspace 角色联动的开发任务板**。

**与 hermes-web-ui Kanban 的差异**：

| | hermes-web-ui | Hermes Panel (方案) |
|------|------|------|
| 数据源 | hermes CLI kanban 命令 | **panel.db tasks 表 (已有)** |
| Agent 联动 | ❌ | **✅ 右键"派给 @架构师"** |
| Chat 联动 | ❌ | **✅ 卡片关联 Session** |

**实现方案**：

```
BFF 路由 (复用 panel.db tasks CRUD):
  GET    /api/tasks?status=&workspace=   → 列表 (按状态分组)
  POST   /api/tasks                      → 创建
  PATCH  /api/tasks/:id                  → 更新 (移动列/改指派)
  DELETE /api/tasks/:id                  → 删除

前端页面:
  /tasks → 看板视图 (6 列: Backlog/Ready/Running/Review/Blocked/Done)
  顶部: [新建任务] [筛选: Workspace▾] [视图: Kanban/Markdown▾]
  
  任务卡片:
    标题 + 描述
    指派 Agent (图标 + 名称)
    关联 Session (点击跳到 Chat)
    优先级/标签
    hover 出现 [编辑] [删除]
  
  右键菜单:
    "派给 @架构师" → 自动创建新 session + 调 Orchestrator
    "关联到当前会话" → 绑定 session_id
```

### Phase 4e: Profile 级网关管理 + PII 脱敏 (0.5 周)

**网关管理**：扩展 `services/hermes-gateway.ts`，支持 `startGatewayForProfile(profile)` 和端口自动分配。前端 `/workspaces` 页面 Profile 详情中增加 Gateway 控制。

**PII 脱敏**：消息渲染前自动检测手机号/身份证/邮箱/API Key，替换为 `***`。可 hover 查看 + 确认按钮。

---

## 四、P2-P3：后续补充

| 功能 | 工期 | 排期 |
|------|:---:|------|
| 模型自动发现 (auth.json + /v1/models) | 2 天 | P2-1 |
| 文件浏览器远端后端 (SSH/Docker) | 1 周 | P2-2 |
| 微信扫码登录 | 1 周 | P2-3 |
| 9 语言 i18n | 3 天 | P3 |
| OAuth 登录 (Codex/Nous 等) | 2 周 | P3 |

---

## 五、时间线总览

```
Week 1 (6/1-6/7)
  Day 1-2: Phase 4a — 上下文自动压缩 ✅
  Day 3-5: Phase 4b 启动 — 群聊 BFF + 基础 UI

Week 2 (6/8-6/14)
  Phase 4b 完成 — 群聊上线

Week 3 (6/15-6/21)
  Phase 4c — 场景化终端面板

Week 4 (6/22-6/28)
  Phase 4d — Kanban 任务板

Week 5 (6/29-7/5)
  Phase 4e — 网关管理 + PII 脱敏
  P2-1 — 模型自动发现
```

---

## 六、完成后的竞争态势

| 维度 | 当前 Panel | 完成后 Panel | hermes-web-ui |
|------|:---:|:---:|:---:|
| 聊天体验 | 9 | **9** (+压缩) | 9 |
| 渠道管理 | 6 | **6** | 10 |
| Agent 协作 | 7 | **9** (+群聊+Kanban) | 7 |
| 文件编辑 | 9 | **9** (+终端联动) | 6 |
| 终端 | 2 | **7** (场景化) | 9 |
| 数据洞察 | 9 | **9** | 7 |
| 开发者工具 | 10 | **10** | 3 |
| 通知系统 | 9 | **9** (+PII) | 4 |
| 总分 | 128 | **~158** | 142 |

---

**END OF PLAN 4**
