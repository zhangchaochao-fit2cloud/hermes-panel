import { ref, type Ref } from 'vue';
import { bffFetch } from '@/api/bff';

/**
 * 会话固定 / 置顶 — pinned session id 集合存 localStorage。
 *
 * 简单选型：用 Array<string> 而非 Set 序列化，pinned 顺序 = 用户固定的先后顺序
 * （新固定的排前面，让用户感觉"最近 pin 的优先"）。最多 50 条，避免膨胀。
 */
const STORAGE_KEY = 'panel.pinned.sessions';
const MAX_PINNED = 50;

interface PinnedSessionsResponse {
  ids: string[];
}

let syncStarted = false;
let syncTimer: ReturnType<typeof window.setTimeout> | undefined;

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(x => typeof x === 'string').slice(0, MAX_PINNED) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_PINNED)));
  } catch { /* quota */ }
}

function normalize(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_PINNED) break;
  }
  return out;
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

// 单例 ref，让所有组件共享同一个状态（不靠 Pinia 因为太轻）
const pinned: Ref<string[]> = ref(read());

async function pullRemotePinned(): Promise<void> {
  try {
    const remote = await bffFetch<PinnedSessionsResponse>('/api/preferences/pinned-sessions', { silent: true });
    const merged = normalize([...pinned.value, ...remote.ids]);
    if (!sameIds(merged, pinned.value)) {
      pinned.value = merged;
      write(merged);
    }
    if (!sameIds(merged, remote.ids)) {
      await bffFetch<PinnedSessionsResponse>('/api/preferences/pinned-sessions', {
        method: 'PUT',
        body: JSON.stringify({ ids: merged }),
        silent: true,
      });
    }
  } catch {
    // BFF may be offline in packaged/dev edge cases; localStorage remains the responsive source.
  }
}

function pushRemotePinned(ids: string[]): void {
  if (syncTimer !== undefined) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    void bffFetch<PinnedSessionsResponse>('/api/preferences/pinned-sessions', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
      silent: true,
    }).catch(() => {
      // Keep local pins even when the BFF is temporarily unavailable.
    });
  }, 150);
}

function startSync(): void {
  if (syncStarted) return;
  syncStarted = true;
  void pullRemotePinned();
}

export function usePinnedSessions(): {
  pinned: Ref<string[]>;
  isPinned: (id: string) => boolean;
  pin: (id: string) => void;
  unpin: (id: string) => void;
  toggle: (id: string) => void;
} {
  startSync();

  function isPinned(id: string): boolean {
    return pinned.value.includes(id);
  }
  function pin(id: string): void {
    if (pinned.value.includes(id)) return;
    pinned.value = [id, ...pinned.value].slice(0, MAX_PINNED);
    write(pinned.value);
    pushRemotePinned(pinned.value);
  }
  function unpin(id: string): void {
    pinned.value = pinned.value.filter(x => x !== id);
    write(pinned.value);
    pushRemotePinned(pinned.value);
  }
  function toggle(id: string): void {
    if (isPinned(id)) unpin(id);
    else pin(id);
  }
  return { pinned, isPinned, pin, unpin, toggle };
}
