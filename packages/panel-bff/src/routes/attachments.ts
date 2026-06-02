import Router from '@koa/router';
import { mkdirSync, writeFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { getPanelHome } from '../services/hermes-home.js';

export const attachmentsRouter = new Router();

function attachmentsDir(): string {
  const dir = join(getPanelHome(), 'attachments');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

interface AttachmentMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

// Upload an attachment (base64-encoded body for simplicity in v1)
attachmentsRouter.post('/attachments', async ctx => {
  const { filename, mimeType, data } = ctx.request.body as { filename?: string; mimeType?: string; data?: string } | undefined ?? {};
  if (!data || !filename) { ctx.status = 400; ctx.body = { error: 'filename and data required' }; return; }
  
  const id = randomUUID();
  const buffer = Buffer.from(data, 'base64');
  
  // Size limit: 10MB
  if (buffer.length > 10 * 1024 * 1024) {
    ctx.status = 413; ctx.body = { error: 'File too large (max 10MB)' }; return;
  }
  
  const dir = attachmentsDir();
  const ext = filename.split('.').pop() ?? 'bin';
  const storedName = `${id}.${ext}`;
  writeFileSync(join(dir, storedName), buffer);
  
  // Save metadata
  const meta: AttachmentMeta = { id, filename, mimeType: mimeType ?? 'application/octet-stream', size: buffer.length, createdAt: Date.now() };
  writeFileSync(join(dir, `${id}.meta.json`), JSON.stringify(meta), 'utf8');
  
  ctx.body = meta;
  ctx.status = 201;
});

// Get attachment metadata
attachmentsRouter.get('/attachments/:id', async ctx => {
  const dir = attachmentsDir();
  const metaPath = join(dir, `${ctx.params.id}.meta.json`);
  if (!existsSync(metaPath)) { ctx.status = 404; return; }
  ctx.body = JSON.parse(readFileSync(metaPath, 'utf8'));
});

// Get attachment content
attachmentsRouter.get('/attachments/:id/content', async ctx => {
  const dir = attachmentsDir();
  const metaPath = join(dir, `${ctx.params.id}.meta.json`);
  if (!existsSync(metaPath)) { ctx.status = 404; return; }
  
  const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as AttachmentMeta;
  const ext = meta.filename.split('.').pop() ?? 'bin';
  const filePath = join(dir, `${ctx.params.id}.${ext}`);
  if (!existsSync(filePath)) { ctx.status = 404; return; }
  
  ctx.type = meta.mimeType;
  ctx.body = readFileSync(filePath);
});

// Delete attachment
attachmentsRouter.delete('/attachments/:id', async ctx => {
  const dir = attachmentsDir();
  const metaPath = join(dir, `${ctx.params.id}.meta.json`);
  if (!existsSync(metaPath)) { ctx.status = 404; return; }
  
  const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as AttachmentMeta;
  const ext = meta.filename.split('.').pop() ?? 'bin';
  try {
    unlinkSync(join(dir, `${ctx.params.id}.${ext}`));
    unlinkSync(metaPath);
  } catch { /* best effort */ }
  ctx.body = { ok: true };
});
