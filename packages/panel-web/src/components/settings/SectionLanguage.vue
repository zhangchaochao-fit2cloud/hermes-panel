<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale } from '@/locales';

const { t, locale } = useI18n();

interface LangOption { value: 'zh-CN' | 'en-US'; label: string }
const options = computed<LangOption[]>(() => [
  { value: 'zh-CN', label: t('settings.language.zhCN') },
  { value: 'en-US', label: 'English' },
]);

function pick(v: 'zh-CN' | 'en-US'): void {
  setLocale(v);
}
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ t('settings.language.title') }}</h3>
    <p class="text-sm opacity-60 mb-6">{{ t('settings.language.desc') }}</p>

    <div class="flex flex-col gap-2">
      <label
        v-for="opt in options"
        :key="opt.value"
        class="flex items-center gap-3 px-4 py-3 rounded-md border cursor-pointer transition-colors"
        :class="
          locale === opt.value
            ? 'border-[var(--brand-500)] bg-[var(--brand-500)]/5'
            : 'border-[var(--border)] hover:bg-[var(--bg-elevate)]'
        "
      >
        <input
          type="radio"
          name="panel-locale"
          :value="opt.value"
          :checked="locale === opt.value"
          class="accent-[var(--brand-500)]"
          @change="pick(opt.value)"
        />
        <span class="text-sm">{{ opt.label }}</span>
      </label>
    </div>
  </div>
</template>
