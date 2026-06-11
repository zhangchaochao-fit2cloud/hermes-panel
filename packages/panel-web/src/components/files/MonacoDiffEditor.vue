<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import loader from '@monaco-editor/loader';

const props = withDefaults(defineProps<{
  original: string;
  modified: string;
  language?: string;
}>(), {
  language: 'plaintext',
});

const emit = defineEmits<{
  'close': [];
}>();

const containerRef = ref<HTMLElement | null>(null);
let diffEditor: any = null;
let monacoApi: any = null;
let themeObserver: MutationObserver | null = null;
let disposed = false;

function getTheme(): string {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'dark' ? 'vs-dark' : 'vs';
}

onMounted(async () => {
  const monaco = await loader.init();
  if (disposed || !containerRef.value) return;
  monacoApi = monaco;

  diffEditor = monaco.editor.createDiffEditor(containerRef.value, {
    automaticLayout: true,
    readOnly: true,
    renderSideBySide: true,
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    renderWhitespace: 'selection',
    padding: { top: 12 },
    originalEditable: false,
    enableSplitViewResizing: true,
  });

  const originalModel = monaco.editor.createModel(props.original, props.language);
  const modifiedModel = monaco.editor.createModel(props.modified, props.language);
  diffEditor.setModel({ original: originalModel, modified: modifiedModel });

  themeObserver = new MutationObserver(() => {
    if (monacoApi) {
      monacoApi.editor.setTheme(getTheme());
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
});

watch(() => props.original, (val) => {
  if (diffEditor && monacoApi) {
    const model = diffEditor.getModel();
    if (model?.original) {
      model.original.setValue(val);
    }
  }
});

watch(() => props.modified, (val) => {
  if (diffEditor && monacoApi) {
    const model = diffEditor.getModel();
    if (model?.modified) {
      model.modified.setValue(val);
    }
  }
});

watch(() => props.language, (lang) => {
  if (diffEditor && monacoApi) {
    const model = diffEditor.getModel();
    if (model?.original) monacoApi.editor.setModelLanguage(model.original, lang);
    if (model?.modified) monacoApi.editor.setModelLanguage(model.modified, lang);
  }
});

onBeforeUnmount(() => {
  disposed = true;
  themeObserver?.disconnect();
  diffEditor?.dispose();
  diffEditor = null;
  monacoApi = null;
});
</script>

<template>
  <div class="h-full w-full relative">
    <button
      class="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-elevate)] transition-colors text-xs"
      @click="emit('close')"
    >
      ×
    </button>
    <div ref="containerRef" class="h-full w-full" />
  </div>
</template>
