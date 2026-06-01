import Router from '@koa/router';
import { registerUser, verifyCredentials, createSession, revokeSession } from '../services/auth.js';
import { requireUser } from '../middleware/auth.js';

export const authRouter = new Router();

authRouter.post('/auth/register', async (ctx) => {
  const b = (ctx.request.body ?? {}) as { email?: string; password?: string; displayName?: string };
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  if (!email || !password) {
    ctx.status = 400;
    ctx.body = { error: { code: 'INVALID_BODY', message: 'email and password required' } };
    return;
  }
  try {
    const user = registerUser(email, password, b.displayName);
    const token = createSession(user.id);
    ctx.status = 201;
    ctx.body = { user, token };
  } catch (e: any) {
    ctx.status = e.status ?? 500;
    ctx.body = { error: { code: 'EMAIL_TAKEN', message: e.message } };
  }
});

authRouter.post('/auth/login', async (ctx) => {
  const b = (ctx.request.body ?? {}) as { email?: string; password?: string };
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const user = verifyCredentials(email, password);
  if (!user) {
    ctx.status = 401;
    ctx.body = { error: { code: 'INVALID_CREDENTIALS', message: 'invalid email or password' } };
    return;
  }
  const token = createSession(user.id);
  ctx.body = { user, token };
});

authRouter.post('/auth/logout', async (ctx) => {
  const token = (ctx.headers['authorization'] ?? '').replace(/^Bearer\s+/i, '');
  revokeSession(token);
  ctx.status = 204;
});

authRouter.get('/auth/me', async (ctx) => {
  if (!requireUser(ctx)) return;
  ctx.body = { user: ctx.state.user };
});
