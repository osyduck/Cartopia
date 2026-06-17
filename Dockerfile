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
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

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
CMD ["npx", "tsx", "worker/index.ts"]
