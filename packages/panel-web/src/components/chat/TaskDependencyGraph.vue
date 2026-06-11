<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useI18n } from 'vue-i18n';

interface TaskNode {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  x: number;
  y: number;
}

interface TaskEdge {
  from: string;
  to: string;
}

const props = defineProps<{
  tasks: TaskNode[];
  edges: TaskEdge[];
}>();

const { t } = useI18n();
const svgRef = ref<SVGSVGElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

const viewState = ref({
  x: 0,
  y: 0,
  zoom: 1,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  viewBoxStartX: 0,
  viewBoxStartY: 0
});

const statusColors = {
  pending: '#6b7280',
  running: '#3b82f6',
  completed: '#10b981',
  failed: '#ef4444'
};

const nodePositions = computed(() => {
  return props.tasks.map(task => ({
    ...task,
    color: statusColors[task.status]
  }));
});

const edgesWithPositions = computed(() => {
  const taskMap = new Map(props.tasks.map(task => [task.id, task]));
  return props.edges
    .filter(edge => taskMap.has(edge.from) && taskMap.has(edge.to))
    .map(edge => {
      const fromTask = taskMap.get(edge.from)!;
      const toTask = taskMap.get(edge.to)!;
      return {
        from: { x: fromTask.x + 60, y: fromTask.y + 20 },
        to: { x: toTask.x, y: toTask.y + 20 }
      };
    });
});

function handleMouseDown(event: MouseEvent): void {
  if (event.button !== 0) return;
  viewState.value.isDragging = true;
  viewState.value.dragStartX = event.clientX;
  viewState.value.dragStartY = event.clientY;
  viewState.value.viewBoxStartX = viewState.value.x;
  viewState.value.viewBoxStartY = viewState.value.y;
}

function handleMouseMove(event: MouseEvent): void {
  if (!viewState.value.isDragging) return;
  const deltaX = event.clientX - viewState.value.dragStartX;
  const deltaY = event.clientY - viewState.value.dragStartY;
  viewState.value.x = viewState.value.viewBoxStartX - deltaX / viewState.value.zoom;
  viewState.value.y = viewState.value.viewBoxStartY - deltaY / viewState.value.zoom;
}

function handleMouseUp(): void {
  viewState.value.isDragging = false;
}

function handleWheel(event: WheelEvent): void {
  event.preventDefault();
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.1, Math.min(5, viewState.value.zoom * zoomFactor));
  
  const rect = svgRef.value?.getBoundingClientRect();
  if (!rect) return;
  
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  
  const svgPoint = screenToSvg(mouseX, mouseY);
  viewState.value.zoom = newZoom;
  
  const newSvgPoint = screenToSvg(mouseX, mouseY);
  viewState.value.x += svgPoint.x - newSvgPoint.x;
  viewState.value.y += svgPoint.y - newSvgPoint.y;
}

function screenToSvg(screenX: number, screenY: number): { x: number; y: number } {
  return {
    x: screenX / viewState.value.zoom + viewState.value.x,
    y: screenY / viewState.value.zoom + viewState.value.y
  };
}

function viewBox(): string {
  const width = containerRef.value?.clientWidth || 800;
  const height = containerRef.value?.clientHeight || 600;
  return `${viewState.value.x} ${viewState.value.y} ${width / viewState.value.zoom} ${height / viewState.value.zoom}`;
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});

watch(() => props.tasks, () => {
  if (props.tasks.length === 0) return;
  
  const minX = Math.min(...props.tasks.map(t => t.x));
  const minY = Math.min(...props.tasks.map(t => t.y));
  const maxX = Math.max(...props.tasks.map(t => t.x));
  const maxY = Math.max(...props.tasks.map(t => t.y));
  
  const padding = 50;
  viewState.value.x = minX - padding;
  viewState.value.y = minY - padding;
}, { immediate: true });
</script>

<template>
  <div 
    ref="containerRef" 
    class="task-dependency-graph"
    @mousedown="handleMouseDown"
    @wheel="handleWheel"
  >
    <svg 
      ref="svgRef" 
      width="100%" 
      height="100%" 
      :viewBox="viewBox()"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
        </marker>
      </defs>
      
      <g class="edges">
        <path
          v-for="(edge, index) in edgesWithPositions"
          :key="`edge-${index}`"
          :d="`M ${edge.from.x} ${edge.from.y} C ${(edge.from.x + edge.to.x) / 2} ${edge.from.y}, ${(edge.from.x + edge.to.x) / 2} ${edge.to.y}, ${edge.to.x} ${edge.to.y}`"
          fill="none"
          stroke="#9ca3af"
          stroke-width="2"
          marker-end="url(#arrowhead)"
        />
      </g>
      
      <g class="nodes">
        <g
          v-for="task in nodePositions"
          :key="task.id"
          :transform="`translate(${task.x}, ${task.y})`"
        >
          <rect
            x="0"
            y="0"
            width="120"
            height="40"
            rx="8"
            :fill="task.color"
            fill-opacity="0.1"
            :stroke="task.color"
            stroke-width="2"
          />
          <text
            x="60"
            y="20"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="currentColor"
            font-size="12"
            font-weight="500"
          >
            {{ task.name }}
          </text>
          <circle
            cx="10"
            cy="10"
            r="4"
            :fill="task.color"
          />
        </g>
      </g>
    </svg>
    
    <div class="zoom-controls">
      <button @click="viewState.zoom = Math.min(5, viewState.zoom * 1.2)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
          <path d="M11 8v6M8 11h6"/>
        </svg>
      </button>
      <button @click="viewState.zoom = Math.max(0.1, viewState.zoom / 1.2)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
          <path d="M8 11h6"/>
        </svg>
      </button>
      <button @click="viewState.zoom = 1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3h18v18H3z"/>
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
        </svg>
      </button>
    </div>
    
    <div class="legend">
      <div class="legend-item" v-for="(color, status) in statusColors" :key="status">
        <span class="legend-color" :style="{ backgroundColor: color }"></span>
        <span class="legend-label">{{ t(`chat.taskDependency.status.${status}`) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-dependency-graph {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--bg-card) 96%, transparent);
  overflow: hidden;
  cursor: grab;
  user-select: none;
}

.task-dependency-graph:active {
  cursor: grabbing;
}

.zoom-controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
}

.zoom-controls button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.zoom-controls button:hover {
  background: var(--bg-elevate);
  color: var(--text-1);
}

.legend {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-card) 90%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.legend-label {
  font-size: 12px;
  color: var(--text-3);
}
</style>