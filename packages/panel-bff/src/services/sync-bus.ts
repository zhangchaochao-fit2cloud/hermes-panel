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

export function addClient(stream: PassThrough): void {
  clients.add(stream);
  stream.on('close', () => clients.delete(stream));
  stream.on('error', () => clients.delete(stream));
  logger.debug({ clientCount: clients.size }, 'sync client connected');
}

export function removeClient(stream: PassThrough): void {
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
