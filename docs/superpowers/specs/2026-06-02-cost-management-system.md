# 成本管控系统设计

> 不只是估算，而是对接真实账单、设置预算硬限制、管理配额。
> Panel 独有：多模型面板天然需要跨供应商统一成本管控。

---

## 一、行业现状

| 工具 | 成本显示 | 预算控制 | 供应商对接 | 配额管理 |
|------|:--:|:--:|:--:|:--:|
| **Codex** | ❌ 被 OpenAI 账单隐藏 | ❌ | ❌ (单一供应商) | ❌ |
| **Claude Code** | 🔸 显示估算 | ❌ | ❌ (单一供应商) | ❌ |
| **Cursor** | ❌ | ❌ | ❌ | ❌ |
| **Hermes Panel (当前)** | ✅ Usage Ledger | 🔸 Goal 级预算 | ❌ | ❌ |
| **Hermes Panel (目标)** | ✅ | ✅ | ✅ | ✅ |

**Panel 的天然优势**：已经支持多模型（OpenAI/Anthropic/DeepSeek），有完整的 Usage Ledger，有 Dashboard。只需要接入各供应商的账单 API。

---

## 二、三层成本管控模型

```
Layer 1: 供应商层 (Provider-Level)
  ├── 对接 OpenAI Billing API (实际账单)
  ├── 对接 Anthropic Billing API (实际账单)
  ├── 对接 DeepSeek Billing API (实际账单)
  └── 自定义 Budget Plan（如 OpenAI $50/月限额）

Layer 2: 项目层 (Project/Workspace-Level)
  ├── 每个 Workspace 设置月度预算
  ├── 角色级配额（架构师最多 $10/月、后端最多 $30/月）
  └── 跨供应商统一汇总

Layer 3: 任务层 (Task/Goal-Level)
  ├── Goal 创建时设置预算上限
  ├── 执行中实时消耗追踪
  └── 预算耗尽 → 软停止或降级
```

---

## 三、核心功能

### 3.1 供应商余额对接

```typescript
interface ProviderBilling {
  provider: 'openai' | 'anthropic' | 'deepseek';
  // 从供应商 API 拉取的实时数据
  currentUsage: number;        // 当前计费周期已用金额
  hardLimit: number;           // 硬限制（如 OpenAI $50/月）
  softLimit: number;           // 软限制（达到后警告）
  billingCycleStart: string;   // 计费周期起始日
  billingCycleEnd: string;     // 计费周期结束日
  // 从 API Key 推断的配额信息
  rateLimitRPM: number;        // 每分钟请求限制
  rateLimitTPM: number;        // 每分钟 Token 限制
  // Panel 设置的覆盖
  panelBudget?: number;        // Panel 层级的额外预算限制
  panelAlertThreshold?: number; // 警告阈值 (80%)
  status: 'ok' | 'warning' | 'exceeded' | 'unknown';
}
```

### 3.2 项目预算

```typescript
interface WorkspaceBudget {
  workspaceId: string;
  monthlyBudget: number;       // 月度总预算
  // 角色配额
  roleQuotas: Record<string, {
    maxMonthlyCost: number;
    maxPerRequestCost: number;
    allowedModels: string[];   // 限制角色可用模型
  }>;
  // 当前状态
  currentUsage: number;
  projectedUsage: number;      // 按当前速率预测
  remainingDays: number;
  dailyBudget: number;         // 建议日均花费
  // 降级策略
  exceedStrategy: 'warn' | 'downgrade' | 'block';
  downgradeTarget?: string;    // 超预算时切换到哪个便宜模型
}
```

### 3.3 预算告警

```
告警级别:
  🟢 正常 (< 60%): 无告警
  🟡 注意 (60-80%): Dashboard 黄色提示
  🟠 警告 (80-95%): 推送通知 + 建议降级
  🔴 严重 (95-100%): 强制切换便宜模型 / 暂停执行
  ⛔ 超限 (> 100%): 阻止新 Goal 创建，仅允许查看

通知渠道:
  - Dashboard 卡片实时显示
  - Telegram / Slack / Discord 推送
  - 邮件日报 (每日汇总)
```

### 3.4 成本预测

```typescript
interface CostForecast {
  // 基于历史数据的预测
  predictedMonthlyTotal: number;
  confidence: number;           // 置信度
  // 按模型预测
  byModel: Record<string, {
    current: number;
    predicted: number;
    trend: 'up' | 'stable' | 'down';
  }>;
  // 建议
  switchSuggestions: Array<{
    from: string;
    to: string;
    estimatedSavings: number;
    impactOnQuality: 'low' | 'medium' | 'high';
  }>;
}
```

---

## 四、Dashboard 设计

```
┌─ 💰 成本管控中心 ───────────────────────────────────────────┐
│                                                              │
│  ┌─ 供应商状态 ───────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  OpenAI      ████████████░░░░░░  58% ($29/$50)  🟢    │ │
│  │  Anthropic   ████████████████░░  82% ($164/$200) 🟠    │ │
│  │  DeepSeek    ████░░░░░░░░░░░░░  22% ($4.40/$20)  🟢   │ │
│  │                                                        │ │
│  │  ⚠️ Anthropic 接近月限额，建议切换到 DeepSeek           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ 项目预算 ─────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  dev-squad      ████████░░░░░░  42% ($84/$200) 🟢     │ │
│  │  content-studio ██████████████  72% ($36/$50)  🟡     │ │
│  │  research-lab   ██░░░░░░░░░░░░  12% ($6/$50)   🟢     │ │
│  │                                                        │ │
│  │  💡 本月预计总花费: $126 / $300 预算                    │ │
│  │  💡 按当前速率日花费: $4.20 (剩余 22 天)               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ 省钱建议 ─────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  🔄 Anthropic → DeepSeek: 节省 ~$45/月                 │ │
│  │  🔄 42% 的 Claude Opus 调用可用 Haiku: 节省 ~$12/月    │ │
│  │  📊 本月已通过降级节省: $23.40                          │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 五、API 设计

```typescript
// 获取成本总览
GET /api/cost/overview
Response: {
  providers: ProviderBilling[];
  workspaces: WorkspaceBudget[];
  forecast: CostForecast;
  totalMonthly: number;
  totalUsed: number;
}

// 设置项目预算
PUT /api/cost/workspace/:id/budget
Body: { monthlyBudget: number; roleQuotas: Record<string, RoleQuota> }

// 设置供应商限制
PUT /api/cost/provider/:name/limit
Body: { hardLimit: number; softLimit: number }

// 获取节省建议
GET /api/cost/suggestions
Response: { suggestions: SwitchSuggestion[] }

// 成本日报 (Cron 触发)
POST /api/cost/daily-report
→ 推送到配置的渠道 (Telegram/Slack/Email)

// 对接供应商账单 (手动或定时刷新)
POST /api/cost/sync-providers
→ 从 OpenAI/Anthropic/DeepSeek API 拉取最新账单数据
```

---

## 六、实施计划

| 阶段 | 功能 | 工期 |
|:--:|------|:--:|
| **P0** | Panel 本地预算管控 (Workspace 级 + Goal 级) | 3h |
| **P0** | 成本管控 Dashboard + 告警 | 3h |
| **P1** | 供应商 API 对接 (OpenAI Billing API) | 3h |
| **P1** | 供应商 API 对接 (Anthropic Billing API) | 3h |
| **P2** | 自动降级策略 (超预算自动切换模型) | 2h |
| **P2** | 成本预测 + 日报 | 2h |

---

**END OF DOCUMENT**
