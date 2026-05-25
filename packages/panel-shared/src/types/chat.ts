export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
  createdAt: number;
  completed: boolean;
  tokenUsage?: TokenUsage;
  /** Local heuristic quality score 0-100; computed when message completes */
  qualityScore?: number;
  /** Local heuristic hallucination risk 0-1 */
  hallucinationRisk?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  preview?: string;
  status: 'pending' | 'running' | 'done' | 'error';
  errorMessage?: string;
  startedAt: number;
  completedAt?: number;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  cost?: number;
}

/**
 * SSE events as emitted by Hermes API server.
 *
 * Wire format (HTTP):
 *   data: {"event": "message.delta", "run_id": "...", "timestamp": 123, "delta": "你"}\n\n
 *
 * The event name lives inside the JSON payload, NOT in an `event:` SSE header.
 */
export type HermesSSEEvent =
  | { event: 'message.delta'; run_id: string; timestamp: number; delta: string }
  | { event: 'reasoning.available'; run_id: string; timestamp: number; text: string }
  | { event: 'tool.started'; run_id: string; timestamp: number; tool: string; preview?: string }
  | { event: 'tool.completed'; run_id: string; timestamp: number; tool: string; duration?: number; error?: boolean }
  | { event: 'run.completed'; run_id: string; timestamp: number; output?: string; usage?: HermesUsage }
  | { event: 'run.error'; run_id: string; timestamp: number; error: string }
  // Allow forward-compat: unknown events are skipped silently
  | { event: string; run_id: string; timestamp: number; [k: string]: unknown };

export interface HermesUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}
