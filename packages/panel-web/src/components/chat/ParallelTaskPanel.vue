<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { NProgress, NButton, NModal, NScrollbar } from 'naive-ui';

interface ParallelTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: number;
  endTime?: number;
  output?: string;
  error?: string;
}

const props = defineProps<{
  tasks: ParallelTask[];
  onCancelTask?: (taskId: string) => void;
}>();

const { t } = useI18n();
const selectedTask = ref<ParallelTask | null>(null);
const showLogModal = ref(false);

const stats = computed(() => {
  const total = props.tasks.length;
  const completed = props.tasks.filter(task => task.status === 'completed').length;
  const failed = props.tasks.filter(task => task.status === 'failed').length;
  const running = props.tasks.filter(task => task.status === 'running').length;
  const pending = props.tasks.filter(task => task.status === 'pending').length;
  
  return { total, completed, failed, running, pending };
});

function formatDuration(startTime: number, endTime?: number): string {
  const duration = (endTime || Date.now()) - startTime;
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

function getStatusColor(status: ParallelTask['status']): string {
  const colors = {
    pending: 'var(--text-3)',
    running: 'var(--brand-500)',
    completed: 'var(--color-success)',
    failed: 'var(--color-error)',
    cancelled: 'var(--text-3)'
  };
  return colors[status];
}

function getStatusIcon(status: ParallelTask['status']): string {
  const icons = {
    pending: '○',
    running: '◉',
    completed: '✓',
    failed: '✗',
    cancelled: '○'
  };
  return icons[status];
}

function viewTaskOutput(task: ParallelTask): void {
  selectedTask.value = task;
  showLogModal.value = true;
}

function cancelTask(taskId: string): void {
  props.onCancelTask?.(taskId);
}
</script>

<template>
  <div class="parallel-task-panel">
    <div class="panel-header">
      <h3>{{ t('chat.parallelTasks.title') }}</h3>
      <div class="task-stats">
        <span class="stat-item">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">{{ t('chat.parallelTasks.stats.total') }}</span>
        </span>
        <span class="stat-item completed">
          <span class="stat-value">{{ stats.completed }}</span>
          <span class="stat-label">{{ t('chat.parallelTasks.stats.completed') }}</span>
        </span>
        <span class="stat-item failed">
          <span class="stat-value">{{ stats.failed }}</span>
          <span class="stat-label">{{ t('chat.parallelTasks.stats.failed') }}</span>
        </span>
        <span class="stat-item running">
          <span class="stat-value">{{ stats.running }}</span>
          <span class="stat-label">{{ t('chat.parallelTasks.stats.running') }}</span>
        </span>
        <span class="stat-item pending">
          <span class="stat-value">{{ stats.pending }}</span>
          <span class="stat-label">{{ t('chat.parallelTasks.stats.pending') }}</span>
        </span>
      </div>
    </div>
    
    <div class="task-list">
      <div 
        v-for="task in tasks" 
        :key="task.id" 
        class="task-item"
        :class="task.status"
      >
        <div class="task-header">
          <div class="task-status" :style="{ color: getStatusColor(task.status) }">
            <span class="status-icon">{{ getStatusIcon(task.status) }}</span>
            <span class="status-text">{{ t(`chat.parallelTasks.status.${task.status}`) }}</span>
          </div>
          <div class="task-name">{{ task.name }}</div>
        </div>
        
        <div class="task-progress">
          <NProgress 
            :percentage="task.progress" 
            :status="task.status === 'failed' ? 'error' : task.status === 'completed' ? 'success' : 'info'"
            :show-indicator="false"
            :height="6"
          />
          <span class="progress-text">{{ task.progress }}%</span>
        </div>
        
        <div class="task-meta">
          <span class="meta-item">
            <span class="meta-label">{{ t('chat.parallelTasks.meta.startTime') }}</span>
            <span class="meta-value">{{ formatTime(task.startTime) }}</span>
          </span>
          <span class="meta-item">
            <span class="meta-label">{{ t('chat.parallelTasks.meta.duration') }}</span>
            <span class="meta-value">{{ formatDuration(task.startTime, task.endTime) }}</span>
          </span>
        </div>
        
        <div class="task-actions">
          <NButton 
            v-if="task.status === 'running'" 
            size="small" 
            type="error" 
            @click="cancelTask(task.id)"
          >
            {{ t('chat.parallelTasks.actions.cancel') }}
          </NButton>
          <NButton 
            v-if="task.output || task.error" 
            size="small" 
            @click="viewTaskOutput(task)"
          >
            {{ t('chat.parallelTasks.actions.viewLog') }}
          </NButton>
        </div>
      </div>
      
      <div v-if="tasks.length === 0" class="empty-state">
        {{ t('chat.parallelTasks.empty') }}
      </div>
    </div>
    
    <NModal 
      v-model:show="showLogModal" 
      :title="selectedTask ? `${t('chat.parallelTasks.log.title')}: ${selectedTask.name}` : ''"
      :style="{ width: '800px' }"
    >
      <NScrollbar style="max-height: 60vh;">
        <pre v-if="selectedTask" class="task-output">{{ selectedTask.output || selectedTask.error }}</pre>
      </NScrollbar>
    </NModal>
  </div>
</template>

<style scoped>
.parallel-task-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--bg-card) 96%, transparent);
  overflow: hidden;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
}

.panel-header h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-1);
}

.task-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-1);
}

.stat-label {
  font-size: 12px;
  color: var(--text-3);
}

.stat-item.completed .stat-value {
  color: var(--color-success);
}

.stat-item.failed .stat-value {
  color: var(--color-error);
}

.stat-item.running .stat-value {
  color: var(--brand-500);
}

.stat-item.pending .stat-value {
  color: var(--text-3);
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.task-item {
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-elevate) 56%, transparent);
}

.task-item.failed {
  border-color: color-mix(in srgb, var(--color-error) 20%, transparent);
  background: color-mix(in srgb, var(--color-error) 5%, transparent);
}

.task-item.completed {
  border-color: color-mix(in srgb, var(--color-success) 20%, transparent);
  background: color-mix(in srgb, var(--color-success) 5%, transparent);
}

.task-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.task-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
}

.status-icon {
  font-size: 14px;
}

.task-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  color: var(--text-1);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.progress-text {
  min-width: 40px;
  font-size: 12px;
  color: var(--text-3);
  text-align: right;
}

.task-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 12px;
}

.meta-item {
  display: flex;
  gap: 4px;
}

.meta-label {
  color: var(--text-3);
}

.meta-value {
  color: var(--text-2);
  font-weight: 500;
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--text-3);
  font-size: 14px;
}

.task-output {
  margin: 0;
  padding: 12px;
  background: var(--bg-elevate);
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>