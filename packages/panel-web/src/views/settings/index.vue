<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { NTabs, NTab } from 'naive-ui';
import SectionAppearance from '@/components/settings/SectionAppearance.vue';
import SectionLanguage from '@/components/settings/SectionLanguage.vue';
import SectionHotkeys from '@/components/settings/SectionHotkeys.vue';
import SectionAdvanced from '@/components/settings/SectionAdvanced.vue';
import SectionAbout from '@/components/settings/SectionAbout.vue';
import { useBreakpoint } from '@/composables/use-breakpoint';

const { t } = useI18n();
const { isMobile } = useBreakpoint();

interface AnchorItem { key: string; label: string }

const anchors: AnchorItem[] = [
  { key: 'appearance', label: 'settings.anchor.appearance' },
  { key: 'language', label: 'settings.anchor.language' },
  { key: 'hotkeys', label: 'settings.anchor.hotkeys' },
  { key: 'advanced', label: 'settings.anchor.advanced' },
  { key: 'about', label: 'settings.anchor.about' },
];

const activeKey = ref<string>('appearance');
const scrollerRef = ref<HTMLElement | null>(null);

let observer: IntersectionObserver | null = null;

function goTo(key: string): void {
  const el = document.getElementById(`settings-section-${key}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  activeKey.value = key;
}

onMounted(() => {
  const root = scrollerRef.value;
  if (!root) return;
  // Top 96px sentinel keeps the *next* section visible enough to win over the
  // one above the viewport when scrolling down.
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length > 0) {
        const id = (visible[0].target as HTMLElement).id;
        const key = id.replace('settings-section-', '');
        if (key) activeKey.value = key;
      }
    },
    {
      root,
      rootMargin: '-96px 0px -50% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    },
  );

  for (const a of anchors) {
    const el = document.getElementById(`settings-section-${a.key}`);
    if (el) observer.observe(el);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<template>
  <div
    class="flex h-full w-full bg-[var(--bg-page)]"
    :class="isMobile ? 'flex-col' : 'flex-row'"
  >
    <!-- Mobile: horizontal scrollable tab bar at top. NTabs handles overflow. -->
    <div
      v-if="isMobile"
      class="flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-card)] px-2"
    >
      <NTabs
        :value="activeKey"
        type="line"
        size="medium"
        animated
        @update:value="(k: string) => goTo(k)"
      >
        <NTab
          v-for="a in anchors"
          :key="a.key"
          :name="a.key"
          :tab="t(a.label)"
        />
      </NTabs>
    </div>

    <!-- Desktop: left anchor nav -->
    <aside
      v-else
      class="w-[220px] flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg-card)] py-6 px-3 overflow-y-auto"
    >
      <h2 class="px-3 pb-3 text-xs uppercase tracking-wide opacity-60">
        {{ t('settings.title') }}
      </h2>
      <nav class="flex flex-col gap-0.5">
        <button
          v-for="a in anchors"
          :key="a.key"
          class="text-left px-3 py-2 rounded-md text-sm transition-colors border-l-2"
          :class="
            activeKey === a.key
              ? 'bg-[var(--brand-500)]/10 text-[var(--brand-600)] border-[var(--brand-500)]'
              : 'border-transparent hover:bg-[var(--bg-elevate)]'
          "
          @click="goTo(a.key)"
        >
          {{ t(a.label) }}
        </button>
      </nav>
    </aside>

    <!-- Scrollable content -->
    <div
      ref="scrollerRef"
      class="flex-1 min-w-0 overflow-y-auto"
    >
      <div
        class="mx-auto space-y-8"
        :class="isMobile ? 'max-w-full px-4 py-6' : 'max-w-[800px] px-8 py-8'"
      >
        <section id="settings-section-appearance" class="scroll-mt-24">
          <SectionAppearance />
        </section>
        <section id="settings-section-language" class="scroll-mt-24">
          <SectionLanguage />
        </section>
        <section id="settings-section-hotkeys" class="scroll-mt-24">
          <SectionHotkeys />
        </section>
        <section id="settings-section-advanced" class="scroll-mt-24">
          <SectionAdvanced />
        </section>
        <section id="settings-section-about" class="scroll-mt-24">
          <SectionAbout />
        </section>
        <!-- bottom padding so the last section can scroll to the top -->
        <div class="h-[40vh]" />
      </div>
    </div>
  </div>
</template>
