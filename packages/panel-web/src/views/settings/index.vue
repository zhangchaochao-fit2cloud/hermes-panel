<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { NTabs, NTab } from 'naive-ui';
import SectionAppearance from '@/components/settings/SectionAppearance.vue';
import SectionProviders from '@/components/settings/SectionProviders.vue';
import SectionHermesEndpoints from '@/components/settings/SectionHermesEndpoints.vue';
import SectionLanguage from '@/components/settings/SectionLanguage.vue';
import SectionHotkeys from '@/components/settings/SectionHotkeys.vue';
import SectionAdvanced from '@/components/settings/SectionAdvanced.vue';
import SectionBackup from '@/components/settings/SectionBackup.vue';
import SectionAbout from '@/components/settings/SectionAbout.vue';
import SectionSystemHealth from '@/components/settings/SectionSystemHealth.vue';
import SectionAccess from '@/components/settings/SectionAccess.vue';
import SectionLicense from '@/components/settings/SectionLicense.vue';
import { useBreakpoint } from '@/composables/use-breakpoint';

const { t } = useI18n();
const { isMobile } = useBreakpoint();
const route = useRoute();
const router = useRouter();

interface AnchorItem { key: string; label: string }

const anchors: AnchorItem[] = [
  { key: 'license', label: 'settings.anchor.license' },
  { key: 'access', label: 'settings.anchor.access' },
  { key: 'system-health', label: 'settings.anchor.systemHealth' },
  { key: 'appearance', label: 'settings.anchor.appearance' },
  { key: 'providers', label: 'settings.anchor.providers' },
  { key: 'hermes-endpoints', label: 'settings.anchor.hermesEndpoints' },
  { key: 'language', label: 'settings.anchor.language' },
  { key: 'hotkeys', label: 'settings.anchor.hotkeys' },
  { key: 'advanced', label: 'settings.anchor.advanced' },
  { key: 'backup', label: 'settings.anchor.backup' },
  { key: 'about', label: 'settings.anchor.about' },
];

const activeKey = ref<string>('system-health');
const focusedKey = ref<string | null>(null);
const scrollerRef = ref<HTMLElement | null>(null);

let observer: IntersectionObserver | null = null;
let focusTimer: ReturnType<typeof setTimeout> | null = null;

function isAnchorKey(key: string): boolean {
  return anchors.some(a => a.key === key);
}

function focusSection(key: string): void {
  focusedKey.value = key;
  if (focusTimer) clearTimeout(focusTimer);
  focusTimer = setTimeout(() => {
    if (focusedKey.value === key) focusedKey.value = null;
  }, 1800);
}

function goTo(key: string, syncHash = true): void {
  if (!isAnchorKey(key)) return;
  const el = document.getElementById(`settings-section-${key}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  activeKey.value = key;
  focusSection(key);
  if (syncHash && route.hash !== `#${key}`) {
    void router.replace({ hash: `#${key}` });
  }
}

function sectionClass(key: string): Array<string | Record<string, boolean>> {
  return [
    'settings-section scroll-mt-24',
    { 'settings-section-focus': focusedKey.value === key },
  ];
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

  // Jump to anchor if route hash points at a known section, e.g. /settings#providers
  const hash = route.hash.replace(/^#/, '');
  if (hash && isAnchorKey(hash)) {
    void nextTick(() => goTo(hash, false));
  }
});

watch(() => route.hash, h => {
  const key = h.replace(/^#/, '');
  if (key && isAnchorKey(key)) {
    void nextTick(() => goTo(key, false));
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  if (focusTimer) clearTimeout(focusTimer);
  focusTimer = null;
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
              ? 'bg-[var(--brand-500)]/10 text-[var(--brand-600)] border-[var(--brand-500)] font-medium'
              : 'border-transparent text-[var(--text-2)] hover:bg-[var(--bg-elevate)] hover:text-[var(--text-1)]'
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
        <section id="settings-section-license" :class="sectionClass('license')">
          <SectionLicense />
        </section>
        <section id="settings-section-access" :class="sectionClass('access')">
          <SectionAccess />
        </section>
        <section id="settings-section-system-health" :class="sectionClass('system-health')">
          <SectionSystemHealth />
        </section>
        <section id="settings-section-appearance" :class="sectionClass('appearance')">
          <SectionAppearance />
        </section>
        <section id="settings-section-providers" :class="sectionClass('providers')">
          <SectionProviders />
        </section>
        <section id="settings-section-hermes-endpoints" :class="sectionClass('hermes-endpoints')">
          <SectionHermesEndpoints />
        </section>
        <section id="settings-section-language" :class="sectionClass('language')">
          <SectionLanguage />
        </section>
        <section id="settings-section-hotkeys" :class="sectionClass('hotkeys')">
          <SectionHotkeys />
        </section>
        <section id="settings-section-advanced" :class="sectionClass('advanced')">
          <SectionAdvanced />
        </section>
        <section id="settings-section-backup" :class="sectionClass('backup')">
          <SectionBackup />
        </section>
        <section id="settings-section-about" :class="sectionClass('about')">
          <SectionAbout />
        </section>
        <!-- bottom padding so the last section can scroll to the top -->
        <div class="h-[40vh]" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-section {
  border-radius: 8px;
  margin-inline: -10px;
  padding: 10px;
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease,
    outline-color 180ms ease;
}

.settings-section-focus {
  outline: 2px solid color-mix(in srgb, var(--brand-500) 48%, transparent);
  outline-offset: 2px;
  background: color-mix(in srgb, var(--brand-500) 7%, transparent);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--brand-500) 9%, transparent);
}
</style>
