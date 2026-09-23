# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --filter @agentkeep/api...

FROM deps AS build
COPY apps/api apps/api
RUN pnpm --filter @agentkeep/api build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --filter @agentkeep/api... --prod
COPY --from=build /app/apps/api/dist apps/api/dist
# SQL migrations are read at runtime from dist/store/schema.sql — ensure copied
COPY apps/api/src/store/schema.sql apps/api/dist/store/schema.sql
ENV PORT=8080
EXPOSE 8080
CMD ["node", "apps/api/dist/index.js"]
