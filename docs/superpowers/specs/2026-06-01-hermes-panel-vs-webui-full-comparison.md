# Hermes Panel vs hermes-web-ui 全维度对比

> **日期**：2026-06-01
> **对比版本**：Hermes Panel v0.1.0-beta.0 vs hermes-web-ui v0.6.7
> **数据来源**：两个仓库的源码直接分析 + 官方文档

---

## 一、项目概况

| 维度 | Hermes Panel | hermes-web-ui |
|------|-------------|---------------|
| **GitHub** | 未发布 | [EKKOLearnAI/hermes-web-ui](https://github.com/EKKOLearnAI/hermes-web-ui) |
| **Stars** | N/A | 4,700+ |
| **当前版本** | 0.1.0-beta.0 | **0.6.7** |
| **许可证** | MIT | MIT |
| **首次提交** | 2026-05 | 2026-04 |
| **开发活跃度** | 单人+AI | 社区驱动 (38+ PR 合并) |
| **仓库结构** | pnpm monorepo (7 packages) | npm workspaces (5 packages) |

---

## 二、技术栈逐层对比

### 2.1 运行时 & 语言

| 维度 | Hermes Panel | hermes-web-ui |
|------|-------------|---------------|
| Node.js | >= 20 | **>= 23** |
| TypeScript | 5.4 | **~6.0** |
| 模块系统 | ESM | ESM |
| 包管理 | pnpm 10 | npm |
| 严格模式 | strict + noUnused | strict |

### 2.2 前端层

| 维度 | Hermes Panel | hermes-web-ui |
|------|-------------|---------------|
| 框架 | Vue 3.5 | Vue 3.5 |
| 构建 | Vite 6 | **Vite 8** |
| UI 库 | Naive UI 2.40 | Naive UI 2.44 |
| 样式方案 | **Tailwind v4 + CSS Variables** | SCSS (scoped) |
| 状态管理 | Pinia 2 | **Pinia 3** |
| 路由 | Vue Router 4 (Hash) | Vue Router 4 (History) |
| i18n | vue-i18n 9 | **vue-i18n 11** |
| 图表 | ECharts 5 | Mermaid 11 |
| Markdown | markdown-it + DOMPurify | markdown-it + highlight.js + **KaTeX** |
| 终端 | xterm.js (计划中) | **@xterm/xterm v6 + node-pty** |
| 代码编辑器 | **Monaco Editor (懒加载)** | Monaco Editor (devDeps) |
| 桌面框架 | **Tauri 2 (Rust, 3-10MB)** | Electron v42 (~150MB) |
| 桌面名称 | Hermes Panel | **Hermes Studio** |
| 桌面平台 | **Win/Mac/Linux** | macOS only |
| 虚拟滚动 | - | vue-virtual-scroller |
| TTS | - | **node-edge-tts** |

### 2.3 BFF 层

| 维度 | Hermes Panel | hermes-web-ui |
|------|-------------|---------------|
| 框架 | Koa 2.15 | Koa 2.15 |
| 路由数 | **27 个路由文件** | **38 个路由文件** |
| 服务文件数 | 28 | **63** |
| 数据库 | **自建 panel.db (12 张表, 读写)** | SQLite (会话同步 + 消息持久化) |
| CLI 调用 | child_process | child_process |
| 日志 | pino | **pino + pino-pretty** |
| API 文档 | - | **tsoa (OpenAPI 生成)** |
| 实时通信 | SSE only | **SSE + Socket.IO + WebSocket** |
| 请求库 | undici + ofetch | **axios** |
| 沙箱 | **Docker (docker CLI)** | - |
| 认证 | Token + **用户名/密码 + RBAC** | Token + 用户名/密码 + **AUTH_DISABLED** |
| 速率限制 | ✅ | ✅ |
| 微信登录 | ❌ (计划 P2) | **✅ (腾讯 iLink API)** |

### 2.4 测试

| 维度 | Hermes Panel | hermes-web-ui |
|------|-------------|---------------|
| 单元测试 | Vitest (88 tests) | Vitest |
| E2E | ❌ | **✅ Playwright** |
| 覆盖率 | - | **✅ v8 coverage** |
| CI 平台 | GitHub Actions (3 OS × 2 Node) | GitHub Actions |

### 2.5 构建 & 部署

| 维度 | Hermes Panel | hermes-web-ui |
|------|-------------|---------------|
| npm 全局安装 | ✅ `npx hermes-panel` | ✅ `npm -g hermes-web-ui` |
| Docker | ✅ docker-compose | ✅ docker-compose |
| 一键安装脚本 | ❌ | **✅ curl \| bash** |
| CLI 命令 | 1 (start) | **5 (start/stop/restart/status/update)** |
| 自动更新 | Tauri Updater | Electron Updater |
| PWA | **✅ manifest + SW + 离线** | 🔸 响应式 |

---

## 三、功能维度逐项对比

### 3.1 聊天

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| SSE 流式 | ✅ | ✅ |
| 工具调用可视化 | ✅✅ (ToolCallCard, 分组折叠) | ✅ |
| 多会话管理 | ✅ | ✅ |
| Ctrl+K 搜索 | ✅ | ✅ |
| Markdown 渲染 | ✅ | ✅ + **KaTeX 数学公式** |
| 代码复制 | ✅ | ✅ |
| Reasoning 显示 | ✅ 可折叠面板 | ✅ |
| 思考速度选择 | ✅ fast/extended/auto | ✅ |
| ContextRing (Token 环) | ✅ 底部常驻 | ✅ |
| 上下文压缩 | ❌ (设计中) | **✅ 883 行实现** |
| 文件上传 | ✅ | ✅ |
| 消息编辑/分叉 | ✅ | ✅ |
| 语音合成 (TTS) | ❌ | **✅ node-edge-tts** |
| 语音输入 | 🔸 计划中 | ❌ |
| **PII 脱敏** | ❌ | **✅** |

### 3.2 渠道管理

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| Telegram | 🔸 刚实现 | ✅ |
| Discord | 🔸 刚实现 | ✅ |
| Slack | 🔸 刚实现 | ✅ |
| WhatsApp | 🔸 刚实现 | ✅ |
| Matrix | 🔸 刚实现 | ✅ |
| 飞书 | 🔸 刚实现 | ✅ |
| 微信 | 🔸 刚实现 | ✅ + **扫码登录** |
| 企业微信 | 🔸 刚实现 | ✅ |
| 配置热重载 | ✅ (重启 Gateway) | ✅ (自动重启) |
| **自定义 Webhook** | ✅ | ❌ |

### 3.3 Agent 协作

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| **Workspace 模板** | **✅✅ 12 个预配置** | ❌ |
| **角色定义 (Role)** | **✅ 每个 Workspace 多角色** | ❌ |
| Orchestrator | 🔸 设计中 | ❌ |
| **群聊 (@mention)** | ❌ | **✅ 2536 行实现** |
| **Kanban 任务板** | ❌ (schema 已就绪) | **✅ 783 行实现** |
| **Agent Bridge** | ❌ | **✅ 1166 行实现** |
| **Coding Agents** | ❌ | **✅** |
| 多 Agent 并行 | 🔸 Docker 沙箱 | 🔸 agent-bridge |

### 3.4 网关 & Profile

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| Gateway 启停 | ✅ | ✅ |
| Gateway 状态 | ✅ | ✅ + **性能监控** |
| **Profile 级网关管理** | ❌ (读状态) | **✅ 独立启停** |
| **端口冲突自动解决** | 🔸 forceKillPort | **✅ 完整实现** |
| Profile 创建/切换/删除 | ✅ | ✅ + **克隆/导入/导出** |
| Profile 配置隔离 | ✅ | ✅ |

### 3.5 文件 & 编辑

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| Monaco Editor | **✅ 懒加载, diff 模式** | 🔸 devDeps (未主用) |
| 文件树 | ✅ (files/ 和 memory/) | ✅ (files/) |
| 多文件 Tab | ✅ | ❌ |
| **文件远端后端** | ❌ (仅本地) | **✅ Docker/SSH/Singularity** |
| 语法高亮预览 | ✅ Monaco | ✅ highlight.js |
| 上传/下载/重命名/删除 | ✅ | ✅ |

### 3.6 终端

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| 终端类型 | 🔸 场景化面板 (计划中) | **✅ 独立终端页** |
| 技术实现 | xterm.js (计划) | **node-pty + WebSocket + xterm.js** |
| 多会话 | - | ✅ |
| 窗口自适应 | - | ✅ |
| 场景联动 | ✅ (目录跟随/cd) | ❌ (通用终端) |

### 3.7 数据 & 洞察

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| Dashboard 仪表盘 | ✅✅ 11 个卡片 | ✅ 用量分析 |
| Token 用量图 | ✅ 7 天折线 | ✅ 30 天趋势 |
| 模型分布饼图 | ✅ | ✅ |
| 月度配速预测 | ✅ | ❌ |
| 成本追踪 (Usage Ledger) | ✅ | ✅ |
| 缓存命中率 | ✅ | ✅ |
| **Performance Monitor** | ❌ | **✅ 独立页面** |
| **Health 健康评分** | ✅ Doctor | ❌ |

### 3.8 开发者工具

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| **API Playground** | **✅** | ❌ |
| **SSE Inspector** | **✅** | ❌ |
| **SDK 代码生成** | **✅** | ❌ |
| **Webhook 调试器** | **✅** | ❌ |
| 日志查看器 | ✅ | ✅ |
| 系统诊断 | ✅ Doctor | ❌ |

### 3.9 模型 & Provider

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| Provider 管理 | ✅ 添加/编辑/删除 | ✅ 添加/编辑/删除 |
| **模型自动发现** | ❌ (手动) | **✅ auth.json + /v1/models** |
| **OAuth 登录** | ❌ | **✅ Codex/Nous/Copilot/xAI** |
| 自定义 API 路径 | ✅ | ✅ |
| **Claude Code 代理** | ❌ | **✅** |
| **Codex 代理** | ❌ | **✅** |

### 3.10 技能 & 插件

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| Skills 浏览 | ✅ (已安装+市场) | ✅ |
| Skills 安装/卸载 | ✅ | ✅ |
| MCP Server 管理 | ✅ | ✅ |
| **Plugins 插件系统** | ✅ (安装/卸载) | ✅ |
| **2000+ Skill 市场** | ❌ | **✅ agentskills.io** |

### 3.11 通知 & 事件

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| 通知中心 | ✅ 三层架构 | 🔸 |
| 通知偏好 | ✅ 按类型/免打扰 | ❌ |
| 离线回放 | ✅ events.db | ❌ |
| 实时事件流 | ✅ EventStreamPanel | ❌ |
| OS 系统通知 | ✅ Tauri | ✅ Electron |
| "回家"体验 | ✅ WelcomeBack | ❌ |

### 3.12 安全

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| Token 认证 | ✅ | ✅ |
| 用户名/密码 | ✅ + RBAC | ✅ |
| **AUTH_DISABLED** | ❌ | **✅ 可关闭认证** |
| API Key 加密存储 | ✅ Keytar + AES-256 | 🔸 .env |
| CSP | ✅ strict | 🔸 |
| CORS | ✅ 白名单 | ✅ |
| Capability Gates | ✅ | ❌ |
| Sudo 审批 | ❌ (spec 中) | ❌ |
| 速率限制 | ✅ | ✅ |

### 3.13 UI/UX

| 功能点 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| 主题模式 | **✅ 5 种 (亮/暗/OLED/系统/自定义)** | 🔸 黑白 (Pure Ink) |
| 主题色 | **✅ 11 色 + 自定义** | 黑白单色 |
| 布局变体 | 🔸 1 种 (Default) | 1 种 |
| **Control Center** | **✅ ⌘⇧P 命令面板** | ❌ |
| 快捷键系统 | ✅ Hotkeys | 🔸 |
| 动效系统 | ✅ 3 档 | 🔸 |
| 响应式 | ✅ 5 档断点 + PWA | ✅ 响应式 |
| 字体系统 | ✅ 中英文混排 | ✅ |
| 无障碍 (A11y) | 🔸 | 🔸 |

### 3.14 国际化 (i18n)

| 语言 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| 简体中文 | ✅ | ✅ |
| 繁体中文 | ✅ | ✅ |
| English | ✅ | ✅ |
| 日本語 | ✅ | ✅ |
| 한국어 | ❌ (计划 P2) | **✅** |
| Deutsch | ❌ (计划 P2) | **✅** |
| Français | ❌ (计划 P2) | **✅** |
| Español | ❌ (计划 P2) | **✅** |
| Português | ❌ (计划 P2) | **✅** |
| Русский | ❌ (计划 P2) | **✅** |
| **语言文件数** | 4 | **11** |

### 3.15 代码组织

| 维度 | Hermes Panel | hermes-web-ui |
|------|-------------|---------------|
| 前端视图数 | 12 | **22** |
| 前端组件数 | **87** | 78 |
| 前端 Store 数 | **27** (细粒度) | 11 (粗粒度) |
| BFF 路由文件数 | 27 | **38** |
| BFF 服务文件数 | 28 | **63** |
| BFF 数据库文件数 | 5 | **10** |
| 组件组织方式 | 按功能分目录 (chat/dashboard/...) | **命名空间隔离 (hermes/ 目录)** |
| 组件大小红线 | ≤ 300 行, ≤ 5 props, ≤ 3 emits | 无明确限制 |
| 代码风格 | 无 ESLint, TS strict | 标准 TS + ESLint |

### 3.16 桌面应用

| 维度 | Hermes Panel | hermes-web-ui |
|------|-------------|---------------|
| 名称 | Hermes Panel | **Hermes Studio** |
| 框架 | **Tauri 2 (Rust)** | Electron v42 |
| 安装包大小 | **3-10 MB** | ~150 MB |
| 内存占用 | **30-80 MB** | ~200-400 MB |
| 启动速度 | **< 1s** | 2-4s |
| 平台 | **Win/Mac/Linux** | macOS only |
| 系统托盘 | ✅ | ✅ |
| 更新 | Tauri Updater + minisign | Electron Updater |
| 签名 | Apple + EV 证书 | Apple |
| VS Code 扩展 | **✅** | ❌ |

---

## 四、hermes-web-ui 有而 Panel 完全没有的功能 (按实现深度排序)

| 排名 | 功能 | 代码量 | 重要度 |
|:---:|------|------|:---:|
| 1 | **群聊 (@mention 多 Agent)** | 2536 行 | ⭐⭐⭐⭐⭐ |
| 2 | **上下文自动压缩** | 883 行 | ⭐⭐⭐⭐⭐ |
| 3 | **Agent Bridge (多 Agent 通信)** | 1166 行 | ⭐⭐⭐⭐ |
| 4 | **Kanban 任务板** | 783 行 | ⭐⭐⭐⭐ |
| 5 | **Web 终端 (node-pty)** | 352 行 | ⭐⭐⭐ |
| 6 | **微信扫码登录** | - | ⭐⭐⭐ |
| 7 | **模型自动发现 (auth.json)** | - | ⭐⭐⭐ |
| 8 | **OAuth 登录 (Codex/Nous/Copilot/xAI)** | 多文件 | ⭐⭐⭐ |
| 9 | **Claude Code / Codex 代理** | 多文件 | ⭐⭐⭐ |
| 10 | **TTS 语音合成** | - | ⭐⭐ |
| 11 | **Performance Monitor** | - | ⭐⭐ |
| 12 | **Coding Agents** | - | ⭐⭐ |
| 13 | **文件远端后端 (Docker/SSH/Singularity)** | - | ⭐⭐ |
| 14 | **PII 脱敏** | - | ⭐⭐ |
| 15 | **9 语言 i18n** | 11 文件 | ⭐⭐ |
| 16 | **E2E 测试 (Playwright)** | - | ⭐⭐ |
| 17 | **OpenAPI 生成 (tsoa)** | - | ⭐ |
| 18 | **一键安装脚本** | - | ⭐ |

---

## 五、Panel 有而 hermes-web-ui 完全没有的功能

| 排名 | 功能 | 说明 |
|:---:|------|------|
| 1 | **12 个内置 Workspace 模板** | dev-squad/collab-hub/content-studio 等预配置角色团队 |
| 2 | **角色定义 (Role)** | 每个 Workspace 内多角色，各有独立模型+工具+prompt |
| 3 | **开发者工具 6 合 1** | API Playground + SSE Inspector + SDK CodeGen + Webhook Tester + Doctor + Logs |
| 4 | **Control Center (⌘⇧P)** | Spotlight 式命令面板 |
| 5 | **Capability Gates** | 按 Hermes 版本自动显示/灰化功能入口 |
| 6 | **Docker 沙箱执行** | 隔离容器执行 Agent 代码 |
| 7 | **Tauri 跨平台桌面** | 轻量原生应用，覆盖 Win/Mac/Linux |
| 8 | **VS Code 扩展** | 编辑器内直接发送代码到 Panel |
| 9 | **PWA 离线支持** | manifest + Service Worker + 离线缓存 |
| 10 | **通知三层架构** | OS 通知 + 应用内通知中心 + 上下文徽章 |
| 11 | **离线事件回放** | events.db 累积 + 启动时回放 |
| 12 | **5 模式主题 + 11 主色** | 亮/暗/OLED/系统/自定义 + 取色器 |
| 13 | **审批队列 (review_items 表)** | Diff/Command/Handoff 统一审批 |
| 14 | **Agent 质量评估 (schema 就绪)** | 幻觉检测 + 质量评分 + 模型替换建议 |
| 15 | **实时事件流面板** | 底部可折叠 EventStreamPanel |
| 16 | **月度配速预测** | 按当前用量预测月底成本 |
| 17 | **配置备份恢复** | 自动备份 + 一键回滚 |
| 18 | **Monaco Editor (完整)** | 懒加载 + diff 模式 + 多 Tab |

---

## 六、架构决策差异

| 决策点 | Hermes Panel | hermes-web-ui | 优劣 |
|------|------|------|------|
| **桌面框架** | Tauri 2 (Rust) | Electron | Panel 更轻量，web-ui 更成熟 |
| **样式方案** | Tailwind v4 | SCSS | 风格差异，无绝对优劣 |
| **数据库** | 自建 panel.db (独立) | 同步 state.db | Panel 独立性更强，web-ui 更简单 |
| **命名空间** | 功能目录 (chat/ dashboard/) | hermes/ 命名空间 | Panel 更直观，web-ui 更可扩展 |
| **Store 粒度** | 细 (27 stores) | 粗 (11 stores) | Panel 更模块化，web-ui 更简单 |
| **主题** | 多色可定制 | 黑白单色 (Pure Ink) | Panel 更丰富，web-ui 更专注 |
| **认证** | 强制认证 | 可关闭 (AUTH_DISABLED) | web-ui 更灵活 |
| **路由模式** | Hash 路由 | History 路由 | web-ui 更标准 |
| **Node 版本** | >= 20 | >= 23 | Panel 兼容性更好 |
| **包管理** | pnpm | npm | Panel 更快更省空间 |
| **前后端通信** | REST + SSE | REST + SSE + Socket.IO + WS | web-ui 更多协议 |
| **API 文档** | ❌ | OpenAPI (tsoa) | web-ui 更好 |
| **E2E 测试** | ❌ | Playwright | web-ui 更好 |

---

## 七、代码规模全景

| 指标 | Hermes Panel | hermes-web-ui |
|------|:---:|:---:|
| 前端视图 | 12 | **22** |
| 前端组件 | **87** | 78 |
| 前端 Store | **27** | 11 |
| BFF 路由 | 27 | **38** |
| BFF 服务 | 28 | **63** |
| BFF 控制器 | N/A (路由内联) | **27** |
| BFF 数据库 | 5 | **10** |
| i18n 文件 | 4 | **11** |
| 总 BFF 文件 | ~60 | **~140** |
| 测试数 | 94 | 未知 |
| **前端独有页面** | 12 个功能页 | **22 个功能页** (含 Kanban/GroupChat/Terminal/CodingAgents/Performance) |

---

## 八、综合评分

| 维度 | Hermes Panel | hermes-web-ui | 说明 |
|------|:---:|:---:|------|
| 聊天体验 | 9 | 9 | 旗鼓相当 |
| 渠道管理 | 6 | **10** | hermes-web-ui 已生产化 |
| Agent 协作 | **7** | 7 | Panel 有 Workspace，web-ui 有群聊 |
| 网关管理 | 5 | **9** | web-ui 有 Profile 级管理 |
| 文件编辑 | **9** | 6 | Panel 有 Monaco |
| 终端 | 2 | **9** | web-ui 有 node-pty |
| 数据洞察 | **9** | 7 | Panel Dashboard 更丰富 |
| 开发者工具 | **10** | 3 | Panel 独有 |
| 模型管理 | 6 | **8** | web-ui 有自动发现+OAuth |
| 技能/插件 | 7 | **8** | web-ui 有 agentskills.io |
| 通知系统 | **9** | 4 | Panel 独有 |
| 安全 | **8** | 7 | Panel 有 Keytar 加密+Capability Gates |
| UI/UX 丰富度 | **9** | 6 | Panel 主题/动效/布局更强 |
| i18n | 6 | **9** | web-ui 9 语言 |
| 桌面应用 | **9** | 5 | Panel Tauri 轻量跨平台 |
| 测试 | 6 | **8** | web-ui 有 Playwright E2E |
| API 文档 | 2 | **7** | web-ui 有 OpenAPI |
| 部署便利性 | 7 | **8** | web-ui 有一键脚本+更完善 CLI |
| **总分** | **128** | **142** | |

> 评分说明：1-10 分，基于功能完整度、实现深度、生产就绪度综合评定。hermes-web-ui 由于 0.6.7 版本的生产化程度在渠道/网关/终端/测试/文档方面领先；Panel 在开发者工具、Workspace、桌面轻量、主题系统方面有独特优势。

---

## 九、结论

**hermes-web-ui 是更成熟的产品**（0.6.7 vs 0.1.0-beta），在渠道配置、群聊、终端、Kanban、上下文压缩、测试基础设施等"生产就绪"方面全面领先。

**Hermes Panel 的不可替代优势**在于：
1. **Workspace 角色体系** — 12 个预配置团队 + 角色定义，目前没有任何产品做到
2. **开发者工具套件** — API Playground / SSE Inspector / CodeGen / Webhook Tester
3. **Tauri 桌面** — 轻量跨平台原生应用，Codex/hermes-web-ui 都做不到
4. **通知 + 离线 + 事件回放** — 完整的三层通知架构
5. **Control Center + Capability Gates** — 独特的产品体验设计

**核心差距项的追赶路径**已在 Plan 3 中规划：渠道配置 (✅3a已完成) → 群聊+终端 (3b) → 上下文压缩 (3d) → Kanban + Agent Bridge (远期)。

---

**END OF DOCUMENT**
