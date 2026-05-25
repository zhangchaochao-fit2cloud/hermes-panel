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
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'running' | 'done' | 'error';
  errorMessage?: string;
  startedAt: number;
  completedAt?: number;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  cached: number;
  total: number;
  cost?: number;
}

export type SSEEvent =
  | { type: 'message.start'; messageId: string; role: Role }
  | { type: 'message.delta'; messageId: string; text: string }
  | { type: 'message.reasoning'; messageId: string; text: string }
  | { type: 'tool.call.start'; toolCallId: string; messageId: string; name: string; input: Record<string, unknown> }
  | { type: 'tool.call.result'; toolCallId: string; output: unknown }
  | { type: 'tool.call.error'; toolCallId: string; error: string }
  | { type: 'message.complete'; messageId: string; usage?: TokenUsage }
  | { type: 'run.done'; runId: string }
  | { type: 'run.error'; runId: string; error: string };
