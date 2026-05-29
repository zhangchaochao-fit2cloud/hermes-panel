import { computed, type ComputedRef, type Ref } from 'vue';
import { bffFetch } from '@/api/bff';
import { useSessionStore } from '@/stores/session';
import { useSessionsStore } from '@/stores/sessions';
import { useCronStore, type CronJob } from '@/stores/cron';

/**
 * cron 合并视图（virtual session）。
 *
 * 同一个 cron job 每次执行都生成独立 session（hermes scheduler 强制 id 含
 * 时间戳，没法在上游复用）。为了让用户感觉是一条会话，前端用 sessionId
 * `virtual:cron:<jobId>` 把同 job 的所有 sessions 拼起来呈现。
 *
 * 重要：
 *   - 这是只读视图 — 真正的会话状态在 hermes/sqlite，不能写回
 *   - 标题/副标题用普通会话措辞，不让用户感知是"合并的"
 *   - 多次执行之间插一行 separator 消息标识本次起点
 */
export interface CronAggregateView {
  isVirtual: ComputedRef<boolean>;
  currentJob: ComputedRef<CronJob | null>;
  load: (jobId: string, runSeparator: (n: number, date: string) => string) => Promise<{ runs: number }>;
}

interface SessionDetail {
  id: string;
  title: string;
  model: string;
  messages: Array<{
    id: number;
    role: string;
    content: string;
    reasoning?: string;
    toolName?: string;
    timestamp: number;
    tokenCount?: number;
  }>;
}

export function useCronAggregateView(opts: {
  resumingFlag: Ref<boolean>;
  modelRef: Ref<string>;
}): CronAggregateView {
  const session = useSessionStore();
  const sessionsList = useSessionsStore();
  const cron = useCronStore();

  const isVirtual = computed(() => (session.sessionId ?? '').startsWith('virtual:'));

  const currentJob = computed<CronJob | null>(() => {
    const id = session.sessionId ?? '';
    const m = id.match(/^virtual:cron:(.+)$/);
    if (!m) return null;
    return cron.jobs.find(j => j.id === m[1]) ?? null;
  });

  async function load(
    jobId: string,
    runSeparator: (n: number, date: string) => string,
  ): Promise<{ runs: number }> {
    opts.resumingFlag.value = true;
    if (cron.jobs.length === 0) void cron.load({ initial: true });
    try {
      const all = sessionsList.items
        .filter(s => s.source === 'cron' && s.id.startsWith(`cron_${jobId}_`))
        .sort((a, b) => a.updatedAt - b.updatedAt);
      if (all.length === 0) return { runs: 0 };
      session.reset();
      session.sessionId = `virtual:cron:${jobId}`;
      for (let i = 0; i < all.length; i++) {
        const s = all[i];
        const sep = session.startAssistantMessage();
        sep.content = runSeparator(i + 1, new Date(s.updatedAt).toLocaleString());
        sep.completed = true;
        sep.createdAt = s.updatedAt;
        try {
          const detail = await bffFetch<SessionDetail>(`/api/sessions/${s.id}`);
          if (i === 0 && detail.model) opts.modelRef.value = detail.model;
          for (const m of detail.messages) {
            if (m.role === 'user') {
              const um = session.appendUserMessage(m.content);
              um.createdAt = m.timestamp;
            } else if (m.role === 'assistant') {
              const am = session.startAssistantMessage();
              am.content = m.content;
              am.reasoning = m.reasoning ?? undefined;
              am.completed = true;
              am.createdAt = m.timestamp;
            }
          }
        } catch (err) {
          const am = session.startAssistantMessage();
          am.content = `（${(err as Error).message}）`;
          am.completed = true;
        }
      }
      return { runs: all.length };
    } finally {
      opts.resumingFlag.value = false;
    }
  }

  return { isVirtual, currentJob, load };
}
