<script setup lang="ts">
/**
 * 会话 hover 浮层 — 鼠标停在会话行 / 卡片上 ≥ 500ms 后，右侧浮层显示该会话的
 * 最后 3 条消息预览。点行打开是显式动作，这个浮层是"快速窥探"。
 *
 * 使用：父组件传 sessionId（或 null = 关闭）+ anchor 元素 boundingRect，浮层
 * 自己负责 fetch + 渲染 + 定位。fetch 结果 LRU 缓存 20 条避免反复请求。
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { bffFetch } from '@/api/bff';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';
import { extractMarkdownImages, stripMarkdownImages, type MarkdownImagePreview } from '@/utils/markdown-images';

const props = defineProps<{
  /** 当前 hover 的 session id，null 表示不显示 */
  sessionId: string | null;
  /** 锚点 DOM rect，浮层会贴它的右上方 */
  anchorRect: DOMRect | null;
}>();

const { t } = useI18n();

interface PreviewMessage {
  role: string;
  content: string;
  timestamp: number;
}
interface SessionDetail {
  id: string;
  title: string;
  model: string;
  messages: PreviewMessage[];
}
interface PreviewMessageView extends PreviewMessage {
  images: MarkdownImagePreview[];
  text: string;
}

const cache = new Map<string, SessionDetail>();
const CACHE_CAP = 20;

const loading = ref(false);
const detail = ref<SessionDetail | null>(null);

let abortCtrl: AbortController | null = null;

watch(() => props.sessionId, async (id) => {
  if (!id) {
    detail.value = null;
    loading.value = false;
    abortCtrl?.abort();
    return;
  }
  // 聚合行不预览（id 形如 cron-job:xxx 后端不认）
  if (id.startsWith('cron-job:')) {
    detail.value = null;
    return;
  }
  const cached = cache.get(id);
  if (cached) {
    detail.value = cached;
    loading.value = false;
    return;
  }
  loading.value = true;
  detail.value = null;
  abortCtrl?.abort();
  abortCtrl = new AbortController();
  try {
    const r = await bffFetch<SessionDetail>(`/api/sessions/${encodeURIComponent(id)}`, {
      silent: true,
      signal: abortCtrl.signal,
    });
    if (props.sessionId !== id) return; // 期间 hover 已切换
    detail.value = r;
    cache.set(id, r);
    if (cache.size > CACHE_CAP) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
  } catch {
    detail.value = null;
  } finally {
    if (props.sessionId === id) loading.value = false;
  }
});

const lastMessages = computed<PreviewMessageView[]>(() => {
  if (!detail.value) return [];
  return detail.value.messages.slice(-3).map(message => ({
    ...message,
    images: extractMarkdownImages(message.content, 3),
    text: stripMarkdownImages(message.content) || message.content,
  }));
});

// 定位：浮层贴 anchor 右侧；右边空间不够时翻到左侧。
const popoverStyle = computed(() => {
  const rect = props.anchorRect;
  if (!rect) return { display: 'none' as const };
  const PAD = 8;
  const WIDTH = 360;
  const HEIGHT_MAX = 320;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // 默认右侧
  let left = rect.right + PAD;
  if (left + WIDTH > vw - PAD) {
    // 翻到左侧
    left = rect.left - WIDTH - PAD;
  }
  // 垂直：与 anchor 顶对齐，但保证整块在视口里
  let top = rect.top;
  if (top + HEIGHT_MAX > vh - PAD) {
    top = Math.max(PAD, vh - HEIGHT_MAX - PAD);
  }
  return {
    top: `${Math.max(PAD, top)}px`,
    left: `${Math.max(PAD, left)}px`,
    width: `${WIDTH}px`,
    maxHeight: `${HEIGHT_MAX}px`,
  };
});

function truncate(s: string, n: number): string {
  const chars = Array.from(s.replace(/\s+/g, ' ').trim());
  return chars.length > n ? `${chars.slice(0, n).join('')}…` : chars.join('');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="hover-preview">
      <div
        v-if="sessionId && anchorRect"
        class="session-hover-preview pointer-events-none fixed z-[180] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-2)] p-3 text-xs flex flex-col gap-2 overflow-hidden"
        :style="popoverStyle"
      >
        <div v-if="loading" class="space-y-2">
          <ThemedSkeleton height="14px" />
          <ThemedSkeleton :repeat="3" height="36px" />
        </div>
        <template v-else-if="detail">
          <div class="text-[11px] text-[var(--text-3)] truncate">{{ detail.model }} · {{ detail.messages.length }} {{ t('chat.message.tokens', { n: '' }).replace(/\s*\d*\s*tokens?/i, '').trim() || 'msgs' }}</div>
          <div v-if="lastMessages.length === 0" class="opacity-60">{{ t('sessions.preview.empty') }}</div>
          <div
            v-for="(m, i) in lastMessages"
            :key="i"
            class="flex flex-col gap-0.5"
          >
            <div class="text-[10px] uppercase tracking-wide opacity-50">
              {{ m.role === 'user' ? t('sessions.preview.user') : t('sessions.preview.assistant') }}
            </div>
            <div v-if="m.images.length" class="session-preview-images">
              <img
                v-for="image in m.images"
                :key="image.src"
                class="session-preview-image"
                :src="image.src"
                :alt="image.alt"
                loading="lazy"
                decoding="async"
              >
            </div>
            <div v-if="m.text" class="text-[var(--text-2)] leading-snug">{{ truncate(m.text, 120) }}</div>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.session-hover-preview {
  /* glass 主题下加 backdrop blur 让浮层更精致 */
  backdrop-filter: blur(4px) saturate(1.2);
}

.session-preview-images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  margin: 2px 0 4px;
}

.session-preview-image {
  width: 100%;
  aspect-ratio: 1.45;
  object-fit: cover;
  border-radius: 7px;
  background: var(--md-image-bg);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--border) 82%, transparent),
    var(--shadow-1);
}

.hover-preview-enter-active,
.hover-preview-leave-active {
  transition: opacity 140ms var(--ease, ease), transform 160ms cubic-bezier(.2, .8, .2, 1);
}
.hover-preview-enter-from,
.hover-preview-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}
</style>
