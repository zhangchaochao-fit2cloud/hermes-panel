<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { NInput, NSelect, NButton, NPopconfirm } from 'naive-ui';
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
const { isMobile, isTablet } = useBreakpoint();
const route = useRoute();
const router = useRouter();

interface AnchorItem { key: string; labelKey: string }

const anchors: AnchorItem[] = [
  { key: 'license', labelKey: 'settings.anchor.license' },
  { key: 'access', labelKey: 'settings.anchor.access' },
  { key: 'system-health', labelKey: 'settings.anchor.systemHealth' },
  { key: 'appearance', labelKey: 'settings.anchor.appearance' },
  { key: 'providers', labelKey: 'settings.anchor.providers' },
  { key: 'hermes-endpoints', labelKey: 'settings.anchor.hermesEndpoints' },
  { key: 'language', labelKey: 'settings.anchor.language' },
  { key: 'hotkeys', labelKey: 'settings.anchor.hotkeys' },
  { key: 'backup', labelKey: 'settings.anchor.backup' },
  { key: 'advanced', labelKey: 'settings.anchor.advanced' },
  { key: 'about', labelKey: 'settings.anchor.about' },
];

interface NavGroup { key: string; labelKey: string; items: string[] }

const navGroups: NavGroup[] = [
  { key: 'account', labelKey: 'settings.groups.account', items: ['license', 'access'] },
  { key: 'system', labelKey: 'settings.groups.system', items: ['system-health', 'providers', 'hermes-endpoints'] },
  { key: 'appearance', labelKey: 'settings.groups.appearance', items: ['appearance', 'language', 'hotkeys'] },
  { key: 'data', labelKey: 'settings.groups.data', items: ['backup', 'advanced'] },
  { key: 'other', labelKey: 'settings.groups.other', items: ['about'] },
];

const activeKey = ref<string>('system-health');
const focusedKey = ref<string | null>(null);
const scrollerRef = ref<HTMLElement | null>(null);
const searchText = ref('');
const expandedGroups = ref<string[]>(['account', 'system', 'appearance', 'data', 'other']);
const fileInputRef = ref<HTMLInputElement | null>(null);

const query = computed(() => searchText.value.trim().toLowerCase());

const visibleGroups = computed(() => {
  if (!query.value) return navGroups;
  return navGroups
    .map(g => ({
      ...g,
      items: g.items.filter(key => {
        const a = anchors.find(x => x.key === key);
        return a && t(a.labelKey).toLowerCase().includes(query.value);
      }),
    }))
    .filter(g => g.items.length > 0);
});

const mobileOptions = computed(() =>
  anchors.map(a => ({ label: t(a.labelKey), value: a.key }))
);

function getAnchor(key: string): AnchorItem | undefined {
  return anchors.find(a => a.key === key);
}

function isGroupExpanded(key: string): boolean {
  if (query.value) return true;
  return expandedGroups.value.includes(key);
}

function toggleGroup(key: string): void {
  const idx = expandedGroups.value.indexOf(key);
  if (idx >= 0) expandedGroups.value.splice(idx, 1);
  else expandedGroups.value.push(key);
}

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

function onSearchKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    const first = visibleGroups.value.flatMap(g => g.items)[0];
    if (first) goTo(first);
  }
}

function highlightText(text: string): string {
  if (!query.value) return text;
  const idx = text.toLowerCase().indexOf(query.value);
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.value.length);
  const after = text.slice(idx + query.value.length);
  return `${before}<mark class="bg-[var(--brand-500)]/20 text-[var(--text-1)] rounded-sm px-0.5">${match}</mark>${after}`;
}

function sectionClass(key: string): Array<string | Record<string, boolean>> {
  return [
    'settings-section scroll-mt-24',
    { 'settings-section-focus': focusedKey.value === key },
  ];
}

function exportSettings(): void {
  const data: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) data[k] = localStorage.getItem(k);
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hermes-settings-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function triggerImport(): void {
  fileInputRef.value?.click();
}

function importSettings(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string) as Record<string, string>;
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'string') localStorage.setItem(k, v);
      }
      window.location.reload();
    } catch { /* ignore */ }
  };
  reader.readAsText(file);
  input.value = '';
}

function resetSettings(): void {
  localStorage.clear();
  window.location.reload();
}

onMounted(() => {
  const root = scrollerRef.value;
  if (!root) return;
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
    <div
      v-if="isMobile"
      class="flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3"
    >
      <NSelect
        :value="activeKey"
        :options="mobileOptions"
        :placeholder="t('settings.title')"
        size="small"
        @update:value="(k: string) => goTo(k)"
      />
    </div>

    <aside
      v-else
      class="flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg-card)] py-6 px-3 overflow-y-auto"
      :class="isTablet ? 'w-[180px]' : 'w-[220px]'"
    >
      <h2 class="px-3 pb-3 text-xs uppercase tracking-wide opacity-60">
        {{ t('settings.title') }}
      </h2>
      <div class="px-2 mb-4">
        <NInput
          v-model:value="searchText"
          :placeholder="t('settings.searchPlaceholder')"
          size="small"
          clearable
          @keydown="onSearchKeydown"
        />
      </div>
      <nav class="flex flex-col gap-0.5">
        <div v-for="group in visibleGroups" :key="group.key" class="mb-1">
          <button
            class="flex items-center justify-between w-full px-3 py-1.5 text-[11px] uppercase tracking-wider font-medium text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
            @click="toggleGroup(group.key)"
          >
            <span>{{ t(group.labelKey) }}</span>
            <span
              class="text-[9px] transition-transform duration-150"
              :class="isGroupExpanded(group.key) ? 'rotate-90' : ''"
            >&#9654;</span>
          </button>
          <div
            v-show="isGroupExpanded(group.key)"
            class="flex flex-col gap-0.5 overflow-hidden"
          >
            <button
              v-for="key in group.items"
              :key="key"
              class="text-left px-3 py-2 rounded-md text-sm transition-colors border-l-2 truncate"
              :class="
                activeKey === key
                  ? 'bg-[var(--brand-500)]/10 text-[var(--brand-600)] border-[var(--brand-500)] font-medium'
                  : 'border-transparent text-[var(--text-2)] hover:bg-[var(--bg-elevate)] hover:text-[var(--text-1)]'
              "
              @click="goTo(key)"
            >
              <span v-html="highlightText(t(getAnchor(key)!.labelKey))" />
            </button>
          </div>
        </div>
      </nav>
    </aside>

    <div
      ref="scrollerRef"
      class="flex-1 min-w-0 overflow-y-auto"
    >
      <div
        class="sticky top-0 z-10 flex items-center justify-end gap-2 px-6 py-2.5 border-b border-[var(--border)] bg-[var(--bg-page)]"
      >
        <NButton size="tiny" quaternary @click="exportSettings">
          {{ t('settings.quickActions.export') }}
        </NButton>
        <NButton size="tiny" quaternary @click="triggerImport">
          {{ t('settings.quickActions.import') }}
        </NButton>
        <NPopconfirm
          @positive-click="resetSettings"
        >
          <template #trigger>
            <NButton size="tiny" quaternary type="warning">
              {{ t('settings.quickActions.reset') }}
            </NButton>
          </template>
          {{ t('settings.quickActions.resetConfirm') }}
        </NPopconfirm>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        class="hidden"
        @change="importSettings"
      />

      <div
        class="mx-auto space-y-8 min-w-0"
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
