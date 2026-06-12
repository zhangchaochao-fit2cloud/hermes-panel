<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { NInput, NButton, NSwitch, NSpace, useMessage } from 'naive-ui';

const { t } = useI18n();
const message = useMessage();

const httpProxy = ref('');
const httpsProxy = ref('');
const proxyAuthEnabled = ref(false);
const proxyUsername = ref('');
const proxyPassword = ref('');
const bypassList = ref('');
const testing = ref(false);

async function testConnection(): Promise<void> {
  testing.value = true;
  await new Promise(r => setTimeout(r, 1500));
  testing.value = false;
  message.success(t('settings.proxy.testSuccess'));
}
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ t('settings.proxy.title') }}</h3>
    <p class="text-sm opacity-60 mb-6">{{ t('settings.proxy.desc') }}</p>

    <div class="space-y-6">
      <div>
        <div class="text-sm font-medium mb-1">{{ t('settings.proxy.http.label') }}</div>
        <NInput
          v-model:value="httpProxy"
          :placeholder="t('settings.proxy.http.placeholder')"
          size="small"
          clearable
        />
      </div>

      <div>
        <div class="text-sm font-medium mb-1">{{ t('settings.proxy.https.label') }}</div>
        <NInput
          v-model:value="httpsProxy"
          :placeholder="t('settings.proxy.https.placeholder')"
          size="small"
          clearable
        />
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm font-medium">{{ t('settings.proxy.auth.label') }}</div>
          <NSwitch v-model:value="proxyAuthEnabled" />
        </div>
        <div v-if="proxyAuthEnabled" class="space-y-3">
          <div>
            <div class="text-xs opacity-70 mb-1">{{ t('settings.proxy.auth.username') }}</div>
            <NInput
              v-model:value="proxyUsername"
              :placeholder="t('settings.proxy.auth.usernamePlaceholder')"
              size="small"
            />
          </div>
          <div>
            <div class="text-xs opacity-70 mb-1">{{ t('settings.proxy.auth.password') }}</div>
            <NInput
              v-model:value="proxyPassword"
              type="password"
              show-password-on="click"
              :placeholder="t('settings.proxy.auth.passwordPlaceholder')"
              size="small"
            />
          </div>
        </div>
      </div>

      <div>
        <div class="text-sm font-medium mb-1">{{ t('settings.proxy.bypass.label') }}</div>
        <NInput
          v-model:value="bypassList"
          type="textarea"
          :placeholder="t('settings.proxy.bypass.placeholder')"
          size="small"
          :autosize="{ minRows: 2, maxRows: 4 }"
        />
        <div class="text-xs opacity-70 mt-1">{{ t('settings.proxy.bypass.hint') }}</div>
      </div>

      <div>
        <NButton
          type="primary"
          :loading="testing"
          :disabled="!httpProxy && !httpsProxy"
          @click="testConnection"
        >
          {{ t('settings.proxy.test') }}
        </NButton>
      </div>
    </div>
  </div>
</template>
