<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  NTabs, NTabPane, NTag, NButton, NSpin, NInput, NModal,
  NForm, NFormItem, useMessage,
} from 'naive-ui';
import { storeToRefs } from 'pinia';
import { useGithubStore } from '@/stores/github';
import ViewErrorBoundary from '@/components/shared/ViewErrorBoundary.vue';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';
import EmptyState from '@/components/shared/EmptyState.vue';

const msg = useMessage();
const { t } = useI18n();
const store = useGithubStore();
const { repos, issues, workflows, runs, loading, error } = storeToRefs(store);

const selectedRepo = ref<{ owner: string; repo: string } | null>(null);
const issueTitle = ref('');
const issueBody = ref('');
const showIssueModal = ref(false);
const creating = ref(false);
const activeTab = ref('repos');

onMounted(() => {
  void store.loadRepos();
});

function selectRepo(owner: string, repo: string): void {
  selectedRepo.value = { owner, repo };
  void store.loadIssues(owner, repo);
  void store.loadWorkflows(owner, repo);
  void store.loadRuns(owner, repo);
}

async function handleCreateIssue(): Promise<void> {
  if (!selectedRepo.value || !issueTitle.value.trim()) return;
  creating.value = true;
  const result = await store.createIssue(
    selectedRepo.value.owner,
    selectedRepo.value.repo,
    issueTitle.value.trim(),
    issueBody.value.trim() || undefined,
  );
  creating.value = false;
  if (result.ok) {
    msg.success(t('github.issueCreated'));
    showIssueModal.value = false;
    issueTitle.value = '';
    issueBody.value = '';
  } else {
    msg.error(result.message ?? t('github.issueCreateFailed'));
  }
}

async function handleRerun(runId: number): Promise<void> {
  const result = await store.rerun(runId);
  if (result.ok) {
    msg.success(t('github.rerunStarted'));
    if (selectedRepo.value) {
      void store.loadRuns(selectedRepo.value.owner, selectedRepo.value.repo);
    }
  } else {
    msg.error(result.message ?? t('github.rerunFailed'));
  }
}

function stateColor(state: string): 'success' | 'warning' | 'error' | 'default' {
  if (state === 'open' || state === 'active' || state === 'success') return 'success';
  if (state === 'closed' || state === 'completed') return 'default';
  if (state === 'failure' || state === 'error') return 'error';
  if (state === 'pending' || state === 'in_progress' || state === 'queued') return 'warning';
  return 'default';
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString();
}

const repoOwner = computed(() => selectedRepo.value?.owner ?? '');
const repoName = computed(() => selectedRepo.value?.repo ?? '');
</script>

<template>
  <ViewErrorBoundary name="github">
    <div class="px-6 py-6 max-w-[1400px] mx-auto">
      <div class="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 class="text-lg font-bold text-[var(--text-1)] mb-1">{{ t('github.title') }}</h2>
          <p class="text-sm text-[var(--text-3)]">{{ t('github.subtitle') }}</p>
        </div>
        <NButton
          size="small"
          quaternary
          :loading="loading"
          :disabled="loading"
          @click="selectedRepo ? void store.loadIssues(repoOwner, repoName) : void store.loadRepos()"
        >
          {{ t('common.refresh') }}
        </NButton>
      </div>

      <ErrorBanner
        v-if="error"
        :message="`${t('github.loadFailed')}: ${error}`"
        :retry-label="t('common.retry')"
        @retry="selectedRepo ? void store.loadIssues(repoOwner, repoName) : void store.loadRepos()"
      />

      <template v-else-if="!selectedRepo">
        <NSpin v-if="loading" size="small" class="flex justify-center py-20" />
        <EmptyState
          v-else-if="repos.length === 0"
          :title="t('github.noRepos')"
          icon="📦"
        />
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="repo in repos"
            :key="repo.id"
            class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 cursor-pointer hover:border-[var(--brand-600)] transition-colors"
            @click="selectRepo(repo.full_name.split('/')[0], repo.name)"
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <h3 class="text-sm font-semibold text-[var(--text-1)] truncate">{{ repo.name }}</h3>
              <NTag v-if="repo.private" size="tiny" type="warning">private</NTag>
            </div>
            <p v-if="repo.description" class="text-xs text-[var(--text-3)] mb-3 line-clamp-2">{{ repo.description }}</p>
            <div class="flex items-center gap-3 text-xs text-[var(--text-3)]">
              <span v-if="repo.language">{{ repo.language }}</span>
              <span v-if="repo.stargazers_count">★ {{ repo.stargazers_count }}</span>
              <span class="ml-auto">{{ formatTime(repo.updated_at) }}</span>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="mb-4 flex items-center gap-2">
          <NButton size="small" quaternary @click="selectedRepo = null">
            ← {{ t('github.backToRepos') }}
          </NButton>
          <span class="text-sm text-[var(--text-2)] font-medium">{{ repoOwner }}/{{ repoName }}</span>
        </div>

        <NTabs v-model:value="activeTab" type="line" animated>
          <NTabPane name="issues" :tab="t('github.issuesTab')">
            <div class="mb-4">
              <NButton size="small" type="primary" @click="showIssueModal = true">
                {{ t('github.newIssue') }}
              </NButton>
            </div>
            <NSpin v-if="loading" size="small" class="flex justify-center py-10" />
            <EmptyState
              v-else-if="issues.length === 0"
              :title="t('github.noIssues')"
              icon="📋"
            />
            <div v-else class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
              <div
                v-for="issue in issues"
                :key="issue.number"
                class="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0 text-sm"
              >
                <span class="font-mono text-[var(--text-3)] w-[60px] flex-shrink-0">#{{ issue.number }}</span>
                <span class="text-[var(--text-1)] flex-1 truncate">{{ issue.title }}</span>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <NTag
                    v-for="label in issue.labels.slice(0, 3)"
                    :key="label.name"
                    size="tiny"
                    :bordered="false"
                    :style="{ backgroundColor: `#${label.color}20`, color: `#${label.color}` }"
                  >
                    {{ label.name }}
                  </NTag>
                </div>
                <NTag :type="stateColor(issue.state)" size="tiny">{{ issue.state }}</NTag>
                <a
                  :href="issue.html_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[var(--text-3)] hover:text-[var(--brand-600)] flex-shrink-0"
                  @click.stop
                >
                  ↗
                </a>
              </div>
            </div>
          </NTabPane>

          <NTabPane name="ci" :tab="t('github.ciTab')">
            <div class="mb-4">
              <NButton
                size="small"
                quaternary
                :loading="loading"
                :disabled="loading"
                @click="void store.loadRuns(repoOwner, repoName)"
              >
                {{ t('common.refresh') }}
              </NButton>
            </div>

            <div v-if="workflows.length" class="mb-6">
              <h3 class="text-sm font-semibold text-[var(--text-1)] mb-3">{{ t('github.workflows') }}</h3>
              <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div
                  v-for="wf in workflows"
                  :key="wf.id"
                  class="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0 text-sm"
                >
                  <NTag :type="wf.state === 'active' ? 'success' : 'default'" size="tiny">{{ wf.state }}</NTag>
                  <span class="text-[var(--text-1)] flex-1 truncate">{{ wf.name }}</span>
                  <a
                    :href="wf.html_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-[var(--text-3)] hover:text-[var(--brand-600)]"
                    @click.stop
                  >
                    ↗
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-semibold text-[var(--text-1)] mb-3">{{ t('github.recentRuns') }}</h3>
              <NSpin v-if="loading" size="small" class="flex justify-center py-10" />
              <EmptyState
                v-else-if="runs.length === 0"
                :title="t('github.noRuns')"
                icon="🔄"
              />
              <div v-else class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div
                  v-for="run in runs"
                  :key="run.id"
                  class="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0 text-sm"
                >
                  <span class="text-[var(--text-3)] w-[50px] flex-shrink-0 tabular-nums">#{{ run.run_number }}</span>
                  <NTag :type="stateColor(run.conclusion ?? run.status)" size="tiny">
                    {{ run.conclusion ?? run.status }}
                  </NTag>
                  <span class="text-[var(--text-1)] flex-1 truncate">{{ run.name }}</span>
                  <span class="text-[var(--text-3)] text-xs">{{ run.head_branch }}</span>
                  <span class="text-[var(--text-3)] text-xs w-[140px] flex-shrink-0">{{ formatTime(run.updated_at) }}</span>
                  <NButton
                    size="tiny"
                    quaternary
                    :disabled="run.status === 'in_progress' || run.status === 'queued'"
                    @click="handleRerun(run.id)"
                  >
                    {{ t('github.rerun') }}
                  </NButton>
                  <a
                    :href="run.html_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-[var(--text-3)] hover:text-[var(--brand-600)] flex-shrink-0"
                    @click.stop
                  >
                    ↗
                  </a>
                </div>
              </div>
            </div>
          </NTabPane>
        </NTabs>
      </template>

      <NModal v-model:show="showIssueModal" preset="card" :title="t('github.newIssue')" style="width: 520px">
        <NForm label-placement="top">
          <NFormItem :label="t('github.issueTitle')">
            <NInput v-model:value="issueTitle" :placeholder="t('github.issueTitlePlaceholder')" />
          </NFormItem>
          <NFormItem :label="t('github.issueBody')">
            <NInput
              v-model:value="issueBody"
              type="textarea"
              :rows="5"
              :placeholder="t('github.issueBodyPlaceholder')"
            />
          </NFormItem>
        </NForm>
        <template #footer>
          <div class="flex justify-end gap-2">
            <NButton size="small" @click="showIssueModal = false">{{ t('common.cancel') }}</NButton>
            <NButton size="small" type="primary" :loading="creating" :disabled="!issueTitle.trim()" @click="handleCreateIssue">
              {{ t('github.createIssue') }}
            </NButton>
          </div>
        </template>
      </NModal>
    </div>
  </ViewErrorBoundary>
</template>
