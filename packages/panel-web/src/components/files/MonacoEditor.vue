<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import loader from '@monaco-editor/loader';

const props = withDefaults(defineProps<{
  modelValue: string;
  language?: string;
  readOnly?: boolean;
}>(), {
  language: 'plaintext',
  readOnly: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'cursor-position': [line: number, column: number];
}>();

const containerRef = ref<HTMLElement | null>(null);
let editor: any = null;
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

  editor = monaco.editor.create(containerRef.value, {
    value: props.modelValue,
    language: props.language,
    readOnly: props.readOnly,
    theme: getTheme(),
    minimap: { enabled: false },
    automaticLayout: true,
    fontSize: 13,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    tabSize: 2,
    renderWhitespace: 'selection',
    bracketPairColorization: { enabled: true },
    padding: { top: 12 },
  });

  editor.onDidChangeModelContent(() => {
    emit('update:modelValue', editor.getValue());
  });

  editor.onDidChangeCursorPosition((e: any) => {
    emit('cursor-position', e.position.lineNumber, e.position.column);
  });

  themeObserver = new MutationObserver(() => {
    if (editor && monacoApi) {
      monacoApi.editor.setTheme(getTheme());
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
});

watch(() => props.modelValue, (newVal) => {
  if (editor && editor.getValue() !== newVal) {
    editor.setValue(newVal);
  }
});

watch(() => props.language, (lang) => {
  if (editor && monacoApi) {
    monacoApi.editor.setModelLanguage(editor.getModel(), lang);
  }
});

onBeforeUnmount(() => {
  disposed = true;
  themeObserver?.disconnect();
  editor?.dispose();
  editor = null;
  monacoApi = null;
});
</script>

<template>
  <div ref="containerRef" class="h-full w-full" />
</template>
