# BFF 架构方案分析：Node.js vs Rust vs 混合

> 背景：Windows 桌面版依赖系统安装 Node.js，导致"node not found"问题。
> 目标：找到体积、维护成本、长期演化的最优解。

---

## 一、现实：当前代码规模

```
BFF 模块总数: 65
├── 路由 (routes/): 30 个文件
│   核心: system, token, auth, sessions, hermes-proxy, stats, usage, cost
│   功能: channels, chat-rooms, goals, sandbox, files, memory, tools, mcp
│   运维: doctor, logs, backup, webhook, draft, secrets, notifications, cron, gateway
│   配置: capabilities, providers, preferences, plugins, workspace-status, profile-cron
│
└── 服务 (services/): 35 个文件
    核心: sqlite-reader, hermes-cli, hermes-home, secure-store, panel-db
    功能: orchestrator, goal-engine, context-compressor, intent-driven, cost-manager
    集成: hermes-providers, hermes-gateway, hermes-mcp, hermes-memory, hermes-plugins
```

---

## 二、方案对比

### 方案 A：打包 node.exe（当前方向）

```
Desktop: Tauri (5MB) + node.exe (30MB) + BFF JS (3MB) = 38MB
npm:     不变，用户自带 Node.js

实现:
  1. 下载 win-x64 node.exe → resources/nodejs/node.exe
  2. bff.rs 优先用 bundled node.exe
  3. tauri.conf.json resources 添加 nodejs/
```

| 维度 | 评估 |
|------|------|
| **实现时间** | 2 小时 |
| **维护成本** | 零（一套代码） |
| **Windows 体积** | 38MB |
| **macOS 体积** | 8MB（系统自带或用户已有 Node） |
| **长期风险** | Node.js 版本更新需手动更新 node.exe |
| **npm 版本** | 不受影响 |

### 方案 B：Rust 重写全部 BFF

```
Desktop: Tauri (5MB) + Rust BFF (内嵌) = 8MB
npm:     不变，Node BFF

实现:
  重写 65 个模块从 TypeScript → Rust
```

| 维度 | 评估 |
|------|------|
| **实现时间** | 2-3 周 |
| **维护成本** | **永久双代码维护（核心风险）** |
| **体积** | 8MB |
| **启动速度** | 0.3s（vs Node 1.5s） |
| **长期风险** | 功能分化、行为不一致、新人需要懂两套代码 |

### 方案 C：混合（核心 Rust + 完整 Node 兜底）

```
Desktop: Tauri (5MB) + Rust Core (3MB) + node.exe (30MB, 仅兜底) = 38MB
         90% 的请求走 Rust（快），复杂请求 fallback 到 Node

实现:
  1. Rust 实现 core 路由: system, auth, hermes-proxy, stats, sessions
  2. 其他路由 fallback 到 Node BFF
  3. 渐进式迁移，按使用频率决定优先级
```

| 维度 | 评估 |
|------|------|
| **实现时间** | 3 天（核心路由） + 渐进式 |
| **维护成本** | 中（两套代码，但 Rust 只覆盖核心路径） |
| **体积** | 38MB（node.exe 仍在） |
| **长期风险** | 中（双代码但核心路径稳定，变更少） |

### 方案 D：OpenAPI 驱动（最优长期方案）

```
Desktop: Tauri (5MB) + Rust BFF（OpenAPI 生成） = 8MB

实现:
  1. 从 Node BFF 提取 OpenAPI 3.0 规范（单文件）
  2. 用 openapi-generator 生成 Rust server stub
  3. 只实现核心 handler 逻辑
  4. Node BFF 作为 reference implementation
```

| 维度 | 评估 |
|------|------|
| **实现时间** | 5 天（写 OpenAPI spec + 实现 handler） |
| **维护成本** | 低（OpenAPI 是单一事实来源，改 spec → 两边同步） |
| **体积** | 8MB |
| **长期风险** | 低（OpenAPI 规范驱动，不易分化） |

---

## 三、长远视角

### 3.1 三年后会怎样？

```
2026: Panel v0.1
  - BFF 功能快速增长（每月新增 3-5 个路由）
  - 方案 A 最合适：改动成本为零，快速迭代

2026-2027: Panel v1.0
  - 功能趋于稳定，路由增长放缓
  - 方案 D 启动：提取 OpenAPI spec → 自动生成 Rust BFF
  - 桌面版体积从 38MB → 8MB

2027-2028: Panel v2.0
  - Rust BFF 完全替代 Node BFF（桌面版）
  - npm 版本继续用 Node BFF（兼容性）
  - OpenAPI spec 维护两套实现同步
```

### 3.2 成本曲线

```
维护成本
  ▲
  │                 方案 B (全 Rust)
  │               ／
  │            ／  方案 C (混合)
  │         ／
  │      ／       方案 D (OpenAPI)
  │   ／
  │ ／──── 方案 A (node.exe)
  └──────────────────────────▶ 时间

方案 A: 今天最低，三年后也是最低
方案 B: 今天最高，永久高
方案 D: 今天中等，一年后降到和 A 接近
```

---

## 四、推荐决策

### 短期（今天）：方案 A

**理由**：
- 2 小时解决 "node not found"
- 零维护成本
- npm 版不受影响
- 38MB vs 150MB（hermes-web-ui）已经很优秀

### 中期（v1.0 发布前）：方案 D

**触发条件**：BFF 路由数 > 50 且增速放缓时启动

**理由**：
- OpenAPI spec 是长期资产（文档 + 代码生成 + 类型安全）
- 自动生成 Rust stub，手写 handler 逻辑
- 桌面版从 38MB 降到 8MB
- 维护成本可控

### 不做：方案 B

**理由**：永久双代码维护，投入产出比不合理

---

## 五、总结

**现在应该做的**：方案 A（打包 node.exe），2 小时解决 Windows 问题。

**v1.0 前应该做的**：方案 D（OpenAPI + Rust），把 30MB 省掉，获得 8MB 安装包。

**永远不做的**：方案 B（全 Rust 重写），维护两套完整代码是技术债务黑洞。

---

**END OF DOCUMENT**
