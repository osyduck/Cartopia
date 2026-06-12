# Cartopia

Self-hosted **PostgreSQL DBaaS control panel**. One web UI to provision and
manage many databases + roles on a shared PostgreSQL server — like a mini,
self-hosted DigitalOcean Managed Databases.

Built with Next.js + TypeScript. Single admin login (no multi-tenant RBAC).

## Architecture

Cartopia separates the **control plane** (this app + its own metadata DB) from
the **data plane** (the managed PostgreSQL where tenant databases live). The
control plane connects to the data plane as an admin role to run DDL; end users
connect to the data plane through **PgBouncer**, never to the control plane.

```
Browser ──▶ Cartopia (Next.js) ──┬─▶ Metadata DB (Postgres)   ← control plane
                                 └─▶ Data plane Postgres ◀─ PgBouncer ◀─ apps
```

Multi-node ready: every database row references an `instances` row, so scaling
out later means registering another data-plane node, not re-architecting.

## Stack

- Next.js 16 (App Router) + TypeScript, Tailwind v4
- Drizzle ORM for the metadata DB
- `pg` + `pg-format` for data-plane DDL (identifiers validated + `%I`-quoted)
- Single-admin session (`jose` JWT cookie + `bcryptjs`)
- PgBouncer (transaction pooling, `auth_query`)
- Planned: BullMQ + Redis worker (quota/metrics/backups), MinIO/S3 backups

## Prerequisites

- Node 20+ (built on Node 24)
- Docker Desktop (for the dev stack)

## Getting started

```bash
# 1. dependencies
npm install

# 2. environment (defaults already match docker-compose)
cp .env.example .env.local

# 3. infra: metadata-pg, dataplane-pg, pgbouncer, redis, minio
docker compose up -d

# 4. metadata schema + seed (admin user + default instance)
npm run db:migrate
npm run db:seed

# 5. run
npm run dev    # http://localhost:3000
```

Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local`
(default `admin@cartopia.local` / `changeme123`).

## What works today (Phase 1)

- Single-admin auth (login + route protection via `proxy.ts`)
- Create / drop databases — each gets a dedicated owner role, `REVOKE CONNECT
  FROM PUBLIC`, schema ownership, connection + statement limits
- Add / remove extra roles with **read** or **read-write** access
- Reset role passwords (shown once, never stored)
- Per-database storage usage + quota bar; **read-only** toggle (quota
  enforcement primitive — blocks writes, allows reads + DELETE)
- Connection strings pointed at PgBouncer
- Audit log of every mutating action

Cross-database isolation is enforced: a tenant role cannot connect to other
databases or to the `postgres`/`template1` maintenance databases
(see `infra/dataplane-init/02-lockdown.sql`).

## Roadmap

- **Phase 2** — quota monitoring worker + auto read-only on overflow
- **Phase 3** — Monitoring page (active connections, size, cache hit ratio,
  instance health) and daily backups (`pg_dump` → MinIO/S3, 7-day retention)
- **Phase 4** — multi-node routing, PITR, hard quotas

## Useful scripts

```bash
npm run db:generate   # regenerate Drizzle migration from schema changes
npm run db:migrate    # apply migrations to the metadata DB
npm run db:seed       # idempotent admin + default-instance seed
npx tsx --env-file=.env.local scripts/smoke-dataplane.ts   # provisioning smoke test
```

## Layout

```
app/(panel)/        authenticated UI (databases, monitoring, backups, audit)
app/login/          login page + action
lib/db/             Drizzle schema + metadata client
lib/dataplane/      provisioning ops, identifier validation, admin pools
lib/services/       metadata <-> data-plane orchestration
lib/auth/           session (jwt) + password hashing
infra/              docker init SQL + pgbouncer config
```
