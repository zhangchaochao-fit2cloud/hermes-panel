import { randomUUID } from 'node:crypto';
import { getLicenseDb } from '../db.js';

interface OrderRow {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  created_at: number;
  updated_at: number;
}

export interface OrderInfo {
  id: string;
  userId: string;
  tier: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

function toOrder(row: OrderRow): OrderInfo {
  return { id: row.id, userId: row.user_id, tier: row.tier, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function createOrder(userId: string, tier: string): OrderInfo {
  const db = getLicenseDb();
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    `INSERT INTO orders (id, user_id, tier, status, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?)`,
  ).run(id, userId, tier, now, now);
  return getOrder(id)!;
}

export function getOrder(id: string): OrderInfo | null {
  const db = getLicenseDb();
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRow | undefined;
  return row ? toOrder(row) : null;
}

export function listOrders(userId: string): OrderInfo[] {
  const db = getLicenseDb();
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId) as OrderRow[];
  return rows.map(toOrder);
}

export function listAllOrders(): OrderInfo[] {
  const db = getLicenseDb();
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all() as OrderRow[];
  return rows.map(toOrder);
}

export function updateOrderStatus(id: string, status: string): OrderInfo | null {
  const db = getLicenseDb();
  const now = Date.now();
  db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
  return getOrder(id);
}
