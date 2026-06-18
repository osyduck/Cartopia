#!/usr/bin/env bash
#
# Cartopia — zero-clone deploy script.
#
# Fetches ONLY the deployment files (docker-compose.prod.yml + infra/ config)
# from a pinned GitHub release tag, then runs the prod stack from prebuilt
# GHCR images. No git, no source code on the VPS.
#
# Usage (from the VPS):
#   curl -fsSL https://raw.githubusercontent.com/osyduck/Cartopia/main/deploy.sh | bash
#
# Pin a version (default v0.1.0):
#   curl -fsSL https://raw.githubusercontent.com/osyduck/Cartopia/main/deploy.sh | VERSION=v0.2.0 bash
#
# Choose install dir (default ./cartopia):
#   curl -fsSL ... | INSTALL_DIR=/opt/cartopia bash
#
# First run: fetches files + creates .env.production from the example, then
# exits and asks you to edit the secrets. Re-run after editing to start the
# stack. Re-run with a new VERSION to update.
#
set -euo pipefail

OWNER="osyduck"
REPO="Cartopia"
VERSION="${VERSION:-v0.1.0}"
VERSION_NUM="${VERSION#v}"                       # v0.1.0 -> 0.1.0
INSTALL_DIR="${INSTALL_DIR:-./cartopia}"
RAW="https://raw.githubusercontent.com/${OWNER}/${REPO}/${VERSION}"

# Repo path -> local path (kept identical).
FILES=(
  "docker-compose.prod.yml"
  ".env.production.example"
  "infra/pgbouncer/pgbouncer.ini"
  "infra/pgbouncer/pgbouncer-session.ini"
  "infra/pgbouncer/userlist.txt"
  "infra/dataplane-init/01-pgbouncer-auth.sql"
  "infra/dataplane-init/02-lockdown.sql"
  "infra/dataplane-init/03-pg-stat-statements.sql"
)

log() { printf '%s\n' "$*"; }

log "▶ Cartopia deploy — version ${VERSION} → ${INSTALL_DIR}"

# ─── Preflight ──────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || { log "✗ docker not found on PATH"; exit 1; }
docker compose version >/dev/null 2>&1 || { log "✗ 'docker compose' plugin not found"; exit 1; }
command -v curl >/dev/null 2>&1 || { log "✗ curl not found on PATH"; exit 1; }

# ─── Fetch deployment files ─────────────────────────────────────────────────
mkdir -p "${INSTALL_DIR}"
cd "${INSTALL_DIR}"

log "▶ Fetching deployment files from ${RAW}…"
for f in "${FILES[@]}"; do
  mkdir -p "$(dirname "$f")"
  if ! curl -fsSL "${RAW}/${f}" -o "$f"; then
    log "✗ Failed to fetch ${f} (tag ${VERSION} may not exist)"
    exit 1
  fi
  log "  ✓ ${f}"
done

# Pin the GHCR image tags in the fetched compose to this exact version, so a
# deploy is reproducible (instead of floating on :latest).
if [[ -n "${VERSION_NUM}" ]]; then
  sed -i \
    -e "s|ghcr.io/${OWNER}/cartopia-web:latest|ghcr.io/${OWNER}/cartopia-web:${VERSION_NUM}|g" \
    -e "s|ghcr.io/${OWNER}/cartopia-worker:latest|ghcr.io/${OWNER}/cartopia-worker:${VERSION_NUM}|g" \
    docker-compose.prod.yml
  log "  ✓ pinned images to :${VERSION_NUM}"
fi

# ─── Bootstrap .env.production on first run ─────────────────────────────────
if [[ ! -f .env.production ]]; then
  cp .env.production.example .env.production
  log ""
  log "✚ Created .env.production from the example."
  log "  Edit it NOW — set real secrets (APP_SECRET, ADMIN_PASSWORD, DB"
  log "  passwords) and DATAPLANE_POOLER_HOST=<your-public-domain-or-IP>."
  log "  Then re-run this same command to start the stack."
  log ""
  log "    nano ${INSTALL_DIR}/.env.production"
  exit 0
fi

# Refuse to start if the env still has placeholder secrets.
if grep -q "change-me" .env.production; then
  log "✗ .env.production still contains placeholder secrets (\"change-me\")."
  log "  Edit it, then re-run: nano ${INSTALL_DIR}/.env.production"
  exit 1
fi

# ─── Pull + start ───────────────────────────────────────────────────────────
log "▶ Pulling prebuilt images from GHCR…"
docker compose --env-file .env.production -f docker-compose.prod.yml pull web worker

log "▶ Starting stack…"
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

log ""
log "✓ Stack is up. Next steps:"
log "  1. Migrate + seed the metadata DB (first run only, in the WORKER container):"
log "     docker compose --env-file .env.production -f docker-compose.prod.yml exec worker npm run db:migrate"
log "     docker compose --env-file .env.production -f docker-compose.prod.yml exec worker npm run db:seed"
log "  2. Reverse-proxy Nginx → 127.0.0.1:3000 with TLS (see PRODUCTION.md)."
log "  3. Open the panel, sign in, provision a database."
log ""
log "  Logs: docker compose -f docker-compose.prod.yml logs -f web"
log "  Update later: re-run this script with VERSION=v0.2.0"
