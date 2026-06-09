<script setup lang="ts">
import { ref } from 'vue';
import { NInput } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import ControlCenterIcon from '@/components/shared/ControlCenterIcon.vue';

type LaunchTarget = 'chat' | 'room';
type ExampleKey = 'debug' | 'build' | 'explain';

const { t } = useI18n();
const router = useRouter();
const draft = ref('');
const examples: ExampleKey[] = ['debug', 'build', 'explain'];

function persistDraft(prompt: string): void {
  try {
    localStorage.setItem('panel.chat.draft.new', prompt);
  } catch {
    /* route still works when storage is unavailable */
  }
}

function useExample(key: ExampleKey): void {
  draft.value = t(`dashboard.workbench.launcher.examples.${key}`);
}

function launch(target: LaunchTarget): void {
  const prompt = draft.value.trim() || t('dashboard.workbench.launcher.defaultPrompt');
  persistDraft(prompt);
  if (target === 'room') {
    void router.push('/chat-room');
    return;
  }
  void router.push({ path: '/chat', query: { new: String(Date.now()) } });
}

function onInputKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey)) return;
  event.preventDefault();
  launch('chat');
}
</script>

<template>
  <section class="task-launcher" aria-labelledby="dashboard-task-launcher-title">
    <div class="task-copy">
      <p class="task-kicker">{{ t('dashboard.workbench.launcher.eyebrow') }}</p>
      <h2 id="dashboard-task-launcher-title" class="task-title">
        {{ t('dashboard.workbench.launcher.title') }}
      </h2>
      <p class="task-desc">{{ t('dashboard.workbench.launcher.desc') }}</p>
    </div>

    <div class="task-input-panel">
      <NInput
        v-model:value="draft"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 4 }"
        :placeholder="t('dashboard.workbench.launcher.placeholder')"
        @keydown="onInputKeydown"
      />
      <div class="task-launcher-footer">
        <div class="task-examples" :aria-label="t('dashboard.workbench.launcher.examplesLabel')">
          <button
            v-for="example in examples"
            :key="example"
            type="button"
            class="task-example"
            @click="useExample(example)"
          >
            {{ t(`dashboard.workbench.launcher.exampleLabels.${example}`) }}
          </button>
        </div>
        <div class="task-actions">
          <button type="button" class="task-action is-secondary" @click="launch('room')">
            <ControlCenterIcon icon="chatRoom" class="h-4 w-4" />
            <span>{{ t('dashboard.workbench.launcher.room') }}</span>
          </button>
          <button type="button" class="task-action is-primary" @click="launch('chat')">
            <ControlCenterIcon icon="chat" class="h-4 w-4" />
            <span>{{ t('dashboard.workbench.launcher.chat') }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.task-launcher {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-500) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 6%, var(--bg-elevate));
  padding: 14px;
}

.task-kicker {
  color: var(--brand-600);
  font-size: 11px;
  font-weight: 750;
  text-transform: uppercase;
}

.task-title {
  margin-top: 5px;
  color: var(--text-1);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.25;
}

.task-desc {
  margin-top: 6px;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.55;
}

.task-input-panel {
  min-width: 0;
}

.task-launcher-footer,
.task-actions,
.task-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.task-launcher-footer {
  margin-top: 10px;
  align-items: center;
  justify-content: space-between;
}

.task-example,
.task-action {
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 650;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.task-example {
  padding: 6px 9px;
}

.task-action {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
}

.task-example:hover,
.task-action:hover {
  border-color: color-mix(in srgb, var(--brand-500) 48%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 8%, var(--bg-card));
  color: var(--text-1);
  transform: translateY(-1px);
}

.task-action.is-primary {
  border-color: color-mix(in srgb, var(--brand-500) 60%, var(--border));
  background: var(--brand-500);
  color: white;
}

@media (max-width: 900px) {
  .task-launcher {
    grid-template-columns: 1fr;
  }
}
</style>
