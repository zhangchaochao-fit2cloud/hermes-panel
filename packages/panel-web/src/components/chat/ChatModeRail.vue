<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

type ModeKey = 'direct' | 'room' | 'cron' | 'cli';
type ModeTone = 'primary' | 'team' | 'schedule' | 'cli';

interface ChatModeAction {
  key: ModeKey;
  tone: ModeTone;
  promptKey?: string;
  route?: string;
  storage?: 'cron';
}

const emit = defineEmits<{
  (e: 'pick-prompt', prompt: string): void;
  (e: 'open-route', payload: { route: string; prompt?: string; storage?: 'cron' }): void;
}>();

const { t } = useI18n();

const actions = computed<ChatModeAction[]>(() => [
  {
    key: 'direct',
    tone: 'primary',
    promptKey: 'chat.modeRail.actions.direct.prompt',
  },
  {
    key: 'room',
    tone: 'team',
    route: '/chat-room',
  },
  {
    key: 'cron',
    tone: 'schedule',
    route: '/cron',
    storage: 'cron',
    promptKey: 'chat.modeRail.actions.cron.prompt',
  },
  {
    key: 'cli',
    tone: 'cli',
    route: '/developer#cli-parity',
    promptKey: 'chat.modeRail.actions.cli.prompt',
  },
]);

function selectAction(action: ChatModeAction): void {
  const prompt = action.promptKey ? t(action.promptKey) : undefined;
  if (action.route) {
    emit('open-route', { route: action.route, prompt, storage: action.storage });
    return;
  }
  if (prompt) emit('pick-prompt', prompt);
}
</script>

<template>
  <section class="chat-mode-rail" :aria-label="t('chat.modeRail.ariaLabel')">
    <div class="mode-rail-copy">
      <p class="mode-rail-label">{{ t('chat.modeRail.label') }}</p>
      <span>{{ t('chat.modeRail.desc') }}</span>
    </div>
    <div class="mode-rail-actions">
      <button
        v-for="action in actions"
        :key="action.key"
        type="button"
        class="mode-rail-action"
        :class="`is-${action.tone}`"
        @click="selectAction(action)"
      >
        <span class="mode-rail-title">{{ t(`chat.modeRail.actions.${action.key}.title`) }}</span>
        <span class="mode-rail-desc">{{ t(`chat.modeRail.actions.${action.key}.desc`) }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.chat-mode-rail {
  display: grid;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  padding: 10px;
}

.mode-rail-copy {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: baseline;
  justify-content: space-between;
}

.mode-rail-label {
  color: var(--text-1);
  font-size: 12px;
  font-weight: 750;
}

.mode-rail-copy span,
.mode-rail-desc {
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.4;
}

.mode-rail-actions {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.mode-rail-action {
  min-height: 58px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevate);
  padding: 9px;
  text-align: left;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.mode-rail-action:hover {
  border-color: color-mix(in srgb, var(--brand-500) 46%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 6%, var(--bg-elevate));
  transform: translateY(-1px);
}

.mode-rail-action.is-primary {
  border-color: color-mix(in srgb, var(--brand-500) 52%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 8%, var(--bg-elevate));
}

.mode-rail-title {
  display: block;
  color: var(--text-1);
  font-size: 12px;
  font-weight: 750;
}

.mode-rail-desc {
  display: block;
  margin-top: 3px;
}

@media (max-width: 960px) {
  .mode-rail-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .mode-rail-actions {
    grid-template-columns: 1fr;
  }
}
</style>
