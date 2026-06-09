import { useRouter, type RouteLocationRaw } from 'vue-router';

export const CHAT_DRAFT_KEY = 'panel.chat.draft.new';
export const GOAL_OBJECTIVE_KEY = 'panel.pendingGoalObjective';
export const CRON_PROMPT_KEY = 'panel.pendingCronPrompt';
export const ROOM_PROMPT_KEY = 'panel.pendingRoomPrompt';

export type PendingTaskTarget = 'goal' | 'cron' | 'room';

const pendingTaskKeys: Record<PendingTaskTarget, string> = {
  goal: GOAL_OBJECTIVE_KEY,
  cron: CRON_PROMPT_KEY,
  room: ROOM_PROMPT_KEY,
};

const pendingTaskRoutes: Record<PendingTaskTarget, string> = {
  goal: '/goals',
  cron: '/cron',
  room: '/chat-room',
};

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    /* navigation still works when storage is unavailable */
  }
}

export function storeChatDraft(prompt: string): void {
  safeSet(localStorage, CHAT_DRAFT_KEY, prompt);
}

export function storePendingTask(target: PendingTaskTarget, prompt: string): void {
  safeSet(sessionStorage, pendingTaskKeys[target], prompt);
}

export function routeForPendingTask(target: PendingTaskTarget): string {
  return pendingTaskRoutes[target];
}

export function useTaskDraft() {
  const router = useRouter();

  function openChatDraft(prompt: string): Promise<unknown> {
    storeChatDraft(prompt);
    return router.push({ path: '/chat', query: { new: String(Date.now()) } });
  }

  function openPendingTask(target: PendingTaskTarget, prompt: string): Promise<unknown> {
    storePendingTask(target, prompt);
    return router.push(pendingTaskRoutes[target]);
  }

  function openRoute(route: RouteLocationRaw): Promise<unknown> {
    return router.push(route);
  }

  return {
    openChatDraft,
    openPendingTask,
    openRoute,
    storeChatDraft,
    storePendingTask,
  };
}
