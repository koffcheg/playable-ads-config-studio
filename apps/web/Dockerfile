FROM node:20-alpine

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN pnpm --filter @studio/shared build && pnpm --filter @studio/web build

EXPOSE 3000

CMD ["pnpm", "--filter", "@studio/web", "exec", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]
