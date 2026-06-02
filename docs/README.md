# Hermes Panel 文档索引

---

## 架构与设计 (Specs)

| 文档 | 日期 | 内容 |
|------|------|------|
| [产品架构设计](superpowers/specs/2026-05-25-hermes-panel-design.md) | 2026-05-25 | 完整产品设计 §1-§22，含架构、组件、数据流、UI、安全 |
| [竞品深度对比](superpowers/specs/2026-06-01-competitive-analysis.md) | 2026-06-01 | Panel vs hermes-web-ui vs Codex vs Claude Code |
| [全维度对比 hermes-web-ui](superpowers/specs/2026-06-01-hermes-panel-vs-webui-full-comparison.md) | 2026-06-01 | 源码级分析（路由数、服务数、功能矩阵） |
| [Orchestrator UX 设计](superpowers/specs/2026-06-01-orchestrator-ux-design.md) | 2026-06-01 | 多 Agent 编排的用户体验设计 |
| [社区与发布规范](superpowers/specs/2026-06-01-release-and-community-standards.md) | 2026-06-01 | 版本管理、分支策略、CI/CD、社区版/专业版 |
| [Goal 引擎进阶设计](superpowers/specs/2026-06-02-goal-engine-advanced.md) | 2026-06-02 | Goal 引擎 vs Codex/Claude 差异化设计 |
| [进阶创新方案](superpowers/specs/2026-06-02-advanced-innovations.md) | 2026-06-02 | 成本智能、意图驱动、知识图谱、预见性 Agent |
| [成本管控系统设计](superpowers/specs/2026-06-02-cost-management-system.md) | 2026-06-02 | 多供应商统一成本管控 |
| [BFF 架构分析](superpowers/specs/2026-06-02-bff-architecture-analysis.md) | 2026-06-02 | Node.js vs Rust vs 混合方案对比 |

## 实施计划 (Plans)

| 计划 | 日期 | 内容 | 状态 |
|------|------|------|:--:|
| [Plan 1: MVP](superpowers/plans/2026-05-25-plan-01-mvp-skeleton-and-chat.md) | 2026-05-25 | 骨架 + Chat 页面 | ✅ 完成 |
| [Plan 2: 工作台+编排](superpowers/plans/2026-05-31-plan-02-local-workbench-and-orchestration.md) | 2026-05-31 | 本地工作台 + 多 Agent 编排 | 🚧 Phase 2a 完成 |
| [Plan 3: hermes-web-ui 对齐](superpowers/plans/2026-06-01-plan-03-hermes-web-ui-parity.md) | 2026-06-01 | 渠道配置、群聊、终端 | 🚧 Phase 3a 完成 |
| [Plan 4: 竞争功能追赶](superpowers/plans/2026-06-01-plan-04-competitive-features.md) | 2026-06-01 | 上下文压缩、群聊、Kanban | 🚧 Phase 4a 完成 |

## 根目录

| 文件 | 内容 |
|------|------|
| [README.md](../README.md) | 项目主文档（英文） |
| [README.zh-CN.md](../README.zh-CN.md) | 项目主文档（中文） |
| [CHANGELOG.md](../CHANGELOG.md) | 版本变更日志 |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | 贡献指南 |
| [SECURITY.md](../SECURITY.md) | 安全策略 |
| [SUPPORT.md](../SUPPORT.md) | 支持指南 |
| [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) | 行为准则 |

---

## 当前状态 (2026-06-02)

### 已实现

- ✅ 10 个页面 (Dashboard/Chat/Sessions/Workspaces/Cron/Memory/Files/Tools/Channels/Settings)
- ✅ 8 平台渠道配置
- ✅ 群聊 (@mention 多 Agent)
- ✅ 上下文自动压缩
- ✅ Monaco Editor + 文件浏览器
- ✅ Docker 沙箱执行
- ✅ 成本智能引擎 + Dashboard 卡片
- ✅ Goal 引擎 + 可视化面板
- ✅ 意图驱动开发
- ✅ Orchestrator V2 (LLM 驱动)
- ✅ 28 项 UX 优化
- ✅ CI/CD + Docker + Gitee 同步
- ✅ Win/Mac/Linux 桌面打包

### 进行中

- 🚧 Orchestrator 引擎 (feat/orchestrator-engine 分支)

### 待做

- ⬜ 团队知识图谱
- ⬜ 场景化终端面板
- ⬜ Kanban 任务板
- ⬜ Goal 模板市场
