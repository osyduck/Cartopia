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
npm run dev       # http://localhost:3000  (control panel)
npm run worker    # background quota sweep (BullMQ, every 60s)
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

## Phase 2 (done)

- **Quota sweep** (`lib/services/quota.ts`) — samples `pg_database_size` per
  database, records usage snapshots, and drives a soft quota state machine:
  warn at 80% → enforce read-only at 100% (kicks live sessions) → recover when
  it drops back under 95% (hysteresis). Each transition logs a `quota_events`
  row + a notification (and POSTs to `ALERT_WEBHOOK_URL` if set —
  Discord/Slack/generic).
- **BullMQ worker** (`worker/index.ts`) — repeatable job runs the sweep every
  `QUOTA_SWEEP_INTERVAL_SECONDS` (default 60). Run with `npm run worker`.
- **UI** — alert banner + usage bars/% + status badges on the databases list, a
  manual "Quota sweep" button, and a Quota events feed on the overview.

One-off sweep without the worker: `npm run quota:sweep`.

## Phase 3 (done)

- **Monitoring** (`lib/services/monitoring.ts` + `/monitoring`) — per-database
  active connections, total connections, cache hit ratio and size, plus
  per-instance health (online/unreachable via ping) and a 24h size sparkline.
  Sampled into `metric_snapshots` by a `monitor-sweep` worker job.
- **Backups** (`lib/services/backups.ts` + `/backups`) — daily `pg_dump -Fc`
  per database streamed straight to MinIO/S3, recorded in `backups`, with a
  rolling **7-day retention** prune. Runs on a cron (`BACKUP_CRON`, default
  02:00) plus a manual "Backup now" button.
- **Restore & download** — restore any backup into a fresh managed database
  (owner role + metadata provisioned, then `pg_restore --no-owner --role`
  streamed from S3, rolled back on failure) straight from the Backups page, or
  download the raw `.dump` via an auth-gated route (`/backups/[id]/download`).

The worker now schedules three jobs: `quota-sweep`, `monitor-sweep` (each every
60s) and `backup-all` (daily cron + prune).

```bash
npm run monitor:sweep   # one-off metrics + health sample
npm run backup:now      # one-off backup of every db + prune
npx tsx --env-file=.env.local scripts/restore-test.ts   # restore a backup into a temp db
```

## Database detail (Supabase-style)

Each database has its own tabbed page (`/databases/[id]`):

- **Header** — name + status, `PostgreSQL vN · Created on …`, Refresh, and three
  stat cards (storage usage, live active connections, role count).
- **Overview** — **Connection Methods** with three tabs: **Transaction Pooler**
  (6432) · **Session Pooler** (6433, a second PgBouncer in session mode) ·
  **Direct Connection** (5432). Each breaks out Host / Port / Database Name /
  Username / Password / Connection String with copy buttons. Role passwords are
  stored AES-GCM-encrypted (`db_roles.password_enc`) so they can be shown again.
- **Monitor** — stat cards (active connections vs cap, size vs quota, cache hit
  ratio, live status) plus a **Query Performance** table powered by
  `pg_stat_statements` (toggle Slowest / Most Time / Most Called).
- **Backups** — this database's backups, "Backup now", restore, and download.
- **Settings** — roles/users manager + danger zone (read-only, delete).

## Roadmap

- **Phase 4** — multi-node routing, PITR (WAL/pgBackRest), hard quotas

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
