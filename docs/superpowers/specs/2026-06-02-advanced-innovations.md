# Hermes Panel 进阶创新方案

> 不再拷贝 Codex/Claude，而是做他们没有的。
> 核心理念：从"反应式 AI 工具"升级为"主动式 AI 工作伴侣"。

---

## 一、成本智能引擎

### 为什么别人做不了

- Codex：模型锁定 GPT，不存在"选择哪个模型更便宜"的问题
- Claude Code：仅有基础成本显示，无历史分析
- Panel 优势：**Dashboard 已有完整 Usage Ledger + 多模型 Provider 支持**

### 功能设计

```
┌─ 💰 成本智能 ──────────────────────────────────────────────────┐
│                                                                │
│  本月花费: $38.21              日均: $1.27                      │
│  预测月末: $51.14              预算剩余: $18.79                  │
│                                                                 │
│  ┌─ 模型分布 ────────────────────────────────────────────────┐ │
│  │ Claude Opus    58% ($22.40)  ████████████████████████████ │ │
│  │ Claude Sonnet  22% ($8.50)   ███████████                  │ │
│  │ DeepSeek       12% ($4.65)   ██████                       │ │
│  │ Haiku           8% ($3.10)   ████                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  💡 智能建议:                                                  │
│  • 本周 43% 的任务复杂度评估为 "简单"，可用 Haiku 替代 Opus    │
│  • 切换后预计节省: $15.80/月 (↓ 42%)                          │
│  • 已设置自动降级: 简单任务 → Haiku, 中等 → Sonnet            │
│                                                                 │
│  [一键切换低成本策略]  [查看详情]  [导出月报]                   │
└────────────────────────────────────────────────────────────────┘
```

### 实现要点

```typescript
interface CostIntelligence {
  // 自动分析历史数据
  analyzeUsage(days: number): CostSuggestion[];
  // 按任务类型统计成本
  costByCategory(): Record<string, number>;
  // 推荐降级策略
  suggestDowngrades(): ModelSwitchSuggestion[];
  // 预测月度花费
  predictMonthlyCost(): number;
  // 设置自动降级规则
  setAutoDowngrade(rules: DowngradeRule[]): void;
}
```

---

## 二、意图驱动开发

### 为什么别人做不了

- Codex：无 Webhook 集成，无多渠道通知
- Claude Code：纯终端，无外部事件触发
- Panel 优势：**Webhook + Channel 集成 + Goal Engine**

### 工作流程

```
外部事件触发
  │
  ├── GitHub Issue 创建 → Webhook → Panel
  ├── Slack 消息 @ 机器人 → Channel 接收 → Panel
  ├── 监控告警 → Webhook → Panel
  └── 定时任务 → Cron → Panel
  │
  ▼
Panel 接收 → Goal Engine 分析
  │
  ├── 分类: bug / feature / refactor / security
  ├── 评估复杂度: simple / medium / complex
  ├── 估算 Token 成本
  ├── 匹配最佳 Workspace 角色
  └── 生成执行计划
  │
  ▼
自动创建 Goal → 多 Agent 执行
  │
  ├── ✅ 成功 → 自动提 PR / 回复 Issue / 通知渠道
  ├── ⚠️ 部分成功 → 创建子 Goal 修复剩余问题
  └── ❌ 失败 → 人工介入 + 记录失败原因
  │
  ▼
通知渠道 (Telegram / Slack / Discord / 微信 / 飞书)
  "✅ Issue #42 已自动修复"
  "🔍 正在审查 #128"
  "⚠️ Task #56 需要人工介入"
```

### API 设计

```typescript
// 创建意图驱动 Goal
POST /api/goals/from-issue
{
  "source": "github",
  "issue": {
    "title": "Fix login redirect after token expiry",
    "body": "...",
    "labels": ["bug", "high-priority"],
    "repo": "hermes-panel"
  }
}

// 自动分析 → 返回预估
Response:
{
  "classification": "bug",
  "complexity": "medium",
  "estimatedTokens": 85_000,
  "estimatedCost": "$0.34",
  "suggestedRoles": ["backend", "qa"],
  "plan": { ... }
}
```

---

## 三、团队知识图谱

### 为什么别人做不了

- Codex/Claude：**单人工具**，无团队视角
- Panel 优势：**Workspace + Memory + Chat 三重数据源**

### 功能设计

```
用户提问
  │
  ▼
语义搜索历史对话
  ├── 找到相似问题 3 个
  ├── 提取解决方案要点
  └── 标注"已解决" / "部分解决"
  │
  ▼
生成回答 + 引用来源
  "类似问题之前讨论过 (2026-05-15, 用户 B):
   方案 A: 使用 middleware 缓存 token...
   方案 B: 缩短 token 过期时间...
   推荐方案 A，因为..."
  │
  ▼
自动维护知识库
  ├── 识别热点话题 → 建议创建 Memory 文档
  ├── 检测过时信息 → 标记需要更新
  └── 跨 Workspace 知识迁移
```

### Memory 页升级

```
┌─ 📚 团队知识 ─────────────────────────────────────────────────┐
│                                                                │
│  🔥 热点话题 (本周)                                            │
│  ├─ "认证流程" (提问 12 次，3 种方案)                          │
│  ├─ "数据库迁移" (提问 8 次，已沉淀文档)                      │
│  └─ "部署流程" (提问 5 次，待整理)                            │
│                                                                │
│  📖 知识图谱                                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │    [认证] ─── [OAuth] ─── [JWT] ─── [Session]            │ │
│  │      │           │          │          │                  │ │
│  │      ├── [登录页] │          ├── [刷新Token]              │ │
│  │      └── [注册页] └── [权限控制] └── [过期处理]            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  💡 建议                                                       │
│  • "Auth 模块" 已有 3 个重复回答，建议创建统一文档            │
│  • "部署流程" 的信息可能是过时的 (最后更新 2 周前)            │
└────────────────────────────────────────────────────────────────┘
```

---

## 四、预见性 Agent

### 为什么别人做不了

- Codex/Claude：**被动触发**，不会主动做事
- Panel 优势：**Cron 定时 + Dashboard 监控 + Channel 通知**

### 工作场景

```
┌─ 每日检查 (Cron: 0 9 * * *) ──────────────────────────────────┐
│                                                                 │
│  1. 扫描昨天的 git log                                          │
│     → 发现 3 个 commit 没有对应的测试                           │
│     → ⚠️ 自动推送: "昨天的变更缺少测试，要创建测试 Goal 吗？" │
│                                                                 │
│  2. 检查未关闭的 Issue                                         │
│     → 2 个 PR 超过 3 天未 review                               │
│     → 📋 推送: "还有 2 个 PR 待 Review"                       │
│                                                                 │
│  3. 检查依赖更新                                               │
│     → 3 个依赖有安全更新                                       │
│     → 🔒 自动创建安全更新 Goal                                 │
│                                                                 │
│  4. 成本预警                                                   │
│     → 本月已用 78% 预算，按当前节奏将超预算                    │
│     → 💰 推送: "建议限制 Opus 使用，切换频繁任务到 Sonnet"    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─ 部署前检查 (手动触发或 CI 集成) ─────────────────────────────┐
│                                                                 │
│  1. package.json 变更但 pnpm-lock.yaml 未更新 → ⚠️ 告警      │
│  2. 新增依赖有已知漏洞 → 🔒 阻止部署                           │
│  3. API 签名变更但文档未更新 → 📝 提醒                         │
│  4. 测试覆盖率下降 > 5% → 🧪 创建补充测试 Goal                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 五、自适应工作流

### 为什么别人做不了

- Codex/Claude：无历史数据积累
- Panel 优势：**panel.db 持久化所有 Goal 执行记录**

### 学习机制

```typescript
interface WorkflowLearning {
  // 从历史 Goal 学习最优执行模式
  learnOptimalPattern(workspaceId: string): LearnedPattern;

  // 预测新 Goal 的 token 消耗
  predictCost(objective: string, workspaceId: string): CostEstimate;

  // 推荐执行顺序
  suggestExecutionOrder(subtasks: SubTask[]): SubTask[];

  // 识别高风险任务
  identifyRisks(objective: string): Risk[];
}

// 学习结果示例
const pattern: LearnedPattern = {
  workspace: 'dev-squad',
  avgSubtasks: 5.3,
  avgTokens: 120_000,
  avgSuccessRate: 0.88,
  bestOrder: ['security', 'architect', 'backend', 'frontend', 'qa', 'reviewer'], // 安全放第一位
  parallelizableSets: [['backend', 'frontend']],
  riskFactors: [
    { condition: '无安全审查', failureRate: 0.45 },
    { condition: '跳过测试', failureRate: 0.62 },
  ],
};
```

---

## 六、Goal 模板市场

### 预置模板

```json
[
  {
    "id": "template-code-review",
    "name": "代码审查",
    "description": "按 Google Code Review 标准审查代码",
    "objective": "审查指定 PR 或代码模块",
    "scopeBoundary": "不修改代码，仅审查",
    "doneWhen": ["标注所有问题", "给出改进建议", "输出审查报告"],
    "tokenBudgetK": 80,
    "roles": ["reviewer", "security"],
    "tags": ["code", "quality"],
    "installs": 1234
  },
  {
    "id": "template-new-feature",
    "name": "新功能开发",
    "description": "从需求到上线的完整开发流程",
    "objective": "实现新功能",
    "scopeBoundary": "不破坏现有功能",
    "doneWhen": ["测试全部通过", "文档更新", "PR 已提交"],
    "tokenBudgetK": 200,
    "roles": ["architect", "backend", "frontend", "qa", "reviewer"],
    "tags": ["development", "feature"],
    "installs": 856
  },
  {
    "id": "template-bug-fix",
    "name": "Bug 修复",
    "description": "定位并修复 Bug，确保不引入新问题",
    "objective": "修复指定 Bug",
    "scopeBoundary": "只修改相关模块",
    "doneWhen": ["Bug 复现步骤不再触发", "回归测试通过", "更新 changelog"],
    "tokenBudgetK": 60,
    "roles": ["backend", "qa"],
    "tags": ["bug", "fix"],
    "installs": 2103
  }
]
```

---

## 七、多 Agent 并行 Goal

### 架构

```
用户输入 Goal
  │
  ▼
Orchestrator 分解
  │
  ├─ 构建 DAG (依赖图)
  ├─ 识别并行组
  └─ 分配预算 (总预算按子任务数分摊)
  │
  ▼
执行引擎
  │
  ├─ 并行组 1: [安全审查] + [前端 UI]
  │     ├─ @security → Claude Opus (预算 30K)
  │     └─ @frontend → DeepSeek (预算 25K)
  │
  ├─ 并行组 2: [后端 API]
  │     └─ @backend → DeepSeek (预算 35K)
  │           (等待 安全审查 完成)
  │
  └─ 汇总: [测试] + [审查]
        └─ @qa + @reviewer (预算 40K)
  │
  ▼
✅ / ⚠️ / ❌ → 通知渠道
```

### 预算分配策略

```typescript
function allocateBudget(goal: Goal, tasks: SubTask[]): Map<string, number> {
  const total = goal.tokenBudgetK * 1000;
  const weights = new Map<string, number>();

  // 策略: 按任务复杂度加权
  for (const task of tasks) {
    const weight = task.role === 'architect' ? 1.5 :
                   task.role === 'security' ? 1.3 :
                   task.role === 'qa' ? 1.2 : 1.0;
    weights.set(task.id, weight);
  }

  const totalWeight = [...weights.values()].reduce((a, b) => a + b, 0);
  return new Map([...weights.entries()].map(([id, w]) =>
    [id, Math.round(total * (w / totalWeight))]
  ));
}
```

---

## 八、实施路线图

| 阶段 | 功能 | 工期 | 差异化程度 |
|:--:|------|:--:|:--:|
| **P0 (本周)** | 成本智能引擎 | 3h | ⭐⭐⭐⭐ |
| **P0 (本周)** | Goal 可视化面板 | 4h | ⭐⭐⭐⭐⭐ |
| **P0 (本周)** | 真实 Token 追踪 | 2h | ⭐⭐⭐ |
| **P1 (下周)** | 意图驱动开发 (Webhook → Goal) | 4h | ⭐⭐⭐⭐⭐ |
| **P1 (下周)** | 团队知识图谱 | 4h | ⭐⭐⭐⭐⭐ |
| **P1 (下周)** | 多 Agent 并行 Goal | 4h | ⭐⭐⭐⭐⭐ |
| **P2 (本月)** | 预见性 Agent (Cron 定时检查) | 3h | ⭐⭐⭐⭐ |
| **P2 (本月)** | 自适应工作流 (历史学习) | 3h | ⭐⭐⭐⭐ |
| **P2 (本月)** | Goal 模板市场 | 2h | ⭐⭐⭐ |

---

**END OF DOCUMENT**
