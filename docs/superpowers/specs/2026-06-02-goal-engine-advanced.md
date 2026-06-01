# Goal Engine 进阶设计方案

> 参考 Codex /goal 和 Claude /goal，但基于 Hermes Panel 独有优势进行深度差异化。

---

## 一、当前行业方案的局限

| Codex /goal | Claude /goal | 共同缺陷 |
|------|------|------|
| 纯终端文本交互 | 纯终端文本交互 | **无可视化** |
| 仅 GPT 模型 | 仅 Claude 模型 | **模型绑定** |
| 单 Agent 循环 | 单 Agent 循环 | **无并行** |
| 云端执行 | 本地执行 | 各有优劣 |
| 无定时调度 | 无定时调度 | **无法自动化** |
| 无多平台集成 | 无多平台集成 | **孤岛式执行** |
| 预算手动设置 | 预算手动设置 | **无历史学习** |

---

## 二、Hermes Panel 的独特优势（可叠加到 Goal 引擎）

### 2.1 真实 Token 追踪（对接 Hermes API）

```typescript
// 当前: estimateTokens = Math.ceil(response.length / 3)  ← 不准
// 进阶: 从 Hermes API 的 usage 字段获取精确值

interface GoalExecution {
  // 每次 Hermes API 调用返回真实 usage
  async function executeStep(g: Goal, prompt: string): Promise<void> {
    const result = await callHermesAgent(prompt);
    // result.usage = { input_tokens: 1234, output_tokens: 567 }
    g.tokensUsed += result.usage.total_tokens;
    if (g.tokensUsed >= g.tokenBudgetK * 1000) triggerSoftStop(g);
  }
}
```

### 2.2 多 Agent 并行执行（独有）

```
Codex/Claude:  单一 Agent 循环执行

Panel:         多 Agent DAG 并行
               ┌──────────┐
               │ Orchestrator│ 分解目标
               └─────┬────┘
          ┌──────────┼──────────┐
          ▼          ▼          ▼
      [安全审查]  [前端 UI]  [后端 API]
      (独立并行)   (独立并行)  (依赖安全)
          │          │          │
          └──────────┼──────────┘
                     ▼
               [测试 + 审查]
               (汇总结果)
```

### 2.3 定时目标（Cron + Goal）

```typescript
// 创建定时目标
POST /api/goals/scheduled
{
  "cron": "0 9 * * 1-5",        // 工作日早 9 点
  "goal": {
    "objective": "分析昨天的代码变更，生成日报",
    "tokenBudgetK": 50,
    "doneWhen": ["生成 Markdown 日报", "包含变更文件数量", "包含风险评估"]
  }
}

// Cron 触发 → 自动创建 Goal → 自动执行 → 结果推送到渠道
```

### 2.4 多模型智能路由（独有）

```typescript
// 根据子任务特征自动选择模型
function routeSubtask(subtask: string, budget: number): string {
  if (subtask.includes('安全') || subtask.includes('架构')) return 'claude-opus-4-7';
  if (subtask.includes('审查') || subtask.includes('测试')) return 'claude-sonnet-4-6';
  if (subtask.includes('代码') || subtask.includes('实现')) return 'deepseek-v4'; // 便宜
  return 'hermes-agent'; // 默认
}
```

### 2.5 Goal 可视化面板（CLI 做不到）

```
┌─ Goal 控制台 ──────────────────────────────────────────────────┐
│                                                                  │
│  📋 实现用户登录系统                                             │
│  ████████████░░░░░░░░  58% (3/5 子任务完成 · 轮次 4/8)          │
│  💰 已用 95K / 200K tokens  ⏱ 耗时 4m 32s                       │
│                                                                  │
│  ✅ 架构设计               🏛 architect    15K tokens   2m 10s  │
│  ✅ 安全审查               🔒 security     22K tokens   1m 15s  │
│  ⏳ 后端 API 实现          🛠 backend       38K tokens   执行中  │
│  📋 前端 UI 实现           🎨 frontend      0K          等待中  │
│  📋 测试编写               🧪 QA            0K          等待中  │
│                                                                  │
│  [⏸ 暂停] [▶ 继续] [🔄 调整预算] [📊 审计报告]                 │
└──────────────────────────────────────────────────────────────────┘
```

### 2.6 历史学习——智能预算推荐

```typescript
// 记录历史 Goal 执行数据
interface GoalHistory {
  objective: string;
  workspace: string;
  subtaskCount: number;
  totalTokens: number;
  totalTime: number;
  success: boolean;
}

// 创建新 Goal 时自动推荐预算
function suggestBudget(objective: string, workspace: string): number {
  const similar = history.filter(g => g.workspace === workspace);
  if (similar.length === 0) return 100_000; // 默认 100K
  const avg = similar.reduce((s, g) => s + g.totalTokens, 0) / similar.length;
  return Math.ceil(avg * 1.2); // 建议历史均值 + 20% 缓冲
}
```

### 2.7 目标市场——社区共享模板

```json
// 预置 Goal 模板
[
  {
    "name": "代码重构",
    "objective": "重构指定模块，改善可维护性和性能",
    "scopeBoundary": "保持对外 API 不变",
    "doneWhen": ["所有现有测试通过", "无 lint 错误", "圈复杂度降低 > 20%"],
    "stopIf": ["破坏现有功能", "超过 30 分钟"],
    "tokenBudgetK": 150,
    "roles": ["architect", "backend", "qa", "reviewer"]
  },
  {
    "name": "安全审计",
    "objective": "按 OWASP Top 10 审查代码安全",
    "scopeBoundary": "不修改功能代码，仅标注问题",
    "doneWhen": ["逐项检查 OWASP Top 10", "标注所有 🔴 严重问题", "输出 PDF 审计报告"],
    "stopIf": ["发现 0day 漏洞需立即通知"],
    "tokenBudgetK": 80,
    "roles": ["security"]
  }
]
```

### 2.8 Goal 分叉与实验

```typescript
// 从 Goal 的某个节点分叉，尝试不同方案
POST /api/goals/:id/fork
{
  "atTurn": 3,                            // 在第 3 轮分叉
  "newObjective": "尝试用 Redis 替代数据库缓存方案"
}
// 创建子 Goal，继承父 Goal 的上下文和已完成任务
```

---

## 三、与 Codex/Claude 的功能矩阵

| 能力 | Codex /goal | Claude /goal | Hermes Panel (进阶) |
|------|:--:|:--:|:--:|
| 真实 Token 追踪 | ✅ API 返回 | ✅ API 返回 | ✅ **对接 Hermes usage 字段** |
| 预算软停止 | ✅ | ✅ | ✅ |
| 完成审计 | ✅ 自审计 | ✅ 外部裁判 | ✅ **可配置审计器** |
| **多 Agent 并行** | ❌ | ❌ | ✅ **独有** |
| **可视化面板** | ❌ (CLI) | ❌ (CLI) | ✅ **独有** |
| **定时目标** | ❌ | ❌ | ✅ **独有 (Cron+Goal)** |
| **多模型路由** | ❌ (GPT only) | ❌ (Claude only) | ✅ **独有** |
| **智能预算推荐** | ❌ | ❌ | ✅ **独有 (历史学习)** |
| **Goal 模板市场** | ❌ | 🔸 社区分享 | ✅ **预置 + 社区** |
| **Goal 分叉** | ❌ | ❌ | ✅ **独有** |
| **渠道通知** | ❌ | ❌ | ✅ **独有 (Telegram/Slack/微信)** |
| **成本追踪** | 🔸 仅显示 | 🔸 仅显示 | ✅ **Dashboard + 同比 + 预测** |
| **开源** | ✅ Apache 2.0 | ❌ Proprietary | ✅ **MIT** |

---

## 四、实施优先级

| 阶段 | 功能 | 工期 | 差异化程度 |
|:--:|------|:--:|:--:|
| **P0** | 真实 Token 追踪 (对接 Hermes API usage 字段) | 2h | ⭐⭐⭐ |
| **P0** | Goal 可视化面板 (前端路由 + 组件) | 4h | ⭐⭐⭐⭐⭐ |
| **P1** | 多 Agent 并行执行 (DAG 调度) | 4h | ⭐⭐⭐⭐⭐ |
| **P1** | 定时目标 (Cron + Goal 联动) | 2h | ⭐⭐⭐⭐ |
| **P1** | 多模型智能路由 | 1h | ⭐⭐⭐⭐ |
| **P2** | 智能预算推荐 (历史学习) | 3h | ⭐⭐⭐ |
| **P2** | Goal 模板市场 | 3h | ⭐⭐⭐ |
| **P2** | Goal 分叉 | 2h | ⭐⭐ |

---

**END OF DOCUMENT**
