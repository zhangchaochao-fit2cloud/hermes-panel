/**
 * Static catalog of context window sizes (input tokens) per model id.
 *
 * Numbers are plausible defaults; some providers vary the limit across SKUs,
 * so the catalog only carries one canonical figure per family. The companion
 * `inferContextLimit()` does an exact-match first, then a prefix scan, so
 * variants like `gpt-5-mini` resolve to the `gpt-5` family value when there
 * is no dedicated entry.
 *
 * Source of truth for runtime limits remains the session store
 * (`session.contextLimit`); this map is a UI-side fallback for when the
 * backend does not report a limit and we only have a model id.
 */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // Anthropic Claude family — 200K shared across Opus/Sonnet/Haiku 3.x→4.x.
  'claude-opus-4-7': 200_000,
  'claude-opus-4-1': 200_000,
  'claude-sonnet-4-6': 200_000,
  'claude-sonnet-4-5': 200_000,
  'claude-haiku-4-5-20251001': 200_000,
  'claude-3-5-haiku-latest': 200_000,
  'claude-3-5-sonnet-latest': 200_000,
  'claude-3-opus-latest': 200_000,
  'claude-': 200_000, // prefix catch-all for unknown claude-* variants

  // OpenAI GPT family — 128K input across GPT-4.1/GPT-5 mainline.
  'gpt-5': 128_000,
  'gpt-5-mini': 128_000,
  'gpt-4.1': 128_000,
  'gpt-4.1-mini': 128_000,
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-': 128_000, // prefix catch-all

  // OpenAI o-series reasoning models — 200K context window.
  'o3': 200_000,
  'o3-mini': 200_000,
  'o4-mini': 200_000,
  'o4': 200_000,

  // DeepSeek — 64K context across v3/v4 chat and reasoner SKUs.
  'deepseek-v4-flash': 64_000,
  'deepseek-v4-reasoner': 64_000,
  'deepseek-chat': 64_000,
  'deepseek-reasoner': 64_000,
  'deepseek-': 64_000,

  // Google Gemini — 1M for Pro tier, 2M for the biggest preview models.
  'gemini-3-pro-preview': 2_000_000,
  'gemini-3-flash-preview': 1_000_000,
  'gemini-2.5-pro': 2_000_000,
  'gemini-2.5-flash': 1_000_000,
  'google/gemini-3-pro-preview': 2_000_000,
  'google/gemini-3-flash-preview': 1_000_000,
  'gemini-': 1_000_000,

  // Meta Llama 4 — 200K tokens (Maverick/Scout).
  'llama-4-maverick': 200_000,
  'llama-4-scout': 200_000,
  'meta-llama/llama-4-maverick': 200_000,
  'meta-llama/llama-4-scout': 200_000,
  'llama-': 200_000,

  // Qwen 3 — 128K input.
  'qwen-3-235b-instruct': 128_000,
  'qwen3-turbo': 128_000,
  'qwen/qwen-3-235b-instruct': 128_000,
  'qwen-': 128_000,
  'qwen3-': 128_000,

  // Mistral — 128K on Large 2411 and friends.
  'mistral-large-2411': 128_000,
  'mistral-large': 128_000,
  'mistralai/mistral-large-2411': 128_000,
  'mistral-': 128_000,

  // xAI Grok 4 — 256K context.
  'grok-4': 256_000,
  'grok-4-mini': 256_000,
  'x-ai/grok-4': 256_000,
  'grok-': 256_000,

  // Zhipu GLM
  'glm-4.7': 128_000,
  'glm-': 128_000,
};

/**
 * Resolve a context-window size for a given model id.
 *
 * 1. Exact match against `MODEL_CONTEXT_LIMITS`.
 * 2. Prefix scan: pick the longest key in the map that the model id starts
 *    with (so `gpt-5-mini` finds `gpt-5` before falling back to `gpt-`).
 * 3. Caller-supplied `fallback` (default 128K).
 *
 * Accepts `null`/`undefined` because the calling component receives the
 * model id from a Pinia store ref that may not be populated yet.
 */
export function inferContextLimit(
  modelId: string | null | undefined,
  fallback: number = 128_000,
): number {
  if (!modelId) return fallback;

  const direct = MODEL_CONTEXT_LIMITS[modelId];
  if (typeof direct === 'number') return direct;

  // Longest prefix wins so the more specific family value is preferred.
  let bestKey = '';
  for (const key of Object.keys(MODEL_CONTEXT_LIMITS)) {
    if (modelId.startsWith(key) && key.length > bestKey.length) {
      bestKey = key;
    }
  }
  if (bestKey) return MODEL_CONTEXT_LIMITS[bestKey];

  return fallback;
}
