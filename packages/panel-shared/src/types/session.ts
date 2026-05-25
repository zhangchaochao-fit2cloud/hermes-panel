import type { ChatMessage } from './chat.js';

export interface SessionSummary {
  id: string;
  title: string;
  model: string;
  messageCount: number;
  tokenTotal: number;
  createdAt: number;
  updatedAt: number;
}

export interface SessionDetail extends SessionSummary {
  messages: ChatMessage[];
}
