<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { NTabs, NTabPane, NSelect, NButton, NEmpty, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useDeveloperStore } from '@/stores/developer';
import { SUPPORTED_LANGS, genCode, type CodeLang } from '@/utils/code-templates';

const { t } = useI18n();
const message = useMessage();
const store = useDeveloperStore();
const { history, selectedHistory, selectedHistoryId } = storeToRefs(store);

const lang = ref<string>('curl');

const historyOptions = computed(() => history.value.map(h => ({
  label: `${h.method} ${h.url}  ·  ${new Date(h.timestamp).toLocaleTimeString()}`,
  value: h.id,
})));

const snippets = computed(() => {
  const entry = selectedHistory.value;
  if (!entry) return null;
  const result: Record<CodeLang, string> = {} as Record<CodeLang, string>;
  for (const meta of SUPPORTED_LANGS) {
    result[meta.id] = genCode(meta.id, {
      method: entry.method,
      url: entry.url,
      headers: entry.headers,
      body: entry.body,
    });
  }
  return result;
});

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    message.success(t('developer.codegen.copied'));
  } catch {
    message.error(t('developer.codegen.copyFailed'));
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-[var(--text-3)]">
        {{ t('developer.codegen.selectRequest') }}
      </span>
      <NSelect
        v-model:value="selectedHistoryId"
        :options="historyOptions"
        size="small"
        class="min-w-[320px]"
        :placeholder="t('developer.codegen.placeholder')"
      />
    </div>

    <NEmpty
      v-if="!snippets"
      size="small"
      :description="t('developer.codegen.emptyHint')"
      class="py-12"
    />

    <NTabs v-else v-model:value="lang" type="line" size="small" animated>
      <NTabPane
        v-for="meta in SUPPORTED_LANGS"
        :key="meta.id"
        :name="meta.id"
        :tab="meta.label"
      >
        <div class="relative">
          <NButton
            class="!absolute right-2 top-2 z-10"
            size="tiny"
            @click="copy((snippets?.[meta.id] ?? ''))"
          >
            {{ t('developer.codegen.copy') }}
          </NButton>
          <pre
            class="rounded-md bg-[var(--bg-elevate)] p-3 text-xs font-mono overflow-auto"
            style="max-height: 600px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;"
          ><code>{{ (snippets?.[meta.id] ?? '') }}</code></pre>
        </div>
      </NTabPane>
    </NTabs>
  </div>
</template>
