<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { useSystemStore } from '@/stores/system';

const { t } = useI18n();
const message = useMessage();
const system = useSystemStore();
const { health } = storeToRefs(system);

const PANEL_VERSION = '0.1.0-alpha.0';
const REPO_URL = 'https://github.com/NousResearch/hermes-agent';

const hermesVersion = computed(() => health.value?.hermes.version ?? '—');

const bffUptime = computed(() => {
  const sec = health.value?.bff.uptimeSec;
  if (typeof sec !== 'number' || !Number.isFinite(sec) || sec < 0) return '—';
  return formatUptime(sec);
});

function formatUptime(sec: number): string {
  const s = Math.floor(sec);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  // Use locale-aware compact labels.
  const dLabel = t('settings.about.uptime_days');
  const hLabel = t('settings.about.uptime_hours');
  const mLabel = t('settings.about.uptime_minutes');
  const sLabel = t('settings.about.uptime_seconds');

  if (days > 0) return `${days} ${dLabel} ${hours} ${hLabel}`;
  if (hours > 0) return `${hours} ${hLabel} ${minutes} ${mLabel}`;
  if (minutes > 0) return `${minutes} ${mLabel} ${seconds} ${sLabel}`;
  return `${seconds} ${sLabel}`;
}

const platform = computed(() => detectPlatform());

function detectPlatform(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 11/.test(ua)) os = 'Windows 11';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) {
    const m = ua.match(/Mac OS X ([0-9_]+)/);
    os = m ? `macOS ${m[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';

  let browser = '';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';

  return browser ? `${os} · ${browser}` : os;
}

function checkUpdate(): void {
  message.success(t('settings.about.check_update_result', { version: `v${PANEL_VERSION}` }));
}
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ t('settings.about.title') }}</h3>
    <p class="text-sm opacity-60 mb-6">{{ t('settings.about.desc') }}</p>

    <div class="border border-[var(--border)] rounded-md divide-y divide-[var(--border)] bg-[var(--bg-card)]">
      <div class="flex items-center justify-between px-4 py-3">
        <span class="text-sm opacity-70">{{ t('settings.about.panel_version') }}</span>
        <span class="text-sm font-mono">v{{ PANEL_VERSION }}</span>
      </div>
      <div class="flex items-center justify-between px-4 py-3">
        <span class="text-sm opacity-70">{{ t('settings.about.hermes_version') }}</span>
        <span class="text-sm font-mono">{{ hermesVersion }}</span>
      </div>
      <div class="flex items-center justify-between px-4 py-3">
        <span class="text-sm opacity-70">{{ t('settings.about.bff_uptime') }}</span>
        <span class="text-sm">{{ bffUptime }}</span>
      </div>
      <div class="flex items-center justify-between px-4 py-3">
        <span class="text-sm opacity-70">{{ t('settings.about.platform') }}</span>
        <span class="text-sm">{{ platform }}</span>
      </div>
      <div class="flex items-center justify-between px-4 py-3">
        <span class="text-sm opacity-70">{{ t('settings.about.repo') }}</span>
        <a
          :href="REPO_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-[var(--brand-600)] hover:text-[var(--brand-700)] hover:underline"
        >
          {{ REPO_URL }}
        </a>
      </div>
    </div>

    <div class="mt-5 flex justify-end">
      <button
        class="px-4 py-1.5 text-sm rounded bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] transition-colors"
        @click="checkUpdate"
      >
        {{ t('settings.about.check_update') }}
      </button>
    </div>
  </div>
</template>
