# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json package.json ./
COPY packages/panel-shared/package.json packages/panel-shared/tsconfig.json ./packages/panel-shared/
COPY packages/panel-bff/package.json packages/panel-bff/tsconfig.json ./packages/panel-bff/
COPY packages/panel-web/package.json packages/panel-web/tsconfig.json ./packages/panel-web/
COPY packages/panel-npm/package.json ./packages/panel-npm/

RUN pnpm install --frozen-lockfile --prod false

COPY packages/panel-shared/src ./packages/panel-shared/src
COPY packages/panel-bff/src ./packages/panel-bff/src
COPY packages/panel-web/src ./packages/panel-web/src
COPY packages/panel-web/index.html ./packages/panel-web/index.html
COPY packages/panel-web/vite.config.ts ./packages/panel-web/vite.config.ts
COPY packages/panel-web/tailwind.config.ts ./packages/panel-web/tailwind.config.ts
COPY packages/panel-web/postcss.config.js ./packages/panel-web/postcss.config.js

RUN pnpm --filter @hermes-panel/shared build
RUN pnpm --filter @hermes-panel/bff build
RUN pnpm --filter @hermes-panel/web build

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine

RUN addgroup -S panel && adduser -S panel -G panel

WORKDIR /app

COPY --from=builder /app/packages/panel-shared/dist ./packages/panel-shared/dist
COPY --from=builder /app/packages/panel-bff/dist ./packages/panel-bff/dist
COPY --from=builder /app/packages/panel-web/dist ./packages/panel-web/dist
COPY --from=builder /app/packages/panel-shared/package.json ./packages/panel-shared/package.json
COPY --from=builder /app/packages/panel-bff/package.json ./packages/panel-bff/package.json
COPY --from=builder /app/packages/panel-web/package.json ./packages/panel-web/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./

ENV NODE_ENV=production
ENV BFF_PORT=5667
ENV PANEL_WEB_PORT=5666
ENV NO_OPEN=1

EXPOSE 5666 5667

USER panel

CMD ["node", "--experimental-specifier-resolution=node", "packages/panel-bff/dist/server.js"]
