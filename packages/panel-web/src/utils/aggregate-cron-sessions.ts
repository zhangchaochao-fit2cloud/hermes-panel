import type { SessionSummary } from '@hermes-panel/shared';

/**
 * cron 维度聚合 — 把同 cron job (id 前缀 cron_<jobid>_<ts>) 的多条 session
 * 合成 1 条虚拟 SessionSummary，title 用 cron job 名（来自外部传入的 jobNameById
 * 映射），id 形如 `cron-job:<jobid>` 让 UI 点击时跳合并视图 (/chat?cron=<jobid>)。
 *
 * 非 cron source 原样返回。
 *
 * 与 ChatSessionsDrawer.cronJobBuckets 的设计意图一致 — sessions 视图、最近会话
 * 视图都用这个函数让 cron 显示为"任务"而不是"每次执行"。
 */
const CRON_ID_RE = /^cron_([a-f0-9]+)_/i;

export interface CronJobNames {
  /** 由调用方提供的 jobid → name 映射；缺失时用 latest session 的 title */
  get(jobId: string): string | undefined;
}

export function aggregateCronSessions(
  items: readonly SessionSummary[],
  jobNames?: CronJobNames,
): SessionSummary[] {
  const cronBuckets = new Map<string, SessionSummary[]>();
  const passthrough: SessionSummary[] = [];

  for (const s of items) {
    if (s.source !== 'cron') {
      passthrough.push(s);
      continue;
    }
    const m = s.id.match(CRON_ID_RE);
    if (!m) {
      passthrough.push(s);
      continue;
    }
    const list = cronBuckets.get(m[1]) ?? [];
    list.push(s);
    cronBuckets.set(m[1], list);
  }

  const cronRows: SessionSummary[] = [];
  for (const [jobId, list] of cronBuckets) {
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    const latest = list[0];
    const totalTokens = list.reduce((sum, s) => sum + (s.tokenTotal ?? 0), 0);
    const totalMessages = list.reduce((sum, s) => sum + (s.messageCount ?? 0), 0);
    cronRows.push({
      id: `cron-job:${jobId}`,
      title: jobNames?.get(jobId) || latest.title || jobId,
      model: latest.model,
      source: 'cron',
      messageCount: totalMessages,
      tokenTotal: totalTokens,
      createdAt: list[list.length - 1].createdAt,
      updatedAt: latest.updatedAt,
    });
  }

  return [...passthrough, ...cronRows].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 测试用：判断一个 session id 是否是聚合行 */
export function isAggregatedCronRow(id: string): boolean {
  return id.startsWith('cron-job:');
}

/** 从聚合 id 解析出 jobid */
export function extractCronJobId(id: string): string | null {
  if (!id.startsWith('cron-job:')) return null;
  return id.slice('cron-job:'.length);
}
