# syntax=docker/dockerfile:1.7

# Cartopia — multi-stage build.
#   target=web    → minimal standalone Next.js server (port 3000)
#   target=worker → full source + tsx + docker-cli (runs BullMQ jobs, pg_dump
#                   via the dataplane container over the docker socket)
#
# Build context must be the repo root (copies package.json, app/, lib/, etc.).

# ─── deps: install node_modules (deps + devDeps needed for build + worker) ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─── builder: compile Next.js (emits .next/standalone) ──────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time placeholders only. env.ts runs schema.parse(process.env) at module
# load, so the required vars (METADATA_DATABASE_URL, APP_SECRET) must be present
# for `next build` to collect page data. Real values are injected at runtime via
# .env.production (env_file in docker-compose.prod.yml) — these never ship.
ENV METADATA_DATABASE_URL="postgres://build:build@localhost:5432/build"
ENV APP_SECRET="build-time-placeholder-secret-32-bytes-minimum"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─── prod-deps: production node_modules only (no devDeps) ───────────────────
# Used by the web image to satisfy serverExternalPackages runtime requires
# without shipping tsx/eslint/playwright/etc.
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─── web: standalone Next.js server ─────────────────────────────────────────
FROM node:20-alpine AS web
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
# standalone server (server.js + pruned node_modules) + static assets + public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# serverExternalPackages (pg, pg-format, bcryptjs, @aws-sdk) are require()'d at
# runtime; the standalone tracer includes only entry files and misses internal
# requires (e.g. pg-format/lib/reserved.js, pg's sub-deps, the @aws-sdk tree).
# Copy the full prod node_modules so every runtime require resolves.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]

# ─── worker: BullMQ jobs (quota sweep, metrics, backups) ────────────────────
# Needs the full TS source (tsx resolves @/ aliases via tsconfig) + docker-cli
# so pg_dump can run inside the dataplane container over the mounted socket.
FROM node:20-alpine AS worker
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache docker-cli
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/package.json ./
# `npm run db:*` / `quota:sweep` etc. hardcode `--env-file=.env.local`; in the
# container the env comes from docker env_file, so an empty .env.local satisfies
# the flag without overriding anything.
RUN touch .env.local
CMD ["npx", "tsx", "worker/index.ts"]
