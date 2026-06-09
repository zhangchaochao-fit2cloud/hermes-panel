<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { NButton, NTag, useMessage } from 'naive-ui';
import { useProvidersStore } from '@/stores/providers';

type SetupPath = {
  id: 'local' | 'free-cloud' | 'api-key' | 'custom';
  provider: string;
  tone: 'success' | 'info' | 'warning' | 'default';
  command: string;
  bullets: string[];
  model?: { name: string; provider: string; baseUrl: string; label: string };
};

const emit = defineEmits<{ (e: 'add-credential', provider: string): void }>();

const { t } = useI18n();
const router = useRouter();
const message = useMessage();
const store = useProvidersStore();

const setupPaths: SetupPath[] = [
  {
    id: 'local',
    provider: 'custom',
    tone: 'success',
    command: 'ollama pull llama3.1',
    bullets: ['localBullet1', 'localBullet2', 'localBullet3'],
    model: {
      name: 'llama3.1',
      provider: 'custom',
      baseUrl: 'http://localhost:11434/v1',
      label: 'Llama 3.1 (Ollama)',
    },
  },
  {
    id: 'free-cloud',
    provider: 'openrouter',
    tone: 'info',
    command: 'hermes auth add openrouter --type api_key --api-key ...',
    bullets: ['freeCloudBullet1', 'freeCloudBullet2', 'freeCloudBullet3'],
  },
  {
    id: 'api-key',
    provider: 'openai',
    tone: 'warning',
    command: 'hermes auth add openai --type api_key --api-key ...',
    bullets: ['apiKeyBullet1', 'apiKeyBullet2', 'apiKeyBullet3'],
  },
  {
    id: 'custom',
    provider: 'custom',
    tone: 'default',
    command: 'hermes config set model.base_url http://localhost:1234/v1',
    bullets: ['customBullet1', 'customBullet2', 'customBullet3'],
    model: {
      name: 'local-model',
      provider: 'custom',
      baseUrl: 'http://localhost:1234/v1',
      label: 'LM Studio local server',
    },
  },
];

const configuredFamilies = computed(() => new Set(store.providers.map(p => p.family)));

function isConfigured(path: SetupPath): boolean {
  return configuredFamilies.value.has(path.provider)
    || (path.provider === store.model?.provider && (store.model.hasApiKey || !!store.model.activeCredential));
}

async function useLocalPreset(path: SetupPath): Promise<void> {
  if (!path.model) return;
  const r = await store.setModel({
    name: path.model.name,
    provider: path.model.provider,
    baseUrl: path.model.baseUrl,
  });
  if (r.ok) {
    message.success(t('settings.providers.setup.modelApplied', { name: path.model.label }));
    return;
  }
  message.error(`${t('model.switcher.failed')}: ${r.error ?? ''}`);
}

function openCredential(path: SetupPath): void {
  emit('add-credential', path.provider);
}

function openChat(): void {
  void router.push('/chat');
}
</script>

<template>
  <section class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
          {{ t('settings.providers.setup.eyebrow') }}
        </p>
        <h4 class="mt-1 text-sm font-semibold text-[var(--text-1)]">
          {{ t('settings.providers.setup.title') }}
        </h4>
        <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
          {{ t('settings.providers.setup.desc') }}
        </p>
      </div>
      <NButton size="small" ghost type="primary" @click="openChat">
        {{ t('settings.providers.setup.testChat') }}
      </NButton>
    </div>

    <div class="mt-4 grid gap-3 lg:grid-cols-2">
      <article
        v-for="path in setupPaths"
        :key="path.id"
        class="rounded-md border border-[var(--border)] bg-[var(--bg-elevate)] p-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h5 class="text-sm font-semibold text-[var(--text-1)]">
                {{ t(`settings.providers.setup.paths.${path.id}.title`) }}
              </h5>
              <NTag v-if="isConfigured(path)" size="tiny" type="success" :bordered="false">
                {{ t('settings.providers.setup.configured') }}
              </NTag>
              <NTag v-else size="tiny" :type="path.tone" :bordered="false">
                {{ t(`settings.providers.setup.paths.${path.id}.tag`) }}
              </NTag>
            </div>
            <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
              {{ t(`settings.providers.setup.paths.${path.id}.desc`) }}
            </p>
          </div>
        </div>

        <ul class="mt-3 space-y-1.5 text-xs leading-5 text-[var(--text-2)]">
          <li v-for="bullet in path.bullets" :key="bullet" class="flex gap-2">
            <span class="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--brand-500)]" />
            <span>{{ t(`settings.providers.setup.${bullet}`) }}</span>
          </li>
        </ul>

        <code class="mt-3 block truncate rounded border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-[11px] text-[var(--text-2)]">
          {{ path.command }}
        </code>

        <div class="mt-3 flex flex-wrap gap-2">
          <NButton v-if="path.model" size="tiny" type="primary" ghost @click="useLocalPreset(path)">
            {{ t('settings.providers.setup.usePreset') }}
          </NButton>
          <NButton v-else size="tiny" type="primary" ghost @click="openCredential(path)">
            {{ t('settings.providers.setup.addCredential') }}
          </NButton>
          <NButton size="tiny" quaternary @click="openCredential(path)">
            {{ t('settings.providers.setup.configure') }}
          </NButton>
        </div>
      </article>
    </div>
  </section>
</template>
