/**
 * Backup / restore endpoints.
 *
 *   GET  /api/backup           → streams a zip of ~/.hermes back.
 *                                Tempfile produced by `hermes backup -o`
 *                                is unlinked after the stream closes.
 *
 *   POST /api/restore          → accepts a raw `application/zip` (or
 *                                `application/octet-stream`) body, writes
 *                                it to a tempfile, then calls
 *                                `hermes import`.
 *                                ?force=true → adds `-f` (overwrite).
 *
 * Body parsing: koa-bodyparser only handles `application/json` and form
 * encodings by default, so `application/zip` falls through untouched.
 * We read directly from `ctx.req` (the raw Node IncomingMessage) and
 * cap the in-memory buffer at MAX_UPLOAD_BYTES.
 *
 * Auth: both endpoints go through authMiddleware like every other route
 * except /api/system/health.
 */

import Router from '@koa/router';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { logger } from '../lib/logger.js';
import { HermesCliError } from '../services/hermes-cli.js';
import { createBackup, restoreBackup } from '../services/hermes-backup.js';

export const backupRouter = new Router();

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;   // 500 MB hard cap

function readRawBody(req: NodeJS.ReadableStream, max: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > max) {
        reject(new Error(`upload exceeds ${max} bytes`));
        // pause + destroy so we stop receiving
        req.removeAllListeners('data');
        req.removeAllListeners('end');
        (req as unknown as { destroy?: (e?: Error) => void }).destroy?.();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (err) {
    logger.warn({ err, path }, 'failed to unlink backup tempfile');
  }
}

async function safeRmDir(path: string): Promise<void> {
  try {
    await rm(path, { recursive: true, force: true });
  } catch (err) {
    logger.warn({ err, path }, 'failed to remove backup tempdir');
  }
}

backupRouter.get('/backup', async ctx => {
  let path: string;
  try {
    const result = await createBackup();
    path = result.path;
  } catch (err) {
    if (err instanceof HermesCliError) {
      ctx.status = 502;
      ctx.body = { error: { code: err.code, message: err.message } };
      return;
    }
    throw err;
  }

  let size: number;
  try {
    size = (await stat(path)).size;
  } catch (err) {
    await safeUnlink(path);
    ctx.status = 500;
    ctx.body = { error: { code: 'BACKUP_STAT_FAILED', message: (err as Error).message } };
    return;
  }

  const filename = basename(path);
  ctx.status = 200;
  ctx.set('Content-Type', 'application/zip');
  ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
  ctx.set('Content-Length', String(size));
  ctx.set('Cache-Control', 'no-store');

  const stream = createReadStream(path);
  // Schedule cleanup after the stream is fully drained, on error, or on early close.
  let cleaned = false;
  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    void safeUnlink(path).then(() => safeRmDir(dirname(path)));
  };
  stream.on('close', cleanup);
  stream.on('error', err => {
    logger.warn({ err, path }, 'backup stream error');
    cleanup();
  });
  ctx.body = stream;
});

backupRouter.post('/restore', async ctx => {
  // koa-bodyparser ignores `application/zip` / `application/octet-stream`,
  // so ctx.req is still readable here.
  const contentType = (ctx.headers['content-type'] ?? '').toLowerCase();
  if (!contentType.includes('application/zip') && !contentType.includes('application/octet-stream')) {
    ctx.status = 415;
    ctx.body = {
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'expected Content-Type: application/zip or application/octet-stream',
      },
    };
    return;
  }

  let payload: Buffer;
  try {
    payload = await readRawBody(ctx.req, MAX_UPLOAD_BYTES);
  } catch (err) {
    ctx.status = 413;
    ctx.body = {
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: (err as Error).message ?? 'payload too large',
      },
    };
    return;
  }
  if (payload.length === 0) {
    ctx.status = 400;
    ctx.body = { error: { code: 'EMPTY_BODY', message: 'restore body is empty' } };
    return;
  }

  const force = String(ctx.query.force ?? '').toLowerCase() === 'true';

  const dir = await mkdtemp(join(tmpdir(), 'hermes-restore-'));
  const tmpfile = join(dir, 'restore.zip');
  try {
    await writeFile(tmpfile, payload);
  } catch (err) {
    await safeRmDir(dir);
    ctx.status = 500;
    ctx.body = { error: { code: 'WRITE_FAILED', message: (err as Error).message } };
    return;
  }

  try {
    const result = await restoreBackup(tmpfile, force);
    if (!result.ok) {
      ctx.status = 502;
      ctx.body = { error: { code: 'HERMES_IMPORT_FAILED', message: result.error ?? 'import failed' } };
      return;
    }
    ctx.body = { ok: true };
  } finally {
    await safeUnlink(tmpfile);
    await safeRmDir(dir);
  }
});
