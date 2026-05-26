import type { ChatMessage } from './chat.js';

/**
 * Real session origin classes that appear in ~/.hermes/state.db.sessions.source.
 * 'unknown' is a panel-side fallback for forward-compatibility — we never
 * write 'unknown' but if a future Hermes adds a new source we surface it
 * without crashing the typed filter.
 */
export type SessionSource = 'cli' | 'cron' | 'api_server' | 'unknown';

export interface SessionSummary {
  id: string;
  title: string;
  model: string;
  source: SessionSource;
  messageCount: number;
  tokenTotal: number;
  createdAt: number;
  updatedAt: number;
}

export interface SessionDetail extends SessionSummary {
  messages: ChatMessage[];
}
