/**
 * Sync Bus — broadcast session events to all connected SSE clients.
 * Enables multi-device / multi-tab real-time sync without WebSocket.
 */

import { PassThrough } from 'node:stream';
import { logger } from '../lib/logger.js';

export type SyncEventType = 'session.updated' | 'session.new' | 'session.deleted' | 'message.new' | 'goal.updated';

export interface SyncEvent {
  type: SyncEventType;
  payload: Record<string, unknown>;
  timestamp: number;
}

const clients = new Set<PassThrough>();
const clientLastSeen = new WeakMap<PassThrough, number>();

// Periodic cleanup of stale clients (every 60s, remove clients idle > 2min)
const _cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const c of clients) {
    const lastSeen = clientLastSeen.get(c) ?? 0;
    if (now - lastSeen > 120_000) {
      try { c.end(); } catch { /* already closed */ }
      clients.delete(c);
    }
  }
}, 60_000);
_cleanupTimer.unref();

function _onClientEvent(stream: PassThrough): void {
  clientLastSeen.set(stream, Date.now());
  clients.delete(stream);
}

export function addClient(stream: PassThrough): void {
  clients.add(stream);
  clientLastSeen.set(stream, Date.now());
  stream.on('close', () => _onClientEvent(stream));
  stream.on('error', () => _onClientEvent(stream));
  logger.debug({ clientCount: clients.size }, 'sync client connected');
}

export function removeClient(stream: PassThrough): void {
  stream.removeAllListeners('close');
  stream.removeAllListeners('error');
  clients.delete(stream);
}

export function broadcast(event: SyncEvent): void {
  const data = JSON.stringify(event);
  const msg = `data: ${data}\n\n`;
  for (const client of clients) {
    try { client.write(msg); }
    catch { clients.delete(client); }
  }
}

export function emit(type: SyncEventType, payload: Record<string, unknown>): void {
  broadcast({ type, payload, timestamp: Date.now() });
}

export function getClientCount(): number {
  return clients.size;
}
