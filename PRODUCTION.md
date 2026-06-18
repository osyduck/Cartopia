# Production deployment

Cartopia in production on a VPS with an existing Nginx. Everything (infra +
app + worker) runs in Docker; Nginx on the host reverse-proxies to the `web`
container and terminates TLS.

## Architecture

```
Tenant app ──▶ <vps-ip>:6432 (PgBouncer, public) ──▶ dataplane-pg (internal)
Browser   ──▶ Nginx :443 ──▶ web container :3000 (loopback)
web/worker ──▶ metadata-pg / redis / minio (internal docker network)
worker     ──▶ docker socket ──▶ dataplane-pg (pg_dump for backups)
```

Only **443** (Nginx), **22** (SSH), and **6432** (PgBouncer) are public. Every
other service is internal to the docker network.

## Prerequisites

- A VPS with a public IPv4
- A **domain** pointing at the VPS (required for Let's Encrypt; the admin cookie
  is `Secure` in production so the panel must be served over HTTPS)
- Docker + the compose plugin
- Nginx + certbot already installed on the host

## 1. Get the deployment files

**Option A — zero-clone (recommended):** fetch only the compose + infra config
from a pinned release tag, no git, no source code on the VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/osyduck/Cartopia/main/deploy.sh | bash
# pin a version:  ... | VERSION=v0.2.0 bash
# custom dir:     ... | INSTALL_DIR=/opt/cartopia bash
```

First run fetches the files into `./cartopia/` and creates `.env.production`
from the example, then exits and asks you to edit the secrets. Re-run after
editing to pull the prebuilt GHCR images and start the stack. The script
auto-pins the image tags to the version being deployed.

Then `cd cartopia` and continue at **Generate real secrets** below.

**Option B — shallow clone** (if you prefer git, or want `--build` as a
fallback):

```bash
git clone --depth 1 https://github.com/osyduck/Cartopia.git
cd Cartopia
cp .env.production.example .env.production
```

Generate real secrets and edit `.env.production`:

```bash
openssl rand -base64 48     # use for APP_SECRET, META_DB_PASSWORD, DATAPLANE_DB_PASSWORD, S3_SECRET_KEY
```

Set in particular:
- `APP_SECRET` (≥ 32 chars), `ADMIN_PASSWORD` (strong)
- `META_DB_PASSWORD` / `DATAPLANE_DB_PASSWORD` — and the matching passwords
  inside `METADATA_DATABASE_URL` / `DATAPLANE_ADMIN_PASSWORD`
- `DATAPLANE_POOLER_HOST` — your **public** domain or IPv4 (this is what tenant
  connection strings will point at)

## 2. (Optional) Harden the PgBouncer auth password

The dataplane init script `infra/dataplane-init/01-pgbouncer-auth.sql` and
`infra/pgbouncer/userlist.txt` ship a dev password (`pgbouncer_auth_pw`). The
init SQL runs only on the **first** creation of the dataplane volume, so change
it in both files **before** first boot if you want to harden it. (Internal-only
role, but worth rotating.)

## 3. Start the stack

**Pull prebuilt images from GHCR** (fastest — no build on the VPS):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull web worker
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Or **build locally** (if you can't reach GHCR or want to modify the image):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

This starts all services. The first run takes a few minutes (pull/build + DB
init).

## 4. Migrate + seed the metadata DB

Run these in the **worker** container (it has the scripts + tsx + drizzle
migrations; the web image is standalone Next.js and has none of them):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec worker \
  npm run db:migrate
docker compose --env-file .env.production -f docker-compose.prod.yml exec worker \
  npm run db:seed
```

`db:seed` is idempotent — it creates the admin user (from `ADMIN_EMAIL` /
`ADMIN_PASSWORD`) and the default data-plane instance (from `DATAPLANE_*`).

## 5. Nginx reverse proxy + TLS

Create `/etc/nginx/sites-available/cartopia.conf`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name cartopia.example.com;

    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name cartopia.example.com;

    ssl_certificate     /etc/letsencrypt/live/cartopia.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cartopia.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Next.js SSR responses can be large — bump the buffers.
    proxy_buffer_size        128k;
    proxy_buffers            4 256k;
    proxy_busy_buffers_size  256k;

    client_max_body_size 64m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
    }
}
```

Enable + issue the cert:

```bash
sudo ln -s /etc/nginx/sites-available/cartopia.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/html -d cartopia.example.com
sudo systemctl reload nginx
```

(Or, if you use the certbot `--nginx` plugin: `sudo certbot --nginx -d cartopia.example.com`.)

## 6. Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 6432    # PgBouncer — tenant connections
sudo ufw enable
```

Do **not** expose 5432, 5433, 6379, 9000, 9001 — the prod compose already binds
them to the docker network only.

## 7. Log in + provision a database

1. Open `https://cartopia.example.com` → landing page → **Sign in**.
2. Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
3. **Databases** → **New database** → name it (e.g. `tenant_app`), set quota +
   connection limit → **Create database**.
4. Open the database → **Overview** tab → **Connection Methods** → pick
   **Transaction Pooler** (recommended) → **Copy .env** (or copy the
   connection string).

## 8. Connection string ready to use

The tenant app receives (host = `DATAPLANE_POOLER_HOST`):

```
postgresql://tenant_app_owner:<generated-pw>@cartopia.example.com:6432/tenant_app
```

or as `.env`:

```dotenv
PGHOST=cartopia.example.com
PGPORT=6432
PGDATABASE=tenant_app
PGUSER=tenant_app_owner
PGPASSWORD=<generated-pw>
DATABASE_URL=postgresql://tenant_app_owner:<generated-pw>@cartopia.example.com:6432/tenant_app
```

Point the tenant app at it. Connections land in PgBouncer (transaction pooling)
→ dataplane Postgres. Done.

## Optional: encrypt tenant connections (PgBouncer TLS)

By default PgBouncer speaks plaintext on 6432 — fine over a private network,
**not** fine over the public internet. To require TLS on client connections,
mount a cert and edit `infra/pgbouncer/pgbouncer.ini`:

```ini
client_tls_sslmode = require
client_tls_key_file = /etc/pgbouncer/tls/key.pem
client_tls_cert_file = /etc/pgbouncer/tls/cert.pem
```

Then add a volume mount in `docker-compose.prod.yml` for the pgbouncer service:

```yaml
    volumes:
      - ./infra/pgbouncer/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini:ro
      - ./infra/pgbouncer/userlist.txt:/etc/pgbouncer/userlist.txt:ro
      - /etc/letsencrypt/live/cartopia.example.com:/etc/pgbouncer/tls:ro
```

You can reuse the Let's Encrypt cert (convert to PEM if needed) or issue a
separate one. Tenant connection strings then add `?sslmode=require`.

## Operations

```bash
# view logs
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f worker

# update to a new release (image published to GHCR — see Releases below)
docker compose --env-file .env.production -f docker-compose.prod.yml pull web worker
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# rebuild from source instead (no GHCR access / local modifications)
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# one-off quota sweep (without waiting for the worker interval)
docker compose --env-file .env.production -f docker-compose.prod.yml exec worker npm run quota:sweep
```

## Releases (GHCR)

Prebuilt images are published to the GitHub Container Registry by the
`release` workflow (`.github/workflows/release.yml`) on every `v*` tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow builds multi-arch (amd64 + arm64) images and pushes:

- `ghcr.io/osyduck/cartopia-web:1.0.0` (+ `:latest`)
- `ghcr.io/osyduck/cartopia-worker:1.0.0` (+ `:latest`)

`docker-compose.prod.yml` references those images, so updating a deployment is
`docker compose pull web worker && docker compose up -d` — no build on the VPS.
To pin a specific release, change `:latest` to `:1.0.0` in the compose file.
The `build:` keys are kept alongside `image:` so `up -d --build` still works
locally without GHCR.

The first push creates the package under `osyduck`; set its visibility in
GitHub → Packages → cartopia-web/worker → settings (public by default for a
public repo).

## Security checklist

- [ ] `APP_SECRET`, `ADMIN_PASSWORD`, all DB passwords, MinIO creds = generated (not defaults)
- [ ] Only 22 / 80 / 443 / 6432 public (UFW + compose bindings)
- [ ] Panel served over HTTPS (Nginx + certbot) — admin cookie is `Secure` in prod
- [ ] `DATAPLANE_POOLER_HOST` set to the public domain/IP (tenant connection strings)
- [ ] PgBouncer TLS enabled if tenants connect over the public internet
- [ ] Backups verified: trigger `npm run backup:now` in the worker container, check MinIO bucket
- [ ] `docker compose` services `restart: unless-stopped` + named volumes for persistence
