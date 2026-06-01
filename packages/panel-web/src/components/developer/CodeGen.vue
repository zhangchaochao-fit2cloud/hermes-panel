<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { NTabs, NTabPane, NSelect } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import CodeBlock from '@/components/shared/CodeBlock.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import { useDeveloperStore } from '@/stores/developer';
import { SUPPORTED_LANGS, genCode, type CodeLang } from '@/utils/code-templates';

const { t } = useI18n();
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

    <EmptyState
      v-if="!snippets"
      icon="{}"
      :title="t('developer.codegen.emptyHint')"
    />

    <NTabs v-else v-model:value="lang" type="line" size="small" animated>
      <NTabPane
        v-for="meta in SUPPORTED_LANGS"
        :key="meta.id"
        :name="meta.id"
        :tab="meta.label"
      >
        <CodeBlock
          :code="snippets?.[meta.id] ?? ''"
          :lang="meta.label"
          max-height="600px"
        />
      </NTabPane>
    </NTabs>
  </div>
</template>
