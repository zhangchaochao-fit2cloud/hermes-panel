import { ref, watch, type Ref } from 'vue';
import { bffFetch } from '@/api/bff';

export interface SmartSuggestion {
  show: boolean;
  message: string;
  action: 'orchestrate' | 'route' | null;
}

/**
 * Watches the composer input and suggests mode upgrades for complex tasks.
 * Debounced — only fires after 1.5s of no typing and prompt > 150 chars.
 */
export function useSmartSuggestion(input: Ref<string>) {
  const suggestion = ref<SmartSuggestion>({ show: false, message: '', action: null });
  let timer: ReturnType<typeof setTimeout> | null = null;

  watch(input, (text) => {
    suggestion.value = { show: false, message: '', action: null };
    if (timer) clearTimeout(timer);
    if (text.trim().length < 150) return;

    timer = setTimeout(async () => {
      try {
        const result = await bffFetch<{ tier: string; model: string; confidence: number }>(
          '/api/model-router/route',
          { method: 'POST', body: JSON.stringify({ prompt: text }), silent: true },
        );
        if (result.tier === 'complex' && result.confidence >= 0.7) {
          suggestion.value = {
            show: true,
            message: 'This task looks complex — orchestration mode may give better results',
            action: 'orchestrate',
          };
        }
      } catch { /* silent */ }
    }, 1500);
  });

  function dismiss(): void {
    suggestion.value = { show: false, message: '', action: null };
  }

  return { suggestion, dismiss };
}
