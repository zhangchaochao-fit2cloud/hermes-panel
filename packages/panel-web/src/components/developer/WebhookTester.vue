<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import {
  NButton, NTag, NModal, NCard, NForm, NFormItem, NInput,
  NCollapse, NCollapseItem, NPopconfirm, useMessage,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import CodeBlock from '@/components/shared/CodeBlock.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';
import { useWebhookStore, type AddWebhookInput, type TestResult } from '@/stores/webhook';

const { t } = useI18n();
const store = useWebhookStore();
const message = useMessage();
const {
  subscriptions, loading, refreshing, initialized, error, disabled, raw,
  testResults, testing,
} = storeToRefs(store);

const showAdd = ref(false);
const submitting = ref(false);

const form = ref<AddWebhookInput>({
  name: '',
  prompt: '',
  events: '',
  description: '',
  skills: '',
  deliver: '',
  deliverChatId: '',
  secret: '',
});

const nameError = computed(() => {
  const v = form.value.name.trim();
  if (!v) return '';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(v)) {
    return t('developer.webhook.errors.invalidName');
  }
  return '';
});

const canSubmit = computed(() => {
  if (submitting.value) return false;
  if (!form.value.name.trim()) return false;
  if (nameError.value) return false;
  return true;
});

/** Per-subscription draft payload for the test action. */
const testPayloads = ref<Record<string, string>>({});

function payloadFor(name: string): string {
  return testPayloads.value[name] ?? '';
}

function setPayload(name: string, value: string): void {
  testPayloads.value = { ...testPayloads.value, [name]: value };
}

function resetForm(): void {
  form.value = {
    name: '',
    prompt: '',
    events: '',
    description: '',
    skills: '',
    deliver: '',
    deliverChatId: '',
    secret: '',
  };
  submitting.value = false;
}

function openAdd(): void {
  resetForm();
  showAdd.value = true;
}

function closeAdd(): void {
  if (submitting.value) return;
  showAdd.value = false;
}

async function refresh(): Promise<void> {
  await store.load();
}

async function submit(): Promise<void> {
  if (!canSubmit.value) return;
  submitting.value = true;
  const r = await store.add({
    name: form.value.name.trim(),
    prompt: form.value.prompt?.trim() || undefined,
    events: form.value.events?.trim() || undefined,
    description: form.value.description?.trim() || undefined,
    skills: form.value.skills?.trim() || undefined,
    deliver: form.value.deliver?.trim() || undefined,
    deliverChatId: form.value.deliverChatId?.trim() || undefined,
    secret: form.value.secret?.trim() || undefined,
  });
  submitting.value = false;
  if (r.ok) {
    message.success(t('developer.webhook.addSuccess', { name: form.value.name.trim() }));
    showAdd.value = false;
  } else {
    const reason = r.message || r.error || '';
    message.error(`${t('developer.webhook.addFailed')}${reason ? ` (${reason})` : ''}`);
  }
}

async function onRemove(name: string): Promise<void> {
  const r = await store.remove(name);
  if (r.ok) {
    message.success(t('developer.webhook.removeSuccess', { name }));
  } else {
    message.error(`${t('developer.webhook.removeFailed')}${r.message ? ` (${r.message})` : ''}`);
  }
}

async function onTest(name: string): Promise<void> {
  const payload = payloadFor(name).trim();
  if (payload) {
    try { JSON.parse(payload); }
    catch {
      message.error(t('developer.webhook.errors.invalidPayload'));
      return;
    }
  }
  const r: TestResult = await store.test(name, payload || undefined);
  if (r.ok) message.success(t('developer.webhook.testSuccess', { name }));
  else message.error(`${t('developer.webhook.testFailed')}${r.message ? ` (${r.message})` : ''}`);
}

function resultStatusType(r: TestResult | undefined): 'success' | 'error' | 'default' {
  if (!r) return 'default';
  return r.ok ? 'success' : 'error';
}

onMounted(() => {
  if (!initialized.value) {
    void store.load({ initial: true });
  }
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header -->
    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3"
    >
      <div class="flex items-center gap-3">
        <h2 class="text-base font-semibold text-[var(--text-1)]">
          {{ t('developer.webhook.title') }}
        </h2>
        <NTag :bordered="false" size="small">
          {{ t('developer.webhook.count', { n: subscriptions.length }) }}
        </NTag>
      </div>
      <div class="flex items-center gap-2">
        <NButton size="small" :loading="refreshing" :disabled="loading" @click="refresh">
          {{ t('developer.webhook.refresh') }}
        </NButton>
        <NButton type="primary" size="small" :disabled="disabled" @click="openAdd">
          {{ t('developer.webhook.add') }}
        </NButton>
      </div>
    </div>

    <!-- Disabled banner -->
    <div
      v-if="disabled"
      class="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-500"
    >
      {{ t('developer.webhook.disabledHint') }}
      <CodeBlock
        v-if="raw"
        class="mt-2"
        :code="raw"
        lang="webhook"
        max-height="220px"
        tone="warning"
      />
    </div>

    <!-- Error banner (e.g. HERMES_CLI_NOT_FOUND) -->
    <ErrorBanner
      v-else-if="error"
      :message="`${t('developer.webhook.errorPrefix')} ${error}`"
      :retry-label="t('developer.webhook.refresh')"
      surface="inline"
      @retry="refresh"
    />

    <!-- Loading state with no prior data -->
    <div v-if="loading && subscriptions.length === 0" class="grid gap-3">
      <div
        v-for="i in 3"
        :key="i"
        class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4"
      >
        <ThemedSkeleton height="16px" :repeat="3" rounded="sm" />
      </div>
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="!disabled && subscriptions.length === 0"
      icon="◇"
      :title="t('developer.webhook.empty')"
    >
      <NButton size="small" type="primary" @click="openAdd">
        {{ t('developer.webhook.add') }}
      </NButton>
    </EmptyState>

    <!-- Subscription cards -->
    <div v-else class="flex flex-col gap-3">
      <article
        v-for="sub in subscriptions"
        :key="sub.name"
        class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3"
      >
        <header class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <code class="font-mono text-sm text-[var(--text-1)] break-all">
                /webhooks/{{ sub.name }}
              </code>
              <NTag v-if="sub.events" size="small" :bordered="false" type="info">
                {{ sub.events }}
              </NTag>
              <NTag v-if="sub.deliver" size="small" :bordered="false">
                {{ sub.deliver }}{{ sub.deliverChatId ? `:${sub.deliverChatId}` : '' }}
              </NTag>
            </div>
            <p
              v-if="sub.description"
              class="mt-1 text-xs text-[var(--text-3)] break-words"
            >
              {{ sub.description }}
            </p>
            <dl class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div v-if="sub.skills" class="flex gap-1.5">
                <dt class="text-[var(--text-3)]">{{ t('developer.webhook.fields.skills') }}:</dt>
                <dd class="text-[var(--text-2)] break-all">{{ sub.skills }}</dd>
              </div>
              <div v-if="sub.secretHint" class="flex gap-1.5">
                <dt class="text-[var(--text-3)]">{{ t('developer.webhook.fields.secret') }}:</dt>
                <dd class="text-[var(--text-2)] break-all font-mono">{{ sub.secretHint }}</dd>
              </div>
              <div v-if="sub.prompt" class="flex gap-1.5 sm:col-span-2">
                <dt class="text-[var(--text-3)]">{{ t('developer.webhook.fields.prompt') }}:</dt>
                <dd class="text-[var(--text-2)] break-words">{{ sub.prompt }}</dd>
              </div>
            </dl>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <NButton
              size="tiny"
              :loading="testing.has(sub.name)"
              :disabled="testing.has(sub.name)"
              @click="onTest(sub.name)"
            >
              {{ t('developer.webhook.actions.test') }}
            </NButton>
            <NPopconfirm
              :positive-text="t('developer.webhook.actions.remove')"
              :negative-text="t('developer.webhook.actions.cancel')"
              @positive-click="onRemove(sub.name)"
            >
              <template #trigger>
                <NButton size="tiny" type="error" ghost>
                  {{ t('developer.webhook.actions.remove') }}
                </NButton>
              </template>
              {{ t('developer.webhook.removeConfirm', { name: sub.name }) }}
            </NPopconfirm>
          </div>
        </header>

        <!-- Test payload input + result -->
        <div class="mt-3 border-t border-[var(--border)] pt-3 flex flex-col gap-2">
          <label class="text-xs text-[var(--text-3)]">
            {{ t('developer.webhook.payloadLabel') }}
          </label>
          <NInput
            type="textarea"
            :value="payloadFor(sub.name)"
            :placeholder="t('developer.webhook.payloadPlaceholder')"
            :autosize="{ minRows: 2, maxRows: 6 }"
            @update:value="(v) => setPayload(sub.name, v)"
          />

          <NCollapse
            v-if="testResults[sub.name]"
            arrow-placement="right"
            :default-expanded-names="['result']"
          >
            <NCollapseItem name="result">
              <template #header>
                <div class="flex items-center gap-2">
                  <NTag size="small" :type="resultStatusType(testResults[sub.name])" :bordered="false">
                    {{ testResults[sub.name].ok
                      ? t('developer.webhook.result.ok')
                      : t('developer.webhook.result.fail') }}
                  </NTag>
                  <span class="text-xs text-[var(--text-3)]">
                    {{ t('developer.webhook.result.heading', { name: sub.name }) }}
                  </span>
                </div>
              </template>
              <div class="flex flex-col gap-2">
                <div
                  v-if="testResults[sub.name].error || testResults[sub.name].message"
                  class="text-xs text-red-500 break-words"
                >
                  {{ testResults[sub.name].error }}{{ testResults[sub.name].message
                    ? `: ${testResults[sub.name].message}` : '' }}
                </div>
                <CodeBlock
                  v-if="testResults[sub.name].stdout"
                  :code="testResults[sub.name].stdout ?? ''"
                  lang="stdout"
                  max-height="320px"
                />
                <CodeBlock
                  v-if="testResults[sub.name].stderr"
                  :code="testResults[sub.name].stderr ?? ''"
                  lang="stderr"
                  max-height="240px"
                  tone="warning"
                />
              </div>
            </NCollapseItem>
          </NCollapse>
        </div>
      </article>
    </div>

    <!-- Add modal -->
    <NModal :show="showAdd" :mask-closable="!submitting" @update:show="(v: boolean) => showAdd = v">
      <NCard
        :title="t('developer.webhook.modalTitle')"
        style="width: 620px; max-width: 92vw"
        :bordered="false"
        size="huge"
      >
        <NForm label-placement="top" :show-feedback="false">
          <NFormItem :label="t('developer.webhook.fields.name')" required>
            <div class="w-full">
              <NInput
                v-model:value="form.name"
                :placeholder="t('developer.webhook.fields.namePlaceholder')"
                :status="nameError ? 'error' : undefined"
              />
              <div v-if="nameError" class="mt-1 text-xs text-red-500">{{ nameError }}</div>
              <div v-else class="mt-1 text-xs text-[var(--text-3)]">
                {{ t('developer.webhook.fields.nameHint') }}
              </div>
            </div>
          </NFormItem>

          <NFormItem :label="t('developer.webhook.fields.prompt')">
            <div class="w-full">
              <NInput
                v-model:value="form.prompt"
                type="textarea"
                :placeholder="t('developer.webhook.fields.promptPlaceholder')"
                :autosize="{ minRows: 2, maxRows: 6 }"
              />
              <div class="mt-1 text-xs text-[var(--text-3)]">
                {{ t('developer.webhook.fields.promptHint') }}
              </div>
            </div>
          </NFormItem>

          <NFormItem :label="t('developer.webhook.fields.events')">
            <div class="w-full">
              <NInput
                v-model:value="form.events"
                :placeholder="t('developer.webhook.fields.eventsPlaceholder')"
              />
              <div class="mt-1 text-xs text-[var(--text-3)]">
                {{ t('developer.webhook.fields.eventsHint') }}
              </div>
            </div>
          </NFormItem>

          <NFormItem :label="t('developer.webhook.fields.description')">
            <NInput
              v-model:value="form.description"
              :placeholder="t('developer.webhook.fields.descriptionPlaceholder')"
            />
          </NFormItem>

          <NFormItem :label="t('developer.webhook.fields.skills')">
            <div class="w-full">
              <NInput
                v-model:value="form.skills"
                :placeholder="t('developer.webhook.fields.skillsPlaceholder')"
              />
              <div class="mt-1 text-xs text-[var(--text-3)]">
                {{ t('developer.webhook.fields.skillsHint') }}
              </div>
            </div>
          </NFormItem>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NFormItem :label="t('developer.webhook.fields.deliver')">
              <NInput
                v-model:value="form.deliver"
                :placeholder="t('developer.webhook.fields.deliverPlaceholder')"
              />
            </NFormItem>
            <NFormItem :label="t('developer.webhook.fields.deliverChatId')">
              <NInput
                v-model:value="form.deliverChatId"
                :placeholder="t('developer.webhook.fields.deliverChatIdPlaceholder')"
              />
            </NFormItem>
          </div>

          <NFormItem :label="t('developer.webhook.fields.secret')">
            <div class="w-full">
              <NInput
                v-model:value="form.secret"
                :placeholder="t('developer.webhook.fields.secretPlaceholder')"
              />
              <div class="mt-1 text-xs text-[var(--text-3)]">
                {{ t('developer.webhook.fields.secretHint') }}
              </div>
            </div>
          </NFormItem>
        </NForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <NButton :disabled="submitting" @click="closeAdd">
              {{ t('developer.webhook.actions.cancel') }}
            </NButton>
            <NButton type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
              {{ t('developer.webhook.actions.subscribe') }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>
  </div>
</template>
