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
- BullMQ + Redis worker — quota sweep, metrics sampling, scheduled backups
- MinIO / S3 — `pg_dump -Fc` backup object storage

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
npm run dev       # http://localhost:3000  → public landing page → Sign in → panel
npm run worker    # background jobs: quota sweep + metrics + backups (BullMQ)
```

Open `http://localhost:3000` for the **landing page**. Click **Sign in** and
log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local`
(default `admin@cartopia.local` / `changeme123`) — you'll land on the databases
list. Unauthenticated visitors stay on the public landing page; authenticated
users hitting `/` or `/login` skip straight to `/databases`.

## Features

### Provisioning & access

- Single-admin auth (login + route protection via `proxy.ts`)
- Create / drop databases — each gets a dedicated owner role, `REVOKE CONNECT
  FROM PUBLIC`, schema ownership, connection + statement limits
- Add / remove extra roles with **read** or **read-write** access
- Reset role passwords (shown once; role passwords are AES-GCM-encrypted in
  `db_roles.password_enc` so they can be revealed again)
- Cross-database isolation enforced — a tenant role cannot connect to other
  databases or to the `postgres`/`template1` maintenance databases
  (see `infra/dataplane-init/02-lockdown.sql`)

### Connection methods

Each database's **Overview** tab (`/databases/[id]`) shows three connection
modes as a segmented control: **Transaction Pooler** (6432) · **Session Pooler**
(6433, a second PgBouncer in session mode) · **Direct Connection** (5432). Each
breaks out Host / Port / Database Name / Username / Password / Connection
String with copy buttons. The connection string is masked by default (Show/Hide
toggle), and a **Copy .env** button exports the full `PGHOST`…`DATABASE_URL`
block at once.

### Quota enforcement

`lib/services/quota.ts` samples `pg_database_size` per database, records usage
snapshots, and drives a soft quota state machine: **warn at 80% → enforce
read-only at 100% (kicks live sessions) → recover under 95%** (hysteresis). Each
transition logs a `quota_events` row + a notification (and POSTs to
`ALERT_WEBHOOK_URL` if set — Discord/Slack/generic). The BullMQ worker runs the
sweep every `QUOTA_SWEEP_INTERVAL_SECONDS` (default 60). The databases list
shows an alert banner + usage bars/% + status badges, plus a manual "Quota
sweep" button.

One-off sweep without the worker: `npm run quota:sweep`.

### Monitoring

Per-database **Monitor** tab (`/databases/[id]/monitor`) — active connections
vs the role connection cap, database size vs quota, cache hit ratio, and a
**Query Performance** table powered by `pg_stat_statements` (toggle Slowest /
Most Time / Most Called; cumulative since `pg_stat_statements` was last reset).
Status reads **Connected** / **Unreachable** with the last sample time.
Metrics are sampled into `metric_snapshots` by a `monitor-sweep` worker job.

```bash
npm run monitor:sweep   # one-off metrics + health sample
```

### Backups & restore

Per-database **Backups** tab (`/databases/[id]/backups`) — daily `pg_dump -Fc`
streamed straight to MinIO/S3, recorded in `backups`, with a rolling **7-day
retention** prune. Runs on a cron (`BACKUP_CRON`, default daily at 2:00 AM)
plus a manual "Backup now" button. **Restore** any backup into a fresh managed
database (owner role + metadata provisioned, then `pg_restore --no-owner --role`
streamed from S3, rolled back on failure), or download the raw `.dump` via an
auth-gated route (`/backups/[id]/download`).

```bash
npm run backup:now      # one-off backup of every db + prune
npx tsx --env-file=.env.local scripts/restore-test.ts   # restore a backup into a temp db
```

### Audit log

`/audit` — every mutating admin action (database created, role added, password
reset, restore, quota sweep) recorded with actor + timestamp. Server-side
paginated (50 per page) with a windowed page-number control.

## Database detail

Each database has its own tabbed page at `/databases/[id]`:

- **Header** — back link, name + status badge, `PostgreSQL vN · Created on …`,
  Refresh.
- **Overview** — three summary stat cards (storage usage, active connections,
  roles) + **Connection Methods** (see above).
- **Monitor** — metric cards + Query Performance table.
- **Backups** — this database's backups, "Backup now", restore, download.
- **Settings** — roles/users manager (table + inline add-role panel) + a
  GitHub-style **Danger zone** (read-only toggle with state-aware microcopy,
  delete database with consequence description).

## Design system

The visual identity is locked in `PRODUCT.md` (product register, users,
principles) and `DESIGN.md` (tokens, components, patterns, bans). Theme: dark
graphite with a honey-amber primary (`oklch(0.70 0.150 52)`), OKLCH tokens in
`app/globals.css`, elevation utilities for depth, Geist Sans + Geist Mono via
`next/font`. The public landing page at `/` is built on the same system.

## Roadmap

- Multi-node routing
- PITR (WAL / pgBackRest)
- Hard quotas (disk-level enforcement)

## Useful scripts

```bash
npm run db:generate   # regenerate Drizzle migration from schema changes
npm run db:migrate    # apply migrations to the metadata DB
npm run db:seed       # idempotent admin + default-instance seed
npx tsx --env-file=.env.local scripts/smoke-dataplane.ts   # provisioning smoke test
```

## Layout

```
app/page.tsx              public landing page (no auth)
app/login/                login page + action
app/(panel)/overview/     panel overview — fleet health + capacity
app/(panel)/databases/    databases list + create form
app/(panel)/databases/[id]/   db detail: Overview / Monitor / Backups / Settings tabs
app/(panel)/audit/        audit log (paginated)
app/(panel)/backups/      backup download route (auth-gated, no list page)
lib/db/                   Drizzle schema + metadata client
lib/dataplane/            provisioning ops, identifier validation, admin pools
lib/services/             metadata <-> data-plane orchestration
lib/auth/                 session (jwt) + password hashing
infra/                    docker init SQL + pgbouncer config
PRODUCT.md                product context, register, principles
DESIGN.md                 locked design system (tokens, components, patterns)
```
