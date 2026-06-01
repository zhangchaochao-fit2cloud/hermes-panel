import Router from '@koa/router';
import { createOrder, listOrders, getOrder, listAllOrders, updateOrderStatus } from '../services/orders.js';
import { requireUser, requireAdmin } from '../middleware/auth.js';

export const ordersRouter = new Router();

ordersRouter.get('/orders', async (ctx) => {
  if (!requireUser(ctx)) return;
  ctx.body = { orders: listOrders(ctx.state.user.id) };
});

ordersRouter.post('/orders', async (ctx) => {
  if (!requireUser(ctx)) return;
  const b = (ctx.request.body ?? {}) as { tier?: string };
  const tier = typeof b.tier === 'string' && ['web', 'desktop', 'pro'].includes(b.tier) ? b.tier : 'web';
  const order = createOrder(ctx.state.user.id, tier);
  ctx.status = 201;
  ctx.body = { order };
});

ordersRouter.get('/orders/:id', async (ctx) => {
  if (!requireUser(ctx)) return;
  const order = getOrder(ctx.params.id);
  if (!order || order.userId !== ctx.state.user.id) {
    ctx.status = 404;
    return;
  }
  ctx.body = { order };
});

// Admin: list all orders
ordersRouter.get('/admin/orders', async (ctx) => {
  if (!requireAdmin(ctx)) return;
  ctx.body = { orders: listAllOrders() };
});

// Admin: update order status
ordersRouter.patch('/admin/orders/:id', async (ctx) => {
  if (!requireAdmin(ctx)) return;
  const b = (ctx.request.body ?? {}) as { status?: string };
  const status = typeof b.status === 'string' ? b.status : '';
  if (!['pending', 'paid', 'delivered', 'refunded'].includes(status)) {
    ctx.status = 400;
    ctx.body = { error: { code: 'INVALID_STATUS', message: 'invalid order status' } };
    return;
  }
  const order = updateOrderStatus(ctx.params.id, status);
  ctx.body = { order };
});
