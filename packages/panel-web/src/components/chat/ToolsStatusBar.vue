<script setup lang="ts">
/**
 * Composer 上方 chip 行 — 展示当前会话能用的 toolsets / MCP 服务一览。
 *
 * 当前 hermes API server 不接受 HTTP 传入 toolsets（从 config.yaml 读死），
 * 所以这里是"只读 + 跳 settings"形态：
 *   - 显示已启用 N 个工具
 *   - hover popover 列出名字
 *   - 点击跳 /tools 页配置
 *
 * 等 hermes 上游支持运行时 toolsets 后，再扩展成真正可点切换的 toggle chip。
 */
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { NPopover } from 'naive-ui';
import { useToolsStore } from '@/stores/tools';

const { t } = useI18n();
const router = useRouter();
const store = useToolsStore();
const { tools, enabledCount } = storeToRefs(store);

onMounted(() => {
  void store.loadTools().catch(() => { /* silent */ });
});

const enabledList = computed(() =>
  tools.value.filter(x => x.enabled).slice(0, 30),
);
const builtinEnabledCount = computed(() =>
  tools.value.filter(x => x.enabled && x.source === 'builtin').length,
);
const mcpEnabledCount = computed(() =>
  tools.value.filter(x => x.enabled && x.source === 'mcp').length,
);

function goConfigure(): void {
  void router.push('/tools');
}
</script>

<template>
  <NPopover trigger="hover" placement="top-start" :show-arrow="false">
    <template #trigger>
      <button
        type="button"
        class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-elevate)] transition-colors"
        @click="goConfigure"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 4l3 3-3 3M8 11h5" />
        </svg>
        <span>{{ t('chatTools.label', { n: enabledCount }) }}</span>
      </button>
    </template>
    <div class="max-w-[280px]">
      <div class="text-xs font-medium text-[var(--text-1)] mb-1.5">
        {{ t('chatTools.popoverTitle') }}
      </div>
      <div class="text-[11px] text-[var(--text-3)] mb-2">
        {{ t('chatTools.popoverDesc', { builtin: builtinEnabledCount, mcp: mcpEnabledCount }) }}
      </div>
      <div v-if="enabledList.length === 0" class="text-[11px] text-[var(--text-3)] italic">
        {{ t('chatTools.empty') }}
      </div>
      <div v-else class="flex flex-wrap gap-1 mb-2">
        <span
          v-for="t in enabledList"
          :key="t.name"
          class="inline-block px-1.5 py-0.5 text-[10px] rounded border border-[var(--border)] bg-[var(--bg-elevate)] font-mono text-[var(--text-2)]"
          :title="t.label || t.name"
        >{{ t.name }}</span>
      </div>
      <button
        class="text-[11px] text-[var(--brand-600)] hover:underline"
        @click="goConfigure"
      >
        {{ t('chatTools.configure') }} →
      </button>
    </div>
  </NPopover>
</template>
