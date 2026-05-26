/**
 * A curated catalog of commonly used inference models, grouped by provider.
 * Hermes itself does not expose a "list models per provider" endpoint, so we
 * ship this static list as the picker's default options. Users can always
 * type a custom name if their model isn't here.
 */
export interface KnownModel {
  /** Model id as accepted by the provider (and what we write to config.yaml). */
  id: string;
  /** Friendly label shown in the dropdown. */
  label: string;
  /** Provider id matching `model.provider` in hermes config. */
  provider: string;
  /** Optional base URL hint for custom providers. */
  baseUrl?: string;
}

export interface KnownModelGroup {
  /** Provider family id (matches hermes `model.provider` for native providers,
   *  or a logical grouping such as `openrouter` / `custom`). */
  provider: string;
  /** Display name for the group. */
  label: string;
  models: KnownModel[];
}

export const KNOWN_MODEL_GROUPS: readonly KnownModelGroup[] = [
  {
    provider: 'anthropic',
    label: 'Anthropic',
    models: [
      { id: 'claude-opus-4-7', label: 'Claude Opus 4.7', provider: 'anthropic' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic' },
      { id: 'claude-opus-4-1', label: 'Claude Opus 4.1', provider: 'anthropic' },
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic' },
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', provider: 'anthropic' },
    ],
  },
  {
    provider: 'openai',
    label: 'OpenAI',
    models: [
      { id: 'gpt-5', label: 'GPT-5', provider: 'openai' },
      { id: 'gpt-5-mini', label: 'GPT-5 Mini', provider: 'openai' },
      { id: 'gpt-4.1', label: 'GPT-4.1', provider: 'openai' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai' },
      { id: 'o3', label: 'o3 (reasoning)', provider: 'openai' },
      { id: 'o4-mini', label: 'o4-mini (reasoning)', provider: 'openai' },
    ],
  },
  {
    provider: 'openrouter',
    label: 'OpenRouter',
    models: [
      { id: 'anthropic/claude-opus-4-7', label: 'Claude Opus 4.7 (via OR)', provider: 'openrouter' },
      { id: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (via OR)', provider: 'openrouter' },
      { id: 'openai/gpt-5', label: 'GPT-5 (via OR)', provider: 'openrouter' },
      { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini (via OR)', provider: 'openrouter' },
      { id: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', provider: 'openrouter' },
      { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', provider: 'openrouter' },
      { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', provider: 'openrouter' },
      { id: 'x-ai/grok-4', label: 'Grok 4', provider: 'openrouter' },
      { id: 'mistralai/mistral-large-2411', label: 'Mistral Large 2411', provider: 'openrouter' },
      { id: 'qwen/qwen-3-235b-instruct', label: 'Qwen 3 235B', provider: 'openrouter' },
    ],
  },
  {
    provider: 'custom',
    label: 'Custom (OpenAI-compatible)',
    models: [
      { id: 'deepseek-v4-flash', label: 'DeepSeek v4 Flash', provider: 'custom', baseUrl: 'https://api.deepseek.com' },
      { id: 'deepseek-v4-reasoner', label: 'DeepSeek v4 Reasoner', provider: 'custom', baseUrl: 'https://api.deepseek.com' },
      { id: 'deepseek-chat', label: 'DeepSeek Chat', provider: 'custom', baseUrl: 'https://api.deepseek.com' },
      { id: 'glm-4.7', label: 'GLM 4.7 (Zhipu)', provider: 'custom', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
      { id: 'qwen3-turbo', label: 'Qwen3 Turbo (DashScope)', provider: 'custom', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    ],
  },
  {
    provider: 'xai',
    label: 'xAI',
    models: [
      { id: 'grok-4', label: 'Grok 4', provider: 'xai' },
      { id: 'grok-4-mini', label: 'Grok 4 Mini', provider: 'xai' },
    ],
  },
  {
    provider: 'copilot',
    label: 'GitHub Copilot',
    models: [
      { id: 'gpt-5', label: 'GPT-5 (Copilot)', provider: 'copilot' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Copilot)', provider: 'copilot' },
    ],
  },
] as const;

/** Flat list, useful for typeahead. */
export const KNOWN_MODELS: readonly KnownModel[] = KNOWN_MODEL_GROUPS.flatMap(g => g.models);

/** Lookup a model by id (returns undefined for custom-typed names). */
export function findKnownModel(id: string): KnownModel | undefined {
  return KNOWN_MODELS.find(m => m.id === id);
}
