<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NButton, NInput, NTag, NDivider, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { LicenseInfo } from '@hermes-panel/shared';
import { activateUserLicense, deactivateUserLicense, getLicenseStatus } from '@/api/auth';

const { t, locale } = useI18n();
const message = useMessage();

const license = ref<LicenseInfo | null>(null);
const features = ref<string[]>([]);
const licenseKey = ref('');
const loading = ref(false);

const hasLicense = computed(() => license.value !== null);
const isActive = computed(() => license.value?.revoked === false);

async function refresh(): Promise<void> {
  try {
    const res = await getLicenseStatus();
    license.value = res.license;
    features.value = res.features;
  } catch {
    // not authenticated — leave empty
  }
}

onMounted(refresh);

function formatTimestamp(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(locale.value);
}

function formatFeature(f: string): string {
  const key = `settings.license.features.${f}`;
  const translated = t(key);
  // If no translation found, t() returns the key itself
  return translated === key ? f : translated;
}

async function onActivate(): Promise<void> {
  if (!licenseKey.value.trim() || loading.value) return;
  loading.value = true;
  try {
    await activateUserLicense(licenseKey.value.trim());
    message.success(t('settings.license.activateSuccess'));
    licenseKey.value = '';
    await refresh();
  } catch (e) {
    message.error(e instanceof Error ? e.message : t('settings.license.activateFailed'));
  } finally {
    loading.value = false;
  }
}

async function onDeactivate(): Promise<void> {
  if (!license.value || loading.value) return;
  loading.value = true;
  try {
    await deactivateUserLicense(license.value.key);
    message.success(t('settings.license.deactivateSuccess'));
    await refresh();
  } catch (e) {
    message.error(e instanceof Error ? e.message : t('settings.license.operationFailed'));
  } finally {
    loading.value = false;
  }
}

async function onRefresh(): Promise<void> {
  loading.value = true;
  try {
    await refresh();
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold">{{ t('settings.license.title') }}</h3>
      <NButton size="tiny" quaternary :loading="loading" @click="onRefresh">
        {{ t('common.refresh') }}
      </NButton>
    </div>

    <!-- No license yet -->
    <div v-if="!hasLicense" class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <p class="text-sm text-[var(--text-3)] mb-3">
        {{ t('settings.license.noLicenseHint') }}
      </p>
      <div class="flex gap-2">
        <NInput
          v-model:value="licenseKey"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          size="small"
          style="flex:1"
          @keyup.enter="onActivate"
        />
        <NButton type="primary" size="small" :loading="loading" @click="onActivate">
          {{ t('settings.license.activate') }}
        </NButton>
      </div>
    </div>

    <!-- License active -->
    <div v-else class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
      <div class="flex items-center gap-2">
        <NTag :type="license!.tier === 'pro' ? 'error' : license!.tier === 'desktop' ? 'warning' : 'default'" size="small">
          {{ license!.tier }}
        </NTag>
        <NTag :type="isActive ? 'success' : 'default'" size="small">
          {{ isActive ? t('settings.license.activated') : t('settings.license.revoked') }}
        </NTag>
      </div>

      <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span class="text-[var(--text-3)]">Key</span>
        <code class="text-[var(--brand-600)]">{{ license!.key }}</code>
        <span class="text-[var(--text-3)]">{{ t('settings.license.activatedAt') }}</span>
        <span>{{ formatTimestamp(license!.activatedAt) }}</span>
        <span class="text-[var(--text-3)]">{{ t('settings.license.expiresAt') }}</span>
        <span>{{ formatTimestamp(license!.expiresAt) }}</span>
        <span class="text-[var(--text-3)]">{{ t('settings.license.boundDevice') }}</span>
        <code class="text-[10px] truncate">{{ license!.boundDevice || t('settings.license.notBound') }}</code>
      </div>

      <NDivider />

      <div>
        <span class="text-xs font-medium text-[var(--text-2)]">{{ t('settings.license.unlockedFeatures') }}</span>
        <div class="flex flex-wrap gap-1 mt-1">
          <NTag
            v-for="f in features"
            :key="f"
            size="tiny"
            :bordered="false"
            type="info"
          >
            {{ formatFeature(f) }}
          </NTag>
          <span v-if="features.length === 0" class="text-xs text-[var(--text-3)]">{{ t('settings.license.noFeatures') }}</span>
        </div>
      </div>

      <NButton size="small" quaternary type="error" @click="onDeactivate">
        {{ t('settings.license.deactivate') }}
      </NButton>
    </div>
  </div>
</template>
