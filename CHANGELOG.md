# Changelog

All notable changes to Hermes Panel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/zh-CN/).

---

## [Unreleased]

### Added
- 平台渠道配置页面 (`/channels`)：Telegram / Discord / Slack / WhatsApp / Matrix / 飞书 / 微信 / 企业微信 8 个渠道统一管理
- Docker 沙箱执行环境：隔离容器运行 Agent 代码，内存/CPU/网络限制
- Monaco Editor + 文件浏览器 (`/files` 路由)：三栏布局，懒加载 Monaco
- 自建 panel.db 数据库扩展：tasks / workflows / workflow_runs / review_items / agent_states / agent_evaluations 6 张新表
- 渠道配置 BFF 服务：读写 Hermes config.yaml，含 .bak 备份

### Changed
- panel.db 服务重构：支持 `runMigrations()` 增量列添加
- README 新增中文版本 (`README.zh-CN.md`)
- 路由侧边栏新增 Channels 入口

---

## [0.1.0-beta.0] — 2026-05-30

### Added
- 项目骨架：pnpm monorepo (panel-web + panel-bff + panel-shared)
- Tauri 2 桌面壳 (panel-desktop)
- npx 运行时 (panel-npm)
- VS Code 扩展 (panel-vscode)
- fake-hermes 测试 Mock
- Chat 页面：SSE 流式聊天、工具调用可视化 (ToolCallCard)、推理过程显示、消息编辑与分叉、选中文字添加到输入框
- Dashboard 页面：StatCard、用量折线图、模型饼图、缓存命中率、月度配速预测、系统健康卡片、最近会话
- Sessions 页面：Table + Grid 双视图、搜索过滤、按来源分组、重命名/删除 (5s 撤销)、导出
- Workspaces 页面：12 个内置 Workspace 模板 + Profile 切换 + 角色定义
- Cron 页面：定时任务卡片 + 状态条 + 创建/暂停/恢复/运行/删除
- Memory 页面：文件树 + 文件编辑 + 信息面板 三栏布局
- Tools 页面：内置工具网格 / MCP 服务器管理 / Skills (已安装+市场) / Plugins 管理
- Developer 页面：API Playground / SSE Inspector / SDK CodeGen / Webhook Tester / 日志查看器 / 系统诊断 (Doctor)
- Settings 页面：系统健康 / 外观 (5 主题 + 11 主色 + 自定义) / Provider 管理 / Hermes 端点 / 语言 / 快捷键 / 高级 / 备份 / 关于
- 通知系统：三层架构 (OS 通知 + 应用内通知中心 + 上下文徽章)
- 实时事件流面板 (EventStreamPanel)
- Control Center (⌘⇧P Spotlight 式命令面板)
- ContextRing (Token 用量环形指示器)
- 思考速度选择器 (fast / extended / auto)
- PWA 支持 (manifest + Service Worker + 离线缓存)
- 简体中文 / 英文 / 繁体中文 / 日语 4 语言 i18n
- BFF Token 认证 (启动时自动生成) + 可选用户名/密码登录 + RBAC (admin/member)
- Hermes API Key 安全存储 (Keytar 系统密钥链 + AES-256-GCM 文件兜底)
- Capability Gates (按 Hermes 版本自动灰化功能入口)
- 配置备份/导出/导入
- GitHub CI: ubuntu/macos/windows × node 20/22 矩阵 typecheck + test + build

[Unreleased]: https://github.com/xxx/hermes-panel/compare/v0.1.0-beta.0...HEAD
[0.1.0-beta.0]: https://github.com/xxx/hermes-panel/releases/tag/v0.1.0-beta.0
